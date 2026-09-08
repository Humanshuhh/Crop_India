import io
import requests
from PIL import Image, ImageDraw

API_URL = "http://127.0.0.1:8000/api/v1/diagnose"

def run_test(case_name, img_bytes, soil="", weather=""):
    files = {"image": ("test.jpg", img_bytes, "image/jpeg")}
    data = {"soil_context": soil, "weather_context": weather}
    res = requests.post(API_URL, files=files, data=data)
    print(f"\n--- {case_name} ---")
    if res.status_code == 200:
        body = res.json()
        print(f"Crop: {body.get('crop_name')}")
        print(f"Condition: {body.get('detected_condition')}")
        print(f"Is Healthy: {body.get('is_healthy')}")
        print(f"Confidence: {body.get('confidence')}")
        print(f"Symptoms: {body.get('symptoms_observed')}")
        print(f"Remedies: {[r['name'] for r in body.get('eco_friendly_remedies', [])]}")
    else:
        print(f"Error {res.status_code}: {res.text}")

# Case 1: Non-Plant / Adversarial Image (Must reject, not hallucinate a plant disease)
blank_img = Image.new("RGB", (256, 256), color=(40, 40, 40)) # Dark gray square
b_buf = io.BytesIO()
blank_img.save(b_buf, format="JPEG")

# Case 2: Pure Healthy Green Leaf Pattern (Should identify healthy, no fake diseases)
healthy_img = Image.new("RGB", (256, 256), color=(34, 139, 34)) # Forest green
h_buf = io.BytesIO()
healthy_img.save(h_buf, format="JPEG")

# Case 3: Foliar Damage Simulation (Brown necrotic lesions on green)
damaged_img = Image.new("RGB", (256, 256), color=(34, 139, 34))
draw = ImageDraw.Draw(damaged_img)
draw.ellipse((60, 60, 180, 180), fill=(139, 69, 19)) # Necrotic brown patch
draw.ellipse((90, 90, 150, 150), fill=(218, 165, 32)) # Yellow halo
d_buf = io.BytesIO()
damaged_img.save(d_buf, format="JPEG")

# Execute tests
run_test("Test 1: Non-Plant Negative Control", b_buf.getvalue())
run_test("Test 2: Healthy Leaf Control", h_buf.getvalue())
run_test("Test 3: Necrotic Lesion Simulation", d_buf.getvalue(), "Low Organic Carbon", "90% Humidity")