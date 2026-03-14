from ultralytics import YOLO
import cv2

class VehicleDetector:
    def __init__(self, model_path, confidence=0.3):
        try:
            self.model = YOLO(model_path) 
        except Exception as e:
            print(f"Warning: Using yolov8n.pt default.")
            self.model = YOLO('yolov8n.pt')
            
        self.confidence = confidence
        self.target_classes = [1, 2, 3, 5, 7]
        self.class_names = {
            1: 'bicycle', 2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'
        }

        # ── Per-class confidence thresholds ──
        # Higher thresholds for large vehicles (reduce false positives)
        # Lower thresholds for small vehicles (avoid missing bikes)
        self.class_conf = {
            1: 0.15,  # bicycle  — small, accept lower confidence
            2: 0.25,  # car      — standard
            3: 0.15,  # motorcycle — small
            5: 0.30,  # bus      — large, require more confidence
            7: 0.30,  # truck    — large
        }

        # ── Per-class colors for clearer visual distinction ──
        self.class_colors = {
            'bicycle':    (255, 200, 0),   # Cyan-yellow
            'car':        (0, 255, 0),     # Green
            'motorcycle': (255, 165, 0),   # Orange
            'bus':        (255, 0, 128),   # Magenta
            'truck':      (0, 180, 255),   # Amber
        }

        # ── Minimum bounding box area (pixels²) to filter noise ──
        self.min_box_area = {
            1: 200,   # bicycle
            2: 600,   # car
            3: 200,   # motorcycle
            5: 1200,  # bus
            7: 1000,  # truck
        }

    def detect(self, frame, exclude_boxes=None, draw=True):
        if exclude_boxes is None:
            exclude_boxes = []
            
        # Run YOLO with NMS IoU threshold to reduce overlapping boxes
        results = self.model(
            frame, stream=True, verbose=False,
            conf=0.1,     # Low base conf — per-class filtering below
            iou=0.45,     # NMS IoU threshold — suppresses duplicate boxes
            classes=self.target_classes,  # Only detect vehicle classes
        )
        
        counts = {name: 0 for name in self.class_names.values()}
        total_count = 0
        vehicle_boxes = []
        
        annotated_frame = frame
        
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in self.target_classes:
                    continue

                conf = float(box.conf[0])
                
                # ── Per-class confidence filtering ──
                min_conf = self.class_conf.get(cls_id, self.confidence)
                if conf < min_conf:
                    continue
                        
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                w, h = x2 - x1, y2 - y1
                area = w * h

                # ── Minimum area filter (removes tiny noise detections) ──
                min_area = self.min_box_area.get(cls_id, 400)
                if area < min_area:
                    continue

                # ── Aspect ratio sanity check ──
                # Vehicles shouldn't be extremely thin or extremely tall
                aspect = w / max(h, 1)
                if aspect > 8.0 or aspect < 0.1:
                    continue
                    
                # Overlap Check with exclude boxes
                is_excluded = False
                for (ex_x1, ex_y1, ex_x2, ex_y2) in exclude_boxes:
                    dx = min(x2, ex_x2) - max(x1, ex_x1)
                    dy = min(y2, ex_y2) - max(y1, ex_y1)
                    if (dx >= 0) and (dy >= 0):
                        if (dx * dy) > 0.5 * area:
                            is_excluded = True
                            break
                if is_excluded:
                    continue

                name = self.class_names[cls_id]
                counts[name] += 1
                total_count += 1
                
                label = f"{name} {int(conf*100)}%"
                color = self.class_colors.get(name, (0, 255, 0))
                
                # Store box for caching / tracking
                vehicle_boxes.append({
                    'coords': (x1, y1, x2, y2),
                    'label': label,
                    'color': color,
                    'type': name,
                    'confidence': conf
                })
                    
                # Draw
                if draw:
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(annotated_frame, label, (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                                
        return annotated_frame, counts, total_count, vehicle_boxes
