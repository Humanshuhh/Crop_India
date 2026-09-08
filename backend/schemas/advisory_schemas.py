from pydantic import BaseModel, Field
from typing import List, Optional

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
    """

    crop_name: str = Field(..., description="The name of the recommended crop")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence level (0‑1)")
    reasoning: str = Field(..., description="Why this crop is suitable")
    expected_yield_impact: Optional[str] = Field(
        None, description="Projected benefit for regenerative soil health"
    )

class RegenerativeAdvisoryResponse(BaseModel):
    """Response model for the regenerative advisory endpoint.

    Attributes
    ----------
    soil_health_score: float
        Overall soil health score (0‑100).
    recommendations: List[CropRecommendation]
        List of crop recommendations.
    regenerative_practices: List[str]
        Suggested regenerative practices (e.g., cover cropping, no‑till).
    analysis_summary: Optional[str]
        Summary of the analysis and insights.
    """

    soil_health_score: float = Field(..., ge=0, le=100, description="Soil health score (0‑100)")
    recommendations: List[CropRecommendation] = Field(
        ..., description="Recommended crops with confidence and reasoning"
    )
    regenerative_practices: List[str] = Field(
        ..., description="Suggested regenerative agronomy practices"
    )
    analysis_summary: Optional[str] = Field(
        None, description="High‑level summary of the advisory analysis"
    )
