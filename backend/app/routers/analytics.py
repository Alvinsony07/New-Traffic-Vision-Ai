"""
Analytics Router — Stats, trends, predictions, reports data, exports
"""
from datetime import datetime as dt, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from ..database import get_db
from ..models import User, LaneStats, VehicleLog, DispatchLog, AccidentReport
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api", tags=["Analytics"])


# ──────────────────────────────────────
#  GET /api/stats
# ──────────────────────────────────────
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Traffic Volume Trend (last 50 entries)
    trend_stats = db.query(LaneStats).order_by(LaneStats.timestamp.desc()).limit(50).all()
    trend_data = [
        {"time": s.timestamp.strftime("%H:%M:%S"), "count": s.vehicle_count, "lane": s.lane_id}
        for s in reversed(trend_stats)
    ]

    # 2. Vehicle type distribution
    dist_query = db.query(VehicleLog.vehicle_type, func.sum(VehicleLog.count)).group_by(VehicleLog.vehicle_type).all()
    dist_data = {vtype: int(count) for vtype, count in dist_query}

    # 3. Peak hours
    peak_query = db.query(
        extract("hour", LaneStats.timestamp).label("h"),
        func.sum(LaneStats.vehicle_count),
    ).group_by("h").all()
    peak_data = {i: 0 for i in range(24)}
    for h, count in peak_query:
        peak_data[int(h)] = int(count)

    # 4. Lane load (avg density)
    lane_query = db.query(LaneStats.lane_id, func.avg(LaneStats.vehicle_count)).group_by(LaneStats.lane_id).all()
    lane_data = {lid: round(float(avg), 1) for lid, avg in lane_query}

    # 5. Emergency count
    ambulance_events = db.query(DispatchLog).count()

    return {
        "trend": trend_data,
        "distribution": dist_data,
        "peak_hours": peak_data,
        "lane_performance": lane_data,
        "ambulance_events": ambulance_events,
    }


# ──────────────────────────────────────
#  GET /api/reports_data
# ──────────────────────────────────────
@router.get("/reports_data")
def reports_data(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    lane: Optional[int] = None,
    density: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LaneStats)

    if lane is not None and 1 <= lane <= 4:
        query = query.filter(LaneStats.lane_id == lane)
    if density and density in ("Low", "Medium", "High"):
        query = query.filter(LaneStats.density == density)
    if date:
        try:
            target = dt.strptime(date, "%Y-%m-%d")
            query = query.filter(func.date(LaneStats.timestamp) == target.date())
        except ValueError:
            pass

    total = query.count()
    pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(LaneStats.timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()

    records = [
        {
            "id": s.id,
            "lane_id": s.lane_id,
            "vehicle_count": s.vehicle_count,
            "density": s.density or ("High" if s.vehicle_count > 20 else ("Medium" if s.vehicle_count > 10 else "Low")),
            "timestamp": s.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for s in items
    ]

    return {
        "records": records,
        "total": total,
        "pages": pages,
        "current_page": page,
        "per_page": per_page,
        "has_next": page < pages,
        "has_prev": page > 1,
    }


# ──────────────────────────────────────
#  GET /api/export_stats  (CSV)
# ──────────────────────────────────────
@router.get("/export_stats")
def export_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    import io, csv

    stats = db.query(LaneStats).order_by(LaneStats.timestamp.desc()).all()
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(["ID", "Lane ID", "Vehicle Count", "Density Label", "Timestamp"])
    for s in stats:
        cw.writerow([s.id, s.lane_id, s.vehicle_count, s.density, s.timestamp])

    output = si.getvalue()
    return StreamingResponse(
        iter([output]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=traffic_stats.csv"},
    )


# ──────────────────────────────────────
#  GET /api/predictions
# ──────────────────────────────────────
@router.get("/predictions")
def get_predictions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = dt.now()
    predictions = []

    for offset in range(1, 7):
        target_hour = (now.hour + offset) % 24
        avg_result = (
            db.query(func.avg(LaneStats.vehicle_count))
            .filter(extract("hour", LaneStats.timestamp) == target_hour)
            .scalar()
        )
        avg_count = round(float(avg_result or 0), 1)

        if avg_count > 25:
            level, color = "High", "#ef4444"
        elif avg_count > 12:
            level, color = "Medium", "#f59e0b"
        else:
            level, color = "Low", "#10b981"

        predictions.append({
            "hour": f"{target_hour:02d}:00",
            "label": (now + timedelta(hours=offset)).strftime("%I %p"),
            "avg_vehicles": avg_count,
            "level": level,
            "color": color,
            "confidence": min(95, 60 + int(avg_count * 0.8)),
        })

    peak_hour = max(predictions, key=lambda x: x["avg_vehicles"])

    return {
        "predictions": predictions,
        "peak_prediction": peak_hour,
        "model": "Historical Time-Series Average",
        "generated_at": now.strftime("%H:%M:%S"),
    }


# ──────────────────────────────────────
#  GET /api/city_map_data
# ──────────────────────────────────────
@router.get("/city_map_data")
def city_map_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from .dashboard import _signal_controller, _video_processor

    status = _signal_controller.get_status() if _signal_controller else {}
    lane_data = _video_processor.lane_data if _video_processor else {}

    reports = db.query(AccidentReport).order_by(AccidentReport.timestamp.desc()).limit(20).all()
    reports_data = [
        {
            "id": r.id,
            "location": r.location,
            "description": r.description,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "status": r.status,
            "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "user": r.user.username if r.user else "Unknown",
        }
        for r in reports
    ]

    dispatches = (
        db.query(DispatchLog)
        .filter(DispatchLog.status.in_(["Dispatched", "En Route", "Arrived", "Patient Loaded"]))
        .order_by(DispatchLog.timestamp.desc())
        .all()
    )
    dispatch_data = [
        {
            "id": d.id,
            "hospital_name": d.hospital_name,
            "hospital_lat": d.hospital_lat,
            "hospital_lng": d.hospital_lng,
            "accident_lat": d.accident_lat,
            "accident_lng": d.accident_lng,
            "distance_km": d.distance_km,
            "status": d.status,
            "timestamp": d.timestamp.strftime("%H:%M:%S"),
        }
        for d in dispatches
    ]

    total_vehicles = sum(
        (lane_data.get(str(i), {}).get("count", 0) for i in range(4)), 0
    )
    active_incidents = db.query(AccidentReport).filter(AccidentReport.status != "Resolved").count()

    return {
        "signal_status": status,
        "lane_data": lane_data,
        "reports": reports_data,
        "dispatches": dispatch_data,
        "summary": {
            "total_vehicles": total_vehicles,
            "active_incidents": active_incidents,
            "active_dispatches": len(dispatch_data),
        },
    }
