from typing import Any, Dict
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from backend.agronomy.telemetry_worker import run_daily_telemetry_scan
from backend.routers.early_warning import router as early_warning_router
from backend.routers.farmer_assistant import router as assistant_router
from backend.database.firebase import get_firestore_db
from backend.ml_engine.soil_advisor import soil_advisor_engine

# Modular Domain Routers
from backend.routers.diagnostics import router as diagnostics_router
from backend.routers.soil import router as soil_router
from backend.routers.voice import router as voice_router

app = FastAPI(
    title="Kisan Intelligence Digital Public Good Engine",
    description="Unified agro-climatic, geospatial, and multimodal diagnostic backend for smallholder farmers.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers
app.include_router(diagnostics_router)
app.include_router(soil_router)
app.include_router(voice_router)
app.include_router(early_warning_router)
app.include_router(assistant_router)

@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Root Discovery Endpoint",
    tags=["System Status"],
)
async def root() -> Dict[str, Any]:
    """Root metadata and service discovery."""
    return {
        "network": "CropIndia - Kisan Sahayak Network",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "documentation": "/docs",
            "redoc": "/redoc",
            "openapi_schema": "/openapi.json",
            "diagnose": "/api/v1/diagnose",
            "soil_evaluate": "/api/v1/soil/evaluate",
            "soil_regenerative_plan": "/api/v1/soil/regenerative-plan",
            "voice_languages": "/api/v1/voice/languages",
            "voice_stream": "/api/v1/voice/listen",
        },
    }

@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health Check Probe",
    tags=["System Status"],
)
def health_check() -> Dict[str, Any]:
    """Liveness probe returning engine and database connectivity state."""
    db = get_firestore_db()
    return {
        "status": "healthy",
        "service": "agro-advisory-engine",
        "gemini_configured": bool(getattr(soil_advisor_engine, "client", False)),
        "firestore_connected": db is not None,
    }

try:
    from backend.database import db
except ImportError:
    db = None

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_client = get_firestore_db()
    
    # Schedule the scan to run daily at 10 sec
    scheduler.add_job(
        run_daily_telemetry_scan,
        trigger="interval",
        seconds=10,
        args=[db],
        id="daily_farm_scan",
        replace_existing=True,
    )
    scheduler.start()
    print("[Scheduler] Automated agricultural telemetry worker started.")
    
    yield
    
    scheduler.shutdown()
    print("[Scheduler] Automated worker shut down.")