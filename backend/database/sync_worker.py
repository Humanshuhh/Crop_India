from backend.database.firebase import get_firestore_db
from backend.database.bigquery import get_bigquery_client
from datetime import datetime

def sync_soil_records_to_bigquery() -> int:
    """
    Pulls soil health records from Firestore and backs them up to BigQuery
    for long-term analytics and ML model training.
    """
    db = get_firestore_db()
    bq = get_bigquery_client()
    
    if not db or not bq:
        print("Database connection error during sync.")
        return 0
        
    print("Starting sync: Firestore -> BigQuery...")
    
    # 1. Fetch data from Firestore
    # In a production app, you would filter this by date (e.g., only sync yesterday's data)
    docs = db.collection("soil_health_records").stream()
    
    records_to_sync = []
    for doc in docs:
        data = doc.to_dict()
        
        # 2. Flatten the data for BigQuery
        # BigQuery prefers flat data, so we extract the nested fields from the schemas
        raw_metrics = data.get("raw_metrics", {})
        plan = data.get("regenerative_plan", {})
        
        flat_record = {
            "record_id": doc.id,
            "farmer_id": data.get("farmer_id"),
            "created_at": data.get("created_at", datetime.utcnow().isoformat()),
            
            # Extracting specific metrics for analytics
            "ph": raw_metrics.get("ph"),
            "organic_carbon_pct": raw_metrics.get("organic_carbon_pct"),
            "nitrogen_n": raw_metrics.get("nitrogen_n"),
            
            # Extracting the final score
            "soil_health_score": plan.get("soil_health_score")
        }
        records_to_sync.append(flat_record)
        
    # 3. Push to BigQuery
    if records_to_sync:
        table_id = f"{bq.project}.crop_data.historical_soil_health"
        try:
            # Using your proven batch load method
            job = bq.load_table_from_json(records_to_sync, table_id)
            job.result()  # Wait for the job to finish
            print(f"Successfully synced {len(records_to_sync)} soil records to BigQuery.")
            return len(records_to_sync)
        except Exception as e:
            print(f"Sync failed: {e}")
            return 0
            
    print("No records found to sync.")
    return 0