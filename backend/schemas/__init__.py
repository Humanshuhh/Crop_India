from backend.schemas.common import (
    Coordinates,
    NutrientLevel,
    LanguageCode,
    AgroClimaticZoneInfo,
)
from backend.schemas.diagnosis_schemas import (
    CropDiagnosisResponse,
    EcoFriendlyRemedy,
)
from backend.schemas.soil_schemas import (
    SoilHealthCardInput,
    SoilEvaluationReport,
)
from backend.schemas.climate_schemas import (
    WeatherTelemetry,
)
from backend.schemas.advisory_schemas import (
    RegenerativeAdvisoryResponse,
    CropRecommendation,
)
# 1. ADD THIS NEW IMPORT:
from backend.schemas.auth_schemas import (
    LoginRequest,
    LoginResponse,
    AdminProfileSchema,
)

__all__ = [
    "Coordinates",
    "NutrientLevel",
    "LanguageCode",
    "AgroClimaticZoneInfo",
    "CropDiagnosisResponse",
    "EcoFriendlyRemedy",
    "SoilHealthCardInput",
    "SoilEvaluationReport",
    "WeatherTelemetry",
    "RegenerativeAdvisoryResponse",
    "CropRecommendation",
    "LoginRequest",        # <-- Added
    "LoginResponse",       # <-- Added
    "AdminProfileSchema",  # <-- Added
]
