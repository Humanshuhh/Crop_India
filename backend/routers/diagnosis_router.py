"""
Diagnosis Router
Multipart image upload endpoints for plant leaf disease computer vision diagnostics.
"""

import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from backend.schemas.diagnosis_schemas import DiagnosisResponse
from backend.services.vision_service import vision_service

logger = logging.getLogger("naarin.diagnosis_router")
router = APIRouter(prefix="/diagnosis", tags=["Leaf Disease Vision Diagnostics"])


@router.post(
    "/predict",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_200_OK,
    summary="Diagnose Plant Leaf Disease from Photo",
    description=(
        "Accepts a crop foliage photograph (JPEG/PNG/WEBP) via multipart form-data. "
        "Performs computer vision inference for common pathologies (Late Blight, Brown Spot, "
        "Leaf Curl, Yellow Rust, etc.) and provides organic remedies along with chemical last resorts."
    ),
)
async def predict_plant_disease(
    file: UploadFile = File(..., description="Crop leaf photo file (JPEG, PNG, WEBP)"),
) -> DiagnosisResponse:
    """Run leaf disease diagnostic inference on uploaded image."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload payload.",
        )

    # Read image bytes
    try:
        file_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded image bytes: {str(exc)}",
        )

    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Max size safeguard (15MB)
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds maximum allowed limit of 15MB.",
        )

    try:
        diagnosis = vision_service.diagnose_image(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "image/jpeg",
        )
        return diagnosis
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error executing disease diagnostic: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during disease diagnosis: {str(exc)}",
        )
