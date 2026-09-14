# backend/schemas/warning_schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

class TelemetrySnapshot(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ndvi: float = Field(..., ge=-1.0, le=1.0, description="Vegetation vigor index")
    ndwi: float = Field(..., ge=-1.0, le=1.0, description="Canopy water index")
    temperature_c: float
    relative_humidity_pct: float
    rainfall_mm: float

class EarlyWarningEvaluationRequest(BaseModel):
    farmer_id: Optional[str] = "farmer_101"
    latitude: float
    longitude: float
    zone: Optional[str] = "Eastern Plateau & Hills"
    target_language: Optional[str] = "hi"
    baseline_ndvi: Optional[float] = 0.65
    telemetry_series: List[TelemetrySnapshot]

class EarlyWarningAdvisory(BaseModel):
    warning_id: str
    risk_level: str  # "LOW", "MODERATE", "HIGH", "CRITICAL"
    anomaly_detected: bool
    predicted_stress_type: Optional[str] = None
    confidence_score: float
    proactive_actions: List[str]
    spoken_advisory: str
    timestamp: datetime