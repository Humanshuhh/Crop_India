import { apiPostMultipart } from './apiClient';
import type { CropDiagnosisResponse } from '../types/diagnosis.types';
import type { NormalizedError } from '../types/api.types';
import type { SupportedLanguage } from '../types/i18n.types';

// Named constants per Addendum §6
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates and submits crop leaf image via POST /api/v1/diagnose.
 * Enforces client constraints before upload with plain-language farmer error message.
 * Passes farmer's selected language so audio script and diagnosis are localized.
 */
export async function diagnoseCrop(file: File, targetLanguage?: SupportedLanguage | string): Promise<CropDiagnosisResponse> {
  // Pre-upload validation per Addendum §6
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const error: NormalizedError = {
      category: 'VALIDATION_ERROR',
      userMessage: 'This photo is too large (max 10MB). Try taking a new photo or choosing a smaller one.',
    };
    throw error;
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    const error: NormalizedError = {
      category: 'VALIDATION_ERROR',
      userMessage: 'Please upload a photo in JPEG, PNG, or WebP format.',
    };
    throw error;
  }

  const formData = new FormData();
  formData.append('file', file);
  if (targetLanguage) {
    formData.append('target_language', targetLanguage);
  }

  return await apiPostMultipart<CropDiagnosisResponse>('/api/v1/diagnose', formData);
}
