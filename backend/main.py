from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
from secrets import randbelow
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
import edge_tts
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Application(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    age: str
    gender: str
    phone: str = Field(min_length=10, max_length=15)
    district: Literal[
        "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Dharmapuri"
    ]
    block: str
    village: str
    education: str
    skill: str
    goal: Literal["income", "job", "self"]
    consent: str
    selectedCourse: str
    language: Literal["en", "hi", "ta"]


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1200)
    language: Literal["en", "hi", "ta"]


app = FastAPI(
    title="SkillGrade Demo API",
    version="0.1.0",
    description="Credential-free prototype service for voice-led skill applications.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "skillgrade-demo"}


@app.post("/api/gemini/token")
def create_gemini_live_token() -> dict[str, str]:
    """Mint a single-use token so the permanent Gemini key stays server-side."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")
    now = datetime.now(timezone.utc)
    payload = json.dumps({
        "uses": 1,
        "expireTime": (now + timedelta(minutes=30)).isoformat().replace("+00:00", "Z"),
        "newSessionExpireTime": (now + timedelta(minutes=5)).isoformat().replace("+00:00", "Z"),
    }).encode("utf-8")
    request = Request(
        "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
        data=payload,
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            token = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=502, detail=f"Gemini authentication failed: {detail[:240]}") from exc
    except (URLError, TimeoutError) as exc:
        raise HTTPException(status_code=503, detail="Gemini authentication service is unavailable") from exc
    if not token.get("name"):
        raise HTTPException(status_code=502, detail="Gemini returned an invalid session token")
    return {"token": token["name"], "model": "gemini-3.1-flash-live-preview"}


@app.post("/api/applications", status_code=201)
def create_application(application: Application) -> dict[str, str]:
    """Validate a demo application and return a non-identifying reference.

    The prototype intentionally does not persist personal information. Replace this
    adapter with the approved government API when an integration is available.
    """
    now = datetime.now(timezone.utc)
    reference = f"TNS-{now.year}-{randbelow(900000) + 100000}"
    return {
        "reference": reference,
        "status": "received",
        "submittedAt": now.isoformat(),
        "course": application.selectedCourse,
    }


@app.post("/api/speech")
async def create_speech(request: SpeechRequest) -> Response:
    """Return website-delivered neural speech without requiring device voices."""
    voices = {
        "ta": "ta-IN-ValluvarNeural",
        "hi": "hi-IN-SwaraNeural",
        "en": "en-IN-NeerjaNeural",
    }
    communicator = edge_tts.Communicate(
        request.text,
        voices[request.language],
        rate="-4%" if request.language == "ta" else "-3%",
        pitch="-2Hz" if request.language == "ta" else "+0Hz",
    )

    audio = bytearray()
    try:
        async for chunk in communicator.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Speech service unavailable") from exc
    if not audio:
        raise HTTPException(status_code=503, detail="No speech audio was generated")
    return Response(content=bytes(audio), media_type="audio/mpeg")
