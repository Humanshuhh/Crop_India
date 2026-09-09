from typing import List, Optional
from pydantic import BaseModel, Field


class EcoFriendlyRemedy(BaseModel):
    title: str = Field(..., description="Name of the organic/biological solution")
    preparation: str = Field(..., description="How to prepare the organic solution at farm level")
    application: str = Field(..., description="Specific spray timing, dosage per liter, and application frequency")


class CropDiagnosisResponse(BaseModel):
    is_plant_detected: bool = Field(..., description="True if a crop leaf/foliage is visible, False if unrelated image")
    crop_name: Optional[str] = Field(None, description="Identified crop species")
    detected_condition: str = Field(..., description="Name of disease, nutrient chlorosis, or pest infection")
    confidence_level: str = Field(..., description="HIGH, MEDIUM, or LOW based on visual symptom clarity")
    visual_symptoms: List[str] = Field(default_factory=list, description="Observed lesions, pustules, discolorations, or curling")
    underlying_cause: str = Field(..., description="Pathogen type or abiotic stress")
    eco_friendly_remedies: List[EcoFriendlyRemedy] = Field(
        default_factory=list,
        description="Biological and low-cost eco-friendly treatments strictly avoiding toxic chemicals"
    )
    preventive_cultural_practices: List[str] = Field(
        default_factory=list,
        description="Field sanitation, spacing, bio-mulching, or crop rotation"
    )
    spoken_summary: str = Field(
        ..., description="Direct, conversational diagnosis script for the farmer"
    )
