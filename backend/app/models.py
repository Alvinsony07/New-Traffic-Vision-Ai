"""
Traffic Vision AI — SQLAlchemy ORM Models (PostgreSQL)
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base


# ──────────────────────────────────────────────
#  Users & Auth
# ──────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=True)
    phone_number = Column(String(20), nullable=True)
    organization = Column(String(150), nullable=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), default="user")           # 'admin' | 'user'
    failed_login_attempts = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    password_changed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    reports = relationship("AccidentReport", back_populates="user", lazy="dynamic")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="dynamic")


# ──────────────────────────────────────────────
#  Traffic Data
# ──────────────────────────────────────────────
class LaneStats(Base):
    __tablename__ = "lane_stats"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, nullable=False, index=True)   # 1–4
    vehicle_count = Column(Integer, default=0)
    density = Column(String(20))                             # Low | Medium | High
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class VehicleLog(Base):
    __tablename__ = "vehicle_logs"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, nullable=False)
    vehicle_type = Column(String(50), nullable=False, index=True)  # Indexed: grouped in stats
    count = Column(Integer, default=1)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AmbulanceEvent(Base):
    __tablename__ = "ambulance_events"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)


# ──────────────────────────────────────────────
#  Incident & Dispatch
# ──────────────────────────────────────────────
class AccidentReport(Base):
    __tablename__ = "accident_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(20), default="Reported", index=True)   # Indexed: filtered in city_map/dashboard
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reports")
    dispatches = relationship("DispatchLog", back_populates="report", lazy="dynamic")


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("accident_reports.id"), nullable=False)
    hospital_name = Column(String(255), nullable=False)
    hospital_lat = Column(Float, nullable=True)
    hospital_lng = Column(Float, nullable=True)
    accident_lat = Column(Float, nullable=True)
    accident_lng = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    status = Column(String(20), default="Dispatched", index=True)  # Indexed: filtered in active_dispatches
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    report = relationship("AccidentReport", back_populates="dispatches")


# ──────────────────────────────────────────────
#  Audit & Settings
# ──────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)  # Indexed: ordered desc

    user = relationship("User", back_populates="audit_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# ──────────────────────────────────────────────
#  Number Plate Detection (ANPR)
# ──────────────────────────────────────────────
class NumberPlateLog(Base):
    __tablename__ = "number_plate_logs"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(20), nullable=False, index=True)
    lane_id = Column(Integer, nullable=True)
    camera_source = Column(String(255), nullable=True)
    confidence = Column(Float, nullable=True)
    snapshot_path = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

