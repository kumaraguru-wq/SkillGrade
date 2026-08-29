import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { ArrowLeft, Check, CircleStop, Mic, MicOff, RefreshCcw, ShieldCheck, Sparkles, Volume2, X } from 'lucide-react';
import { LiveAudioPlayer, LiveMicrophone, bytesToBase64 } from './liveAudio';
import { supportedDistricts } from './location';
import { INTERVIEW_REQUIRED_FIELDS } from './interviewFields';

const districtNames=supportedDistricts.map(item=>item.name);

const OPTIONAL_FIELDS = ['familyOccupation', 'mobilityConstraints', 'skillProficiencyBand', 'existingQualification'];
const COLLECTABLE_FIELDS = [...INTERVIEW_REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const languageNames = { en: 'English', hi: 'Hindi', ta: 'Tamil with natural Tanglish and English code-switching' };

const declarations = [
  {
    name: 'record_beneficiary_details',
    description: 'Silently save one or more details learned from the beneficiary. Call this as soon as a detail is clear.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        consent: { type: Type.STRING, description: 'yes only after the beneficiary consents' },
        name: { type: Type.STRING },
        age: { type: Type.STRING },
        district: { type: Type.STRING, enum: districtNames },
        education: { type: Type.STRING, enum: ['none', 'class5', 'class8', 'class10', 'class12', 'iti', 'diploma', 'graduate'] },
        currentOccupation: { type: Type.STRING },
        yearsExperience: { type: Type.STRING, description: 'Numeric years, including zero' },
        skills: { type: Type.STRING, description: 'Specific existing practical skills; preserve coding and other English/Tanglish terms exactly' },
        skillProficiencyBand: { type: Type.STRING, enum: ['assisted', 'independent', 'advanced'], description: 'assisted when supervision is needed, independent for routine work without supervision, advanced when the person diagnoses and solves unfamiliar problems independently' },
        existingQualification: { type: Type.STRING, description: 'Existing certificate or qualification related to the skill; record none when the beneficiary has no relevant certificate' },
        familyOccupation: { type: Type.STRING, description: 'Family or traditional occupation; use none when there is none' },
        interests: { type: Type.STRING, description: 'Work and activities the beneficiary enjoys' },
        preferredField: { type: Type.STRING, description: 'The livelihood field they want to pursue' },
        employmentPreference: { type: Type.STRING, enum: ['job', 'self', 'both'] },
        willingToRelocate: { type: Type.STRING, enum: ['yes', 'no', 'limited'] },
        mobilityConstraints: { type: Type.STRING, description: 'Travel, disability, care or mobility constraints; use none when there are none' },
      },
    },
  },
  {
    name: 'complete_interview',
    description: 'Finish only after every required detail is recorded, the complete summary was spoken, and the beneficiary explicitly confirmed it is correct.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

function systemInstruction(language) {
  return `You are SkillGrade, a warm and patient female voice guide helping a Tamil Nadu livelihood beneficiary.

Conduct a natural spoken conversation in ${languageNames[language.key]}. In Tamil, understand and naturally use common Tanglish and English work words such as coding, computer, tailoring and business. Never sound like a questionnaire or announce field names.

You are a livelihood counsellor, not a form filler. Collect the beneficiary's consent, full name, age, district (currently supported pilot districts: ${districtNames.join(', ')}), education, current occupation, years of experience, existing skills, interests, preferred livelihood field, preference for a salaried job, self-employment or both, and willingness to travel or relocate.

The beneficiary's family or traditional occupation and mobility constraints are optional context. Save them if the beneficiary mentions them naturally, but do not explicitly ask for them and do not delay completion when they are absent.

After years of experience and the relevant skill are clear:
- If yearsExperience is greater than zero, ask exactly one natural follow-up that distinguishes whether the person needs supervision, handles routine tasks independently, or can diagnose and solve unfamiliar problems on their own. Map the answer to skillProficiencyBand as assisted, independent, or advanced respectively.
- If yearsExperience is zero, do not ask any proficiency follow-up. Silently record skillProficiencyBand as assisted.
- Ask whether they hold any existing certificate or qualification for that skill. Record its stated name accurately, or record existingQualification as none.

Conversation rules:
- Begin with a short friendly welcome, explain that you will have a brief conversation, and ask for consent. After consent, clearly ask for the beneficiary's full name in the selected conversation language and record it before completing the interview.
- Ask only one thing at a time, but respond naturally to whatever the person says.
- Do not ask “is that correct?” after each answer. Briefly acknowledge and continue.
- Use record_beneficiary_details silently whenever information becomes clear.
- If speech is unclear, say what you did understand and ask only for the missing part.
- Ask useful follow-up questions about the work they actually perform and what they hope to do next. Distinguish existing experience from an aspirational interest.
- Preserve English and Tanglish occupation words accurately. Coding means software/programming and must never be changed to stitching or tailoring.
- Record the current occupation exactly as stated. Never replace electrician work with office work, coding with tailoring, or any occupation with a guessed category.
- Never invent a qualification, eligibility rule, job, training centre, salary, or recommendation. The deterministic application engine handles those after profile confirmation.
- Understand corrections at any time and overwrite the relevant value using the tool.
- Once everything is collected, speak one concise complete livelihood-profile summary. Ask the person to correct anything or say that everything is correct.
- Call complete_interview only after explicit final confirmation and all fields are complete.
- Do not recommend courses during the interview. Keep replies concise and conversational.
- Never mention tools, JSON, forms, APIs, Gemini, or internal processing.`;
}

function GeminiOrb({ status }) {
  return <div className={`gemini-orb status-${status}`} aria-hidden="true">
    <span className="gemini-glow"/><span className="gemini-ring ring-a"/><span className="gemini-ring ring-b"/>
    <div className="orb-core"><i/><i/><i/><i/><i/><i/><i/></div>
  </div>;
}

export default function GeminiLive({ language, profile, setProfile, onComplete, onExit, onFallback, credential, active = true, onVoiceReady }) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [userCaption, setUserCaption] = useState('');
  const [assistantCaption, setAssistantCaption] = useState('');
  const [muted, setMuted] = useState(false);
  const [retry, setRetry] = useState(0);
  const profileRef = useRef(profile);
  const sessionRef = useRef(null);
  const microphoneRef = useRef(null);
  const playerRef = useRef(null);
  const mutedRef = useRef(false);
  const pendingCompletionRef = useRef(false);
  const inputTurnRef = useRef('');
  const outputTurnRef = useRef('');

  useEffect(() => { mutedRef.current = muted || !active; }, [active, muted]);

  const savedCount = useMemo(() => INTERVIEW_REQUIRED_FIELDS.filter(field => profile[field]).length, [profile]);

  const handleToolCalls = useCallback(async message => {
    const calls = message.toolCall?.functionCalls || [];
    if (!calls.length) return;
    const responses = [];
    for (const call of calls) {
      if (call.name === 'record_beneficiary_details') {
        const cleaned = {};
        for (const [key, value] of Object.entries(call.args || {})) {
          if (COLLECTABLE_FIELDS.includes(key) && value !== undefined && value !== null) cleaned[key] = String(value).trim();
        }
        const updated = { ...profileRef.current, ...cleaned };
        profileRef.current = updated;
        setProfile(updated);
        responses.push({ id: call.id, name: call.name, response: { result: 'Details saved', savedFields: Object.keys(cleaned) } });
      }
      if (call.name === 'complete_interview') {
        const missing = INTERVIEW_REQUIRED_FIELDS.filter(field => !profileRef.current[field]);
        if (missing.length) responses.push({ id: call.id, name: call.name, response: { result: 'Cannot finish yet', missingFields: missing } });
        else {
          pendingCompletionRef.current = true;
          responses.push({ id: call.id, name: call.name, response: { result: 'Application details confirmed' } });
        }
      }
    }
    if (responses.length) sessionRef.current?.sendToolResponse({ functionResponses: responses });
  }, [setProfile]);

  useEffect(() => {
    let cancelled = false;
    let session;
    const player = new LiveAudioPlayer();
    playerRef.current = player;

    async function connect() {
      setError('');
      setStatus('connecting');
      try {
        const microphone = new LiveMicrophone((buffer, sampleRate) => {
          if (!mutedRef.current && sessionRef.current) {
            sessionRef.current.sendRealtimeInput({ audio: { data: bytesToBase64(buffer), mimeType: `audio/pcm;rate=${sampleRate}` } });
          }
        });
        microphoneRef.current = microphone;
        const mediaReady = Promise.all([microphone.start(), player.ensureContext()]);
        const prefetchedIsFresh = credential?.token && Date.now() - credential.fetchedAt < 4 * 60 * 1000 && retry === 0;
        const tokenReady = prefetchedIsFresh ? Promise.resolve(credential) : fetch('/api/gemini/token', { method: 'POST' }).then(async response => {
          if (!response.ok) {
            const detail = await response.json().catch(() => ({}));
            throw new Error(detail.detail || 'Could not start the secure voice session');
          }
          return response.json();
        });
        const [{ token, model }] = await Promise.all([tokenReady, mediaReady]);
        if (cancelled) return;
        const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
        session = await ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            systemInstruction: { parts: [{ text: systemInstruction(language) }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                prefixPaddingMs: 300,
                silenceDurationMs: 1100,
              },
            },
            tools: [{ functionDeclarations: declarations }],
            sessionResumption: {},
          },
          callbacks: {
            onopen: () => setStatus('listening'),
            onmessage: async message => {
              if (message.serverContent?.interrupted) {
                player.interrupt();
                setStatus('listening');
              }
              const inputText = message.serverContent?.inputTranscription?.text;
              if (inputText) {
                inputTurnRef.current += inputText;
                setUserCaption(inputTurnRef.current);
              }
              const outputText = message.serverContent?.outputTranscription?.text;
              if (outputText) {
                outputTurnRef.current += outputText;
                setAssistantCaption(outputTurnRef.current);
              }
              const parts = message.serverContent?.modelTurn?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  setStatus('speaking');
                  await player.play(part.inlineData.data);
                }
              }
              await handleToolCalls(message);
              if (message.serverContent?.turnComplete) {
                inputTurnRef.current = '';
                outputTurnRef.current = '';
                setStatus('listening');
                if (pendingCompletionRef.current) {
                  pendingCompletionRef.current = false;
                  setTimeout(() => onComplete(profileRef.current), 450);
                }
              }
            },
            onerror: event => {
              setStatus('error');
              setError(event?.message || 'The live voice connection was interrupted.');
            },
            onclose: event => {
              if (!cancelled && !pendingCompletionRef.current) {
                setStatus('error');
                setError(event?.reason || 'The voice session ended.');
              }
            },
          },
        });
        if (cancelled) { session.close(); return; }
        sessionRef.current = session;
        onVoiceReady?.({
          speak: text => {
            if (!sessionRef.current || !text) return false;
            player.interrupt();
            const requestedLanguage = language.key === 'ta' ? 'natural Tamil with appropriate Tanglish for English terms' : language.key === 'hi' ? 'natural Hindi' : 'Indian English';
            sessionRef.current.sendRealtimeInput({ text: `[UI NARRATION] Speak the following naturally in ${requestedLanguage}. Translate it when needed. Do not ask a question, collect data, or call a tool. Say only the content: ${text}` });
            return true;
          },
          stop: () => player.interrupt(),
        });
        session.sendRealtimeInput({ text: 'Start the beneficiary conversation now with your spoken welcome.' });
      } catch (connectionError) {
        if (!cancelled) {
          setStatus('error');
          setError(connectionError.message || 'Unable to start the voice conversation.');
        }
      }
    }

    connect();
    return () => {
      cancelled = true;
      sessionRef.current = null;
      onVoiceReady?.(null);
      try { session?.close(); } catch { /* already closed */ }
      microphoneRef.current?.stop();
      player.close();
    };
  }, [credential, handleToolCalls, language, onComplete, onVoiceReady, retry]);

  const end = () => {
    sessionRef.current?.close();
    onExit();
  };

  return <main className={`gemini-live-page ${active ? '' : 'gemini-live-background'}`}>
    <header className="gemini-live-header">
      <div className="live-brand"><div className="brand-mark"><img src="/skillgrade-logo.png" alt=""/></div><div><b>SkillGrade Live</b><span>AI voice guidance</span></div></div>
      <div className="secure-session"><ShieldCheck size={15}/>Secure live session</div>
      <button className="end-session" onClick={end}><ArrowLeft size={17}/>Back</button>
    </header>

    <section className="gemini-live-content">
      <div className="live-progress"><div><span>Application details</span><b>{savedCount} of {INTERVIEW_REQUIRED_FIELDS.length}</b></div><div><i style={{ width: `${(savedCount / INTERVIEW_REQUIRED_FIELDS.length) * 100}%` }}/></div></div>
      <div className="live-visual"><GeminiOrb status={status}/><p className="live-state">{status === 'connecting' ? 'Connecting securely…' : status === 'speaking' ? 'SkillGrade is speaking' : status === 'listening' ? 'I’m listening' : 'Connection paused'}</p><span className="live-language">{language.native} · natural conversation</span></div>

      <div className="live-captions">
        <div className="caption assistant-caption"><span>SKILLGRADE</span><p>{assistantCaption || (status === 'connecting' ? 'Preparing your voice guide…' : 'Our conversation will appear here.')}</p></div>
        {userCaption && <div className="caption user-caption"><span>YOU</span><p>{userCaption}</p></div>}
      </div>

      {error && <div className="live-error"><b>Voice session interrupted</b><p>{error} Your answers so far were saved as a draft.</p><div className="live-error-actions"><button onClick={() => setRetry(value => value + 1)}><RefreshCcw size={16}/>Reconnect</button><button onClick={onFallback}><ArrowLeft size={16}/>Continue with offline form</button></div></div>}

      <div className="live-controls">
        <button className={muted ? 'muted' : ''} onClick={() => setMuted(value => !value)}>{muted ? <MicOff size={21}/> : <Mic size={21}/>}<span>{muted ? 'Unmute' : 'Mute'}</span></button>
        <div className="handsfree"><i/><span><b>Hands-free mode</b><small>Speak naturally. Pause whenever you need.</small></span></div>
        <button onClick={end}><CircleStop size={21}/><span>Finish</span></button>
      </div>
    </section>
  </main>;
}
