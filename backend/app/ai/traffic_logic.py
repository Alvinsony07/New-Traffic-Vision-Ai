from ..database import SessionLocal
import json
from ..models import SystemSetting

class TrafficLogic:
    def __init__(self, config):
        self.config = config

    def _get_settings(self):
        """Fetch settings from DB or use defaults"""
        # Defaults
        settings = {
            "low_density_green": self.config.MIN_GREEN_TIME,
            "medium_density_green": 30, # default from settings
            "high_density_green": self.config.MAX_GREEN_TIME,
            "weather_condition": "Clear",
        }
        
        try:
            with SessionLocal() as db:
                rows = db.query(SystemSetting).all()
                for row in rows:
                    try:
                        settings[row.key] = json.loads(row.value)
                    except (json.JSONDecodeError, TypeError, ValueError):
                        settings[row.key] = row.value
        except Exception as e:
            print(f"Error fetching settings in TrafficLogic: {e}")
            
        return settings

    def calculate_green_time(self, vehicle_count):
        """
        Calculates adaptive green-light duration based on real-time vehicle density
        and weather conditions.
        """
        settings = self._get_settings()
        
        min_t = int(settings.get("low_density_green", self.config.MIN_GREEN_TIME))
        med_t = int(settings.get("medium_density_green", 30))
        max_t = int(settings.get("high_density_green", self.config.MAX_GREEN_TIME))
        high_thresh = self.config.DENSITY_HIGH
        low_thresh = self.config.DENSITY_LOW

        weather = settings.get("weather_condition", "Clear")
        
        # Weather multipliers (Adverse weather requires longer green times to clear traffic safely)
        multipliers = {
            "Clear": 1.0,
            "Rain": 1.25,
            "Fog": 1.35,
            "Snow": 1.5,
        }
        multiplier = multipliers.get(weather, 1.0)
        
        if vehicle_count <= 0:
            duration = min_t
        elif vehicle_count <= low_thresh:
            # Interpolate between min_t and med_t
            ratio = vehicle_count / (low_thresh if low_thresh > 0 else 1)
            duration = min_t + (med_t - min_t) * ratio
        else:
            # Interpolate between med_t and max_t
            clamped_count = min(vehicle_count, high_thresh)
            range_val = high_thresh - low_thresh
            if range_val <= 0:
                duration = max_t
            else:
                ratio = (clamped_count - low_thresh) / range_val
                duration = med_t + (max_t - med_t) * ratio
        
        # Apply weather multiplier
        duration = int(duration * multiplier)
        
        # We can cap it at max_t * multiplier to allow weather to slightly exceed normal max_t,
        # but let's just cap the overall duration at 180s for safety limit.
        return max(min_t, min(int(duration), 180))

    def get_density_label(self, vehicle_count):
        if vehicle_count >= self.config.DENSITY_HIGH:
            return "High"
        elif vehicle_count >= self.config.DENSITY_LOW:
            return "Medium"
        else:
            return "Low"
