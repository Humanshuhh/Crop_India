import { apiPostJson } from './apiClient';
import type { SoilHealthInput, RegenerativeAdvisoryResponse } from '../types/soil.types';
import type { SupportedLanguage } from '../types/i18n.types';

/**
 * Evaluates farm soil parameters via POST /api/v1/soil/evaluate.
 * Passes target_language so advisory and spoken summary are generated in the requested language.
 */
export async function evaluateSoil(
  input: SoilHealthInput,
  targetLanguage?: SupportedLanguage | string
): Promise<RegenerativeAdvisoryResponse> {
  const payload: SoilHealthInput = {
    ...input,
    target_language: targetLanguage || input.target_language,
  };

  return await apiPostJson<SoilHealthInput, RegenerativeAdvisoryResponse>(
    '/api/v1/soil/evaluate',
    payload
  );
}
