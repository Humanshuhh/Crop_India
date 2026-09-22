import { apiPostJson, apiGetJson } from './apiClient';

/**
 * Backend Farmer schema mapping to /db/farmer.
 */
export interface FarmerDbRecord {
  farmer_id: string;
  name: string;
  phone: string;
  state: string;
  district: string;
  language?: string;
  // Extended profile metadata
  village?: string;
  latitude?: string | number;
  longitude?: string | number;
  land_area?: string | number;
  primary_crops?: string;
  agro_climatic_zone?: string;
}

export interface FarmerDbSaveResponse {
  status: string;
  message: string;
  data: FarmerDbRecord;
}

/**
 * Save farmer profile to backend Firestore route POST /db/farmer.
 */
export async function saveFarmerProfileToDb(farmer: FarmerDbRecord): Promise<FarmerDbSaveResponse> {
  return await apiPostJson<FarmerDbRecord, FarmerDbSaveResponse>('/db/farmer', farmer);
}

/**
 * Retrieve farmer profile from backend Firestore route GET /db/farmer/{farmer_id}.
 */
export async function getFarmerProfileFromDb(farmerId: string): Promise<FarmerDbRecord> {
  return await apiGetJson<FarmerDbRecord>(`/db/farmer/${encodeURIComponent(farmerId)}`);
}

