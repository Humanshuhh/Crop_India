import { apiPostMultipart, normalizeApiError } from './apiClient';
import type {
  FarmerQueryRequest,
  FarmerAssistantResult,
  FarmerQueryBackendResponse,
} from '../types/assistant.types';

/**
 * Service boundary for Multimodal Farmer Assistant.
 * Connects to live POST /api/v1/farmer/query via multipart/form-data.
 *
 * Backend parameter mapping:
 * - `query_text`: Farmer's textual query
 * - `target_language`: Regional language code (e.g., "hi", "en", "bn")
 * - `image_file`: Optional crop foliar photo (File or Blob)
 * - `audio_file`: Optional raw audio query
 */
export async function queryFarmerAssistant(
  request: FarmerQueryRequest
): Promise<FarmerAssistantResult> {
  const formData = new FormData();

  const queryText = request.query_text ?? request.query ?? '';
  if (queryText.trim()) {
    formData.append('query_text', queryText.trim());
  }

  const lang = request.target_language ?? request.language;
  if (lang) {
    formData.append('target_language', lang);
  }

  const image = request.image_file ?? request.image;
  if (image) {
    formData.append('image_file', image);
  }

  const audio = request.audio_file ?? request.audio;
  if (audio) {
    formData.append('audio_file', audio, 'voice_query.wav');
  }

  try {
    const raw = await apiPostMultipart<FarmerQueryBackendResponse>(
      '/api/v1/farmer/query',
      formData
    );

    let text = '';
    if (typeof raw === 'string') {
      text = raw;
    } else if (raw && typeof raw === 'object') {
      if (typeof raw.detected_response === 'string') {
        text = raw.detected_response;
      } else if (typeof raw.answer === 'string') {
        text = raw.answer;
      } else {
        text = JSON.stringify(raw);
      }
    }

    return {
      text,
      raw,
    };
  } catch (err) {
    throw normalizeApiError(
      err,
      'Could not reach the Farmer Assistant service. Please try again in a moment.'
    );
  }
}

