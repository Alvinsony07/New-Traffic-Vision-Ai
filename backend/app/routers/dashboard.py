"""
Dashboard Router — Live status, signal control, video streaming
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import SignalOverride
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api", tags=["Dashboard"])

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
    """Generator for MJPEG stream."""
    import time
    idle = 0
    while _video_processor and _video_processor.running:
        frame_bytes = _video_processor.get_frame(lane_id)
        if frame_bytes:
            idle = 0
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        else:
            idle += 1
            if idle > 300:
                break
            time.sleep(0.1)


@router.get("/video_feed/{lane_id}")
def video_feed(lane_id: int):
    if lane_id < 0 or lane_id > 3:
        raise HTTPException(status_code=400, detail="Invalid lane")
    return StreamingResponse(
        _gen_frames(lane_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
