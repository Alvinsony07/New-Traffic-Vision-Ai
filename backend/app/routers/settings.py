"""
Settings Router — System settings, audit trail, data purge
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AuditLog, SystemSetting, LaneStats, VehicleLog
from ..schemas import SettingsUpdate
from ..auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api", tags=["Settings"])

# Default settings
_DEFAULTS = {
    "yolo_model": "yolov8s",
    "confidence_threshold": 45,
    "ambulance_confidence": 65,
    "low_density_green": 15,
    "medium_density_green": 30,
    "high_density_green": 45,
    "dark_mode": True,
    "voice_alerts": True,
    "auto_dispatch": True,
    "data_retention": "30_days",
    "weather_condition": "Clear",
}


def _load_settings(db: Session) -> dict:
    """Load settings from the database, falling back to defaults."""
    settings = dict(_DEFAULTS)
    rows = db.query(SystemSetting).all()
    for row in rows:
        try:
            settings[row.key] = json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            settings[row.key] = row.value
    return settings


def _save_settings(db: Session, data: dict):
    """Upsert settings into the database."""
    for key, value in data.items():
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        serialized = json.dumps(value)
        if row:
            row.value = serialized
        else:
            db.add(SystemSetting(key=key, value=serialized))
    db.commit()


# ──────────────────────────────────────
#  GET /api/settings
# ──────────────────────────────────────
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    return _load_settings(db)


# ──────────────────────────────────────
#  POST /api/settings
# ──────────────────────────────────────
@router.post("/settings")
def save_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    current = _load_settings(db)
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=400, detail="No data provided")

    for key, value in updates.items():
        current[key] = value

    _save_settings(db, current)

    # Audit
    entry = AuditLog(
        action="settings_changed",
        details=f"Updated: {', '.join(updates.keys())}",
        user_id=current_user.id,
    )
    db.add(entry)
    db.commit()

    return {"success": True, "settings": current}


# ──────────────────────────────────────
#  GET /api/audit_trail
# ──────────────────────────────────────
@router.get("/audit_trail")
def audit_trail(
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    per_page = min(per_page, 100)
    total = db.query(AuditLog).count()
    pages = max(1, (total + per_page - 1) // per_page)

    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "entries": [
            {
                "id": l.id,
                "action": l.action,
                "details": l.details,
                "user": l.user.username if l.user else "System",
                "ip": l.ip_address,
                "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for l in logs
        ],
        "total": total,
        "pages": pages,
        "current_page": page,
    }


# ──────────────────────────────────────
#  POST /api/purge_data
# ──────────────────────────────────────
@router.post("/purge_data")
def purge_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    try:
        lane_count = db.query(LaneStats).count()
        vehicle_count = db.query(VehicleLog).count()

        db.query(LaneStats).delete()
        db.query(VehicleLog).delete()
        db.commit()

        entry = AuditLog(
            action="data_purge",
            details=f"Purged {lane_count} lane stats, {vehicle_count} vehicle logs",
            user_id=current_user.id,
        )
        db.add(entry)
        db.commit()

        return {"success": True, "purged": {"lane_stats": lane_count, "vehicle_logs": vehicle_count}}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
