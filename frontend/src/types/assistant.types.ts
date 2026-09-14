/**
 * Multimodal Farmer Assistant Types
 * Real contract for POST /api/v1/farmer/query endpoint.
 */

export type MessageSender = 'user' | 'assistant';

export interface AssistantMessage {
  id: string;
  sender: MessageSender;
  text: string;
  imageUrl?: string;
  /** Reserved for raw audio playback if backend returns voice clips */
  audioBlob?: Blob;
  timestamp: string;
  spokenSummary?: string;
  isError?: boolean;
  actionableSteps?: string[];
  sources?: string[];
  relatedTopics?: string[];
}

/**
 * Request payload sent via multipart/form-data to POST /api/v1/farmer/query.
 * Actual backend fields:
 * - query_text (string, optional)
 * - image_file (UploadFile, optional)
 * - audio_file (UploadFile, optional)
 * - target_language (string, optional)
 */
export interface FarmerQueryRequest {
  query?: string;
  query_text?: string;
  language?: string;
  target_language?: string;
  image?: File | Blob;
  image_file?: File | Blob;
  audio?: Blob;
  audio_file?: Blob;
}

/**
 * Backend runtime returns {"status": "success", "detected_response": "..."}
 * or plain string if OpenAPI 200 string response schema is returned.
 */
export interface FarmerQuerySuccessPayload {
  status?: string;
  detected_response?: string;
  answer?: string;
}

export type FarmerQueryBackendResponse = FarmerQuerySuccessPayload | string;

export interface FarmerAssistantResult {
  text: string;
  raw?: FarmerQueryBackendResponse;
}

