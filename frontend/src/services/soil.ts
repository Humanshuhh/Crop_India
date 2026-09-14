import { apiPostJson } from './apiClient';
import type { SoilHealthInput, RegenerativeAdvisoryResponse } from '../types/soil.types';

/**
 * Evaluates farm soil parameters via POST /api/v1/soil/evaluate.
 * Strictly sends only documented fields per Rule 3 and Addendum §1.
 */
export async function evaluateSoil(input: SoilHealthInput): Promise<RegenerativeAdvisoryResponse> {
  return await apiPostJson<SoilHealthInput, RegenerativeAdvisoryResponse>(
    '/api/v1/soil/evaluate',
    input
  );
}
