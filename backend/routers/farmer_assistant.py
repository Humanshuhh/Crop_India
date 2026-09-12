# backend/routers/farmer_assistant.py
import io
import os
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from google import genai
from google.genai import types
from PIL import Image

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Multimodal Assistant"])

# Initialize the GenAI client
client = genai.Client()

SYSTEM_INSTRUCTION = """
You are an expert agronomic assistant for CropIndia.
Your core rules:
1. Language Mirroring: Identify the language and script used by the farmer (e.g., Hindi, Bengali, Punjabi, Tamil, English, etc.) from their text or audio query. You MUST compose your entire response strictly in that same language and dialect/script.
2. Multimodal Analysis:
   - If an image is provided, inspect the crop leaves, stems, or soil for physical symptoms, pests, or deficiencies.
   - If an audio clip is provided, listen to the farmer's spoken query and extract their intent.
3. Agronomic Integrity:
   - Prioritize validated, zero-chemical, and biological solutions (e.g., sour buttermilk/chaach, neem kernel aqueous extract, Jeevamrit, Trichoderma viride).
   - Keep answers practical, step-by-step, actionable, and culturally relatable.
4. Output Tone: Empathetic, concise, clear, and easy for a farmer to understand or listen to.
"""

@router.post("/query")
async def process_farmer_query(
    query_text: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    target_language: Optional[str] = Form(None),  # Optional override (e.g., "hi", "bn")
):
    if not query_text and not audio_file and not image_file:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one input: query text, an audio clip, or an image.",
        )

    contents = []

    # 1. Process Image (if uploaded)
    if image_file:
        image_bytes = await image_file.read()
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            contents.append(pil_img)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file format.")

    # 2. Process Audio (if voice query uploaded)
    if audio_file:
        audio_bytes = await audio_file.read()
        mime_type = audio_file.content_type or "audio/mp3"
        contents.append(
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
        )

    # 3. Process Text Query & Prompt Directives
    prompt_builder = []
    if query_text:
        prompt_builder.append(f"Farmer Query: {query_text}")

    if target_language:
        prompt_builder.append(f"Mandatory Language Code: {target_language}")
    else:
        prompt_builder.append(
            "Detect the language of the query/audio and respond strictly in that identical language."
        )

    contents.append("\n".join(prompt_builder))

    # 4. Generate Response with Gemini 3.6 Flash
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.1,
            ),
        )

        return {
            "status": "success",
            "detected_response": response.text,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Assistant service temporarily unavailable: {str(exc)}",
        )