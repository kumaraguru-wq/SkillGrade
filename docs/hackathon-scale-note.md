# SkillGrade: scale, cost and government integration

## Demo architecture

Gemini Live provides the most natural hackathon conversation and correction experience. It is intentionally not presented as the only production voice provider.

## Scale path

1. Bhashini or an approved Indian-language STT service converts short utterances to text.
2. A smaller request/response language model extracts only the beneficiary profile fields.
3. SkillGrade's deterministic engine performs eligibility, relevance and ranking without an LLM.
4. Bhashini or approved TTS reads the result.
5. Offline forms and assisted kiosks queue encrypted drafts for later synchronization.

This reduces continuous streaming time, supports government-aligned language infrastructure and keeps qualification truth outside the model.

## Cost story

Do not quote a cost per interview until provider pricing, average interview duration, audio volume and caching measurements are verified. Measure:

- median interview minutes and reconnect rate;
- audio input/output volume per language;
- token-extraction cost per completed profile;
- completion rates for Live voice versus STT + extraction + TTS;
- Bhashini quota/operating agreements;
- cost per completed, validated beneficiary profile—not cost per API request.

## Catalog expansion

The prototype catalog is deliberately small. Production ingestion should import and validate qualification packs from official NQR/NCVET/NSDC sources, version every eligibility rule, retain source provenance and run regression scenarios before publishing a catalog update.

## Gemini token endpoint protection

`POST /api/gemini/token` uses a per-IP sliding-window limit of **5 requests per minute and 20 requests per hour**. A normal interview needs one short-lived token, so these limits allow reasonable reconnects while reducing scripted token minting, unexpected Gemini cost and abuse. Rejected requests return HTTP `429`, a clear retry message and a `Retry-After` header.

The hackathon implementation keeps counters in memory and intentionally adds no rate-limiting dependency. This is suitable for a single demo process, but counters are not shared across multiple workers and reset when the service restarts. A production deployment should move the same limits to a shared store or API gateway (for example Redis, a cloud rate limiter or an approved government gateway), use the correctly configured proxy/client IP, and monitor legitimate reconnect failures before changing the thresholds.
