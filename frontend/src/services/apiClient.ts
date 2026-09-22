import type { NormalizedError, ErrorCategory } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface FastApiValidationErrorDetail {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

/**
 * Isolated error normalizer per Addendum §4.
 * Handles FastAPI simple detail ({ detail: string }) and validation array ({ detail: [...] })
 */
export function normalizeApiError(error: unknown, fallbackMessage: string): NormalizedError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'category' in error &&
    'userMessage' in error
  ) {
    return error as NormalizedError;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    console.error('[Kisan Sahayak Network Error]', error);
    return {
      category: 'BACKEND_UNREACHABLE',
      userMessage: 'Cannot connect to the agricultural advisory server. Please ensure the service is running or check your connection.',
      technicalDetails: error.message,
    };
  }

  if (error instanceof Error) {
    console.error('[Kisan Sahayak Error]', error);
    return {
      category: 'PROCESSING_ERROR',
      userMessage: error.message || fallbackMessage,
      technicalDetails: error.stack,
    };
  }

  return {
    category: 'UNKNOWN',
    userMessage: fallbackMessage,
  };
}

export async function parseResponseError(res: Response, fallbackMessage: string): Promise<NormalizedError> {
  const status = res.status;
  let category: ErrorCategory = 'HTTP_ERROR';
  let userMessage = fallbackMessage;
  let technical = '';

  try {
    const data = await res.json();
    technical = JSON.stringify(data);

    if (data && data.detail) {
      if (typeof data.detail === 'string') {
        userMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        category = 'VALIDATION_ERROR';
        const formatted = (data.detail as FastApiValidationErrorDetail[])
          .map((item) => {
            const field = item.loc ? item.loc[item.loc.length - 1] : 'field';
            return `${field}: ${item.msg}`;
          })
          .join(', ');
        userMessage = `Please check input values: ${formatted}`;
      }
    }
  } catch {
    technical = `HTTP ${status}: ${res.statusText}`;
  }

  if (status >= 500) {
    category = 'PROCESSING_ERROR';
    if (userMessage.toLowerCase().includes('gemini') || userMessage.toLowerCase().includes('ai')) {
      category = 'THIRD_PARTY_SERVICE_ERROR';
      userMessage = 'The AI diagnostic engine encountered a temporary problem. Please try again in a few moments.';
    } else {
      userMessage = 'The server encountered an error while processing your request. Please try again.';
    }
  } else if (status === 422 || status === 400) {
    category = 'VALIDATION_ERROR';
  }

  console.error(`[Kisan Sahayak API Error ${status}]`, technical);

  return {
    category,
    userMessage,
    technicalDetails: technical,
    statusCode: status,
  };
}

export async function apiPostJson<TRequest, TResponse>(
  endpoint: string,
  payload: TRequest
): Promise<TResponse> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw await parseResponseError(res, 'Failed to complete soil evaluation');
    }

    return (await res.json()) as TResponse;
  } catch (err) {
    throw normalizeApiError(err, 'Could not connect to the advisory server.');
  }
}

export async function apiPostMultipart<TResponse>(
  endpoint: string,
  formData: FormData
): Promise<TResponse> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!res.ok) {
      throw await parseResponseError(res, 'Failed to diagnose crop leaf');
    }

    return (await res.json()) as TResponse;
  } catch (err) {
    throw normalizeApiError(err, 'Could not connect to the diagnosis server.');
  }
}

export async function apiGetJson<TResponse>(endpoint: string): Promise<TResponse> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw await parseResponseError(res, 'Failed to reach service');
    }

    return (await res.json()) as TResponse;
  } catch (err) {
    throw normalizeApiError(err, 'Service unreachable.');
  }
}
