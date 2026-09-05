"""
ML Schemas Module
Request and response models for Google GenAI agricultural ML module.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CropDiagnosisSchema(BaseModel):
    """Strict structured output schema for crop leaf disease diagnosis."""

    crop_name: str = Field(
        ...,
        description="Identified host crop name (e.g. Tomato, Wheat, Rice / Paddy, Cotton, Pearl Millet)",
        json_schema_extra={"example": "Tomato"},
    )
    disease_detected: str = Field(
        ...,
        description="Identified disease or pathology name, or 'Healthy / No Disease'",
        json_schema_extra={"example": "Tomato Late Blight"},
    )
    pathogen_type: str = Field(
        ...,
        description="Classification of pathogen (e.g. Fungal (Oomycete), Viral, Bacterial, Physiological, None)",
        json_schema_extra={"example": "Fungal (Oomycete)"},
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model diagnostic confidence score between 0.0 and 1.0",
        json_schema_extra={"example": 0.95},
    )
    symptoms: List[str] = Field(
        ...,
        description="Observable diagnostic symptoms on foliage, stems, or fruit",
        json_schema_extra={
            "example": [
                "Dark water-soaked lesions on leaf margins",
                "Velvety white fungal spore growth on underside of leaves",
            ]
        },
    )
    eco_friendly_remedies: List[str] = Field(
        ...,
        description="Low-cost, organic and biological remedies (e.g. Neem oil, Cow urine spray, Trichoderma, Jeevamrutha)",
        json_schema_extra={
            "example": [
                "Foliar spray of Neem oil (3000 ppm) @ 5ml/L water with liquid soap emulsifier.",
                "Spray fermented Cow Urine (Gomutra) 10% solution + 1g Hing (Asafoetida) every 7 days.",
                "Apply bio-fungicide Trichoderma viride @ 5g/L water in evening hours.",
            ]
        },
    )
    urgency: str = Field(
        ...,
        description="Treatment urgency level: Immediate (within 24 hours), Moderate (2-3 days), Low / Preventive, or None",
        json_schema_extra={"example": "Immediate (within 24 hours)"},
    )


class AdvisoryQueryRequest(BaseModel):
    """Input payload for generating voice-friendly farmer advisory."""

    query: str = Field(
        ...,
        min_length=2,
        description="Farmer's natural language question or issue",
        json_schema_extra={
            "example": "Monsoon is delayed by 3 weeks and topsoil is dry. What drought-hardy crop should I sow, and how do I enrich soil organic matter?"
        },
    )
    district: str = Field(
        ...,
        min_length=2,
        description="District name in India (e.g., Jaipur, Nagpur, Ludhiana, Rajkot, Varanasi)",
        json_schema_extra={"example": "Jaipur"},
    )
    diagnosis: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional diagnostic payload from a prior leaf photo scan",
        json_schema_extra={
            "example": {
                "crop_name": "Tomato",
                "disease_detected": "Tomato Late Blight",
                "pathogen_type": "Fungal (Oomycete)",
                "confidence": 0.95,
                "urgency": "Immediate (within 24 hours)",
            }
        },
    )


class AdvisoryQueryResponse(BaseModel):
    """Synthesized farmer advisory response."""

    advisory: str = Field(
        ...,
        description="Actionable, voice-ready regenerative farming advisory tailored for marginal smallholders",
    )
    district: str = Field(..., description="Target district analyzed")
    source_model: str = Field(
        ..., description="Model or engine that generated the advisory (e.g. gemini-2.5-flash)"
    )
    tools_invoked: List[str] = Field(
        default_factory=list,
        description="Scientific data tools invoked during synthesis (e.g. soil_health_card, imd_weather, isro_bhuvan)",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of advisory generation",
    )
