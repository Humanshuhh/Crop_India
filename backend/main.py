"""
NAARIN - National Agro-Advisory & Regenerative Intelligence Network
FastAPI Main Application Entrypoint
Digital Public Good adhering to India's AgriStack UFSI Standards
Integrated with Google GenAI SDK (gemini-2.5-flash)
"""

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routers import (
    advisory_router,
    diagnosis_router,
    agristack_router,
    federation_router,
    ml_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("naarin.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    logger.info("=" * 70)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"AgriStack UFSI Standards Active: {settings.AGRISTACK_CONTEXT_URL}")
    logger.info(f"Open-Meteo Integration Endpoint: {settings.OPEN_METEO_BASE_URL}")
    logger.info(f"Google GenAI Engine Model: {settings.GEMINI_MODEL}")
    logger.info("=" * 70)
    yield
    logger.info(f"Shutting down {settings.APP_NAME}. Clean exit.")


# Initialize FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {
            "name": "Google GenAI Agricultural ML & Voice Advisory",
            "description": "Multimodal leaf disease diagnosis and voice-friendly regenerative advisories using gemini-2.5-flash and scientific data tools.",
        },
        {
            "name": "Agro-Advisory & Crop Recommendation",
            "description": "Hyper-local regenerative crop recommendations and Soil Health Card agronomy optimization.",
        },
        {
            "name": "Leaf Disease Vision Diagnostics",
            "description": "Computer vision diagnostic engine for plant foliage diseases with organic and chemical remedies.",
        },
        {
            "name": "AgriStack UFSI Open Standards",
            "description": "GeoJSON & JSON-LD interoperable endpoints conforming to India's AgriStack Unified Farmer Service Interface.",
        },
        {
            "name": "Inter-State Federated Learning Twins",
            "description": "Privacy-preserving machine learning model aggregation across agro-climatic digital twin nodes.",
        },
    ],
)

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Mount Routers
# Mount ML Router at /api (e.g. /api/diagnose and /api/advisory) and /api/v1 prefix
app.include_router(ml_router, prefix="/api")
app.include_router(ml_router, prefix=settings.API_V1_PREFIX)

# Mount Domain & Standard Routers under API v1 prefix
app.include_router(advisory_router, prefix=settings.API_V1_PREFIX)
app.include_router(diagnosis_router, prefix=settings.API_V1_PREFIX)
app.include_router(agristack_router, prefix=settings.API_V1_PREFIX)
app.include_router(federation_router, prefix=settings.API_V1_PREFIX)


@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Root Discovery Endpoint",
    tags=["System Status"],
)
async def root() -> Dict[str, Any]:
    """Root metadata & service discovery."""
    return {
        "network": "NAARIN - National Agro-Advisory & Regenerative Intelligence Network",
        "standard": "India AgriStack UFSI v1.0 Compliant",
        "version": settings.APP_VERSION,
        "status": "operational",
        "environment": settings.ENVIRONMENT,
        "ai_module": {
            "sdk": "google-genai",
            "model": settings.GEMINI_MODEL,
            "target_beneficiaries": "Marginal Indian Smallholders (<2 hectares)",
        },
        "endpoints": {
            "documentation": "/docs",
            "redoc": "/redoc",
            "openapi_schema": "/openapi.json",
            "genai_crop_diagnose": "/api/diagnose",
            "genai_farmer_advisory": "/api/advisory",
            "agro_advisory_recommend": f"{settings.API_V1_PREFIX}/advisory/recommend",
            "leaf_disease_diagnosis": f"{settings.API_V1_PREFIX}/diagnosis/predict",
            "agristack_ufsi_advisories": f"{settings.API_V1_PREFIX}/agristack/ufsi/v1/advisories",
            "federated_twin_sync": f"{settings.API_V1_PREFIX}/federation/sync-twins",
        },
        "json_ld_context": settings.AGRISTACK_CONTEXT_URL,
    }


@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health Check Probe",
    tags=["System Status"],
)
async def health_check() -> Dict[str, str]:
    """Liveness probe returning service health state."""
    return {
        "status": "healthy",
        "service": "NAARIN API Gateway",
        "version": settings.APP_VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
