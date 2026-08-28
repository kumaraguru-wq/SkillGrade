# SkillCube Live

A responsive, real-time AI voice guide for Tamil Nadu livelihood beneficiaries. Gemini Live conducts a natural conversation in English, Hindi, Tamil, or Tanglish; silently fills an application; reads one final summary; accepts spoken corrections; and then produces explainable NSQF course recommendations.

## Configure

Create `.env` in the project root. Never expose this value through a `VITE_` variable or commit the file.

```env
GEMINI_API_KEY=your_google_ai_studio_key
```

The backend exchanges this permanent secret for a single-use, short-lived token. Only that temporary token reaches the browser.

## Run

```powershell
npm.cmd install
python -m pip install -r backend/requirements.txt
npm.cmd run dev
```

The development command starts the Vite website and FastAPI service together. Open `http://localhost:5173` in Chrome or Edge and allow microphone access once.

For a phone on the same Wi-Fi, use the Wi-Fi address printed by Vite. Microphone access on non-localhost addresses normally requires HTTPS, so deploy both frontend and backend behind HTTPS before sharing a public link.

## Live conversation

- One continuous PCM microphone stream; no repeated mic tapping
- Gemini server-side voice activity detection with pause tolerance
- Native audio replies and interruption support
- Secure token prefetch and parallel audio initialization for a faster first response
- Input and output live captions
- Natural Tamil/English code-switching and Tanglish
- Background tool calls that fill the beneficiary profile
- Patient, cumulative ten-digit phone-number collection
- One spoken summary with conversational corrections
- Automatic handoff to explainable recommendations after final confirmation
- The same persistent Gemini voice narrates recommendations, review, translation, and submission

## Demo boundaries

- Course and local-demand information is realistic sample data, not current official availability.
- Government submission is explicitly simulated.
- No Aadhaar or identity document is collected.
- Replace `POST /api/applications` with an authorised government endpoint before production use.
