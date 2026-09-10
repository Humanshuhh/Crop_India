import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from gtts import gTTS

router = APIRouter(prefix="/api/v1/voice", tags=["Multilingual Voice"])

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "gtts_code": "en"},
    "hi": {"name": "Hindi", "gtts_code": "hi"},
    "bn": {"name": "Bengali", "gtts_code": "bn"},
    "te": {"name": "Telugu", "gtts_code": "te"},
    "ta": {"name": "Tamil", "gtts_code": "ta"},
    "mr": {"name": "Marathi", "gtts_code": "mr"},
    "gu": {"name": "Gujarati", "gtts_code": "gu"},
}


@router.get("/languages")
def get_supported_languages():
    """Returns supported Indian regional languages for the frontend selector."""
    return [{"code": k, "label": v["name"]} for k, v in SUPPORTED_LANGUAGES.items()]


@router.get("/listen")
def stream_voice_advisory(text: str, lang: str = "hi"):
    """Generates and streams MP3 audio directly to the UI without saving to disk."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    target_lang = lang.lower().strip()
    lang_config = SUPPORTED_LANGUAGES.get(target_lang, SUPPORTED_LANGUAGES["hi"])

    try:
        tts = gTTS(text=text, lang=lang_config["gtts_code"], slow=False)
    except Exception:
        tts = gTTS(text=text, lang="en", slow=False)

    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)

    return StreamingResponse(
        audio_buffer,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"inline; filename=advisory_{lang}.mp3"},
    )