# backend/routers/voice_router.py
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.services.voice_service import voice_service, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/api/v1/voice", tags=["Voice Advisory"])

class VoiceRequest(BaseModel):
    text: str
    language: str = "hi"

@router.post("/stream")
def stream_advisory_voice(payload: VoiceRequest):
    """
    Receives vernacular advisory text and streams back MP3 audio.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    # Generates in-memory MP3 audio stream
    audio_stream = voice_service.generate_audio_stream(
        text=payload.text,
        lang_code=payload.language
    )

    return StreamingResponse(
        audio_stream,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=advisory.mp3"
        }
    )

@router.get("/languages")
def get_supported_languages():
    """Returns all supported regional languages."""
    return SUPPORTED_LANGUAGES