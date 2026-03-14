"""
Traffic Vision AI — FastAPI Application Entry Point

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.models import User
from app.auth import hash_password

# ── Actual AI Modules Integration ──
from app.ai.signal_controller import SignalController
from app.ai.video_processor import VideoProcessor
from app.ai.traffic_logic import TrafficLogic
# ── Create all tables ──
Base.metadata.create_all(bind=engine)

# ── Shared instances (populated on startup) ──
signal_controller = None
video_processor = None
traffic_logic = None


# ── Lifespan: replaces deprecated @app.on_event("startup") ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler — runs setup on startup, cleanup on shutdown."""
    from app.database import SessionLocal

    # Seed admin user
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                full_name="System Administrator",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("✅ Default admin created (admin / admin123)")
        else:
            print("✅ Admin user already exists")
    finally:
        db.close()

    # Initialize AI Components
    global signal_controller, video_processor, traffic_logic
    try:
        signal_controller = SignalController(num_lanes=4)
        traffic_logic = TrafficLogic(settings)
        video_processor = VideoProcessor(config=settings, signal_controller=signal_controller)
        
        # Start streams with no initial video feeds (dummy mode until UI triggers it)
        video_processor.start_streams([None, None, None, None])
        
        # Import here to avoid circular imports at module level
        from app.routers import dashboard
        dashboard.set_runtime_refs(signal_controller, video_processor)
        print("✅ AI Components (YOLO, Signal Controller) initialized successfully")
    except Exception as e:
        print(f"⚠️ Failed to initialize AI components: {e}")
        # Setup fallbacks if models are completely missing
        signal_controller = SignalController(num_lanes=4)
        traffic_logic = TrafficLogic(settings)
        from app.routers import dashboard
        dashboard.set_runtime_refs(signal_controller, None)

    # Background signal timer
    def signal_timer_loop():
        # Fallback dummy callback if video_processor failed
        def dummy_counts():
            return {i: 0 for i in range(4)}
            
        while True:
            if signal_controller and traffic_logic:
                counts_cb = dummy_counts
                if video_processor:
                    counts_cb = lambda: {i: video_processor.get_lane_count(i) for i in range(4)}
                    
                signal_controller.update_state(
                    time.time(),
                    get_lane_counts_callback=counts_cb,
                    traffic_logic_ref=traffic_logic
                )
            time.sleep(1)

    t = threading.Thread(target=signal_timer_loop, daemon=True)
    t.start()
    print("✅ Signal controller & timer started")
    print("✅ FastAPI server ready — Swagger docs at /api/docs")

    # ── Yield control to the application ──
    yield

    # ── Shutdown cleanup (runs when server stops) ──
    print("🛑 Shutting down Traffic Vision AI...")
    if video_processor:
        try:
            video_processor.stop_all()
        except Exception:
            pass
    print("🛑 Cleanup complete")


# ── FastAPI App ──
app = FastAPI(
    title="Traffic Vision AI",
    description="Intelligent Traffic Monitoring & Analytics API",
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── CORS (allow the React dev server) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──
from app.routers import auth, dashboard, analytics, dispatch, settings as settings_router

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(dispatch.router)
app.include_router(settings_router.router)


# ── Health check with system diagnostics ──
import time as _time
_startup_time = _time.time()

@app.get("/api/health")
def health():
    uptime_secs = int(_time.time() - _startup_time)
    hours, remainder = divmod(uptime_secs, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    return {
        "status": "healthy",
        "service": "Traffic Vision AI",
        "version": "3.0.0",
        "uptime": f"{hours}h {minutes}m {seconds}s",
        "ai_components": {
            "signal_controller": signal_controller is not None,
            "video_processor": video_processor is not None,
            "active_streams": video_processor.get_active_stream_count() if video_processor else 0,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
