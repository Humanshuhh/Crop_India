import os
from google.cloud import bigquery

# Set path to BigQuery / GCP credentials
KEY_PATH = os.path.join(os.path.dirname(__file__), "credentials", "gcp-key.json")

if os.path.exists(KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KEY_PATH

def get_bigquery_client():
    """Initializes and returns a BigQuery Client instance."""
    try:
        client = bigquery.Client()
        return client
    except Exception as e:
        print(f"BigQuery Client Error: {e}")
        return None