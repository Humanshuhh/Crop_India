import os
import json
import base64
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

def initialize_firebase():
    if firebase_admin._apps:
        return

    base64_key = os.getenv("FIREBASE_KEY_BASE64")
    key_path = os.path.join(os.path.dirname(__file__), "credentials", "firebase-key.json")

    if base64_key:
        # Decode base64 key directly into a dictionary
        key_dict = json.loads(base64.b64decode(base64_key).decode("utf-8"))
        cred = credentials.Certificate(key_dict)
        firebase_admin.initialize_app(cred)
    elif os.path.exists(key_path):
        # Fallback to local json file
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    else:
        print("Warning: Neither FIREBASE_KEY_BASE64 nor firebase-key.json was found.")

initialize_firebase()

try:
    db = firestore.client()
except Exception as e:
    db = None
    print(f"Firestore Client Error: {e}")

def get_firestore_db():
    """Returns the active Firestore database instance."""
    return db