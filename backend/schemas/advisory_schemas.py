"""
Advisory Schemas
Request and Response models for crop recommendations and regenerative agronomy.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class NutrientRating(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class SeasonEnum(str, Enum):
    KHARIF = "Kharif"
    RABI = "Rabi"
    ZAID = "Zaid"
    PERENNIAL = "Perennial"


class IrrigationSourceEnum(str, Enum):
    RAINFED = "Rainfed"
    CANAL = "Canal"
    BOREWELL = "Borewell"
    DRIP = "Drip"
    SPRINKLER = "Sprinkler"


class SoilCustomOverride(BaseModel):
    """Optional user-supplied Soil Health Card overrides."""
    nitrogen_kg_ha: Optional[float] = Field(None, ge=0, le=1000, description="Nitrogen in kg/ha")
    phosphorus_kg_ha: Optional[float] = Field(None, ge=0, le=300, description="Phosphorus in kg/ha")
    potassium_kg_ha: Optional[float] = Field(None, ge=0, le=1000, description="Potassium in kg/ha")
    organic_carbon_pct: Optional[float] = Field(None, ge=0.0, le=10.0, description="Soil Organic Carbon %")
    ph: Optional[float] = Field(None, ge=3.0, le=11.0, description="Soil pH level")
    soil_type: Optional[str] = Field(None, description="Custom soil type name")


class AdvisoryRequest(BaseModel):
    """Input payload for generating agro-advisory recommendations."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Farm centroid latitude", json_schema_extra={"example": 26.9124})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Farm centroid longitude", json_schema_extra={"example": 75.7873})
    state: Optional[str] = Field(None, description="Indian State name", json_schema_extra={"example": "Rajasthan"})
    district: Optional[str] = Field(None, description="District name", json_schema_extra={"example": "Jaipur"})
    current_crop: Optional[str] = Field(None, description="Current or previously harvested crop", json_schema_extra={"example": "Wheat"})
    season: Optional[SeasonEnum] = Field(SeasonEnum.KHARIF, description="Upcoming cropping season")
    farm_size_acres: Optional[float] = Field(2.5, ge=0.1, le=10000.0, description="Farm size in acres")
    irrigation_source: Optional[IrrigationSourceEnum] = Field(
        IrrigationSourceEnum.RAINFED, description="Primary irrigation method"
    )
    soil_override: Optional[SoilCustomOverride] = Field(
        None, description="Explicit Soil Health Card metrics if known"
    )


class WeatherSummary(BaseModel):
    """14-day weather forecast and moisture summary."""
    rainfall_14d_sum_mm: float = Field(..., description="14-day cumulative rainfall in mm")
    temp_2m_max_avg_c: float = Field(..., description="14-day average maximum temperature (°C)")
    temp_2m_min_avg_c: float = Field(..., description="14-day average minimum temperature (°C)")
    topsoil_moisture_avg_m3m3: float = Field(..., description="Topsoil (0-1cm) moisture in m³/m³")
    drought_risk: bool = Field(..., description="True if precipitation and moisture indicate drought stress")
    heatwave_risk: bool = Field(..., description="True if max temperature exceeds regional thresholds")
    forecast_source: str = Field("Open-Meteo", description="Data provider or fallback mode")


class SoilHealthProfile(BaseModel):
    """Soil physical and chemical properties."""
    zone_name: str
    soil_type: str
    nitrogen_kg_ha: float
    nitrogen_rating: NutrientRating
    phosphorus_kg_ha: float
    phosphorus_rating: NutrientRating
    potassium_kg_ha: float
    potassium_rating: NutrientRating
    organic_carbon_pct: float
    ph: float
    electrical_conductivity_dsm: float
    soil_health_card_id: str
    is_custom_override: bool = False


class CropRecommendation(BaseModel):
    """Detailed crop option with economic and regenerative indices."""
    crop_name: str
    scientific_name: str
    variety_recommendation: str
    suitability_score: int = Field(..., ge=0, le=100, description="Suitability index 0-100")
    reasoning: str
    water_requirement: str
    growth_duration_days: int
    expected_yield_quintals_per_acre: float
    estimated_profit_per_acre_inr: float
    is_nitrogen_fixer: bool = False
    is_drought_tolerant: bool = False


class BioFertilizerRecommendation(BaseModel):
    """Natural bio-fertilizer and microbial inoculant recommendations."""
    name: str
    category: str
    dosage: str
    application_stage: str
    targeted_benefit: str


class RegenerativePractice(BaseModel):
    """Actionable sustainable agronomy practices."""
    title: str
    description: str
    priority: str = Field(..., description="High, Medium, Recommended")
    expected_co2_sequestration_kg_acre: float
    water_conservation_impact: str


class SoilRestorationScore(BaseModel):
    """Composite score measuring restoration and soil health."""
    total_score: int = Field(..., ge=0, le=100, description="Overall restoration index 0-100")
    organic_matter_score: int = Field(..., ge=0, le=100)
    nutrient_balance_score: int = Field(..., ge=0, le=100)
    biological_activity_score: int = Field(..., ge=0, le=100)
    resilience_grade: str = Field(..., description="Grade: A+ (Regenerative Leader) down to D (Degraded)")


class LocationContext(BaseModel):
    """Resolved geographic context for the farm."""
    latitude: float
    longitude: float
    state: str
    district: str
    agro_climatic_zone: str


class AdvisoryResponse(BaseModel):
    """Complete NAARIN Agro-Advisory Package."""
    advisory_id: str
    location_context: LocationContext
    weather_summary: WeatherSummary
    soil_profile: SoilHealthProfile
    recommended_crops: List[CropRecommendation]
    crop_rotation_plan: List[str]
    bio_fertilizers: List[BioFertilizerRecommendation]
    regenerative_practices: List[RegenerativePractice]
    soil_restoration_score: SoilRestorationScore
    risk_advisories: List[str]
    carbon_sequestration_potential_kg_ha_yr: float
    water_savings_potential_pct: float
    generated_at: datetime
