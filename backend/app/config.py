"""
Traffic Vision AI — Configuration
Loads settings from .env with sensible defaults.
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # ── Database ──
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/traffic_vision_ai"

    # ── JWT Auth ──
    SECRET_KEY: str = "supersecretkey-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── App ──
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ── Model Paths ──
    BASE_DIR: str = os.path.abspath(os.path.dirname(__file__))
    MODEL_VEHICLE_PATH: str = ""
    MODEL_AMBULANCE_PATH: str = ""
    UPLOAD_FOLDER: str = ""

    # ── Traffic Logic ──
    MIN_GREEN_TIME: int = 10
    MAX_GREEN_TIME: int = 120
    YELLOW_TIME: int = 3
    DENSITY_LOW: int = 10
    DENSITY_HIGH: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def model_post_init(self, __context):
        if not self.MODEL_VEHICLE_PATH:
            self.MODEL_VEHICLE_PATH = os.path.join(self.BASE_DIR, "..", "weights", "yolov8_vehicle.pt")
        if not self.MODEL_AMBULANCE_PATH:
            self.MODEL_AMBULANCE_PATH = os.path.join(self.BASE_DIR, "..", "weights", "ambulance.pt")
        if not self.UPLOAD_FOLDER:
            self.UPLOAD_FOLDER = os.path.join(self.BASE_DIR, "uploads")
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
