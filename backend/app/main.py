"""
TWIN Lite Pro - Business Edition
Full Feature Set with Analytics
"""

import os
import io
import uuid
import hashlib
import logging
import json
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

app = FastAPI(title="TWIN Lite Pro", version="3.1.0")

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
STRIPE_KEY = os.getenv("STRIPE_SECRET_KEY", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 18 Working Languages
LANGUAGE_CODES = {
    "en": "English", "es": "Spanish", "de": "German", "fr": "French",
    "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "sv": "Swedish",
    "da": "Danish", "no": "Norwegian", "fi": "Finnish", "cs": "Czech",
    "pl": "Polish", "ro": "Romanian", "hu": "Hungarian", "sk": "Slovak",
    "bg": "Bulgarian", "hr": "Croatian"
}

# Analytics storage (use Redis/DB in production)
analytics = {
    "translations": 0,
    "languages_used": {},
    "users": set()
}

@app.middleware("http")
async def track_requests(request: Request, call_next):
    """Track all API requests for analytics"""
    if request.url.path == "/translate-and-speak":
        analytics["translations"] += 1
    response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {
        "name": "TWIN Lite Pro",
        "version": "3.1.0",
        "status": "live",
        "languages": len(LANGUAGE_CODES),
        "total_translations": analytics["translations"]
    }

@app.get("/analytics")
async def get_analytics():
    """Get usage analytics"""
    return {
        "total_translations": analytics["translations"],
        "languages_supported": len(LANGUAGE_CODES),
        "language_list": list(LANGUAGE_CODES.keys()),
        "timestamp": datetime.now().isoformat()
    }

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
async def translate_and_speak(text: str = Form(...), target_language: str = Form(...), source_language: str = Form("auto")):
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    # Track language usage
    analytics["languages_used"][target_language] = analytics["languages_used"].get(target_language, 0) + 1
    
    try:
        translated = text
        if DEEPL_API_KEY and source_language != target_language:
            try:
                async with httpx.AsyncClient() as client:
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
        
        if success and audio:
            return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg", headers={"X-Translated-Text": translated})
        else:
            return JSONResponse({"translated_text": translated, "audio": None})
            
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Stripe Payment Endpoints
@app.post("/stripe/create-checkout")
async def create_checkout(plan: str = Form(...)):
    """Create Stripe checkout session"""
    if not STRIPE_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    prices = {
        "starter": "price_starter_999",
        "pro": "price_pro_2999",
        "enterprise": "price_enterprise_9999"
    }
    
    # TODO: Implement actual Stripe integration
    return {"url": "https://checkout.stripe.com/pay/demo", "plan": plan}

# Crypto Payment Endpoints
class CryptoPayment(BaseModel):
    coin: str
    amount: float
    tx_hash: str = None

@app.post("/crypto/payment")
async def crypto_payment(payment: CryptoPayment):
    """Process crypto payment"""
    wallets = {
        "btc": os.getenv("BTC_WALLET", "YOUR_BTC"),
        "eth": os.getenv("ETH_WALLET", "YOUR_ETH"),
        "usdt": os.getenv("USDT_WALLET", "YOUR_USDT")
    }
    
    return {
        "status": "pending",
        "wallet": wallets.get(payment.coin, "NOT_CONFIGURED"),
        "message": "Send payment and email tx hash to support@twinlite.com"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
