from backend.database.bigquery import get_bigquery_client
from backend.schemas.climate_schemas import WeatherTelemetry
from backend.schemas.soil_schemas import SoilHealthCardInput
from backend.schemas.warning_schemas import EarlyWarningAdvisory  # Your new import!
from datetime import datetime

def ingest_historical_weather(weather_data_list: list[WeatherTelemetry]) -> bool:
    """Batch loads IMD weather telemetry into BigQuery."""
    bq = get_bigquery_client()
    if not bq:
        return False
    
    table_id = f"{bq.project}.crop_data.historical_weather"
    
    rows_to_insert = [weather.model_dump() for weather in weather_data_list]
    
    try:
        job = bq.load_table_from_json(rows_to_insert, table_id)
        job.result() 
        return True
    except Exception as e:
        print(f"BigQuery load error: {e}")
        return False

def ingest_bulk_shc(soil_data_list: list[SoilHealthCardInput]) -> bool:
    """Batch loads thousands of Soil Health Cards into BigQuery for analytics."""
    bq = get_bigquery_client()
    if not bq:
        return False
    
    table_id = f"{bq.project}.crop_data.soil_health_cards"
    rows_to_insert = [soil.model_dump() for soil in soil_data_list]
    
    try:
        job = bq.load_table_from_json(rows_to_insert, table_id)
        job.result()
        return True
    except Exception as e:
        print(f"BigQuery load error: {e}")
        return False

def log_warning_bigquery(
    farmer_id: str,
    zone: str,
    advisory: EarlyWarningAdvisory
) -> bool:
    """Logs early warning metrics to BigQuery for regional analytics."""
    bq = get_bigquery_client()
    if not bq:
        return False
    
    table_id = f"{bq.project}.crop_data.early_warning_logs"
    
    row_to_insert = [{
        "warning_id": advisory.warning_id,
        "farmer_id": farmer_id,
        "zone": zone,
        "risk_level": advisory.risk_level,
        "stress_type": advisory.predicted_stress_type or "Unknown",
        "timestamp": datetime.utcnow().isoformat()
    }]
    
    try:
        errors = bq.insert_rows_json(table_id, row_to_insert)
        if errors:
            print(f"BigQuery insert errors: {errors}")
            return False
        return True
    except Exception as e:
        print(f"BigQuery log error: {e}")
        return False