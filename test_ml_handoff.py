import json
import os
import sys

TELEMETRY_FILE = "field_telemetry.json"

def generate_kisan_card(telemetry: dict):
    coords = telemetry.get("metadata", {}).get("target_coordinates", {})
    veg = telemetry.get("vegetation_indices", {})
    soil = telemetry.get("soil_profile", {})
    climate = telemetry.get("climate_and_weather", {})
    
    lat = coords.get("latitude")
    lon = coords.get("longitude")
    soc = soil.get("soil_organic_carbon_pct", 0.0)
    ph = soil.get("soil_ph", 7.0)
    rainfall = climate.get("cumulative_kharif_rainfall_mm", 0.0)
    rain_regime = climate.get("rainfall_regime", "")
    soil_type = soil.get("soil_type", "Loam")
    ndvi = veg.get("ndvi_harvest_peak", 0.0)
    current_temp = climate.get("live_current_temperature_celsius", 30.0)
    rain_forecast = climate.get("forecast_7day_rainfall_mm", 0.0)

    # 1. Plain-Language Field Diagnosis
    if ph < 6.5:
        soil_nature = "Halka Tezabi (Slightly Acidic) - Good for millets and upland paddy"
    elif ph > 7.8:
        soil_nature = "Chuna-yukt / Khari (Alkaline) - Needs gypsum / sulfur support"
    else:
        soil_nature = "Santulit (Balanced / Neutral) - Excellent for all crops"

    if soc < 0.50:
        fertility_note = "Kamzor (Needs Organic Khad / Gobar Khad)"
        action_item = "Use 2 trolleys of well-rotted Gobar Khad (FYM) or Vermicompost before sowing."
    else:
        fertility_note = "Acchi (Healthy Organic Matter)"
        action_item = "Maintain normal organic nutrition; soil is healthy."

    # 2. Regional Crop Selection
    if rainfall < 500 or "Arid" in rain_regime or "Sand" in soil_type:
        top_crops = ["Bajra (Pearl Millet)", "Guar (Cluster Bean)", "Moth Bean"]
        water_note = "Low water area: Pick drought-resistant varieties."
    elif ph < 6.5 and rainfall >= 1000:
        top_crops = ["Upland Rice (Sahbhagi / Vandana)", "Madua / Ragi (Finger Millet)", "Arhar / Kurthi"]
        water_note = "High rain area: Choose quick-draining field crops or drought-hardy upland rice."
    elif "Clay" in soil_type or "Regur" in soil_type:
        top_crops = ["Soybean", "Kapas (Cotton)", "Chana (Rabi)"]
        water_note = "High water-holding soil: Watch out for water stagnation."
    else:
        top_crops = ["Paddy (Dhan)", "Makka (Maize)", "Sarson (Mustard - Rabi)"]
        water_note = "Adequate water and fertile plains."

    # 3. Formatted Kisan Advisory Card (High-Contrast, Clear Layout)
    print("\n" + "=" * 55)
    print("             KISAN KHET SALAH (FARM ADVISORY)")
    print("=" * 55)
    print(f"Location GPS   : Lat {lat:.3f}, Lon {lon:.3f}")
    print(f"Mitti Ka Prakar: {soil_type}")
    print(f"Mitti Ki Sehat : {fertility_note}")
    print(f"Barish Stithi  : {rainfall} mm ({water_note})")
    print(f"Mausam Update  : {current_temp}°C | Agle 7 din barish: {rain_forecast} mm")
    print("-" * 55)
    print("TOP RECOMMENDED CROPS (Aapke Khet Ke Liye Sabse Behtar Fasalein):")
    for idx, crop in enumerate(top_crops, 1):
        print(f"  {idx}. {crop}")
    print("-" * 55)
    print("KHET KI DEKHBHAL (Immediate Soil Action):")
    print(f"  * {action_item}")
    print("=" * 55)

    # 4. Voice-Ready Text for Regional Mobile / IVR Call
    voice_script = (
        f"Kisan bhai, aapka khet Lat {lat:.2f}, Lon {lon:.2f} par sthit hai. "
        f"Aapki mitti {soil_type.split('(')[0].strip()} hai aur mitti mein jaivik khad ki thodi kami hai. "
        f"Aapke ilaqe mein pichhle season mein lagbhag {int(rainfall)} millimeter barish hui hai. "
        f"Aapke khet ke liye sabse labhdayak fasalein hain: {', '.join(top_crops)}. "
        f"Buvai se pehle khet mein gobar ki khad ya kenchua khad avashya dalein."
    )

    print("\nVOICE-ASSISTANT / AUDIO PROMPT (For Mobile TTS):")
    print(f'"{voice_script}"\n')

def main():
    if not os.path.exists(TELEMETRY_FILE):
        print(f"[!] File '{TELEMETRY_FILE}' not found. Run point_telemetry_engine.py first.")
        sys.exit(1)

    with open(TELEMETRY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    generate_kisan_card(data)

if __name__ == "__main__":
    main()