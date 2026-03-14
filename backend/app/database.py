"""
Traffic Vision AI — Database engine & session factory
Supports both SQLite (dev) and PostgreSQL (production).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,        # Concurrent connections (default 5 is too low for video + API)
    max_overflow=20,     # Burst capacity for peak load
    pool_recycle=1800,   # Recycle connections every 30 min (prevents stale connections)
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


def get_db():
    """FastAPI dependency — yields a DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
