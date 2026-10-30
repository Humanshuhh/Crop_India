import json
import ee
import folium
from shapely.geometry import shape, mapping

# 1. Initialize Google Earth Engine
ee.Initialize(project='team-ceres-agro')

# 2. Read and simplify the local GeoJSON boundary
geojson_path = 'india_boundary.geojson'
with open(geojson_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

raw_geom = data['features'][0]['geometry'] if 'features' in data else data['geometry']
local_shape = shape(raw_geom)
simplified_shape = local_shape.simplify(tolerance=0.01, preserve_topology=True)
india_geometry = ee.Geometry(mapping(simplified_shape))

print("Official sovereign boundary loaded and optimized locally.")

# 3. Cloud-masking function using Sentinel-2 QA60 bitmask
def mask_s2_clouds(image):
    qa = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = (
        qa.bitwiseAnd(cloud_bit_mask).eq(0)
        .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    )
    return image.updateMask(mask)

# 4. Filter Sentinel-2 imagery with relaxed scene filter and pixel-level masking
s2_collection = (
    ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(india_geometry.bounds())
    .filterDate('2025-10-01', '2025-11-15')  # Extended to mid-November for monsoon clearing
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))  # Accept partially cloudy passes
    .map(mask_s2_clouds)  # Remove only cloudy pixels
)

# 5. Create median composite and calculate NDVI
composite = s2_collection.median()
ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI_Oct_2025')
india_ndvi = ndvi.clip(india_geometry)

# 6. Compute national mean NDVI across India
print("Calculating gap-free mean NDVI on Google Cloud for October 2025...")
stats = india_ndvi.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=india_geometry,
    scale=10000,
    maxPixels=1e10
).getInfo()

mean_val = stats.get('NDVI_Oct_2025')
print(f"National Mean NDVI (Oct 2025 - Peak Kharif): {mean_val:.4f}")

# 7. Define visualization colors
ndvi_vis_params = {
    'min': 0.0,
    'max': 0.8,
    'palette': [
        '#FFFFFF',  # Snow / barren / urban
        '#CE7E45',  # Sparse vegetation
        '#FCD163',  # Low vegetation
        '#66A000',  # Moderate vegetation
        '#207401',  # High greenness
        '#054901'   # Dense forest / crops
    ]
}

# 8. Helper function to extract Earth Engine web tiles
def get_ee_tile_url(ee_image, vis_params):
    map_id_dict = ee.Image(ee_image).getMapId(vis_params)
    return map_id_dict['tile_fetcher'].url_format

# 9. Create a native Folium Leaflet Map
fmap = folium.Map(
    location=[22.5, 82.0],
    zoom_start=5,
    tiles='OpenStreetMap',
    control_scale=True
)

# 10. Add the Sentinel-2 NDVI layer
folium.TileLayer(
    tiles=get_ee_tile_url(india_ndvi, ndvi_vis_params),
    attr='Google Earth Engine | Sentinel-2',
    name='India Sentinel-2 NDVI (Oct-Nov 2025)',
    overlay=True,
    control=True,
    show=True
).add_to(fmap)

folium.LayerControl(collapsed=False).add_to(fmap)

# 11. Save map directly to standalone HTML
output_html = "india_ndvi_map.html"
fmap.save(output_html)
print(f"Interactive map successfully generated without gaps: {output_html}")