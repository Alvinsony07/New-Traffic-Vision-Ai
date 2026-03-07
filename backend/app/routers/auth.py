"""
Auth Router — Login, Register, Profile
"""
from datetime import datetime
from collections import defaultdict
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AuditLog
from ..schemas import UserCreate, UserLogin, Token, UserOut
from ..auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ── In-memory rate limiter ──
_login_attempts: dict = defaultdict(list)
LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = 300  # 5 minutes


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < LOGIN_RATE_WINDOW]
    return len(_login_attempts[ip]) >= LOGIN_RATE_LIMIT


def _record_attempt(ip: str):
    _login_attempts[ip].append(time.time())


def _audit(db: Session, action: str, details: str, user_id: int = None, ip: str = None):
    entry = AuditLog(action=action, details=details, user_id=user_id, ip_address=ip)
    db.add(entry)
    try:
        db.commit()
    except Exception:
        db.rollback()


# ──────────────────────────────────────
#  POST /api/auth/register
# ──────────────────────────────────────
@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # Check uniqueness
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        organization=payload.organization,
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ──────────────────────────────────────
#  POST /api/auth/login
# ──────────────────────────────────────
@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host

    if _is_rate_limited(client_ip):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")

    _record_attempt(client_ip)

    user = db.query(User).filter(User.username == payload.username).first()

    # Locked account
    if user and user.is_locked:
        raise HTTPException(status_code=403, detail="Account locked. Contact admin.")

    if not user or not verify_password(payload.password, user.password_hash):
        # Track failed attempts
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.is_locked = True
            db.commit()
        _audit(db, "login_failed", f"Failed login for: {payload.username}", ip=client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Success — reset counters
    user.failed_login_attempts = 0
    db.commit()
    _login_attempts.pop(client_ip, None)

    _audit(db, "login_success", f"User {user.username} logged in", user_id=user.id, ip=client_ip)

    token = create_access_token(data={"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


# ──────────────────────────────────────
#  GET /api/auth/me
# ──────────────────────────────────────
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
