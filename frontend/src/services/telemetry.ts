/**
 * Telemetry API Service
 * Connects to the existing backend telemetry endpoints.
 *
 * Data-honesty policy:
 * - NDVI/NDWI from /sentinel-surface-map are weather-derived simulations,
 *   NOT real Sentinel-2 satellite measurements. Label them as "estimated".
 * - Alerts from /early-warning/alerts are real anomaly-detection outputs.
 * - No fake values are ever injected.
 */
import { normalizeApiError } from './apiClient';
import type {
  SentinelSurfaceMapResponse,
  EarlyWarningAlertsResponse,
} from '../types/telemetry.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function telemetryGet<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    // 404 or 503 are valid "pending/unavailable" responses from the backend; parse body as-is.
    return (await res.json()) as T;
  } catch (err) {
    throw normalizeApiError(err, 'Telemetry service unreachable.');
  }
}

/**
 * Fetches weather-derived vegetation index estimates for a location.
 * Corresponds to: GET /api/v1/telemetry/sentinel-surface-map?lat=&lon=&radius_km=
 *
 * NOTE: The returned vegetation_indices (NDVI/NDWI) are derived from Open-Meteo
 * weather history using simulate_satellite_indices(), NOT from actual Sentinel-2
 * satellite imagery. They must be labeled accordingly in the UI.
 */
export async function fetchSentinelSurfaceMap(
  lat: number,
  lon: number,
  radius_km: number = 5.0
): Promise<SentinelSurfaceMapResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius_km: String(radius_km),
  });
  return telemetryGet<SentinelSurfaceMapResponse>(
    `/api/v1/telemetry/sentinel-surface-map?${params}`
  );
}

/**
 * Fetches live anomaly-detection alerts for a location.
 * Corresponds to: GET /api/v1/early-warning/alerts?lat=&lon=
 *
 * Uses real Open-Meteo weather data + simulate_satellite_indices() + anomaly model.
 * Alerts are genuine outputs from the backend risk evaluation engine.
 */
export async function fetchEarlyWarningAlerts(
  lat: number,
  lon: number
): Promise<EarlyWarningAlertsResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  return telemetryGet<EarlyWarningAlertsResponse>(
    `/api/v1/early-warning/alerts?${params}`
  );
}

