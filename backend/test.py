import os
import json
from PIL import Image

# 1. Use the real uploaded leaf photo if present, otherwise create a dummy
test_image_path = "test_leaf.png" if os.path.exists("test_leaf.png") else ("leaf.png" if os.path.exists("leaf.png") else "test_leaf.jpg")
if not os.path.exists(test_image_path):
    img = Image.new("RGB", (200, 200), color=(34, 139, 34))
    img.save(test_image_path)
    print(f"Created temporary dummy image: {test_image_path}")
else:
    print(f"Using test leaf photo: {test_image_path}")

mime_type = "image/png" if test_image_path.endswith(".png") else "image/jpeg"

try:
    import requests
    BASE_URL = "http://127.0.0.1:8000"
    with open(test_image_path, "rb") as f:
        files = {"image": (test_image_path, f, mime_type)}
        response = requests.post(f"{BASE_URL}/api/diagnose", files=files, timeout=1.5)
    
    print("\n--- 1. Testing /api/diagnose Endpoint ---")
    print("Status Code:", response.status_code)
    diag_data = response.json()
    print("Diagnosis Response:\n", json.dumps(diag_data, indent=2))

    print("\n--- 2. Testing /api/advisory Endpoint ---")
    payload = {
        "query": "My leaves are turning yellow with brown lesions. Should I apply Urea or irrigate, or what organic spray is recommended?",
        "district": "Barmer",
        "diagnosis": diag_data if response.status_code == 200 else None
    }
    response = requests.post(f"{BASE_URL}/api/advisory", json=payload, timeout=2.0)
    print("Status Code:", response.status_code)
    print("Advisory Response:\n", json.dumps(response.json(), indent=2))

except Exception:
    # If live uvicorn server is not currently running on port 8000, test in-process via TestClient
    print("\n[INFO] Live uvicorn server on port 8000 not active. Testing via in-process FastAPI TestClient:")
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)

    print("\n--- 1. Testing /api/diagnose Endpoint ---")
    with open(test_image_path, "rb") as f:
        files = {"image": (test_image_path, f, mime_type)}
        response = client.post("/api/diagnose", files=files)
    print("Status Code:", response.status_code)
    diag_data = response.json()
    print("Diagnosis Response:\n", json.dumps(diag_data, indent=2))

    print("\n--- 2. Testing /api/advisory Endpoint ---")
    payload = {
        "query": "My leaves are turning yellow with brown lesions. Should I apply Urea or irrigate, or what organic spray is recommended?",
        "district": "Barmer",
        "diagnosis": diag_data if response.status_code == 200 else None
    }
    response = client.post("/api/advisory", data=payload)
    print("Status Code:", response.status_code)
    print("Advisory Response:\n", json.dumps(response.json(), indent=2))
