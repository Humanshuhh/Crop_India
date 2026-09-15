# backend/database/bigquery_crud.py

import logging
from datetime import datetime, timezone
from typing import List, Optional

from backend.database.bigquery import get_bigquery_client
from backend.schemas.climate_schemas import WeatherTelemetry
from backend.schemas.soil_schemas import SoilHealthCardInput
from backend.schemas.warning_schemas import EarlyWarningAdvisory

logger = logging.getLogger("kisan_sahayak.bigquery")


def ingest_historical_weather(weather_data_list: List[WeatherTelemetry]) -> bool:
    """Batch loads IMD weather telemetry into BigQuery."""
    bq = get_bigquery_client()
    if not bq:
        logger.error("BigQuery client not connected.")
        return False

    table_id = f"{bq.project}.crop_data.historical_weather"
    rows_to_insert = [weather.model_dump() for weather in weather_data_list]

    try:
        job = bq.load_table_from_json(rows_to_insert, table_id)
        job.result()  # Wait for batch ingestion to complete
        logger.info(f"Successfully loaded {len(rows_to_insert)} weather records to {table_id}")
        return True
    except Exception as e:
        logger.error(f"BigQuery weather load error: {e}")
        return False


def ingest_bulk_shc(soil_data_list: List[SoilHealthCardInput]) -> bool:
    """Batch loads Soil Health Cards into BigQuery for regional analytics."""
    bq = get_bigquery_client()
    if not bq:
        logger.error("BigQuery client not connected.")
        return False

    table_id = f"{bq.project}.crop_data.soil_health_cards"
    rows_to_insert = [soil.model_dump() for soil in soil_data_list]

    try:
        job = bq.load_table_from_json(rows_to_insert, table_id)
        job.result()  # Wait for batch ingestion to complete
        logger.info(f"Successfully loaded {len(rows_to_insert)} soil health cards to {table_id}")
        return True
    except Exception as e:
        logger.error(f"BigQuery SHC load error: {e}")
        return False


def log_warning_bigquery(
    farmer_id: str,
    zone: str,
    advisory: EarlyWarningAdvisory,
) -> bool:
    """
    Logs early warning metrics to BigQuery using batch loading
    for Free-Tier/Sandbox compatibility.
    """
    bq = get_bigquery_client()
    if not bq:
        logger.error("BigQuery client not connected.")
        return False

    table_id = f"{bq.project}.crop_data.early_warning_logs"

    # Safely handle field attributes matching EarlyWarningAdvisory schema
    stress_type = getattr(advisory, "predicted_stress_type", None) or "Unknown"
    warning_id = getattr(advisory, "warning_id", None) or f"warn_{int(datetime.now().timestamp())}"
    risk_level = getattr(advisory, "risk_level", "MODERATE")

    rows_to_insert = [
        {
            "warning_id": warning_id,
            "farmer_id": farmer_id,
            "zone": zone,
            "risk_level": risk_level,
            "stress_type": stress_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    ]

    try:
        # Use load_table_from_json instead of insert_rows_json for Sandbox tier
        job = bq.load_table_from_json(rows_to_insert, table_id)
        job.result()
        logger.info(f"Successfully logged warning {warning_id} to BigQuery.")
        return True
    except Exception as e:
        logger.error(f"BigQuery warning log error: {e}")
        return False