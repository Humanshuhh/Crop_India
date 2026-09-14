/**
 * Early Warning & Predictive Anomaly Alert Types
 * Matches OpenAPI schema for POST /api/v1/early-warning/evaluate-risk.
 */

export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'CRITICAL' | string;

/**
 * Individual observation in the satellite & meteorological telemetry time-series.
 */
export interface TelemetrySnapshot {
  timestamp?: string;
  /** Vegetation vigor index (-1.0 to 1.0) */
  ndvi: number;
  /** Canopy water index (-1.0 to 1.0) */
  ndwi: number;
  temperature_c: number;
  relative_humidity_pct: number;
  rainfall_mm: number;
}

/**
 * Request payload for POST /api/v1/early-warning/evaluate-risk.
 */
export interface EarlyWarningEvaluationRequest {
  farmer_id?: string | null;
  latitude: number;
  longitude: number;
  zone?: string | null;
  target_language?: string | null;
  baseline_ndvi?: number | null;
  telemetry_series: TelemetrySnapshot[];
}

/**
 * Real response model returned by POST /api/v1/early-warning/evaluate-risk.
 */
export interface EarlyWarningAdvisory {
  warning_id: string;
  risk_level: RiskLevel;
  anomaly_detected: boolean;
  predicted_stress_type?: string | null;
  confidence_score: number;
  proactive_actions: string[];
  spoken_advisory: string;
  timestamp: string;
}

