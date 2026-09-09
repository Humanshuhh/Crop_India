from typing import List, Optional
from pydantic import BaseModel, Field


class BioAmendmentItem(BaseModel):
    """Represents a non-chemical, biological, or organic soil input."""
    name: str = Field(..., description="Name of the bio-fertilizer or organic amendment (e.g., Jeevamrit, Azotobacter, PSB)")
    target_deficiency: str = Field(..., description="Soil parameter targeted (e.g., Soil Organic Carbon, Nitrogen fixation)")
    application_method: str = Field(..., description="Dosage and method (e.g., soil drenching, broadcasting with FYM, seed treatment)")


class CropRecommendation(BaseModel):
    """Represents a single crop recommendation.

    Attributes
    ----------
    crop_name: str
        Name of the recommended crop.
    confidence_score: float
        Confidence level (0.0 to 1.0) of this recommendation.
    reasoning: str
        Explanation why this crop is suitable based on soil and climate data.
    expected_yield_impact: Optional[str]
        Projected benefit for regenerative soil health or yield improvement.
    ecological_role: Optional[str]
        Role in breaking monoculture (e.g., Nitrogen fixation, drought tolerance, biomass addition).
    """

    crop_name: str = Field(..., description="The name of the recommended crop (e.g., Millets, Pulses, Green Manure)")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence level (0.0 to 1.0)")
    reasoning: str = Field(..., description="Why this crop is suitable based on soil and climate data")
    expected_yield_impact: Optional[str] = Field(
        None, description="Projected benefit for regenerative soil health or yield improvement"
    )
    ecological_role: Optional[str] = Field(
        default=None,
        description="Ecological role (e.g., nitrogen fixation, drought resilience, breaking monoculture)"
    )


class RegenerativeAdvisoryResponse(BaseModel):
    """Response model for the regenerative advisory endpoint.

    Attributes
    ----------
    soil_health_score: float
        Overall soil health score (0-100).
    recommendations: List[CropRecommendation]
        List of climate-resilient crop recommendations.
    regenerative_practices: List[str]
        Suggested regenerative practices (e.g., cover cropping, no-till, mulching).
    chemical_free_warning: str
        Notice enforcing elimination of synthetic chemical inputs (Urea, DAP).
    bio_amendments: List[BioAmendmentItem]
        Prescribed biological amendments to replenish organic carbon and nutrients.
    analysis_summary: Optional[str]
        Summary of the analysis and agronomic insights.
    spoken_summary: Optional[str]
        Conversational advisory script tailored for regional voice-first TTS playback.
    """

    soil_health_score: float = Field(..., ge=0, le=100, description="Soil health score (0-100)")
    recommendations: List[CropRecommendation] = Field(
        default_factory=list, description="Recommended crops with confidence and reasoning"
    )
    regenerative_practices: List[str] = Field(
        default_factory=list, description="Suggested regenerative agronomy practices"
    )
    chemical_free_warning: str = Field(
        default="Zero synthetic chemical fertilizers/pesticides recommended. Rebuilding biological soil food web.",
        description="Explicit notice regarding synthetic chemicals"
    )
    bio_amendments: List[BioAmendmentItem] = Field(
        default_factory=list,
        description="Biological and organic soil amendments replacing synthetic chemicals"
    )
    analysis_summary: Optional[str] = Field(
        None, description="High-level summary of the advisory analysis"
    )
    spoken_summary: Optional[str] = Field(
        default=None,
        description="Conversational audio script in farmer's regional dialect for low-literacy playback"
    )