export type ErrorCategory = 
  | 'VALIDATION_ERROR' 
  | 'BACKEND_UNREACHABLE' 
  | 'HTTP_ERROR' 
  | 'PROCESSING_ERROR' 
  | 'THIRD_PARTY_SERVICE_ERROR'
  | 'UNKNOWN';

export interface NormalizedError {
  category: ErrorCategory;
  userMessage: string;
  technicalDetails?: string;
  statusCode?: number;
}
