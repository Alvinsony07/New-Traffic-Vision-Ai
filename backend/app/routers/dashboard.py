"""
Dashboard Router — Live status, signal control, video streaming
"""
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
import os
import shutil
import re

from ..database import get_db
from ..models import User
from ..schemas import SignalOverride
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api", tags=["Dashboard"])

# Allowed video extensions (matches old project)
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def _secure_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal — reimplements werkzeug.secure_filename."""
    # Remove path separators and keep only safe characters
    filename = filename.replace('/', '_').replace('\\', '_')
    filename = re.sub(r'[^\w\s\-.]', '', filename).strip()
    filename = re.sub(r'[\s]+', '_', filename)
    return filename or 'upload'

# ── References to runtime objects (injected at startup via main.py) ──
_signal_controller = None
_video_processor = None


def set_runtime_refs(signal_controller, video_processor):
    """Called once from main.py after initializing core components."""
    global _signal_controller, _video_processor
    _signal_controller = signal_controller
    _video_processor = video_processor


# ──────────────────────────────────────
#  GET /api/status
# ──────────────────────────────────────
@router.get("/status")
def get_status(current_user: User = Depends(get_current_user)):
    status = _signal_controller.get_status() if _signal_controller else {}
    lane_data = _video_processor.lane_data if _video_processor else {}
    return {"signal_status": status, "lane_data": lane_data}


# ──────────────────────────────────────
#  POST /api/override
# ──────────────────────────────────────
@router.post("/override")
def override_signal(
    payload: SignalOverride,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not _signal_controller:
        raise HTTPException(status_code=503, detail="Signal controller not initialized")

    success = _signal_controller.force_switch(payload.lane_id)

    # Audit
    from ..models import AuditLog
    entry = AuditLog(
        action="signal_override",
        details=f"Manual override to Lane {payload.lane_id}",
        user_id=current_user.id,
    )
    db.add(entry)
    db.commit()

    return {"success": success}

# ──────────────────────────────────────
#  POST /api/setup_streams
# ──────────────────────────────────────
@router.post("/setup_streams")
def setup_streams(
    cam_1: str = Form(default=""),
    cam_2: str = Form(default=""),
    cam_3: str = Form(default=""),
    cam_4: str = Form(default=""),
    video_1: UploadFile = File(default=None),
    video_2: UploadFile = File(default=None),
    video_3: UploadFile = File(default=None),
    video_4: UploadFile = File(default=None),
    current_user: User = Depends(get_current_admin),
):
    if not _video_processor:
        raise HTTPException(status_code=503, detail="Video processor not initialized")

    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    cams = [cam_1, cam_2, cam_3, cam_4]
    vids = [video_1, video_2, video_3, video_4]
    final_sources = []

    for i in range(4):
        cam = cams[i].strip() if cams[i] else ""
        vid = vids[i]

        if cam:
            if cam.isdigit():
                final_sources.append(int(cam))
            else:
                final_sources.append(cam)
        elif vid and vid.filename:
            safe_name = _secure_filename(vid.filename)
            if not safe_name:
                final_sources.append(None)
                continue
            # Validate file extension — matches old project's ALLOWED_VIDEO_EXTENSIONS check
            ext = safe_name.rsplit('.', 1)[-1].lower() if '.' in safe_name else ''
            if ext not in ALLOWED_VIDEO_EXTENSIONS:
                print(f"Rejected upload: invalid extension '.{ext}'")
                final_sources.append(None)
                continue
            file_path = os.path.join(upload_dir, safe_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(vid.file, buffer)
            final_sources.append(file_path)
        else:
            final_sources.append(None)

    _video_processor.start_streams(final_sources)
    return {"success": True, "sources": final_sources}


# ──────────────────────────────────────
#  GET /video_snapshot/{lane_id}
# ──────────────────────────────────────
@router.get("/video_snapshot/{lane_id}")
def video_snapshot(lane_id: int):
    if lane_id < 0 or lane_id > 3:
        raise HTTPException(status_code=400, detail="Invalid lane")

    if not _video_processor:
        raise HTTPException(status_code=503, detail="Video processor not initialized")

    frame_bytes = _video_processor.get_frame(lane_id)
    if frame_bytes:
        return Response(content=frame_bytes, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Frame not ready")


# ──────────────────────────────────────
#  GET /api/video_feed/{lane_id}  (MJPEG stream)
# ──────────────────────────────────────
def _gen_frames(lane_id: int):
    """Generator for MJPEG stream — optimized for stability."""
    import time
    idle = 0
    last_frame = None
    while _video_processor and _video_processor.running:
        frame_bytes = _video_processor.get_frame(lane_id)
        if frame_bytes:
            idle = 0
            # Only send if frame actually changed (avoids unnecessary bandwidth)
            if frame_bytes is not last_frame:
                last_frame = frame_bytes
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
            time.sleep(0.04)  # ~25 FPS cap
        else:
            idle += 1
            if idle > 150:  # 30 seconds at 0.2s sleep
                break
            time.sleep(0.2)  # Slower poll when no frames


@router.get("/video_feed/{lane_id}")
def video_feed(lane_id: int):
    if lane_id < 0 or lane_id > 3:
        raise HTTPException(status_code=400, detail="Invalid lane")
    return StreamingResponse(
        _gen_frames(lane_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

