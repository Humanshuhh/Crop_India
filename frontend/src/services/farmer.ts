import { apiPostJson, apiGetJson } from './apiClient';
import type { FarmerProfile } from '../types/profile.types';

/**
 * Backend Farmer schema mapping to /api/v1/farmer.
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
 * Save farmer profile to backend Firestore route POST /api/v1/farmer.
 */
export async function saveFarmerProfileToDb(farmer: FarmerDbRecord): Promise<FarmerDbSaveResponse> {
  return await apiPostJson<FarmerDbRecord, FarmerDbSaveResponse>('/api/v1/farmer', farmer);
}

/**
 * Retrieve farmer profile from backend Firestore route GET /api/v1/farmer/{farmer_id}.
 */
export async function getFarmerProfileFromDb(farmerId: string): Promise<FarmerDbRecord> {
  return await apiGetJson<FarmerDbRecord>(`/api/v1/farmer/${encodeURIComponent(farmerId)}`);
}

/**
 * Synchronously retrieves the saved local farmer profile from localStorage.
 * Checks user-scoped storage key first, falling back to guest/legacy key.
 */
export function getSavedFarmerProfile(uid?: string | null): FarmerProfile | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const key = uid ? `kisan_farmer_profile_${uid}` : 'kisan_farmer_profile_guest';
    const raw = localStorage.getItem(key) || (!uid ? localStorage.getItem('kisan_farmer_profile') : null);
    if (!raw) return null;
    return JSON.parse(raw) as FarmerProfile;
  } catch {
    return null;
  }
}
