import { apiPostJson, normalizeApiError } from './apiClient';
import type {
  EarlyWarningEvaluationRequest,
  EarlyWarningAdvisory,
} from '../types/earlyWarning.types';

/**
 * Service boundary for Predictive Early Warning & Crop Anomaly Alerts.
 * Connects to real backend endpoint: POST /api/v1/early-warning/evaluate-risk.
 *
 * Backend Requirements:
 * - `latitude` & `longitude` (number, required)
 * - `telemetry_series` (TelemetrySnapshot[], required non-empty)
 *   Containing ndvi, ndwi, temperature_c, relative_humidity_pct, rainfall_mm.
 *
 * Non-Fabrication Policy:
 * This service expects genuine telemetry from satellite/meteorological pipelines.
 * It will not send dummy or placeholder data.
 */
export async function evaluateCropRisk(
  request: EarlyWarningEvaluationRequest
): Promise<EarlyWarningAdvisory> {
  if (!request.telemetry_series || request.telemetry_series.length === 0) {
    throw {
      category: 'VALIDATION_ERROR',
      userMessage:
        'Cannot evaluate crop risk: genuine satellite or weather telemetry time-series is required but not yet available.',
    };
  }

  try {
    return await apiPostJson<EarlyWarningEvaluationRequest, EarlyWarningAdvisory>(
      '/api/v1/early-warning/evaluate-risk',
      request
    );
  } catch (err) {
    throw normalizeApiError(
      err,
      'Failed to evaluate agricultural risk advisory from backend telemetry engine.'
    );
  }
}

