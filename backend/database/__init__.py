# Export Database Connection Clients
from .firebase import get_firestore_db
from .bigquery import get_bigquery_client

# Export Firestore CRUD Operations (Real-Time & GenAI Output)
from .firestore_crud import (
    save_farmer_profile,
    save_soil_record,
    save_leaf_diagnostic,
    save_early_warning_firestore
)

# Export BigQuery CRUD Operations (Analytics & Bulk Data)
from .bigquery_crud import (
    ingest_historical_weather,
    ingest_bulk_shc,
    log_warning_bigquery
)

# Export Sync Operations (Cross-Database Pipeline)
from .sync_worker import sync_soil_records_to_bigquery

# Define what gets imported when someone uses `from backend.database import *`
__all__ = [
    "get_firestore_db",
    "get_bigquery_client",
    "save_farmer_profile",
    "save_soil_record",
    "save_leaf_diagnostic",
    "save_early_warning_firestore",
    "ingest_historical_weather",
    "ingest_bulk_shc",
    "log_warning_bigquery",
    "sync_soil_records_to_bigquery"
]