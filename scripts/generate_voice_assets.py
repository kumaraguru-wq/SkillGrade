"""Generate bundled Tamil prompts for the credential-free demo experience."""

import asyncio
from pathlib import Path

import edge_tts


PROMPTS = {
    "language-sample": "தமிழில் தொடரவும்",
    "confirm": "இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.",
    "acknowledge": "சரி, பதிவு செய்துவிட்டேன். அடுத்ததாக.",
    "consent": "தொடங்குவதற்கு முன், திறன் வழிகாட்டலுக்காக உங்கள் பதில்களைப் பகிர ஒப்புக்கொள்கிறீர்களா?",
    "name": "உங்கள் முழுப் பெயர் என்ன?",
    "age": "உங்கள் வயது என்ன?",
    "gender": "உங்கள் பாலினம் என்ன?",
    "phone": "உங்கள் பத்து இலக்க கைபேசி எண் என்ன?",
    "district": "தமிழ்நாட்டில் எந்த மாவட்டத்தில் வசிக்கிறீர்கள்?",
    "block": "உங்கள் வட்டாரம் அல்லது பகுதி எது?",
    "village": "உங்கள் கிராமம் அல்லது ஊர் எது?",
    "education": "உங்கள் உயர்ந்த கல்வித் தகுதி என்ன?",
    "skill": "உங்களுக்கு ஏற்கனவே தெரிந்த அல்லது விருப்பமான வேலை என்ன?",
    "goal": "உங்கள் முக்கிய இலக்கு என்ன?",
    "submitted": "உங்கள் விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது.",
}


async def generate() -> None:
    destination = Path(__file__).resolve().parents[1] / "public" / "audio" / "ta"
    destination.mkdir(parents=True, exist_ok=True)
    for name, text in PROMPTS.items():
        output = destination / f"{name}.mp3"
        print(f"Generating {output.name}")
        await edge_tts.Communicate(text, "ta-IN-ValluvarNeural", rate="-4%", pitch="-2Hz").save(output)


if __name__ == "__main__":
    asyncio.run(generate())
