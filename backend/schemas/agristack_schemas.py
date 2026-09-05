"""
AgriStack UFSI & Federation Schemas
JSON-LD and GeoJSON standards for India's Unified Farmer Service Interface (UFSI)
and inter-state Agro-Climatic Digital Twin Federated Learning.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# GeoJSON & JSON-LD Schemas (AgriStack UFSI Compliance)
# ---------------------------------------------------------------------------

class GeoJSONGeometryPoint(BaseModel):
    """GeoJSON Point geometry."""
    type: str = "Point"
    coordinates: List[float] = Field(
        ..., min_length=2, max_length=2, description="[longitude, latitude]", json_schema_extra={"example": [75.7873, 26.9124]}
    )


class AgriStackAdvisoryProperties(BaseModel):
    """JSON-LD annotated properties for UFSI agro-advisory."""
    at_type: str = Field("AgroAdvisory", alias="@type")
    advisoryId: str
    farmerZoneCode: str
    stateCode: str
    districtCode: str
    validityStart: str
    validityEnd: str
    cropCode: str
    cropName: str
    soilHealthIndex: float = Field(..., ge=0, le=100)
    soilOrganicCarbonPct: float
    npkRating: Dict[str, str]
    advisoryTitle: str
    advisoryMessage: str
    recommendedIntervention: Dict[str, Any]
    regenerativeCompliance: Dict[str, Any]

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "@type": "AgroAdvisory",
                "advisoryId": "ADV-IN-RJ-2026-0841",
                "farmerZoneCode": "IN-RJ-AZ04",
                "stateCode": "RJ",
                "districtCode": "JPR",
                "validityStart": "2026-09-01T00:00:00Z",
                "validityEnd": "2026-09-15T23:59:59Z",
                "cropCode": "MHT-01",
                "cropName": "Pearl Millet (Bajra)",
                "soilHealthIndex": 78.5,
                "soilOrganicCarbonPct": 0.42,
                "npkRating": {"N": "Low", "P": "Medium", "K": "High"},
                "advisoryTitle": "Drought-Resilient Intercrop & Jeevamrutha Application",
                "advisoryMessage": "Low SOC detected. Intercrop with Pigeon Pea and apply Jeevamrutha @ 200L/acre.",
                "recommendedIntervention": {
                    "primaryCrop": "Pearl Millet (GHB-538)",
                    "intercrop": "Pigeon Pea (ICPL-87)",
                    "bioFertilizer": "Jeevamrutha + Azotobacter"
                },
                "regenerativeCompliance": {
                    "mulchingRequired": True,
                    "zeroTillageRecommended": True,
                    "chemicalFertilizerReductionPct": 40
                }
            }
        }
    }


class AgriStackGeoJSONFeature(BaseModel):
    """GeoJSON Feature conforming to AgriStack UFSI."""
    type: str = "Feature"
    id: str
    geometry: GeoJSONGeometryPoint
    properties: AgriStackAdvisoryProperties


class AgriStackFeatureCollection(BaseModel):
    """AgriStack JSON-LD GeoJSON FeatureCollection."""
    at_context: str = Field(
        "https://agristack.gov.in/contexts/v1/advisory.jsonld",
        alias="@context",
        description="AgriStack JSON-LD context URL"
    )
    type: str = "FeatureCollection"
    standard: str = "AgriStack UFSI v1.0 (Digital Public Good)"
    generatedAt: datetime
    totalFeatures: int
    features: List[AgriStackGeoJSONFeature]

    model_config = {
        "populate_by_name": True
    }


# ---------------------------------------------------------------------------
# Inter-State Digital Twin Federation Schemas
# ---------------------------------------------------------------------------

class TwinSyncRequest(BaseModel):
    """Payload for synchronizing federated model weights across agro-climatic nodes."""
    source_node_id: str = Field(..., description="Source state agro-climatic node ID", json_schema_extra={"example": "RJ-Arid-Zone-04"})
    target_node_id: str = Field(..., description="Target twin node ID for federation", json_schema_extra={"example": "GJ-Arid-Zone-02"})
    model_family: str = Field("CropYield_Regenerative_v3", description="Model architecture identifier")
    round_number: int = Field(14, ge=1, description="Federated learning training round")
    local_loss: float = Field(0.042, ge=0.0, description="Local training loss on agro-climatic twin data")
    sample_count: int = Field(12500, ge=10, description="Differential privacy sample batch size")
    agro_climatic_parameters: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {
            "mean_annual_rainfall_mm": 450.0,
            "soil_organic_carbon_mean": 0.38,
            "arid_zone_aridity_index": 0.18,
            "temperature_anomaly_c": 1.2
        },
        description="Non-PII macro agro-climatic parameters"
    )


class TwinSyncResponse(BaseModel):
    """Response returned upon successful federated model aggregation."""
    sync_id: str
    source_node_id: str
    target_node_id: str
    agro_climatic_similarity_score: float = Field(..., ge=0.0, le=1.0)
    aggregated_model_version: str
    consensus_weights_hash: str
    shared_agro_insights: List[str]
    transfer_learnings: Dict[str, Any]
    privacy_guarantee: str
    differential_privacy_budget: Dict[str, float]
    synced_at: datetime
