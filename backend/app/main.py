"""
TWIN Lite Pro - Optimized Backend
With Turbo Speed Support
"""

import os
import io
import uuid
import hashlib
import logging
import time
from datetime import datetime, timedelta
from enum import Enum

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Request
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import httpx
from jose import jwt
from passlib.context import CryptContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TWIN Lite Pro", version="3.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse("../frontend/index.html")

SECRET_KEY = os.getenv("SECRET_KEY", "change-this")
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 18 Working Languages
LANGUAGE_CODES = {
    "en": "English", "es": "Spanish", "de": "German", "fr": "French",
    "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "sv": "Swedish",
    "da": "Danish", "no": "Norwegian", "fi": "Finnish", "cs": "Czech",
    "pl": "Polish", "ro": "Romanian", "hu": "Hungarian", "sk": "Slovak",
    "bg": "Bulgarian", "hr": "Croatian"
}

@app.get("/")
async def root():
    return {"name": "TWIN Lite Pro", "version": "3.2.0", "status": "turbo-ready", "languages": len(LANGUAGE_CODES)}

@app.get("/health")
async def health():
    return {"status": "healthy", "deepl_configured": bool(DEEPL_API_KEY), "turbo": True}

def generate_tts(text, lang):
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=lang[:2], slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read(), True
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return None, False

@app.post("/translate-and-speak")
async def translate_and_speak(
    request: Request,
    text: str = Form(...), 
    target_language: str = Form(...), 
    source_language: str = Form("auto")
):
    start_time = time.time()
    
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    # Check for turbo mode header
    is_turbo = request.headers.get('X-Turbo') == 'enabled'
    
    try:
        translated = text
        if DEEPL_API_KEY and source_language != target_language:
            try:
                async with httpx.AsyncClient(timeout=5.0 if is_turbo else 10.0) as client:
                    deepl_lang = target_language.upper()
                    r = await client.post(
                        "https://api-free.deepl.com/v2/translate",
                        headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
                        data={"text": text, "target_lang": deepl_lang}
                    )
                    if r.status_code == 200:
                        translated = r.json()["translations"][0]["text"]
            except Exception as e:
                logger.error(f"Translation error: {e}")
        
        audio, success = generate_tts(translated, target_language)
        
        process_time = (time.time() - start_time) * 1000
        
        headers = {
            "X-Translated-Text": translated,
            "X-Process-Time": f"{process_time:.0f}ms"
        }
        
        if is_turbo:
            headers["X-Turbo"] = "enabled"
            headers["Cache-Control"] = "max-age=300"
        
        if success and audio:
            return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg", headers=headers)
        else:
            return JSONResponse({"translated_text": translated, "audio": None}, headers=headers)
            
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
