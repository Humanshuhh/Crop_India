from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Base Soil Input Model
class SoilHealthCardInput(BaseModel):
    """Input payload representing Soil Health Card metrics."""
    nitrogen_n: Optional[float] = Field(default=None, description="Available Nitrogen (kg/ha)")
    phosphorus_p: Optional[float] = Field(default=None, description="Available Phosphorus (kg/ha)")
    potassium_k: Optional[float] = Field(default=None, description="Available Potassium (kg/ha)")
    organic_carbon_pct: float = Field(default=0.45, description="Soil Organic Carbon percentage")
    ph: float = Field(default=7.0, description="Soil pH level")
    electrical_conductivity: Optional[float] = Field(default=None, description="EC in dS/m")
    sulfur_s: Optional[float] = Field(default=None, description="Available Sulfur (ppm)")
    zinc_zn: Optional[float] = Field(default=None, description="Available Zinc (ppm)")
    iron_fe: Optional[float] = Field(default=None, description="Available Iron (ppm)")
    soil_texture: str = Field(default="Sandy Loam", description="Physical soil texture classification")
    target_crop: Optional[str] = Field(default=None, description="Current or intended crop")
    state: Optional[str] = Field(default=None, description="State or region")
    district: Optional[str] = Field(default=None, description="District name")

# Alias for backward compatibility
SoilHealthInput = SoilHealthCardInput

class SoilEvaluationReport(BaseModel):
    """Evaluation summary returned by the soil telemetry router."""
    soil_health_score: float = Field(default=75.0, description="Calculated soil score (0-100)")
    organic_carbon_status: str = Field(default="Deficient", description="SOC evaluation")
    ph_status: str = Field(default="Neutral", description="Soil pH evaluation")
    nutrient_status: Dict[str, Any] = Field(default_factory=dict, description="NPK status breakdown")
    agro_climatic_zone: str = Field(default="Eastern Plateau & Hills", description="Regional corridor")
    recommendations: List[str] = Field(default_factory=list, description="Agronomic insights")

class BioAmendment(BaseModel):
    name: str = Field(..., description="Name of organic or biological amendment (e.g., Jeevamrit, Trichoderma, Azotobacter)")
    target_deficiency: str = Field(..., description="Deficiency targeted (e.g., Low Organic Carbon, Nitrogen, Fungal Inoculation)")
    preparation_or_sourcing: str = Field(..., description="How to prepare on-farm or source locally")
    dosage_and_application: str = Field(..., description="Application method (soil drench, seed treatment, broadcasting)")

class CropRotationCycle(BaseModel):
    season: str = Field(..., description="Kharif, Rabi, or Zaid")
    recommended_crop: str = Field(..., description="Climate-resilient crop (e.g., Pearl Millet / Bajra, Chickpea, Dhaincha)")
    ecological_role: str = Field(..., description="Nitrogen fixation, deep root aeration, weed suppression, or biomass addition")
    water_requirement: str = Field(..., description="Low, Moderate, or High")

class RegenerativeActionPlan(BaseModel):
    soil_health_assessment: str = Field(..., description="Status of Soil Organic Carbon and texture")
    synthetic_chemical_alert: str = Field(
        default="Zero synthetic chemical fertilizers/pesticides recommended. Rebuilding biological soil food web.",
        description="Explicit notice regarding synthetic chemicals"
    )
    biological_amendments: List[BioAmendment] = Field(default_factory=list, description="List of natural amendments")
    regenerative_crop_rotations: List[CropRotationCycle] = Field(default_factory=list, description="Soil-rebuilding crop schedule")
    cultural_water_practices: List[str] = Field(default_factory=list, description="Mulching, contour bunding, cover cropping, minimum tillage")
    spoken_summary: str = Field(..., description="Conversational audio script in farmer's regional dialect")

# Alias for backward compatibility with older routes
RegenerativeAdvisoryResponse = RegenerativeActionPlan
