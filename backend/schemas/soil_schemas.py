from typing import List, Optional
from pydantic import BaseModel, Field


class SoilHealthInput(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Field latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Field longitude")
    ph: Optional[float] = Field(default=7.0, description="Soil pH value")
    organic_carbon_percent: Optional[float] = Field(
        default=0.45, description="Soil Organic Carbon percentage (SOC %)"
    )
    nitrogen_kg_ha: Optional[float] = Field(
        default=210.0, description="Available Nitrogen (kg/ha)"
    )
    phosphorus_kg_ha: Optional[float] = Field(
        default=14.0, description="Available Phosphorus (kg/ha)"
    )
    potassium_kg_ha: Optional[float] = Field(
        default=160.0, description="Available Potassium (kg/ha)"
    )
    zinc_ppm: Optional[float] = Field(
        default=0.50, description="Available Zinc (ppm)"
    )


# Backward-compatible alias
SoilHealthCardInput = SoilHealthInput


class BiologicalConditioningAction(BaseModel):
    amendment_name: str = Field(
        ..., description="Organic amendment (e.g., Dhaincha green manuring, Vermicompost, PSB)"
    )
    application_rate: str = Field(
        ..., description="Dosage per acre or hectare with field preparation steps"
    )
    purpose: str = Field(
        ..., description="Agronomic purpose (e.g., restore active carbon, unlock bound phosphorus)"
    )


class RegenerativeAdvisoryResponse(BaseModel):
    zone_name: str = Field(..., description="Resolved cross-border Agro-Climatic Zone")
    soil_health_summary: str = Field(
        ..., description="Plain-language diagnosis of soil condition and critical deficits"
    )
    is_critically_degraded: bool = Field(
        ..., description="True if Soil Organic Carbon is severely depleted (<0.50%)"
    )
    biological_amendments: List[BiologicalConditioningAction] = Field(
        default_factory=list,
        description="Non-chemical biological solutions to rebuild soil fertility"
    )
    crop_rotation_recommendations: List[str] = Field(
        default_factory=list,
        description="Climate-resilient crops (millets/pulses) to break monoculture cycles"
    )
    sowing_window_advice: str = Field(
        ..., description="Sowing timing guided by satellite moisture and rainfall outlook"
    )
    localized_voice_script: str = Field(
        ..., description="Simple, jargon-free voice-first spoken advice script for the farmer"
    )


# Backward-compatible alias
SoilEvaluationReport = RegenerativeAdvisoryResponse
