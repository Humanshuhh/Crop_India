export interface SoilHealthInput {
  latitude: number;
  longitude: number;
  ph?: number;
  organic_carbon_percent?: number;
  organic_carbon_pct?: number;
  nitrogen_kg_ha?: number;
  nitrogen_n?: number;
  phosphorus_kg_ha?: number;
  phosphorus_p?: number;
  potassium_kg_ha?: number;
  potassium_k?: number;
  zinc_ppm?: number;
  zinc_zn?: number;
  target_language?: string;
}

export interface BiologicalConditioningAction {
  name: string;
  target_deficiency: string;
  preparation_or_sourcing: string;
  dosage_and_application: string;
}

export interface CropRotationCycle {
  season: string;
  recommended_crop: string;
  ecological_role: string;
  water_requirement: string;
}

export interface RegenerativeAdvisoryResponse {
  soil_health_assessment: string;
  synthetic_chemical_alert: string;
  biological_amendments: BiologicalConditioningAction[];
  regenerative_crop_rotations: CropRotationCycle[];
  cultural_water_practices: string[];
  spoken_summary: string;
}