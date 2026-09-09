import io
import logging
from gtts import gTTS

logger = logging.getLogger("kisan_sahayak.voice")

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "gtts_code": "en"},
    "hi": {"name": "Hindi", "gtts_code": "hi"},
    "bn": {"name": "Bengali", "gtts_code": "bn"},
    "te": {"name": "Telugu", "gtts_code": "te"},
    "ta": {"name": "Tamil", "gtts_code": "ta"},
    "mr": {"name": "Marathi", "gtts_code": "mr"},
    "gu": {"name": "Gujarati", "gtts_code": "gu"},
}

class AgroVoiceService:
    @staticmethod
    def generate_audio_stream(text: str, lang_code: str = "hi") -> io.BytesIO:
        target_lang = lang_code.lower().strip()
        lang_config = SUPPORTED_LANGUAGES.get(target_lang, SUPPORTED_LANGUAGES["hi"])
        
        try:
            tts = gTTS(text=text, lang=lang_config["gtts_code"], slow=False)
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            return audio_buffer
        except Exception as exc:
            logger.error(f"TTS generation failed for {lang_code}: {exc}")
            fallback_tts = gTTS(text=text, lang="en", slow=False)
            audio_buffer = io.BytesIO()
            fallback_tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            return audio_buffer

voice_service = AgroVoiceService()
