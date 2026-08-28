import { GoogleGenAI, Modality } from '@google/genai';

const response = await fetch('http://127.0.0.1:8003/api/gemini/token', { method: 'POST' });
if (!response.ok) throw new Error(`Token endpoint failed: ${response.status}`);
const { token, model } = await response.json();
const client = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

let received = false;
let session;
const timeout = setTimeout(() => {
  console.error('Gemini Live test timed out');
  session?.close();
  process.exitCode = 1;
}, 20000);

session = await client.live.connect({
  model,
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    systemInstruction: { parts: [{ text: 'You are a concise voice assistant.' }] },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: { automaticActivityDetection: { disabled: false, prefixPaddingMs: 300, silenceDurationMs: 1100 } },
    tools: [{ functionDeclarations: [{ name: 'save_test', description: 'Save a test value', parameters: { type: 'OBJECT', properties: { value: { type: 'STRING' } } } }] }],
    sessionResumption: {},
  },
  callbacks: {
    onopen: () => {},
    onmessage: message => {
      const hasAudio = message.serverContent?.modelTurn?.parts?.some(part => part.inlineData?.data);
      if (hasAudio || message.serverContent?.outputTranscription?.text) {
        received = true;
        console.log('Gemini Live audio response: received');
        clearTimeout(timeout);
        session.close();
      }
    },
    onerror: event => {
      console.error(`Gemini Live error: ${event.message || 'unknown'}`);
      clearTimeout(timeout);
      process.exitCode = 1;
    },
    onclose: () => {
      if (!received) process.exitCode = 1;
    },
  },
});
session.sendRealtimeInput({ text: 'Say only: connection ready.' });
