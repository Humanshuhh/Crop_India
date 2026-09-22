export interface EcoFriendlyRemedy {
  title: string;
  preparation: string;
  application: string;
}

export interface CropDiagnosisResponse {
  is_plant_detected: boolean;
  crop_name?: string | null;
  detected_condition: string;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  visual_symptoms: string[];
  underlying_cause: string;
  eco_friendly_remedies: EcoFriendlyRemedy[];
  preventive_cultural_practices: string[];
  audio_advisory_script?: string;
  spoken_summary?: string;
}
