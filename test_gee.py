import ee

# 1. Initialize the Earth Engine client library
ee.Initialize(project='team-ceres-agro')

print("Connection successful! Google Earth Engine is ready.")

# 2. Query metadata for the Sentinel-2 Harmonized satellite collection
sentinel_collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
sample_image = sentinel_collection.first()

# 3. Retrieve available spectral bands
bands = sample_image.bandNames().getInfo()
print("Available Sentinel-2 Bands:")
print(bands)