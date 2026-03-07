"""
Traffic Vision AI — Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Auth ──
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    organization: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    phone_number: Optional[str]
    organization: Optional[str]
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Traffic ──
class LaneStatsOut(BaseModel):
    id: int
    lane_id: int
    vehicle_count: int
    density: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class StatusResponse(BaseModel):
    signal_status: Dict[str, Any]
    lane_data: Dict[str, Any]


# ── Reports ──
class AccidentReportCreate(BaseModel):
    location: str = Field(..., min_length=1)
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AccidentReportOut(BaseModel):
    id: int
    location: str
    description: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    status: str
    timestamp: datetime
    user: Optional[str] = None  # username

    class Config:
        from_attributes = True


# ── Dispatch ──
class DispatchCreate(BaseModel):
    report_id: int
    hospital_name: str = "Unknown"
    hospital_lat: Optional[float] = None
    hospital_lng: Optional[float] = None
    accident_lat: Optional[float] = None
    accident_lng: Optional[float] = None
    distance_km: Optional[float] = None


class DispatchOut(BaseModel):
    id: int
    report_id: int
    hospital_name: str
    hospital_lat: Optional[float]
    hospital_lng: Optional[float]
    accident_lat: Optional[float]
    accident_lng: Optional[float]
    distance_km: Optional[float]
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class DispatchStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Dispatched|En Route|Arrived|Patient Loaded|Complete|Declined)$")


# ── Settings ──
class SettingsUpdate(BaseModel):
    yolo_model: Optional[str] = None
    confidence_threshold: Optional[int] = None
    ambulance_confidence: Optional[int] = None
    low_density_green: Optional[int] = None
    medium_density_green: Optional[int] = None
    high_density_green: Optional[int] = None
    dark_mode: Optional[bool] = None
    voice_alerts: Optional[bool] = None
    auto_dispatch: Optional[bool] = None
    data_retention: Optional[str] = None
    weather_condition: Optional[str] = None


# ── Signal Override ──
class SignalOverride(BaseModel):
    lane_id: int = Field(..., ge=0, le=3)


# ── Generic ──
class SuccessResponse(BaseModel):
    success: bool
    message: Optional[str] = None


class PaginatedResponse(BaseModel):
    records: List[Any]
    total: int
    pages: int
    current_page: int
    per_page: int
    has_next: bool
    has_prev: bool
