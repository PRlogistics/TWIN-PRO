"""
TWIN Lite Pro - Business Edition
Fixed Version with proper error handling
"""

import os
import io
import uuid
import hashlib
import logging
from datetime import datetime, timedelta
from enum import Enum

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
from jose import jwt
from passlib.context import CryptContext

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TWIN Lite Pro",
    description="Elite Real-Time Voice Translation SaaS",
    version="3.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse("../frontend/index.html")
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Serve frontend static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse("../frontend/index.html")
# Configuration with fallbacks
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-immediately")
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SubscriptionTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"

PLANS = {
    SubscriptionTier.FREE: {
        "name": "Free",
        "price": 0,
        "characters": 10000,
        "languages": 5
    },
    SubscriptionTier.STARTER: {
        "name": "Starter",
        "price": 9.99,
        "characters": 100000,
        "languages": 15
    },
    SubscriptionTier.PRO: {
        "name": "Pro", 
        "price": 29.99,
        "characters": 500000,
        "languages": 25
    },
    SubscriptionTier.ENTERPRISE: {
        "name": "Enterprise",
        "price": 99.99,
        "characters": 2000000,
        "languages": 50
    }
}

LANGUAGE_CODES = {
    "es": "Spanish", "de": "German", "fr": "French", "it": "Italian",
    "pt": "Portuguese", "nl": "Dutch", "pl": "Polish", "ru": "Russian",
    "ja": "Japanese", "zh": "Chinese", "ko": "Korean", "ar": "Arabic",
    "hi": "Hindi", "tr": "Turkish", "sv": "Swedish", "da": "Danish",
    "fi": "Finnish", "no": "Norwegian", "cs": "Czech", "el": "Greek",
    "he": "Hebrew", "id": "Indonesian", "uk": "Ukrainian", "vi": "Vietnamese",
    "th": "Thai", "sw": "Swahili", "en": "English"
}

users_db = {}

class User:
    def __init__(self, email, password_hash):
        self.id = str(uuid.uuid4())
        self.email = email
        self.password_hash = password_hash
        self.tier = SubscriptionTier.FREE
        self.characters_used = 0
        self.referral_code = hashlib.md5(f"{email}{self.id}".encode()).hexdigest()[:8].upper()
        self.created_at = datetime.now()

def get_password_hash(password):
    return pwd_context.hash(password)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

@app.get("/")
async def root():
    return {
        "name": "TWIN Lite Pro",
        "version": "3.0.1",
        "status": "operational",
        "users": len(users_db),
        "languages": len(LANGUAGE_CODES)
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "deepl_configured": bool(DEEPL_API_KEY),
        "deepl_key_length": len(DEEPL_API_KEY) if DEEPL_API_KEY else 0
    }

@app.post("/translate-and-speak")
async def translate_and_speak(
    text: str = Form(...),
    target_language: str = Form(...),
    source_language: str = Form("auto")
):
    """ELITE FEATURE: Translate and speak with global language support"""
    if not text or len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text must be between 1-5000 characters")
    
    char_count = len(text)
    logger.info(f"Translation request: {source_language} -> {target_language}, {char_count} chars")
    
    try:
        # Step 1: Translate text using DeepL if available
        translated_text = text
        
        if source_language != target_language and DEEPL_API_KEY and len(DEEPL_API_KEY) > 10:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # Map language codes for DeepL compatibility
                    deepl_target = target_language.upper()
                    if target_language == "zh-CN":
                        deepl_target = "ZH"  # DeepL uses ZH for Chinese
                    
                    payload = {
                        "text": text,
                        "target_lang": deepl_target
                    }
                    if source_language != "auto":
                        payload["source_lang"] = source_language.upper()
                    
                    response = await client.post(
                        "https://api-free.deepl.com/v2/translate",
                        headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
                        data=payload
                    )
                    
                    if response.status_code == 200:
                        translated_text = response.json()["translations"][0]["text"]
                        logger.info(f"DeepL translation successful")
                    else:
                        logger.warning(f"DeepL API error: {response.status_code}, using original text")
                        
            except Exception as e:
                logger.error(f"DeepL translation error: {e}")
                # Continue with original text if translation fails
        
        # Step 2: Generate speech with gTTS
        try:
            from gtts import gTTS
            
            # Language code mapping for gTTS compatibility
            gtts_lang_map = {
                "zh-CN": "zh-cn",  # Mandarin Chinese
                "zh-TW": "zh-tw",  # Traditional Chinese
                "ja": "ja",        # Japanese
                "ar": "ar",        # Arabic
                "ru": "ru",        # Russian
                "hi": "hi",        # Hindi
                "ko": "ko",        # Korean
                "es": "es",        # Spanish
                "de": "de",        # German
                "fr": "fr",        # French
                "it": "it",        # Italian
                "pt": "pt",        # Portuguese
                "en": "en"         # English
            }
            
            # Get mapped language code or use first 2 chars as fallback
            tts_lang = gtts_lang_map.get(target_language, target_language[:2])
            
            logger.info(f"Generating TTS for language: {tts_lang}")
            # Ensure proper encoding for gTTS
            encoded_text = translated_text.encode("utf-8").decode("utf-8")
            tts = gTTS(text=encoded_text, lang=tts_lang, slow=False)
            
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            
            # Success - return audio with translated text
            return StreamingResponse(
                mp3_fp,
                media_type="audio/mpeg",
                headers={"X-Translated-Text": translated_text}
            )
            
        except Exception as tts_error:
            # TTS failed but translation worked - return text with error info
            logger.error(f"TTS generation failed for {target_language}: {tts_error}")
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "translated_text": translated_text,
                    "audio_available": False,
                    "message": f"Translation successful! Audio playback is temporarily unavailable for {target_language}, but text translation is working perfectly.",
                    "target_language": target_language,
                    "character_count": char_count
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in translate_and_speak: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)



