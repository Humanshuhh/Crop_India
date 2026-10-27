import { apiGetJson, normalizeApiError } from './apiClient';
import type { HistoryItem } from '../types/history.types';

interface BackendHistoryRecord {
  id: string;
  category: 'LEAF_DISEASE' | 'SOIL_HEALTH';
  farmer_id?: string;
  created_at?: string;
  timestamp?: string;
  crop_name?: string;
  detected_condition?: string;
  confidence_level?: string;
  spoken_summary?: string;
  summary?: string;
  raw_metrics?: Record<string, unknown>;
  regenerative_plan?: Record<string, unknown>;
  eco_friendly_remedies?: unknown;
  [key: string]: unknown;
}

function mapBackendHistoryRecord(raw: BackendHistoryRecord): HistoryItem {
  if (raw.category !== 'LEAF_DISEASE' && raw.category !== 'SOIL_HEALTH') {
    throw new Error(`Unsupported history category: ${raw.category}`);
  }

  const isLeaf = raw.category === 'LEAF_DISEASE';

  const cropName =
    typeof raw.crop_name === 'string' && raw.crop_name.trim()
      ? raw.crop_name
      : 'Crop';

  const condition =
    typeof raw.detected_condition === 'string' && raw.detected_condition.trim()
      ? raw.detected_condition
      : 'Diagnosis';

  const summary = isLeaf
    ? typeof raw.spoken_summary === 'string' && raw.spoken_summary.trim()
      ? raw.spoken_summary
      : condition
    : typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary
      : 'Soil assessment completed.';

  return {
    id: raw.id,
    type: isLeaf ? 'diagnosis' : 'soil_evaluation',
    title: isLeaf
      ? `${cropName} — ${condition}`
      : `Soil Health — ${summary.slice(0, 50) || 'Assessment'}`,
    summary,
    date:
      typeof raw.created_at === 'string'
        ? raw.created_at
        : typeof raw.timestamp === 'string'
          ? raw.timestamp
          : '',
    status_or_confidence:
      isLeaf && typeof raw.confidence_level === 'string'
        ? `Confidence: ${raw.confidence_level}`
        : undefined,
    tags: isLeaf ? [cropName, condition] : ['Soil Health'],
    details: { ...raw },
  };
}

/**
 * Retrieves and maps the authenticated farmer's history records.
 * Supports limitCount parameter to retrieve up to 100 historical assessments.
 */
export async function getFarmerHistory(
  farmerId: string,
  limitCount: number = 25
): Promise<HistoryItem[]> {
  const cleanId = (farmerId || '').trim();
  if (!cleanId || cleanId.toLowerCase() === 'default_farmer' || cleanId.toLowerCase() === 'guest' || cleanId.toLowerCase() === 'all') {
    return [];
  }

  try {
    const params = new URLSearchParams({ limit_count: String(limitCount) });
    const records = await apiGetJson<BackendHistoryRecord[]>(
      `/api/v1/history/${encodeURIComponent(farmerId)}?${params}`
    );

    if (!Array.isArray(records)) {
      throw new Error('Unexpected history response format.');
    }

    return records.map(mapBackendHistoryRecord);
  } catch (err: unknown) {
    throw normalizeApiError(
      err,
      'Unable to retrieve history records. Please try again.'
    );
  }
}
