import os
import firebase_admin
from firebase_admin import credentials, firestore

# Path to Firebase service account key
KEY_PATH = os.path.join(os.path.dirname(__file__), "credentials", "firebase-key.json")

# Initialize Firebase App
if not firebase_admin._apps:
    if os.path.exists(KEY_PATH):
        cred = credentials.Certificate(KEY_PATH)
        firebase_admin.initialize_app(cred)
    else:
        print(f"Warning: Firebase key missing at {KEY_PATH}")

# Get Firestore Client
try:
    db = firestore.client()
except Exception as e:
    db = None
    print(f"Firestore Client Error: {e}")

def get_firestore_db():
    """Returns the active Firestore database instance."""
    return db