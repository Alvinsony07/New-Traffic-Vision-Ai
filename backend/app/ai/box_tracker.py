"""
Simple IoU-based box tracker for temporal smoothing.
Reduces flickering by carrying detections forward between detection intervals.
"""
import time


class BoxTracker:
    """
    Tracks bounding boxes across frames using IoU matching.
    Each tracked box persists for `max_age` detection cycles.
    """

    def __init__(self, iou_threshold=0.3, max_age=3):
        self.iou_threshold = iou_threshold
        self.max_age = max_age  # How many detection cycles a box survives without a match
        self.tracks = {}  # lane_id -> list of Track dicts

    def update(self, lane_id, new_boxes):
        """
        Update tracks for a given lane with new detections.
        
        Args:
            lane_id: int
            new_boxes: list of {'coords': (x1,y1,x2,y2), 'label': str, 'color': tuple, 'type': str}
            
        Returns:
            list of smoothed box dicts (same format as input)
        """
        if lane_id not in self.tracks:
            self.tracks[lane_id] = []

        existing = self.tracks[lane_id]
        matched_existing = set()
        matched_new = set()
        
        # Match new boxes to existing tracks using IoU
        for ni, new_box in enumerate(new_boxes):
            best_iou = 0
            best_idx = -1
            for ei, track in enumerate(existing):
                if ei in matched_existing:
                    continue
                iou = self._compute_iou(new_box['coords'], track['coords'])
                if iou > best_iou:
                    best_iou = iou
                    best_idx = ei

            if best_iou >= self.iou_threshold and best_idx >= 0:
                # Matched — smooth coordinates (exponential moving average)
                old = existing[best_idx]
                alpha = 0.6  # Weight toward new detection
                smoothed = tuple(
                    int(alpha * n + (1 - alpha) * o)
                    for n, o in zip(new_box['coords'], old['coords'])
                )
                existing[best_idx]['coords'] = smoothed
                existing[best_idx]['label'] = new_box['label']
                existing[best_idx]['color'] = new_box['color']
                existing[best_idx]['type'] = new_box['type']
                existing[best_idx]['age'] = 0
                matched_existing.add(best_idx)
                matched_new.add(ni)

        # Add unmatched new boxes as new tracks
        for ni, new_box in enumerate(new_boxes):
            if ni not in matched_new:
                existing.append({
                    'coords': new_box['coords'],
                    'label': new_box['label'],
                    'color': new_box['color'],
                    'type': new_box.get('type', ''),
                    'age': 0
                })

        # Age unmatched existing tracks
        for ei, track in enumerate(existing):
            if ei not in matched_existing:
                track['age'] += 1

        # Remove expired tracks
        self.tracks[lane_id] = [t for t in existing if t['age'] <= self.max_age]

        return self.tracks[lane_id]

    def get_boxes(self, lane_id):
        """Get current tracked boxes for a lane."""
        return self.tracks.get(lane_id, [])

    @staticmethod
    def _compute_iou(box_a, box_b):
        """Compute Intersection over Union between two boxes."""
        ax1, ay1, ax2, ay2 = box_a
        bx1, by1, bx2, by2 = box_b

        # Intersection
        ix1 = max(ax1, bx1)
        iy1 = max(ay1, by1)
        ix2 = min(ax2, bx2)
        iy2 = min(ay2, by2)

        if ix2 <= ix1 or iy2 <= iy1:
            return 0.0

        intersection = (ix2 - ix1) * (iy2 - iy1)

        # Union
        area_a = (ax2 - ax1) * (ay2 - ay1)
        area_b = (bx2 - bx1) * (by2 - by1)
        union = area_a + area_b - intersection

        if union <= 0:
            return 0.0

        return intersection / union
