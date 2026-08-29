# SkillGrade

## Overview

SkillGrade is a multilingual, voice-first livelihood planning prototype for PM-AJAY beneficiaries. It validates a beneficiary profile, deterministically filters unrelated or ineligible sectors, and combines qualifications, experience, mobility, training availability, demo jobs, market demand and self-employment possibilities.

The beneficiary can speak in English, Hindi or Tamil/Tanglish, confirm the extracted profile and receive explainable livelihood pathways. A separate counsellor-dashboard preview demonstrates aggregate programme monitoring.

### Screenshots

The following paths are reserved for real screenshots from the running application:

![SkillGrade landing screen](docs/screenshots/landing.png)

![Gemini Live voice interview](docs/screenshots/voice-interview.png)

![Livelihood recommendation results](docs/screenshots/recommendation-results.png)

![Counsellor dashboard preview](docs/screenshots/counsellor-dashboard.png)

> **Screenshot files must be added manually.** Capture these screens from the real running application and save them under `docs/screenshots/`. Placeholder or generated images should not be presented as actual product screenshots.

## Architecture

```text
Beneficiary / counsellor browser
            |
            v
React frontend (voice UI, profile confirmation, offline drafts)
    |                       |                         |
    | token / speech        | application / stats    | confirmed profile
    v                       v                         v
FastAPI backend --------> SQLite              Deterministic recommendation engine
    |
    v
Gemini Live (multilingual voice conversation)

shared/locations.json ------> shared frontend/backend pilot geography
docs/hackathon-scale-note.md -> scale, cost, rate-limit and production migration rationale
```

- `src/recommendationEngine.js` applies eligibility and sector hard filters before explainable weighted ranking.
- `src/providers/livelihoodDataProvider.js` separates prototype qualifications, centres, jobs and demand records from matching logic.
- `backend/main.py` protects the Gemini credential, validates submissions and stores non-identifying funnel records in SQLite.
- Gemini collects, corrects, explains and translates profile information; it does not invent qualification or eligibility data.

## Configure

Create a private `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_ai_studio_key
```

The backend also accepts these deployment settings:

```env
ALLOWED_ORIGINS=https://your-frontend.example
ALLOWED_ORIGIN_REGEX=^https://.*\.your-domain\.example$
SKILLGRADE_DB_PATH=/persistent/path/skillgrade.db
```

Never commit the `.env` file or expose the permanent Gemini key in frontend code.

## Run

Install the frontend and backend dependencies:

```powershell
npm.cmd install
python -m pip install -r requirements.txt
```

Start the React frontend and FastAPI backend together:

```powershell
npm.cmd run dev
```

Open `http://localhost:5173`. For microphone access from a mobile device, use an HTTPS deployment rather than a plain LAN HTTP address.

For the scripted judging fallback, open `http://localhost:5173/?demo=true`, sign in and select **Load demo profile**. Normal sessions do not show this control.

Useful verification commands:

```powershell
npm.cmd run test:recommendations
npm.cmd run build
```

## Demo boundaries

### Low-connectivity behaviour

- Every partial voice or form answer is saved locally as a resumable, account-scoped draft.
- Saved drafts appear under **Review saved profiles** after login.
- If Gemini Live disconnects, **Continue with offline form** opens a prefilled text form.
- Failed application submissions are marked **Pending sync**, retained locally and retried when connectivity returns or the user selects **Retry sync**.
- Qualification, training-centre, job and demand demo datasets are bundled with the frontend.
- Live voice still requires connectivity. The production scale path is Bhashini STT/TTS with a short request/response NLP call, plus an offline form or assisted-kiosk queue.

### Data and recommendation safeguards

- `shared/locations.json` is the single state/district pilot configuration used by the active frontend and backend.
- Education, experience and age eligibility are deterministic.
- Sector relevance is hard-filtered before scoring.
- Interest, relevant experience and existing skills are primary matching signals.
- Results below 60% are hidden.
- Catalog, training-centre, demand and job records are explicitly labelled prototype/demo unless independently verified.
- Gemini cannot create eligibility rules, qualifications, jobs, centres or salary claims.
- No salary increase is guaranteed, and no wage range is displayed without a verified source.

### Persistence and privacy

- Before `POST /api/applications` is sent, the frontend strips the beneficiary's name from both direct and queued submission payloads.
- The beneficiary's name is never stored in the backend database. SQLite persists only a hashed account identifier and limited funnel fields such as age band, district and course selection.
- Login, saved beneficiary profiles and resumable drafts remain browser-local in this prototype.
- Because browser-local profiles do contain the beneficiary's name, production still requires authenticated storage, encryption, consent-based retention and device-access protections.
- The officer dashboard is explicitly marked as an unauthenticated preview; it is not a production authorization system.

## Known limitations

- Gemini Live voice quality and availability depend on network conditions and provider availability.
- The qualification catalog is a proof of concept, not the complete registry across all Sector Skill Councils.
- Training centres, demand signals and job opportunities are realistic demo records, not live government listings.
- The current pilot configuration covers six Tamil Nadu districts.
- SQLite is suitable for a single prototype instance, not a multi-instance national deployment.
- Gemini token rate limits are stored in process memory and reset on restart; production requires a shared limiter or API gateway.
- Browser-local accounts do not work across devices. Production requires secure server-side identity, officer roles, encryption, retention rules and audited access control.
- National expansion requires official catalog and location-provider ingestion, plus production infrastructure; it does not require rewriting the deterministic matching engine.
- The production cost per interview must be measured using real duration, reconnect and provider-pricing data before making a cost claim. See [`docs/hackathon-scale-note.md`](docs/hackathon-scale-note.md).
