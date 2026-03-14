"""
Analytics Router — Stats, trends, predictions, reports data, exports, PDF generation
"""
from datetime import datetime as dt, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse
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
#  GET /api/generate_pdf  (HTML Report)
# ──────────────────────────────────────
@router.get("/generate_pdf")
def generate_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Generate a downloadable HTML report of traffic statistics."""
    stats = db.query(LaneStats).order_by(LaneStats.timestamp.desc()).limit(100).all()
    dispatches = db.query(DispatchLog).order_by(DispatchLog.timestamp.desc()).limit(20).all()
    incidents = db.query(AccidentReport).order_by(AccidentReport.timestamp.desc()).limit(20).all()

    total_vehicles = sum(s.vehicle_count for s in stats)
    total_dispatches = db.query(DispatchLog).count()
    total_incidents = db.query(AccidentReport).count()
    now = dt.now()

    # Build HTML
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }}
            h1 {{ color: #3b82f6; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }}
            h2 {{ color: #1e293b; margin-top: 30px; }}
            .meta {{ color: #64748b; font-size: 14px; margin-bottom: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }}
            th {{ background: #3b82f6; color: white; padding: 10px; text-align: left; }}
            td {{ padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }}
            tr:nth-child(even) {{ background: #f8fafc; }}
            .stat-box {{ display: inline-block; background: #f1f5f9; border-radius: 10px; padding: 15px 25px; margin: 5px; text-align: center; }}
            .stat-val {{ font-size: 28px; font-weight: bold; color: #3b82f6; }}
            .stat-lbl {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }}
            .footer {{ margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }}
        </style>
    </head>
    <body>
        <h1>Traffic Vision AI — Analytics Report</h1>
        <div class="meta">Generated: {now.strftime('%Y-%m-%d %H:%M:%S')} | System v3.0</div>

        <div>
            <div class="stat-box"><div class="stat-val">{total_vehicles}</div><div class="stat-lbl">Total Vehicles</div></div>
            <div class="stat-box"><div class="stat-val">{total_dispatches}</div><div class="stat-lbl">Dispatches</div></div>
            <div class="stat-box"><div class="stat-val">{total_incidents}</div><div class="stat-lbl">Incidents</div></div>
            <div class="stat-box"><div class="stat-val">{len(stats)}</div><div class="stat-lbl">Data Points</div></div>
        </div>

        <h2>Recent Traffic Records</h2>
        <table>
            <tr><th>ID</th><th>Lane</th><th>Vehicles</th><th>Density</th><th>Timestamp</th></tr>
    """

    for s in stats[:50]:
        density = s.density or ("High" if s.vehicle_count > 20 else ("Medium" if s.vehicle_count > 10 else "Low"))
        html += f"<tr><td>#{s.id}</td><td>Lane {s.lane_id}</td><td>{s.vehicle_count}</td><td>{density}</td><td>{s.timestamp.strftime('%Y-%m-%d %H:%M')}</td></tr>\n"

    html += """</table>
        <h2>Recent Incident Reports</h2>
        <table>
            <tr><th>ID</th><th>Location</th><th>Status</th><th>Reported</th></tr>
    """

    for inc in incidents:
        html += f"<tr><td>#{inc.id}</td><td>{inc.location}</td><td>{inc.status}</td><td>{inc.timestamp.strftime('%Y-%m-%d %H:%M')}</td></tr>\n"

    html += f"""
        </table>
        <div class="footer">
            Traffic Vision AI — Autonomous Traffic Management System<br>
            This report was auto-generated. Data reflects records up to {now.strftime('%Y-%m-%d %H:%M')}.
        </div>
    </body>
    </html>
    """

    filename = f"traffic_report_{now.strftime('%Y%m%d_%H%M%S')}.html"
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
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


# ──────────────────────────────────────
#  Admin User Management
# ──────────────────────────────────────
@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """List all users for admin management."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "phone_number": u.phone_number,
                "organization": u.organization,
                "role": u.role,
                "is_locked": u.is_locked,
                "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None,
            }
            for u in users
        ]
    }


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Delete a user (admin only). Cannot delete yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"success": True, "message": f"User '{user.username}' deleted"}


@router.post("/users/{user_id}/toggle-lock")
def toggle_lock_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Lock or unlock a user account."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot lock your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_locked = not user.is_locked
    if not user.is_locked:
        user.failed_login_attempts = 0
    db.commit()
    return {"success": True, "is_locked": user.is_locked}


@router.post("/users/{user_id}/change-role")
def change_user_role(user_id: int, role: str = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Change user role (admin only)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    if role not in ("admin", "user", "ambulance_driver"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"success": True, "role": role}
