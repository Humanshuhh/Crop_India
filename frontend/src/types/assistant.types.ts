/**
 * Multimodal Farmer Assistant Types
 * Contract for POST /api/v1/farmer/query endpoint.
 */

export type MessageSender = 'user' | 'assistant';

export type ActionIntent =
  | 'DO_NOT_SPRAY'
  | 'SAFE_TO_SPRAY'
  | 'IRRIGATE_NOW'
  | string;

export interface AssistantMessage {
  id: string;
  sender: MessageSender;
  text: string;
  imageUrl?: string;
  audioBlob?: Blob;
  audioBase64?: string | null;
  timestamp: string;
  spokenSummary?: string;
  isError?: boolean;
  retryQuery?: string;
  retryLanguage?: string;
  actionableSteps?: string[];
  sources?: string[];
  relatedTopics?: string[];
  voiceCommands?: string[];
  actionIntent?: ActionIntent;
  detailedResponse?: string;
  voiceAdvisory?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AssistantMessage[];
  language?: string;
}

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

export interface FarmerQuerySuccessPayload {
  status?: string;
  detected_response?: string;
  answer?: string;
  voice_advisory?: string;
  audio_base64?: string | null;
  voice_commands?: string[];
  action_intent?: ActionIntent;
  detailed_response?: string;
}

export type FarmerQueryBackendResponse =
  | FarmerQuerySuccessPayload
  | string;

export interface FarmerAssistantResult {
  text: string;
  voiceAdvisory?: string;
  audioBase64?: string | null;
  voiceCommands?: string[];
  actionIntent?: ActionIntent;
  detailedResponse?: string;
  raw?: FarmerQueryBackendResponse;
}
