# Agro-Geospatial Feature Engine

Real-time telemetry microservice built for hackathons that extracts 10m Sentinel-2 indices (NDVI/NDWI), OpenLandMap soil profiles (texture, pH, Soil Organic Carbon), IMD-aligned seasonal rainfall (CHIRPS), and live 7-day weather (Open-Meteo) based on user GPS coordinates.

Outputs a standardized `field_telemetry.json` payload for downstream ML crop recommendation models and farmer advisory systems.

---

## 1. Setup & Requirements

Ensure Earth Engine is authenticated on the host machine:

```bash
pip install -r requirements.txt
earthengine authenticate