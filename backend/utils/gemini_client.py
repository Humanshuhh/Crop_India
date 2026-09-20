import asyncio
import logging
import random
from typing import Any, List, Optional, Union
from google import genai
from google.genai import types

# Configure structured logger for retry warnings
logger = logging.getLogger("cropindia.gemini_client")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Transient exceptions to catch across google-genai and google-api-core
RETRYABLE_EXCEPTIONS: tuple = ()
try:
    from google.genai.errors import APIError  # google-genai SDK
    RETRYABLE_EXCEPTIONS += (APIError,)
except ImportError:
    pass

try:
    from google.api_core.exceptions import (  # Underlying Google API exceptions
        InternalServerError,
        ResourceExhausted,
        ServiceUnavailable,
    )
    RETRYABLE_EXCEPTIONS += (ResourceExhausted, ServiceUnavailable, InternalServerError)
except ImportError:
    pass


async def async_generate_content_with_backoff(
    client: genai.Client,
    model: str,
    contents: Union[str, List[Any]],
    config: Optional[types.GenerateContentConfig] = None,
    max_retries: int = 4,
    base_delay: float = 2.0,
) -> types.GenerateContentResponse:
    """
    Executes a non-blocking Gemini generate_content call using the async client
    with exponential backoff and jitter to handle 429 and 503 errors.
    """
    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
            return response

        except RETRYABLE_EXCEPTIONS as exc:
            # Check for rate-limiting or server overloads
            status_code = getattr(exc, "code", getattr(exc, "status_code", None))
            error_message = str(exc)

            is_transient = (
                status_code in (429, 500, 503)
                or "429" in error_message
                or "RESOURCE_EXHAUSTED" in error_message
                or "503" in error_message
                or "overloaded" in error_message.lower()
            )

            if not is_transient or attempt == max_retries - 1:
                logger.error(
                    f"Gemini API call failed permanently on attempt {attempt + 1}/{max_retries}: {exc}"
                )
                raise exc

            # Full jitter formula: base_delay * 2^attempt + uniform(0.5, 1.5)
            backoff_delay = (base_delay * (2 ** attempt)) + random.uniform(0.5, 1.5)
            logger.warning(
                f"Rate limit / capacity peak encountered (Attempt {attempt + 1}/{max_retries}). "
                f"Retrying in {backoff_delay:.2f}s... Details: {exc}"
            )
            await asyncio.sleep(backoff_delay)


def generate_content_with_backoff(
    client: genai.Client,
    model: str,
    contents: Union[str, List[Any]],
    config: Optional[types.GenerateContentConfig] = None,
    max_retries: int = 4,
    base_delay: float = 2.0,
) -> types.GenerateContentResponse:
    """Synchronous fallback version with exponential backoff and jitter."""
    import time

    for attempt in range(max_retries):
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except RETRYABLE_EXCEPTIONS as exc:
            status_code = getattr(exc, "code", getattr(exc, "status_code", None))
            error_message = str(exc)

            is_transient = (
                status_code in (429, 500, 503)
                or "429" in error_message
                or "RESOURCE_EXHAUSTED" in error_message
                or "503" in error_message
                or "overloaded" in error_message.lower()
            )

            if not is_transient or attempt == max_retries - 1:
                logger.error(
                    f"Sync Gemini call failed permanently on attempt {attempt + 1}/{max_retries}: {exc}"
                )
                raise exc

            backoff_delay = (base_delay * (2 ** attempt)) + random.uniform(0.5, 1.5)
            logger.warning(
                f"[Sync] Throttled on attempt {attempt + 1}/{max_retries}. Retrying in {backoff_delay:.2f}s..."
            )
            time.sleep(backoff_delay)