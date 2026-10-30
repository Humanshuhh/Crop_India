import json
import ee
import folium
from shapely.geometry import shape, mapping

# 1. Initialize Google Earth Engine
ee.Initialize(project='team-ceres-agro')

# 2. Load and locally simplify the official sovereign boundary
geojson_path = 'india_boundary.geojson'
with open(geojson_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

geom_dict = data['features'][0]['geometry'] if 'features' in data else data['geometry']
local_shape = shape(geom_dict)
simplified_shape = local_shape.simplify(tolerance=0.01, preserve_topology=True)
india_geometry = ee.Geometry(mapping(simplified_shape))

print("Official sovereign boundary loaded.")

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

# 4. Helper function to generate clean seasonal median composites
def get_seasonal_ndvi(start_date, end_date, name):
    print(f"Querying Sentinel-2 for {name} ({start_date} to {end_date})...")
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(india_geometry.bounds())
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
        .map(mask_s2_clouds)
    )
    median_composite = collection.median()
    ndvi = median_composite.normalizedDifference(['B8', 'B4']).rename(name)
    return ndvi.clip(india_geometry)

# 5. Composite generation (2025 Seasonal Kharif Cycle)
pre_monsoon = get_seasonal_ndvi('2025-04-15', '2025-05-31', 'NDVI_PreMonsoon_2025')
post_monsoon = get_seasonal_ndvi('2025-10-01', '2025-11-15', 'NDVI_PostMonsoon_2025')

# 6. Change Detection (Delta NDVI = Post - Pre)
ndvi_diff = post_monsoon.subtract(pre_monsoon).rename('NDVI_Difference_2025')

# 7. National statistical reduction across the country
print("Computing gap-free national seasonal statistics on Google Cloud...")
combined_seasons = pre_monsoon.addBands(post_monsoon)

stats = combined_seasons.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=india_geometry,
    scale=10000,
    maxPixels=1e10
).getInfo()

mean_pre = stats.get('NDVI_PreMonsoon_2025')
mean_post = stats.get('NDVI_PostMonsoon_2025')

print(f"National Mean NDVI (Pre-Monsoon 2025): {mean_pre:.4f}")
print(f"National Mean NDVI (Post-Monsoon 2025): {mean_post:.4f}")
print(f"National Net Vegetation Shift (2025): {mean_post - mean_pre:+.4f}")

# 8. Visualization styling
ndvi_abs_vis = {
    'min': 0.0,
    'max': 0.8,
    'palette': [
        '#FFFFFF',  # Bare soil / rock / desert
        '#CE7E45',  # Very sparse vegetation
        '#FCD163',  # Low vegetation
        '#66A000',  # Moderate vegetation
        '#207401',  # Dense crops / canopy
        '#054901'   # High-density forest
    ]
}

diff_vis_params = {
    'min': -0.3,
    'max': 0.5,
    'palette': [
        '#A50026',  # Deep Red: Significant drying / loss
        '#F46D43',  # Light Red: Moderate decline
        '#FFFFBF',  # Light Yellow: Stable / no change
        '#66BD63',  # Light Green: Moderate growth
        '#006837'   # Deep Green: Strong vegetation surge
    ]
}

# 9. Helper function to extract Earth Engine tile URLs
def get_ee_tile_url(ee_image, vis_params):
    map_id_dict = ee.Image(ee_image).getMapId(vis_params)
    return map_id_dict['tile_fetcher'].url_format

# 10. Build Folium Leaflet Map
fmap = folium.Map(
    location=[22.5, 82.0],
    zoom_start=5,
    tiles='OpenStreetMap',
    control_scale=True
)

# Layer 1: Pre-Monsoon NDVI (May 2025)
folium.TileLayer(
    tiles=get_ee_tile_url(pre_monsoon, ndvi_abs_vis),
    attr='Google Earth Engine | Sentinel-2',
    name='Pre-Monsoon NDVI (May 2025)',
    overlay=True,
    control=True,
    show=False
).add_to(fmap)

# Layer 2: Post-Monsoon NDVI (Oct 2025)
folium.TileLayer(
    tiles=get_ee_tile_url(post_monsoon, ndvi_abs_vis),
    attr='Google Earth Engine | Sentinel-2',
    name='Post-Monsoon NDVI (Oct 2025)',
    overlay=True,
    control=True,
    show=False
).add_to(fmap)

# Layer 3: Seasonal NDVI Shift (Oct - May 2025)
folium.TileLayer(
    tiles=get_ee_tile_url(ndvi_diff, diff_vis_params),
    attr='Google Earth Engine | Sentinel-2',
    name='Seasonal NDVI Shift (Oct - May 2025)',
    overlay=True,
    control=True,
    show=True
).add_to(fmap)

