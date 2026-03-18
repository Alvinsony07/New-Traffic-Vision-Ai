import cv2
import numpy as np
import threading
import time
from .vehicle_detector import VehicleDetector
from .ambulance_detector import AmbulanceDetector
from .plate_detector import PlateDetector
from .box_tracker import BoxTracker
from .traffic_logic import TrafficLogic
from ..database import SessionLocal
from ..models import LaneStats, VehicleLog, AmbulanceEvent

class VideoProcessor:
    def __init__(self, config, signal_controller=None):
        self.config = config
        self.signal_controller = signal_controller
        
        self.vehicle_detector = VehicleDetector(config.MODEL_VEHICLE_PATH)
        self.ambulance_detector = AmbulanceDetector(config.MODEL_AMBULANCE_PATH)
        self.traffic_logic = TrafficLogic(config)

        # ── ANPR: Share EasyOCR reader from AmbulanceDetector ──
        self.plate_detector = PlateDetector(save_snapshots=True)
        if self.ambulance_detector.ocr_ready:
            self.plate_detector.set_ocr_reader(self.ambulance_detector.reader)
            print("🔍 ANPR: Using shared EasyOCR reader from AmbulanceDetector")

        # ── Model Warmup (eliminates cold-start latency) ──
        try:
            dummy_frame = np.zeros((270, 480, 3), dtype=np.uint8)
            self.vehicle_detector.detect(dummy_frame, draw=False)
            print("✅ YOLO model warmed up — first inference latency eliminated")
        except Exception as e:
            print(f"⚠️ Model warmup failed (non-critical): {e}")
        
        # Store latest processing results
        self.frame_data = {} # {0: frame, 1: frame, ...}
        # Updated to include 'details' for broken down counts
        self.lane_data = {i: {'count': 0, 'density': 'Low', 'details': {}} for i in range(4)}
        self.ambulance_active = [False] * 4 # Track ambulance state per lane
        self.plate_detections = {i: [] for i in range(4)}  # Latest ANPR results per lane
        self.box_tracker = BoxTracker(iou_threshold=0.3, max_age=3)  # Temporal smoothing
        
        self.caps = [None] * 4
        self.sources = [None] * 4 # Paths to video files
        
        self.running = False
        self.thread = None
        self.last_db_log = {}  # Timestamp of last DB write per lane

    def start_streams(self, video_paths):
        """
        Initialize video captures
        video_paths: list of 4 file paths or stream URLs
        """
        # Stop existing thread/streams if running to prevent conflict
        if self.running or (self.thread and self.thread.is_alive()):
            self.stop()
            # Give it a moment to release resources
            time.sleep(0.5)

        self.sources = video_paths
        for i, src in enumerate(video_paths):
            if src:
                self.caps[i] = cv2.VideoCapture(src)
        
        self.running = True
        self.thread = threading.Thread(target=self._process_loop)
        self.thread.daemon = True
        self.thread.start()

    def _process_loop(self):
        """
        Main processing loop.
        Reads frames from all active sources, runs detection, updates stats.
        """
        fps_infos = {}
        for i in range(4):
            fps_infos[i] = {
                'frame_time': 0.033, # Default 30 fps
                'last_read': 0,
                'frame_count': 0,
                'is_file': False
            }
            if self.caps[i] and self.caps[i].isOpened():
                if self.sources[i]:
                    # Checking if it's a local video upload/file to enable looping
                    src = str(self.sources[i])
                    fps_infos[i]['is_file'] = not src.isdigit() and not src.startswith(('rtsp://', 'http://'))
                
                fps = self.caps[i].get(cv2.CAP_PROP_FPS)
                if fps and fps > 0 and fps < 120:
                    fps_infos[i]['frame_time'] = 1.0 / fps

        # Optimization: Run detection every N frames
        DETECT_INTERVAL = 4 
        
        cached_boxes = {i: {'vehicles': [], 'ambulance': []} for i in range(4)}
        
        # Signal logic comes directly from the injected dependency
        current_signal_logic = self.signal_controller
        
        while self.running:
            # Fast global polling loop, prevents 100% CPU while letting individual cameras run at their own max FPS
            time.sleep(0.01) 
            
            for i in range(4):
                try:
                    if self.caps[i] and self.caps[i].isOpened():
                        finfo = fps_infos[i]
                        now = time.time()
                        
                        # Throttle based on original FPS (e.g. 1/60th second vs 1/30th)
                        if now - finfo['last_read'] < finfo['frame_time']:
                            continue
                            
                        ret, raw_frame = self.caps[i].read()
                        
                        if not ret:
                            if finfo['is_file']:
                                # Loop local video files automatically
                                self.caps[i].set(cv2.CAP_PROP_POS_FRAMES, 0)
                                ret, raw_frame = self.caps[i].read()
                                if not ret:
                                    self.caps[i].release()
                                    self.caps[i] = None
                                    continue
                            else:
                                print(f"Lane {i}: Stream ended or disconnected.")
                                self.caps[i].release()
                                self.caps[i] = None
                                continue

                        finfo['last_read'] = time.time()
                        finfo['frame_count'] += 1
                        
                        # Downscale
                        frame = cv2.resize(raw_frame, (480, 270))
                        
                        # -- STAGGERED DETECTION LOGIC --
                        if (finfo['frame_count'] + i) % DETECT_INTERVAL == 0:
                            
                            # 1. Detect All Vehicles (No drawing yet)
                            # We get vehicle_boxes: [{'coords':(x1,y1,x2,y2), ...}]
                            _, counts, total, veh_data_list = self.vehicle_detector.detect(frame, draw=False)

                            # Extract just boxes for ambulance check
                            raw_boxes = [v['coords'] for v in veh_data_list]

                            # 2. Check if any vehicle is an ambulance
                            # This reuses the boxes, avoiding a 2nd YOLO call
                            has_ambu, _, ambu_boxes = self.ambulance_detector.check_boxes(frame, raw_boxes)
                            
                            self.ambulance_active[i] = has_ambu
                            
                            # Cache Ambulance Boxes
                            cached_boxes[i]['ambulance'] = ambu_boxes
                            
                            # Cache Vehicle Boxes (excluding ambulances for drawing if needed, 
                            # or just separate them. Vehicles are already classified by YOLO)
                            cached_boxes[i]['vehicles'] = veh_data_list

                            # ── Update box tracker for smooth drawing ──
                            self.box_tracker.update(i, veh_data_list)

                            # Start Counting Logic
                            # If ambulance is found, technically it was counted as a 'truck' or 'car' usually.
                            # We can leave the count as is, or adjust. 
                            # User cares about 'Traffic Logic', so Ambulance presence is more important than -1 car count.

                            # Update Stats
                            self.lane_data[i]['count'] = total
                            self.lane_data[i]['details'] = counts 
                            density_label = self.traffic_logic.get_density_label(total)
                            self.lane_data[i]['density'] = density_label

                            # ── ANPR: Run plate detection on detected vehicles ──
                            if self.plate_detector.ready:
                                try:
                                    plate_results = self.plate_detector.process_frame(
                                        frame, veh_data_list, lane_id=i,
                                        camera_source=str(self.sources[i] or f'Lane {i+1}')
                                    )
                                    self.plate_detections[i] = plate_results
                                except Exception as pe:
                                    print(f"ANPR error lane {i}: {pe}")

                            # DB logging: periodically
                            current_time = time.time()
                            if self.last_db_log.get(i, 0) + 5 < current_time:
                                self.last_db_log[i] = current_time
                                threading.Thread(
                                    target=self._log_to_db,
                                    args=(i+1, total, density_label, counts),
                                    daemon=True
                                ).start()

                        # -- DRAWING (Every Frame) — use TRACKED boxes for stability --
                        # Draw Ambulances (from cached — no smoothing needed)
                        for (ax1, ay1, ax2, ay2) in cached_boxes[i]['ambulance']:
                            cv2.rectangle(frame, (ax1, ay1), (ax2, ay2), (0, 0, 255), 3)
                            cv2.putText(frame, "AMBULANCE", (ax1, ay1 - 10), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                        
                        # Draw Vehicles — use SMOOTHED tracked boxes
                        tracked_vehicles = self.box_tracker.get_boxes(i)
                        for box_data in tracked_vehicles:
                            (vx1, vy1, vx2, vy2) = box_data['coords']
                            
                            # Don't draw over ambulance
                            is_ambu = False
                            for (ax1, ay1, ax2, ay2) in cached_boxes[i]['ambulance']:
                                iou = BoxTracker._compute_iou((vx1, vy1, vx2, vy2), (ax1, ay1, ax2, ay2))
                                if iou > 0.5:
                                    is_ambu = True
                                    break
                            if is_ambu: continue

                            label = box_data['label']
                            color = box_data['color']
                            cv2.rectangle(frame, (vx1, vy1), (vx2, vy2), color, 2)
                            cv2.putText(frame, label, (vx1, vy1 - 10), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

                        # ── Draw ANPR plate detections ──
                        for pdet in self.plate_detections.get(i, []):
                            bx1, by1, bx2, by2 = pdet['bbox']
                            cv2.rectangle(frame, (bx1, by1), (bx2, by2), (0, 255, 255), 2)
                            plate_label = f"{pdet['plate']} {int(pdet['confidence']*100)}%"
                            cv2.putText(frame, plate_label, (bx1, by1 - 6),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)

                        # Adaptive JPEG quality: lower quality when more streams are active
                        active_count = sum(1 for c in self.caps if c is not None)
                        jpeg_quality = 45 if active_count > 2 else 70
                        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
                        self.frame_data[i] = buffer.tobytes()
                except Exception as e:
                    print(f"Error in lane {i}: {e}")
                    continue

            # Update Signal Controller (Check if ANY lane has ambulance)
            ambulance_lane = -1
            for lid, active in enumerate(self.ambulance_active):
                if active:
                    ambulance_lane = lid
                    break
            
            if current_signal_logic:
                current_signal_logic.set_ambulance_event(ambulance_lane, ambulance_lane != -1)

    def _log_to_db(self, lane_id, total, density_label, counts):
        try:
            with SessionLocal() as db_session:
                stats = LaneStats(lane_id=lane_id, vehicle_count=total, density=density_label)
                db_session.add(stats)
                for v_type, v_count in counts.items():
                    if v_count > 0:
                        v_log = VehicleLog(lane_id=lane_id, vehicle_type=v_type, count=v_count)
                        db_session.add(v_log)
                db_session.commit()
        except Exception as e:
            print(f"DB Log Error: {e}")

    def get_frame(self, lane_id):
        return self.frame_data.get(lane_id)
        
    def get_lane_count(self, lane_id):
        return self.lane_data[lane_id]['count']

    def get_active_stream_count(self):
        """Return number of active video streams."""
        return sum(1 for c in self.caps if c is not None and c.isOpened())

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)  # Prevent deadlock
        for cap in self.caps:
            if cap:
                cap.release()
        self.caps = [None] * 4

    # Alias for backward compatibility
    stop_all = stop
