"""
Dispatch Router — Ambulance dispatch CRUD & status updates
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import User, AccidentReport, DispatchLog, AuditLog
from ..schemas import DispatchCreate, DispatchOut, DispatchStatusUpdate, AccidentReportCreate, AccidentReportOut
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api", tags=["Dispatch"])


# ──────────────────────────────────────
#  POST /api/reports  — Submit accident report
# ──────────────────────────────────────
@router.post("/reports", response_model=AccidentReportOut, status_code=201)
def create_report(
    payload: AccidentReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = AccidentReport(
        user_id=current_user.id,
        location=payload.location,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="Reported",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return AccidentReportOut(
        id=report.id,
        location=report.location,
        description=report.description,
        latitude=report.latitude,
        longitude=report.longitude,
        status=report.status,
        timestamp=report.timestamp,
        user=current_user.username,
    )


# ──────────────────────────────────────
#  GET /api/reports — List recent reports
# ──────────────────────────────────────
@router.get("/reports")
def list_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(AccidentReport).options(joinedload(AccidentReport.user)).order_by(AccidentReport.timestamp.desc()).limit(20).all()
    return {
        "reports": [
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
    }


# ──────────────────────────────────────
#  POST /api/dispatch
# ──────────────────────────────────────
@router.post("/dispatch", status_code=201)
def create_dispatch(
    payload: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(AccidentReport).filter(AccidentReport.id == payload.report_id).first()
    if not report:
        raise HTTPException(status_code=400, detail="Invalid report ID")

    dispatch = DispatchLog(
        report_id=payload.report_id,
        hospital_name=payload.hospital_name,
        hospital_lat=payload.hospital_lat,
        hospital_lng=payload.hospital_lng,
        accident_lat=payload.accident_lat,
        accident_lng=payload.accident_lng,
        distance_km=payload.distance_km,
        status="Dispatched",
    )
    db.add(dispatch)

    # Audit
    entry = AuditLog(
        action="dispatch_created",
        details=f"Dispatched to {payload.hospital_name} for report #{payload.report_id}",
        user_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(dispatch)

    return {"success": True, "dispatch_id": dispatch.id}


# ──────────────────────────────────────
#  GET /api/dispatch/active
# ──────────────────────────────────────
@router.get("/dispatch/active")
def active_dispatches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dispatches = (
        db.query(DispatchLog)
        .options(joinedload(DispatchLog.report))
        .filter(DispatchLog.status.in_(["Dispatched", "En Route", "Arrived", "Patient Loaded"]))
        .order_by(DispatchLog.timestamp.desc())
        .all()
    )
    return {
        "dispatches": [
            {
                "id": d.id,
                "report_id": d.report_id,
                "hospital_name": d.hospital_name,
                "hospital_lat": d.hospital_lat,
                "hospital_lng": d.hospital_lng,
                "accident_lat": d.accident_lat,
                "accident_lng": d.accident_lng,
                "distance_km": d.distance_km,
                "status": d.status,
                "timestamp": d.timestamp.strftime("%H:%M:%S"),
                "description": d.report.description if d.report else "",
                "location": d.report.location if d.report else "",
            }
            for d in dispatches
        ]
    }


# ──────────────────────────────────────
#  POST /api/dispatch/{id}/accept
# ──────────────────────────────────────
@router.post("/dispatch/{dispatch_id}/accept")
def accept_dispatch(dispatch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(DispatchLog).filter(DispatchLog.id == dispatch_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    d.status = "En Route"
    db.commit()
    return {"success": True}


# ──────────────────────────────────────
#  POST /api/dispatch/{id}/decline
# ──────────────────────────────────────
@router.post("/dispatch/{dispatch_id}/decline")
def decline_dispatch(dispatch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(DispatchLog).filter(DispatchLog.id == dispatch_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    d.status = "Declined"
    db.commit()
    return {"success": True}


# ──────────────────────────────────────
#  POST /api/dispatch/{id}/status
# ──────────────────────────────────────
@router.post("/dispatch/{dispatch_id}/status")
def update_dispatch_status(
    dispatch_id: int,
    payload: DispatchStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = db.query(DispatchLog).filter(DispatchLog.id == dispatch_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    d.status = payload.status
    db.commit()
    return {"success": True, "status": payload.status}
