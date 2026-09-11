import os
import json
import base64
from dotenv import load_dotenv
from google.cloud import bigquery
from google.oauth2 import service_account

load_dotenv()

def get_bigquery_client():
    """Initializes and returns a BigQuery Client instance."""
    base64_key = os.getenv("GCP_KEY_BASE64")
    key_path = os.path.join(os.path.dirname(__file__), "credentials", "firebase-key.json")

    try:
        if base64_key:
            # Load credentials directly from base64 env string
            key_info = json.loads(base64.b64decode(base64_key).decode("utf-8"))
            creds = service_account.Credentials.from_service_account_info(key_info)
            return bigquery.Client(credentials=creds, project=key_info.get("project_id"))
        elif os.path.exists(key_path):
            # Fallback to local json file
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path
            return bigquery.Client()
        else:
            print("Warning: Neither GCP_KEY_BASE64 nor local key file was found.")
            return None
    except Exception as e:
        print(f"BigQuery Client Error: {e}")
        return None