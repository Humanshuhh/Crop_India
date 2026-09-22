import { apiGetJson } from './apiClient';

export interface BackendHealthResponse {
  status: string;
  service: string;
  gemini_configured: boolean;
}

export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  return await apiGetJson<BackendHealthResponse>('/health');
}
