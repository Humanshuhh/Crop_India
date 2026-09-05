"""
NAARIN Configuration Module
National Agro-Advisory & Regenerative Intelligence Network
"""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable override support."""

    APP_NAME: str = "NAARIN - National Agro-Advisory & Regenerative Intelligence Network"
    APP_DESCRIPTION: str = (
        "Digital Public Good adhering to India's AgriStack UFSI standards. "
        "Provides hyper-local regenerative agro-advisories, leaf disease diagnostics, "
        "and privacy-preserving agro-climatic twin federation."
    )
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # CORS configuration
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # External APIs & Standards
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    WEATHER_REQUEST_TIMEOUT_SECONDS: float = 6.0
    AGRISTACK_CONTEXT_URL: str = "https://agristack.gov.in/contexts/v1/advisory.jsonld"
    AGRISTACK_UFSI_VERSION: str = "v1"

    # Model / Inference Settings
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.70

    # Google GenAI Settings
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TEMPERATURE: float = 0.2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()


settings = get_settings()
