from backend.database.bigquery import get_bigquery_client
from backend.schemas.climate_schemas import WeatherTelemetry
from backend.schemas.soil_schemas import SoilHealthCardInput

def ingest_historical_weather(weather_data_list: list[WeatherTelemetry]) -> bool:
    """Batch loads IMD weather telemetry into BigQuery."""
    bq = get_bigquery_client()
    if not bq:
        return False
    
    table_id = f"{bq.project}.crop_data.historical_weather"
    
    # Convert Pydantic models to pure dictionaries for BigQuery
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