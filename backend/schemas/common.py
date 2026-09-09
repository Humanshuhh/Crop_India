from enum import Enum
from pydantic import BaseModel, Field

class NutrientLevel(str, Enum):
    LOW = "LOW"
    OPTIMAL = "OPTIMAL"
    HIGH = "HIGH"

class LanguageCode(str, Enum):
    HINDI = "hi"
    ENGLISH = "en"
    MARATHI = "mr"
    GUJARATI = "gu"
    TELUGU = "te"
    BENGALI = "bn"

class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of the field")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of the field")

class AgroClimaticZoneInfo(BaseModel):
    zone_id: str = Field(..., description="Zone identifier")
    zone_name: str = Field(..., description="Agro-climatic zone name")
    contiguous_states: list[str] = Field(default_factory=list)
