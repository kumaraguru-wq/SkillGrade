# SkillGrade

SkillGrade is a multilingual, voice-first livelihood planning prototype for PM-AJAY beneficiaries. It validates a beneficiary profile, deterministically filters unrelated or ineligible sectors, and combines qualifications, experience, mobility, training availability, demo jobs, market demand and self-employment possibilities.

## Run locally

Create a private `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_ai_studio_key
```

Then run:

```powershell
npm.cmd install
python -m pip install -r requirements.txt
npm.cmd run dev
```

Open `http://localhost:5173`. For mobile microphone access, deploy behind HTTPS.

## Low-connectivity behaviour

- Every partial voice or form answer is saved locally as a resumable account-scoped draft.
- Saved drafts appear under **Review saved profiles** after login.
- If Gemini Live disconnects, **Continue with offline form** opens a prefilled text form.
- Qualification, training-centre, job and demand demo datasets are bundled with the frontend.
- Live voice still requires connectivity. The production scale path is Bhashini STT/TTS with a short request/response NLP call, plus an offline form/kiosk queue.

## Data and configuration

- `shared/locations.json` is the single state/district pilot configuration used by the active frontend and backend.
- `src/providers/livelihoodDataProvider.js` isolates prototype data from the engine so official NQR/NCVET, training and employment providers can replace it without rewriting matching logic.
- The catalog is a proof of concept, not the full registry across 40+ Sector Skill Councils.
- `POST /api/applications` writes a non-identifying funnel record to SQLite. It excludes beneficiary names and stores only a hash of the local account ID.
- SQLite is suitable for a single prototype instance. A real deployment should use authenticated accounts, PostgreSQL, approved encryption, retention and access policies.

## Recommendation safeguards

- Education and age eligibility are deterministic.
- Sector relevance is hard-filtered before scoring.
- Interest, experience and skills are primary signals.
- Results below 60% are hidden.
- Gemini explains and translates; it cannot create eligibility rules, qualifications, jobs, centres or salary claims.

## Deployment configuration

The backend accepts these environment settings:

```env
GEMINI_API_KEY=...
ALLOWED_ORIGINS=https://your-frontend.example
ALLOWED_ORIGIN_REGEX=^https://.*\.your-domain\.example$
SKILLGRADE_DB_PATH=/persistent/path/skillgrade.db
```

## Honest prototype boundaries

- Voice depends on Gemini Live and network quality.
- Catalog, training centres, demand and job rows are explicitly labelled prototype/demo data.
- No salary increase is guaranteed, and no wage range is displayed without a verified source.
- Login and resumable drafts are browser-local; cross-device accounts require a secure server identity system.
- The current pilot configuration covers six Tamil Nadu districts. National expansion is a data/configuration operation, not a matching-engine rewrite.
