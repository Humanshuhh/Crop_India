"""
Advisory Router
Endpoints for generating agro-climatic crop recommendations and regenerative agronomy advisories.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from backend.schemas.advisory_schemas import AdvisoryRequest, AdvisoryResponse
from backend.services.weather_service import weather_service
from backend.services.soil_service import soil_service
from backend.services.regenerative_engine import regenerative_engine

logger = logging.getLogger("naarin.advisory_router")
router = APIRouter(prefix="/advisory", tags=["Agro-Advisory & Crop Recommendation"])


@router.post(
    "/recommend",
    response_model=AdvisoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Regenerative Crop Recommendations & Agro-Advisory",
    description=(
        "Accepts farmer GPS coordinates, cropping season, and optional soil card overrides. "
        "Integrates 14-day Open-Meteo climate forecasts with Indian Soil Health Card profiles "
        "to deliver sustainable crop rotations, bio-fertilizer schedules, and a 0-100 Soil Restoration Score."
    ),
)
async def generate_crop_advisory(request: AdvisoryRequest) -> AdvisoryResponse:
    """Generate hyper-local crop and regenerative farming advisory."""
    try:
        # 1. Resolve geographic context
        location = soil_service.resolve_location(
            lat=request.latitude,
            lon=request.longitude,
            state=request.state,
            district=request.district,
        )

        # 2. Fetch 14-day weather forecast (with zero-crash offline fallback)
        weather = await weather_service.get_14day_forecast(
            latitude=request.latitude, longitude=request.longitude
        )

        # 3. Retrieve or override Soil Health Card profile
        soil = soil_service.get_soil_profile(
            lat=request.latitude,
            lon=request.longitude,
            override=request.soil_override,
        )

        # 4. Execute regenerative decision matrix and scoring engine
        advisory = regenerative_engine.generate_advisory(
            request=request,
            weather=weather,
            soil=soil,
            location=location,
        )

        return advisory

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating crop advisory: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate agro-advisory: {str(exc)}",
        )
