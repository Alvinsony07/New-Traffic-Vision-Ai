"""
ANPR — Automatic Number Plate Recognition
Uses YOLO-based vehicle detection + image preprocessing + EasyOCR
for extracting number plates from video frames.
"""
import cv2
import numpy as np
import re
import os
import time
from datetime import datetime, timezone
from ..database import SessionLocal
from ..models import NumberPlateLog


# Indian plate patterns (KL = Kerala, TN = Tamil Nadu, KA = Karnataka, etc.)
INDIAN_PLATE_PATTERN = re.compile(
    r'^[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{0,3}\s?[0-9]{1,4}$'
)

# Common plate patterns globally
GENERIC_PLATE_PATTERN = re.compile(
    r'^[A-Z0-9]{2,3}\s?[A-Z0-9]{1,4}\s?[A-Z0-9]{1,6}$'
)


class PlateDetector:
    """
    Number plate detection and OCR pipeline.
    Integrates with the existing VideoProcessor — receives
    vehicle bounding boxes and extracts plate text.
    """

    def __init__(self, ocr_reader=None, save_snapshots=True):
        self.ocr_reader = ocr_reader      # Shared EasyOCR reader
        self.save_snapshots = save_snapshots
        self.snapshot_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'plate_snapshots')
        os.makedirs(self.snapshot_dir, exist_ok=True)

        # Rate-limit: don't process plates too frequently
        self.last_process_time = 0
        self.process_interval = 3.0  # seconds between ANPR scans
        self.recently_seen = {}      # plate -> timestamp (debounce same plate)
        self.debounce_secs = 30      # ignore same plate for 30s
        self._ready = ocr_reader is not None
        print(f"🔍 ANPR PlateDetector initialized (OCR ready: {self._ready})")

    @property
    def ready(self):
        return self._ready

    def set_ocr_reader(self, reader):
        """Attach OCR reader (called after AmbulanceDetector inits EasyOCR)."""
        self.ocr_reader = reader
        self._ready = reader is not None

    def process_frame(self, frame, vehicle_boxes, lane_id=0, camera_source="default"):
        """
        Main entry point — called from VideoProcessor's detection cycle.
        
        Args:
            frame: BGR numpy array (480x270 downscaled)
            vehicle_boxes: list of {'coords': (x1,y1,x2,y2), 'type': str, ...}
            lane_id: which lane/camera
            camera_source: camera identifier
            
        Returns:
            list of detected plates: [{'plate': str, 'confidence': float, 'bbox': tuple}]
        """
        if not self._ready:
            return []

        now = time.time()
        if now - self.last_process_time < self.process_interval:
            return []
        self.last_process_time = now

        detections = []

        for box_data in vehicle_boxes:
            x1, y1, x2, y2 = box_data['coords']
            w, h = x2 - x1, y2 - y1

            # Skip small vehicles (plates won't be readable)
            if w < 80 or h < 50:
                continue

            vehicle_roi = frame[y1:y2, x1:x2]
            if vehicle_roi.size == 0:
                continue

            # Extract plate region candidates
            plate_candidates = self._find_plate_regions(vehicle_roi)

            for plate_roi, (px1, py1, px2, py2) in plate_candidates:
                # Preprocess for OCR
                processed = self._preprocess_plate(plate_roi)

                # Run OCR
                text, confidence = self._read_plate_text(processed)
                if not text:
                    continue

                # Validate plate format
                cleaned = self._clean_plate_text(text)
                if not cleaned or len(cleaned) < 4:
                    continue

                # Debounce — don't log same plate repeatedly
                if cleaned in self.recently_seen:
                    if now - self.recently_seen[cleaned] < self.debounce_secs:
                        continue

                self.recently_seen[cleaned] = now

                # Save snapshot
                snapshot_path = None
                if self.save_snapshots:
                    snapshot_path = self._save_snapshot(plate_roi, cleaned)

                # Log to database
                self._log_plate(cleaned, lane_id, camera_source, confidence, snapshot_path)

                detections.append({
                    'plate': cleaned,
                    'confidence': confidence,
                    'bbox': (x1 + px1, y1 + py1, x1 + px2, y1 + py2)
                })

        # Cleanup old debounce entries
        cutoff = now - self.debounce_secs * 2
        self.recently_seen = {k: v for k, v in self.recently_seen.items() if v > cutoff}

        return detections

    def _find_plate_regions(self, vehicle_roi):
        """
        Locate potential plate regions within a vehicle ROI.
        Uses edge detection + contour analysis.
        
        Returns: list of (plate_roi, (x1,y1,x2,y2)) within vehicle_roi coords
        """
        h, w = vehicle_roi.shape[:2]
        candidates = []

        # Convert to grayscale
        gray = cv2.cvtColor(vehicle_roi, cv2.COLOR_BGR2GRAY)

        # Apply bilateral filter (preserves edges, removes noise)
        filtered = cv2.bilateralFilter(gray, 11, 17, 17)

        # Edge detection
        edges = cv2.Canny(filtered, 30, 200)

        # Dilate to connect edges
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:15]:
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            # Plates are roughly rectangular (4 corners)
            if len(approx) >= 4 and len(approx) <= 8:
                x, y, cw, ch = cv2.boundingRect(approx)
                aspect = cw / ch if ch > 0 else 0

                # Plate aspect ratios: typically 2:1 to 5:1
                if 1.5 < aspect < 6.0 and cw > 40 and ch > 12:
                    # Plate should be in lower 70% of vehicle
                    if y > h * 0.2:
                        pad = 4
                        px1 = max(0, x - pad)
                        py1 = max(0, y - pad)
                        px2 = min(w, x + cw + pad)
                        py2 = min(h, y + ch + pad)
                        roi = vehicle_roi[py1:py2, px1:px2]
                        if roi.size > 0:
                            candidates.append((roi, (px1, py1, px2, py2)))

        # Fallback: lower strip of vehicle (common plate location)
        if not candidates:
            strip_y1 = int(h * 0.6)
            strip_y2 = h
            strip = vehicle_roi[strip_y1:strip_y2, :]
            if strip.size > 0:
                candidates.append((strip, (0, strip_y1, w, strip_y2)))

        return candidates[:3]  # Max 3 candidates per vehicle

    def _preprocess_plate(self, plate_roi):
        """
        Preprocess plate image for better OCR accuracy.
        Steps: resize → grayscale → CLAHE → dual threshold → denoise
        """
        # Resize to standard height for consistent OCR
        h, w = plate_roi.shape[:2]
        if h < 40:
            scale = 80 / max(h, 1)  # Larger target for better character clarity
            plate_roi = cv2.resize(plate_roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # Grayscale
        if len(plate_roi.shape) == 3:
            gray = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = plate_roi

        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Bilateral filter — preserves edges while smoothing
        blurred = cv2.bilateralFilter(enhanced, 9, 75, 75)

        # Adaptive threshold (handles uneven lighting)
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # Also try Otsu on well-lit plates and pick whichever has better contrast
        _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Pick the result with more defined white-to-black ratio
        adaptive_white = cv2.countNonZero(thresh)
        otsu_white = cv2.countNonZero(otsu)
        total_px = thresh.shape[0] * thresh.shape[1]
        
        # Prefer the threshold whose white ratio is closer to 40-60% (typical for plates)
        adaptive_ratio = abs(0.5 - adaptive_white / max(total_px, 1))
        otsu_ratio = abs(0.5 - otsu_white / max(total_px, 1))
        best = thresh if adaptive_ratio < otsu_ratio else otsu

        # Morphological opening to remove small noise
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(best, cv2.MORPH_OPEN, kernel)

        return cleaned

    def _read_plate_text(self, processed_image):
        """
        Run EasyOCR on preprocessed plate image.
        Returns: (text, confidence)
        """
        if not self.ocr_reader:
            return None, 0.0

        try:
            results = self.ocr_reader.readtext(
                processed_image,
                allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
                paragraph=True,
                min_size=8,
                text_threshold=0.4,
                low_text=0.25,
                contrast_ths=0.05,
                adjust_contrast=0.7
            )

            if not results:
                return None, 0.0

            # Combine all text fragments
            texts = []
            confidences = []
            for detection in results:
                if len(detection) >= 2:
                    text = detection[1] if isinstance(detection[1], str) else str(detection[1])
                    conf = detection[2] if len(detection) > 2 else 0.5
                    texts.append(text.upper().strip())
                    confidences.append(float(conf))

            full_text = ' '.join(texts)
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

            return full_text, avg_conf

        except Exception as e:
            print(f"ANPR OCR error: {e}")
            return None, 0.0

    def _clean_plate_text(self, text):
        """
        Clean and normalize plate text.
        Context-aware OCR error correction.
        """
        if not text:
            return None

        text = text.upper().strip()
        # Remove non-alphanumeric (except spaces)
        text = re.sub(r'[^A-Z0-9\s]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove all spaces for pattern matching
        compact = text.replace(' ', '')
        
        if len(compact) < 4:
            return None

        # Context-aware OCR substitution for Indian plates
        # Pattern: XX 00 XX 0000 — letters at positions 0-1, digits at 2-3, letters at 4-5, digits at 6+
        if len(compact) >= 8:
            corrected = list(compact)
            for idx in range(len(corrected)):
                if idx < 2 or (4 <= idx <= 5 and idx < len(corrected)):
                    # Expected letter positions — fix digit-to-letter
                    corrected[idx] = corrected[idx].replace('0', 'O').replace('1', 'I').replace('5', 'S').replace('8', 'B')
                elif 2 <= idx <= 3 or idx >= 6:
                    # Expected digit positions — fix letter-to-digit
                    corrected[idx] = corrected[idx].replace('O', '0').replace('I', '1').replace('S', '5').replace('B', '8')
            compact = ''.join(corrected)

        # Check if it looks like a plate
        if INDIAN_PLATE_PATTERN.match(compact):
            return compact
        if GENERIC_PLATE_PATTERN.match(compact):
            return compact

        # If it has at least 4 alphanumeric chars, accept it
        if 4 <= len(compact) <= 12:
            return compact

        return None

    def _save_snapshot(self, plate_roi, plate_text):
        """Save plate snapshot to disk."""
        try:
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_text = re.sub(r'[^A-Z0-9]', '', plate_text)[:10]
            filename = f"plate_{safe_text}_{ts}.jpg"
            filepath = os.path.join(self.snapshot_dir, filename)
            cv2.imwrite(filepath, plate_roi, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            return filepath
        except Exception as e:
            print(f"ANPR snapshot save error: {e}")
            return None

    def _log_plate(self, plate_text, lane_id, camera_source, confidence, snapshot_path):
        """Log detected plate to database."""
        try:
            with SessionLocal() as db:
                log = NumberPlateLog(
                    plate_number=plate_text,
                    lane_id=lane_id + 1,  # 1-indexed
                    camera_source=camera_source,
                    confidence=confidence,
                    snapshot_path=snapshot_path
                )
                db.add(log)
                db.commit()
                print(f"🚗 ANPR: Plate detected — {plate_text} (conf: {confidence:.0%}, lane {lane_id + 1})")
        except Exception as e:
            print(f"ANPR DB error: {e}")
