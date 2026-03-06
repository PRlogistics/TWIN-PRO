"""
TWIN Lite Pro - Business Edition
With Crypto Payments
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
from pydantic import BaseModel, EmailStr
import httpx
from jose import jwt
from passlib.context import CryptContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TWIN Lite Pro", version="3.0.5")

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

LANGUAGE_CODES = {
    "es": "Spanish", "de": "German", "fr": "French", "it": "Italian",
    "pt": "Portuguese", "nl": "Dutch", "sv": "Swedish", "da": "Danish",
    "cs": "Czech", "id": "Indonesian", "en": "English"
}

def get_password_hash(password):
    return pwd_context.hash(password)

@app.get("/")
async def root():
    return {"name": "TWIN Lite Pro", "version": "3.0.5", "status": "live", "languages": len(LANGUAGE_CODES)}

@app.get("/health")
async def health():
    return {"status": "healthy", "deepl_configured": bool(DEEPL_API_KEY)}

def generate_tts(text, lang):
    try:
        from gtts import gTTS
        lang_map = {
            "zh-CN": "zh-cn", "ja": "ja", "ar": "ar", "ru": "ru",
            "hi": "hi", "ko": "ko", "es": "es", "de": "de", "fr": "fr",
            "it": "it", "pt": "pt", "en": "en", "nl": "nl", "sv": "sv",
            "da": "da", "cs": "cs", "id": "id"
        }
        tts_lang = lang_map.get(lang, lang[:2])
        tts = gTTS(text=text, lang=tts_lang, slow=False)
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
    
    try:
        translated = text
        if DEEPL_API_KEY and source_language != target_language:
            try:
                async with httpx.AsyncClient() as client:
                    deepl_lang = target_language.upper()
                    if target_language == "zh-CN":
                        deepl_lang = "ZH"
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
            return JSONResponse({"translated_text": translated, "audio": None, "message": f"Translation: {translated}"})
            
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# CRYPTO PAYMENT MODELS
class CryptoPaymentRequest(BaseModel):
    coin: str
    amount_usd: float
    user_email: str

class CryptoPaymentVerify(BaseModel):
    tx_hash: str
    coin: str
    amount: float

@app.post("/crypto/create-payment")
async def create_crypto_payment(request: CryptoPaymentRequest):
    wallets = {
        "btc": os.getenv("BTC_WALLET", "YOUR_BTC_ADDRESS"),
        "eth": os.getenv("ETH_WALLET", "YOUR_ETH_ADDRESS"),
        "usdt": os.getenv("USDT_WALLET", "YOUR_USDT_ADDRESS")
    }
    
    if request.coin not in wallets:
        raise HTTPException(status_code=400, detail="Unsupported cryptocurrency")
    
    payment_id = str(uuid.uuid4())
    
    return {
        "payment_id": payment_id,
        "wallet_address": wallets[request.coin],
        "amount_usd": request.amount_usd,
        "status": "pending",
        "message": f"Send payment to {wallets[request.coin]}. Email support@twinlite.com with payment ID after sending."
    }

@app.post("/crypto/verify-payment")
async def verify_crypto_payment(verification: CryptoPaymentVerify):
    return {
        "status": "received",
        "message": "Payment received and being verified. You will receive confirmation email within 24 hours.",
        "tx_hash": verification.tx_hash
    }

@app.get("/crypto/supported")
async def supported_crypto():
    return {
        "coins": [
            {"id": "btc", "name": "Bitcoin", "symbol": "BTC"},
            {"id": "eth", "name": "Ethereum", "symbol": "ETH"},
            {"id": "usdt", "name": "Tether", "symbol": "USDT"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
