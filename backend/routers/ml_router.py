"""
ML Router Module
Endpoints exposing Google GenAI agricultural ML services:
- POST /api/diagnose: Multimodal leaf disease diagnosis with strict JSON schema.
- POST /api/advisory: Voice-friendly regenerative agro-advisory with Gemini tool calling.
"""

import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, File, UploadFile, Request, HTTPException, status

from backend.schemas.ml_schemas import (
    CropDiagnosisSchema,
    AdvisoryQueryRequest,
    AdvisoryQueryResponse,
)
from backend.services.ml_engine import ml_engine

logger = logging.getLogger("naarin.ml_router")

router = APIRouter(tags=["Google GenAI Agricultural ML & Voice Advisory"])


@router.post(
    "/diagnose",
    response_model=CropDiagnosisSchema,
    status_code=status.HTTP_200_OK,
    summary="Diagnose Plant Leaf Disease via Google GenAI Multimodal Vision",
    description=(
        "Accepts a crop foliage photograph (JPEG/PNG/WEBP) via multipart form-data. "
        "Supports form field keys 'file' or 'image'. "
        "Leverages Google GenAI (gemini-2.5-flash) to perform multimodal vision diagnostics, "
        "returning a strict structured JSON payload with low-cost, eco-friendly/organic remedies."
    ),
)
async def diagnose_leaf(
    file: Optional[UploadFile] = File(None, description="Plant leaf photograph (field: file)"),
    image: Optional[UploadFile] = File(None, description="Plant leaf photograph (field: image)"),
) -> CropDiagnosisSchema:
    """Diagnose plant foliage disease using Google GenAI SDK multimodal vision."""
    upload = file or image
    if not upload or not upload.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image uploaded. Please provide an image file with form field 'file' or 'image'.",
        )

    # 1. Read file bytes
    try:
        file_bytes = await upload.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded image bytes: {str(exc)}",
        )

    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty.",
        )

    # 2. File size limit safeguard (15MB)
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds maximum allowed limit of 15MB.",
        )

    # 3. Perform ML inference
    try:
        diagnosis_dict = ml_engine.diagnose_crop_disease(
            image_bytes=file_bytes,
            filename=upload.filename,
        )
        return CropDiagnosisSchema(**diagnosis_dict)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error during crop disease diagnosis: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during disease diagnosis: {str(exc)}",
        )


@router.post(
    "/advisory",
    response_model=AdvisoryQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Voice-Friendly Regenerative Agro-Advisory with Tool Calling",
    description=(
        "Accepts a farmer natural language query, district name, and optional prior leaf diagnosis payload. "
        "Supports both application/json (json=payload) and form data (data=payload). "
        "Ingests scientific datasets (Soil Health Cards, IMD weather forecasts, ISRO Bhuvan satellite indices) "
        "via Gemini function calling tools to synthesize concise, voice-ready regenerative farming advice."
    ),
)
async def generate_advisory(request: Request) -> AdvisoryQueryResponse:
    """Generate synthesized regenerative farming advisory for smallholders."""
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body = await request.json()
        else:
            form = await request.form()
            body = dict(form)
            if "diagnosis" in body and isinstance(body["diagnosis"], str):
                try:
                    body["diagnosis"] = json.loads(body["diagnosis"])
                except Exception:
                    pass

        req_data = AdvisoryQueryRequest(**body)

        advisory_text = ml_engine.generate_farmer_advisory(
            user_query=req_data.query,
            district=req_data.district,
            diagnosis=req_data.diagnosis,
        )

        source_model = (
            "gemini-2.5-flash (Google GenAI Live)"
            if ml_engine.is_live()
            else "gemini-2.5-flash (Domain Agro-Climatic Synthesis Engine)"
        )

        tools_invoked = [
            "soil_health_card (NPK, SOC, pH)",
            "imd_open_meteo (14-day climate & moisture)",
            "isro_bhuvan (NDVI & Agro-Twin Corridor)",
        ]

        return AdvisoryQueryResponse(
            advisory=advisory_text,
            district=req_data.district.title(),
            source_model=source_model,
            tools_invoked=tools_invoked,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error generating farmer advisory: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate farmer advisory: {str(exc)}",
        )
