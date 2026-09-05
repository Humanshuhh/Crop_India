"""
Diagnosis Schemas
Request and Response models for plant leaf disease computer vision diagnostics.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SeverityEnum(str, Enum):
    NONE = "None (Healthy)"
    LOW = "Low"
    MODERATE = "Moderate"
    SEVERE = "Severe"


class ImageMetadata(BaseModel):
    """Uploaded image metadata."""
    filename: str
    content_type: str
    width: int
    height: int
    file_size_bytes: int


class DiagnosisResponse(BaseModel):
    """Leaf disease diagnostic response."""
    diagnosis_id: str
    disease_name: str
    pathogen_scientific_name: Optional[str] = None
    affected_crop: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model inference confidence score (0-1)")
    severity: SeverityEnum
    symptoms_detected: List[str]
    organic_remedy: str = Field(..., description="Bio-pesticide / traditional organic treatment formulation")
    chemical_last_resort: str = Field(..., description="Controlled chemical fungicide/insecticide dosage as last resort")
    preventive_measures: List[str]
    image_metadata: ImageMetadata
    analyzed_at: datetime