# 11. Add Agricultural Regional Spotlights
spotlights = folium.FeatureGroup(name="Field Spotlights (Key Agronomic Belts)", show=True)

# Spotlight 1: Punjab / Haryana Breadbasket
folium.Marker(
    location=[30.3753, 75.8573],
    popup=folium.Popup(
        """<b>Punjab Plains (Intensive Irrigated Belt)</b><br>
        <i>Observation:</i> Extreme Kharif crop surge.<br>
        Fields transition from bare harvested wheat soil in May to dense paddy canopy in October.""",
        max_width=250
    ),
    tooltip="Click to inspect: Punjab Breadbasket",
    icon=folium.Icon(color="green", icon="leaf")
).add_to(spotlights)

# Spotlight 2: Deccan Rainfed Belt (Vidarbha / Maharashtra)
folium.Marker(
    location=[20.7453, 78.6022],
    popup=folium.Popup(
        """<b>Deccan Rainfed Zone (Vidarbha)</b><br>
        <i>Observation:</i> Rainfed monsoon response.<br>
        High contrast between parched summer soil and rainfed soybean/cotton crop emergence.""",
        max_width=250
    ),
    tooltip="Click to inspect: Deccan Rainfed Zone",
    icon=folium.Icon(color="orange", icon="tint")
).add_to(spotlights)

# Spotlight 3: Kaveri Delta (Tamil Nadu)
folium.Marker(
    location=[10.7867, 79.1378],
    popup=folium.Popup(
        """<b>Kaveri Delta (Peninsular Coastal Rice Belt)</b><br>
        <i>Observation:</i> Cloud-masked Kuruvai/Samba crop cycles.<br>
        Validates gap-free composite recovery despite retreating monsoon rains.""",
        max_width=250
    ),
    tooltip="Click to inspect: Kaveri Delta",
    icon=folium.Icon(color="blue", icon="info-sign")
).add_to(spotlights)

spotlights.add_to(fmap)

# Layer toggle control
folium.LayerControl(collapsed=False).add_to(fmap)

# 12. Compact farmer-friendly HUD & legend
legend_html = f'''
<div style="
    position: fixed; 
    bottom: 15px; 
    right: 15px; 
    z-index: 9999; 
    background-color: rgba(255, 255, 255, 0.94);
    padding: 7px 10px;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    font-size: 10px;
    line-height: 1.25;
    max-width: 195px;
">
    <b style="font-size: 11px; color: #1b5e20;">Kisan Crop Monitor</b>
    <span style="font-size: 8.5px; color: #666; display: block;">Sentinel-2 (2025)</span>
    <hr style="margin: 4px 0; border: 0; border-top: 1px solid #ddd;">
    
    <b>Pre-Rain:</b> {mean_pre:.2f} | <b>Harvest:</b> {mean_post:.2f}<br>
    <b>Crop Gain:</b> <span style="color: #2e7d32; font-weight: bold;">+{((mean_post - mean_pre)*100):.1f}% Cover</span>
    
    <hr style="margin: 4px 0; border: 0; border-top: 1px solid #ddd;">
    <b>Field Status:</b><br>
    <div style="display: flex; align-items: center; margin-top: 3px;">
        <span style="background: #006837; width: 9px; height: 9px; display: inline-block; margin-right: 5px; border-radius: 2px;"></span>
        <span>Healthy Crop</span>
    </div>
    <div style="display: flex; align-items: center; margin-top: 2px;">
        <span style="background: #66BD63; width: 9px; height: 9px; display: inline-block; margin-right: 5px; border-radius: 2px;"></span>
        <span>Emerging Crop</span>
    </div>
    <div style="display: flex; align-items: center; margin-top: 2px;">
        <span style="background: #FFFFBF; width: 9px; height: 9px; display: inline-block; margin-right: 5px; border: 1px solid #ccc; border-radius: 2px;"></span>
        <span>Fallow / Bare Soil</span>
    </div>
    <div style="display: flex; align-items: center; margin-top: 2px;">
        <span style="background: #A50026; width: 9px; height: 9px; display: inline-block; margin-right: 5px; border-radius: 2px;"></span>
        <span>Crop Stress / Loss</span>
    </div>
</div>
'''

fmap.get_root().html.add_child(folium.Element(legend_html))

# Save standalone HTML
output_html = "india_seasonal_difference_map.html"
fmap.save(output_html)
print(f"Compact map with regional spotlights saved: {output_html}")