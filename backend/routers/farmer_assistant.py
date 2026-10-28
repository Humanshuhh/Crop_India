# backend/routers/farmer_assistant.py

import asyncio
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.services.assistant_service import assistant_service

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Multimodal Assistant"])


@router.post("/query")
async def process_farmer_query(
    query_text: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    target_language: Optional[str] = Form("hi"),
    include_audio: Optional[bool] = Form(True),
):
    if not query_text and not audio_file and not image_file:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one input: query text, an audio clip, or an image.",
        )

    image_bytes = await image_file.read() if image_file else None
    audio_bytes = await audio_file.read() if audio_file else None
    audio_mime = audio_file.content_type if audio_file else "audio/mp3"

    # Delegate core AI reasoning & weather telemetry to service
    parsed_result = await assistant_service.generate_response(
        query_text=query_text,
        image_bytes=image_bytes,
        audio_bytes=audio_bytes,
        audio_mime_type=audio_mime,
        latitude=latitude,
        longitude=longitude,
        target_language=target_language or "hi",
    )

    # Audio synthesis bounded with a 2.5s ceiling
    audio_base64 = None
    if include_audio:
        try:
            audio_base64 = await asyncio.wait_for(
                asyncio.to_thread(
                    assistant_service.synthesize_speech,
                    parsed_result.voice_advisory,
                    target_language or "hi",
                ),
                timeout=2.5,
            )
        except Exception:
            audio_base64 = None

    return {
        "status": "success",
        "detailed_response": parsed_result.detailed_advisory,
        "voice_advisory": parsed_result.voice_advisory,
        "voice_commands": parsed_result.voice_commands,
        "action_intent": parsed_result.action_intent,
        "audio_base64": audio_base64,
    }