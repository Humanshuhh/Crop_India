export interface FarmerProfile {
  fullName: string;
  phone: string;
  email?: string;
  farmerId?: string;
  village: string;
  district: string;
  state: string;
  latitude: string;
  longitude: string;
  landArea: string;
  landUnit: 'acres' | 'hectares';
  primaryCrops: string;
  agroClimaticZone?: string;
  updatedAt?: string;
}
