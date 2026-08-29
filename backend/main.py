from collections import deque
from datetime import datetime, timedelta, timezone
import json
import os
import hashlib
import math
import sqlite3
from pathlib import Path
from secrets import randbelow
from threading import Lock
from time import monotonic
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
import edge_tts
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


ROOT_DIR = Path(__file__).resolve().parents[1]
LOCATION_CONFIG = json.loads((ROOT_DIR / "shared" / "locations.json").read_text(encoding="utf-8"))
SUPPORTED_DISTRICTS = {district["name"] for state in LOCATION_CONFIG["states"] for district in state["districts"]}
QUALIFICATION_CATALOG = json.loads((ROOT_DIR / "src" / "data" / "qualifications.json").read_text(encoding="utf-8"))
QUALIFICATION_IDS = frozenset(qualification["id"] for qualification in QUALIFICATION_CATALOG)
DATABASE_PATH = Path(os.getenv("SKILLGRADE_DB_PATH", str(ROOT_DIR / "backend" / "data" / "skillgrade.db")))
TOKEN_RATE_LIMITS = ((60, 5), (3600, 20))
TOKEN_RATE_MAX_WINDOW = max(window for window, _ in TOKEN_RATE_LIMITS)
TOKEN_REQUESTS: dict[str, deque[float]] = {}
TOKEN_REQUESTS_LOCK = Lock()


def enforce_gemini_token_rate_limit(client_ip: str) -> None:
    """Apply per-process sliding-window limits before minting a paid token."""
    now = monotonic()
    with TOKEN_REQUESTS_LOCK:
        attempts = TOKEN_REQUESTS.setdefault(client_ip, deque())
        while attempts and now - attempts[0] >= TOKEN_RATE_MAX_WINDOW:
            attempts.popleft()

        retry_after = 0
        for window_seconds, maximum_requests in TOKEN_RATE_LIMITS:
            requests_in_window = [timestamp for timestamp in attempts if now - timestamp < window_seconds]
            if len(requests_in_window) >= maximum_requests:
                retry_after = max(retry_after, math.ceil(window_seconds - (now - requests_in_window[-maximum_requests])))

        if retry_after:
            raise HTTPException(
                status_code=429,
                detail=f"Gemini voice session limit reached for this network. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        attempts.append(now)


class Application(BaseModel):
    accountId: str = Field(default="anonymous", max_length=100)
    age: int = Field(ge=15, le=70)
    district: str
    state: str = "Tamil Nadu"
    education: str = ""
    currentOccupation: str = ""
    yearsExperience: float = Field(default=0, ge=0, allow_inf_nan=False)
    skills: str = ""
    skillProficiencyBand: Literal["assisted", "independent", "advanced"] = "assisted"
    existingQualification: str = "none"
    interests: str = ""
    employmentPreference: str = "both"
    willingToRelocate: str = "limited"
    selectedCourse: str = ""
    language: Literal["en", "hi", "ta"] = "en"

    @field_validator("selectedCourse")
    @classmethod
    def selected_course_must_exist(cls, value: str) -> str:
        if value not in QUALIFICATION_IDS:
            raise ValueError("Selected course ID does not exist in the qualification catalog")
        return value


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
    allow_origins=[origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()],
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"^https?://(?:(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(?::\d+)?|[a-z0-9-]+\.onrender\.com)$"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS applications (
            reference TEXT PRIMARY KEY, submitted_at TEXT NOT NULL, account_hash TEXT NOT NULL,
            age_band TEXT, district TEXT NOT NULL, state TEXT NOT NULL, education TEXT,
            occupation TEXT, experience_years REAL, skills TEXT, skill_proficiency_band TEXT,
            existing_qualification TEXT, interests TEXT,
            employment_preference TEXT, mobility TEXT, selected_course TEXT, language TEXT, status TEXT NOT NULL
        )""")
        for column_definition in (
            "skill_proficiency_band TEXT DEFAULT 'assisted'",
            "existing_qualification TEXT DEFAULT 'none'",
        ):
            try:
                connection.execute(f"ALTER TABLE applications ADD COLUMN {column_definition}")
            except sqlite3.OperationalError as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise


init_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "skillgrade-demo"}


@app.post("/api/gemini/token")
def create_gemini_live_token(request: FastAPIRequest) -> dict[str, str]:
    """Mint a single-use token so the permanent Gemini key stays server-side."""
    client_ip = request.client.host if request.client else "unknown"
    enforce_gemini_token_rate_limit(client_ip)
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
    """Persist a non-identifying funnel record and return its reference."""
    if application.district not in SUPPORTED_DISTRICTS:
        raise HTTPException(status_code=422, detail="District is not enabled in the shared pilot configuration")
    now = datetime.now(timezone.utc)
    reference = f"TNS-{now.year}-{randbelow(900000) + 100000}"
    age = application.age
    age_band = "15-17" if age < 18 else "18-24" if age < 25 else "25-34" if age < 35 else "35-44" if age < 45 else "45+"
    account_hash = hashlib.sha256(application.accountId.strip().lower().encode("utf-8")).hexdigest()
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("""INSERT INTO applications
            (reference,submitted_at,account_hash,age_band,district,state,education,occupation,experience_years,skills,skill_proficiency_band,existing_qualification,interests,employment_preference,mobility,selected_course,language,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(
            reference,now.isoformat(),account_hash,age_band,application.district,application.state,application.education,
            application.currentOccupation,application.yearsExperience,application.skills,application.skillProficiencyBand,application.existingQualification,application.interests,
            application.employmentPreference,application.willingToRelocate,application.selectedCourse,application.language,"received"
        ))
    return {
        "reference": reference,
        "status": "received",
        "submittedAt": now.isoformat(),
        "course": application.selectedCourse,
    }


@app.get("/api/applications/stats")
def application_stats() -> dict:
    """Return aggregate prototype funnel statistics without personal records."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        total = connection.execute("SELECT COUNT(*) FROM applications").fetchone()[0]
        districts = dict(connection.execute("SELECT district, COUNT(*) FROM applications GROUP BY district").fetchall())
        pathways = dict(connection.execute("SELECT selected_course, COUNT(*) FROM applications WHERE selected_course != '' GROUP BY selected_course").fetchall())
    return {"total": total, "byDistrict": districts, "byPathway": pathways, "dataPolicy": "Non-identifying prototype funnel records"}


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
