from pydantic import BaseModel, Field
from backend.schemas.common import Coordinates

class WeatherTelemetry(BaseModel):
    """Meteorological data required for advisory generation.

    Attributes
    ----------
    coordinates: Coordinates
        Geographic location of the field.
    rainfall_14d_sum_mm: float
        Cumulative rainfall over the last 14 days (in millimetres).
    mean_temp_celsius: float
        Average temperature over the period (°C).
    relative_humidity_pct: float
        Average relative humidity (percentage).
    drought_risk_index: str
        Categorical drought risk, e.g., "LOW", "MODERATE", "HIGH".
    sowing_window_open: bool
        Indicates whether the current sowing window is suitable.
    """

    coordinates: Coordinates = Field(..., description="Geographic location of the field")
    rainfall_14d_sum_mm: float = Field(..., ge=0, description="Cumulative 14‑day rainfall (mm)")
    mean_temp_celsius: float = Field(..., description="Mean temperature (°C)")
    relative_humidity_pct: float = Field(..., ge=0, le=100, description="Relative humidity (%)")
    drought_risk_index: str = Field(..., description="Drought risk category")
    sowing_window_open: bool = Field(..., description="Is sowing window currently open")