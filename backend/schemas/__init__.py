"""
NAARIN Schemas Package
"""

from backend.schemas.advisory_schemas import (
    NutrientRating,
    SeasonEnum,
    IrrigationSourceEnum,
    SoilCustomOverride,
    AdvisoryRequest,
    WeatherSummary,
    SoilHealthProfile,
    CropRecommendation,
    BioFertilizerRecommendation,
    RegenerativePractice,
    SoilRestorationScore,
    LocationContext,
    AdvisoryResponse,
)
from backend.schemas.diagnosis_schemas import (
    SeverityEnum,
    ImageMetadata,
    DiagnosisResponse,
)
from backend.schemas.agristack_schemas import (
    GeoJSONGeometryPoint,
    AgriStackAdvisoryProperties,
    AgriStackGeoJSONFeature,
    AgriStackFeatureCollection,
    TwinSyncRequest,
    TwinSyncResponse,
)

from backend.schemas.ml_schemas import (
    CropDiagnosisSchema,
    AdvisoryQueryRequest,
    AdvisoryQueryResponse,
)

__all__ = [
    "NutrientRating",
    "SeasonEnum",
    "IrrigationSourceEnum",
    "SoilCustomOverride",
    "AdvisoryRequest",
    "WeatherSummary",
    "SoilHealthProfile",
    "CropRecommendation",
    "BioFertilizerRecommendation",
    "RegenerativePractice",
    "SoilRestorationScore",
    "LocationContext",
    "AdvisoryResponse",
    "SeverityEnum",
    "ImageMetadata",
    "DiagnosisResponse",
    "GeoJSONGeometryPoint",
    "AgriStackAdvisoryProperties",
    "AgriStackGeoJSONFeature",
    "AgriStackFeatureCollection",
    "TwinSyncRequest",
    "TwinSyncResponse",
    "CropDiagnosisSchema",
    "AdvisoryQueryRequest",
    "AdvisoryQueryResponse",
]

