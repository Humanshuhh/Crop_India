import { apiGetJson, normalizeApiError } from './apiClient';
import type { HistoryItem } from '../types/history.types';

/**
 * Service boundary for Diagnostic & Advisory History.
 * Prepares request and handles connection to future GET /api/v1/history/{farmer_id}.
 */
export async function getFarmerHistory(farmerId: string): Promise<HistoryItem[]> {
  try {
    return await apiGetJson<HistoryItem[]>(`/api/v1/history/${encodeURIComponent(farmerId)}`);
  } catch (err) {
    throw normalizeApiError(
      err,
      'History retrieval API is not currently deployed on the backend.'
    );
  }
}

