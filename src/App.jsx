import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, BriefcaseBusiness, Check, CheckCircle2,
  ChevronRight, CircleUserRound, Clock3, GraduationCap, Headphones, Languages,
  FolderOpen, LogOut, MapPin, Mic, MicOff, RefreshCcw, RotateCcw, ShieldCheck, Sparkles, Speaker,
  SquarePen, Volume2, WifiOff, X,
} from 'lucide-react';
import { copy, courses, districtDetails, districts, languageOptions, questions } from './data';
import { tamilVoiceAssets } from './voiceAssets';
import GeminiLive from './GeminiLive';
import { recommendPathways } from './recommendationEngine';
import { AssessmentForm, CareerRoadmap, CounsellorAdmin, LivelihoodRecommendations, ProfileSummary, RecommendationDetails } from './CounsellorPages';
import { OpportunityDetails, OpportunityRecommendations, PersonalizedRoadmap } from './LivelihoodJourney';
import SavedProfiles from './SavedProfiles';
import AuthScreen from './AuthScreen';

const SESSION_KEY='skillgrade-session-v1';
const savedProfilesKey=userId=>`skillgrade-beneficiaries-v2:${userId}`;
function loadSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null') } catch { return null } }
function loadSavedProfiles(userId) {
  if(!userId)return [];
  try { const value = JSON.parse(localStorage.getItem(savedProfilesKey(userId)) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceRequest;
let websiteAudio;

function stopWebsiteAudio() {
  if (!websiteAudio) return;
  websiteAudio.pause();
  websiteAudio.src = '';
  websiteAudio = null;
}

function playAudioSource(source, after) {
  stopWebsiteAudio();
  const audio = new Audio(source);
  websiteAudio = audio;
  audio.onended = () => {
    websiteAudio = null;
    if (after) after();
  };
  audio.onerror = () => {
    websiteAudio = null;
    if (after) after();
  };
  return audio.play();
}

function getVoicesReady() {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve([]);
  const available = synth.getVoices();
  if (available.length) return Promise.resolve(available);
  if (voiceRequest) return voiceRequest;
  voiceRequest = new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices());
      voiceRequest = null;
    };
    synth.addEventListener?.('voiceschanged', finish, { once: true });
    setTimeout(finish, 1800);
  });
  return voiceRequest;
}

function bestVoice(voices, language) {
  const target = language.code.toLowerCase();
  const base = language.key.toLowerCase();
  const matching = voices.filter(voice => {
    const code = voice.lang.toLowerCase();
    return code === target || code.startsWith(`${base}-`) || code === base;
  });
  const quality = voice => {
    const name = voice.name.toLowerCase();
    let score = voice.lang.toLowerCase() === target ? 100 : 70;
    if (name.includes('google')) score += 60;
    if (name.includes('natural') || name.includes('neural')) score += 55;
    if (name.includes('online')) score += 35;
    if (name.includes('microsoft')) score += 25;
    if (name.includes('pallavi') || name.includes('valluvar')) score += 15;
    if (voice.default) score += 5;
    return score;
  };
  return matching.sort((a, b) => quality(b) - quality(a))[0] || null;
}

const skillAliases = {
  tailoring: ['tailor', 'stitch', 'sew', 'silai', 'सिलाई', 'दर्जी', 'தையல்'],
  farming: ['farm', 'crop', 'garden', 'खेती', 'किसान', 'वிவசாய', 'பயிர்'],
  cooking: ['cook', 'food', 'bake', 'pickle', 'खाना', 'पकाना', 'अचार', 'சமையல்', 'உணவு', 'ஊறுகாய்'],
  electrical: ['electric', 'wire', 'repair', 'बिजली', 'मरम्मत', 'மின்', 'பழுது'],
  computer: ['computer', 'typing', 'data', 'coding', 'programming', 'software', 'website', 'web development', 'app development', 'developer', 'code panna', 'coding pidikkum', 'கோடிங்', 'புரோகிராமிங்', 'கம்ப்யூட்டர்', 'கணினி', 'தட்டச்சு', 'कंप्यूटर', 'टाइपिंग', 'कोडिंग', 'प्रोग्रामिंग'],
  healthcare: ['care', 'nurse', 'health', 'देखभाल', 'नर्स', 'பராமரிப்பு', 'செவிலி'],
  retail: ['sell', 'shop', 'people', 'बिक्री', 'दुकान', 'விற்பனை', 'கடை'],
  plumbing: ['plumb', 'pipe', 'नल', 'पाइप', 'குழாய்'],
};

const labels = {
  name: 'Full name', age: 'Age', gender: 'Gender', phone: 'Mobile number', district: 'District',
  block: 'Block / area', village: 'Village / locality', education: 'Education', skill: 'Skill / interest', goal: 'Goal', consent: 'Consent',
};

const localizedLabels = {
  hi: { name: 'पूरा नाम', age: 'उम्र', gender: 'लिंग', phone: 'मोबाइल नंबर', district: 'ज़िला', block: 'ब्लॉक / क्षेत्र', village: 'गाँव / मोहल्ला', education: 'शिक्षा', skill: 'कौशल / रुचि', goal: 'लक्ष्य', consent: 'सहमति' },
  ta: { name: 'முழுப் பெயர்', age: 'வயது', gender: 'பாலினம்', phone: 'கைபேசி எண்', district: 'மாவட்டம்', block: 'வட்டாரம் / பகுதி', village: 'கிராமம் / ஊர்', education: 'கல்வி', skill: 'திறன் / விருப்பம்', goal: 'இலக்கு', consent: 'ஒப்புதல்' },
};

function normalizeDigits(value) {
  const numeralMap = { '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9','௦':'0','௧':'1','௨':'2','௩':'3','௪':'4','௫':'5','௬':'6','௭':'7','௮':'8','௯':'9' };
  const wordMap = {
    zero:'0', oh:'0', one:'1', two:'2', three:'3', four:'4', five:'5', six:'6', seven:'7', eight:'8', nine:'9',
    shunya:'0', ek:'1', do:'2', teen:'3', char:'4', chaar:'4', paanch:'5', cheh:'6', saat:'7', aath:'8', nau:'9',
    'शून्य':'0', 'एक':'1', 'दो':'2', 'तीन':'3', 'चार':'4', 'पांच':'5', 'छह':'6', 'सात':'7', 'आठ':'8', 'नौ':'9',
    onnu:'1', ondru:'1', rendu:'2', moonu:'3', moondru:'3', naalu:'4', anju:'5', aindhu:'5', aaru:'6', ezhu:'7', ettu:'8', ombadhu:'9', onbadhu:'9', suzhiyam:'0',
    'பூஜ்ஜியம்':'0', 'சுழியம்':'0', 'ஒன்று':'1', 'ஒரு':'1', 'ரெண்டு':'2', 'இரண்டு':'2', 'மூன்று':'3', 'மூணு':'3', 'நான்கு':'4', 'நாலு':'4', 'ஐந்து':'5', 'அஞ்சு':'5', 'ஆறு':'6', 'ஏழு':'7', 'எட்டு':'8', 'ஒன்பது':'9', 'ஒம்பது':'9',
    twenty:'2', thirty:'3', forty:'4', fifty:'5', sixty:'6', seventy:'7', eighty:'8', ninety:'9', 'இருபத்தி':'2', 'முப்பத்தி':'3', 'நாற்பத்தி':'4',
  };
  const tokens = String(value).replace(/[०-९௦-௯]/g, c => numeralMap[c]).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/);
  let output = '';
  let repeat = 1;
  for (const token of tokens) {
    if (token === 'double' || token === 'டபுள்') { repeat = 2; continue; }
    if (token === 'triple' || token === 'ட்ரிபிள்') { repeat = 3; continue; }
    const digit = /^\d+$/.test(token) ? token : wordMap[token];
    if (digit !== undefined) output += digit.repeat(repeat);
    repeat = 1;
  }
  return output;
}

function inferSkill(text = '') {
  const lower = text.toLowerCase();
  const result = Object.entries(skillAliases).find(([, aliases]) => aliases.some(alias => lower.includes(alias)));
  return result?.[0] || lower.split(/\s+/).filter(Boolean)[0] || 'general';
}

function scoreCourses(profile) {
  const inferred = inferSkill(profile.skill);
  const spokenSkill = String(profile.skill).toLowerCase();
  const districtDemand = districtDetails[profile.district]?.demand || [];
  return courses.map(course => {
    const exactIntent = course.skill.some(word => spokenSkill.includes(word));
    const categoryMatch = course.skill.some(word => word.includes(inferred) || inferred.includes(word));
    const skillMatch = exactIntent ? 45 : categoryMatch ? 34 : 12;
    const demandMatch = course.skill.some(word => districtDemand.includes(word)) ? 25 : 8;
    const goalMatch = course.goals.includes(profile.goal) ? 20 : 5;
    const localMatch = course.districts.includes(profile.district) ? 10 : 2;
    const score = skillMatch + demandMatch + goalMatch + localMatch;
    const reasons = [];
    if (skillMatch >= 35) reasons.push('Matches existing interest');
    if (demandMatch === 25) reasons.push(`In demand in ${profile.district}`);
    if (goalMatch === 20) reasons.push('Supports stated goal');
    if (localMatch === 10) reasons.push('Training available locally');
    return { ...course, score, reasons, distance: course.distance + (course.districts.indexOf(profile.district) % 3) };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

function useSpeech(language, onResult) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [ttsError, setTtsError] = useState('');
  const [voiceLabel, setVoiceLabel] = useState('');

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    stopWebsiteAudio();
  }, []);

  const speak = useCallback(async (text, after) => {
    if (!text) return;
    setSpeaking(true);
    window.speechSynthesis?.cancel();
    stopWebsiteAudio();
    const finished = () => {
      setSpeaking(false);
      if (after) after();
    };

    if (language.key === 'ta') {
      const bundledAsset = tamilVoiceAssets[text];
      if (bundledAsset) {
        setTtsError('');
        setVoiceLabel('SkillGrade Tamil Neural · built in');
        try {
          await playAudioSource(bundledAsset, finished);
          return;
        } catch {
          // Continue to the dynamic website voice and then the browser fallback.
        }
      }
      try {
        const response = await fetch('/api/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: language.key }),
        });
        if (response.ok) {
          const audioUrl = URL.createObjectURL(await response.blob());
          setTtsError('');
          setVoiceLabel('SkillGrade Tamil Neural · online');
          await playAudioSource(audioUrl, () => {
            URL.revokeObjectURL(audioUrl);
            finished();
          });
          return;
        }
      } catch {
        // The bundled guided prompts still work when the optional API is offline.
      }
      setTtsError('website-voice-offline');
      setVoiceLabel('Tamil website voice unavailable');
      setTimeout(finished, 250);
      return;
    }

    const voices = await getVoicesReady();
    const voice = bestVoice(voices, language);
    if (!voice) {
      setTtsError('missing-language-voice');
      setVoiceLabel('');
      setTimeout(finished, 250);
      return;
    }
    setTtsError('');
    setVoiceLabel(voice.name);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.code;
    utterance.rate = language.key === 'ta' ? 0.78 : language.key === 'hi' ? 0.84 : 0.92;
    utterance.pitch = language.key === 'ta' ? 0.96 : 1;
    utterance.volume = 1;
    utterance.voice = voice;
    utterance.onend = finished;
    utterance.onerror = finished;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    stopWebsiteAudio();
    window.speechSynthesis?.cancel();
    setListening(false);
    setSpeaking(false);
  }, []);

  const listen = useCallback(() => {
    setError('');
    window.speechSynthesis?.cancel();
    if (!SpeechRecognition) {
      setError('unsupported');
      return;
    }
    recognitionRef.current?.abort();
    const recognition = new SpeechRecognition();
    recognition.lang = language.code;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ');
      onResult(transcript, event.results[event.results.length - 1].isFinal);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== 'aborted') setError(event.error);
    };
    recognition.onend = () => setListening(false);
    try {
      setListening(true);
      recognition.start();
    } catch (startError) {
      setListening(false);
      setError(startError.name || 'start-failed');
    }
  }, [language, onResult]);

  return { supported: Boolean(SpeechRecognition), listening, speaking, error, ttsError, voiceLabel, listen, stop, speak };
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><img src="/skillgrade-logo.png" alt=""/></div>;
}

function Header({ t, view, setView, compact = false, user, onLogout }) {
  return <header className={`topbar ${compact ? 'compact' : ''}`}>
    <button className="brand" onClick={() => setView('home')} aria-label="SkillGrade home">
      <BrandMark />
      <span>Skill<span>Grade</span></span>
    </button>
    <nav className="mode-switch" aria-label="Change view">
      <button className={view !== 'dashboard' ? 'active' : ''} onClick={() => setView('home')}><CircleUserRound size={16}/><span>{t.beneficiary}</span></button>
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><BarChart3 size={16}/><span>{t.officer}</span></button>
    </nav>
    <div className="account-menu"><span>{user?.name}</span><button onClick={onLogout} title="Sign out"><LogOut size={16}/><i>Sign out</i></button></div>
  </header>;
}

function StepRail({ index, total, language }) {
  return <div className="step-rail">
    <div className="step-meta"><span>{language.key === 'ta' ? 'கேள்வி' : language.key === 'hi' ? 'सवाल' : 'Question'} {index + 1}</span><span>{index + 1} / {total}</span></div>
    <div className="step-track"><div style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
  </div>;
}

function OptionGrid({ type, profile, t, onChoose }) {
  let options = [];
  if (type === 'consent') options = [{ value: 'yes', label: t.yes }];
  if (type === 'gender') options = Object.entries(t.genders).map(([value, label]) => ({ value, label }));
  if (type === 'education') options = Object.entries(t.levels).map(([value, label]) => ({ value, label }));
  if (type === 'goal') options = Object.entries(t.goals).map(([value, label]) => ({ value, label }));
  if (type === 'district') options = districts.map(value => ({ value, label: value }));
  if (type === 'block') options = (districtDetails[profile.district]?.blocks || []).map(value => ({ value, label: value }));
  if (!options.length) return null;
  return <div className={`option-grid ${options.length > 4 ? 'many' : ''}`}>
    {options.map(option => <button key={option.value} onClick={() => onChoose(option.value)}>{option.label}<ChevronRight size={17}/></button>)}
  </div>;
}

function VoiceOrb({ listening, onClick, label }) {
  return <button className={`voice-orb ${listening ? 'listening' : ''}`} onClick={onClick} aria-label={label}>
    <span className="orb-ring ring-one"/><span className="orb-ring ring-two"/>
    {listening ? <span className="wave"><i/><i/><i/><i/><i/></span> : <Mic size={31}/>} 
  </button>;
}

function Landing({ language, setLanguage, onStart, onForm, onSaved, onBack, savedCount, t }) {
  const [selected, setSelected] = useState(language.key);
  return <main className="landing">
    <div className="hero-copy">
      <button className="back-link landing-back" onClick={onBack}><ArrowLeft size={18}/>Back to login</button>
      <div className="eyebrow"><Sparkles size={15}/>{t.eyebrow}</div>
      <h1>{t.welcome}</h1>
      <p>{t.intro}</p>
      <div className="trust-row"><span><ShieldCheck size={17}/>Private by design</span><span><WifiOff size={17}/>Demo-ready data</span></div>
    </div>
    <section className="language-card">
      <div className="card-icon"><Languages size={23}/></div>
      <p className="mini-label">LANGUAGE / भाषा / மொழி</p>
      <h2>{t.choose}</h2>
      <div className="languages">
        {languageOptions.map(option => <button key={option.key} className={selected === option.key ? 'selected' : ''} onClick={() => { setSelected(option.key); setLanguage(option); }}>
          <span className="radio"><i/></span><span><b>{option.native}</b><small>{option.label}</small></span>{selected === option.key && <Check size={19}/>} 
        </button>)}
      </div>
      <button className="primary start-button" onClick={onStart}>{copy[selected].start}<ArrowRight size={19}/></button>
      <button className="form-start-button" onClick={onForm}>Use simple form instead</button>
      <button className="saved-start-button" onClick={onSaved}><FolderOpen size={17}/>Review saved profiles{savedCount ? ` (${savedCount})` : ''}</button>
      <p className="browser-note"><Headphones size={15}/>For the clearest voice experience, use Chrome or Edge.</p>
    </section>
  </main>;
}

function InterviewLegacy({ language, t, profile, setProfile, onComplete, onExit }) {
  const qs = questions[language.key];
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [awaitingVoiceConfirmation, setAwaitingVoiceConfirmation] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  const voiceModeRef = useRef('answer');
  const current = qs[index];
  const handleSpeech = useCallback((text, isFinal) => {
    if (voiceModeRef.current === 'confirm') {
      if (!isFinal) return;
      const said = text.toLowerCase();
      const yes = ['yes', 'yeah', 'correct', 'हाँ', 'हां', 'सही', 'ஆம்', 'ஆமாம்', 'சரி'].some(word => said.includes(word));
      const no = ['no', 'wrong', 'नहीं', 'गलत', 'இல்லை', 'தவறு'].some(word => said.includes(word));
      if (yes) setVoiceCommand('yes');
      else if (no) setVoiceCommand('no');
      return;
    }
    setDraft(text);
    if (isFinal) {
      setConfirmed(true);
      setAwaitingVoiceConfirmation(true);
    }
  }, []);
  const speech = useSpeech(language, handleSpeech);

  useEffect(() => {
    setDraft(profile[current.id] || '');
    setConfirmed(Boolean(profile[current.id]));
    setAwaitingVoiceConfirmation(false);
    voiceModeRef.current = 'answer';
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => speech.speak(current.prompt), 450);
    return () => clearTimeout(timer);
  }, [current.prompt, speech.speak]);

  useEffect(() => {
    if (!awaitingVoiceConfirmation) return;
    setAwaitingVoiceConfirmation(false);
    speech.speak(t.correct, () => {
      voiceModeRef.current = 'confirm';
      speech.listen();
    });
  }, [awaitingVoiceConfirmation, speech.listen, speech.speak, t.correct]);

  const displayValue = (id, value) => {
    if (id === 'gender') return t.genders[value] || value;
    if (id === 'education') return t.levels[value] || value;
    if (id === 'goal') return t.goals[value] || value;
    if (id === 'consent') return t.yes;
    return value;
  };

  const choose = value => { setDraft(value); setConfirmed(true); speech.speak(displayValue(current.id, value)); };
  const advance = () => {
    if (!draft) return;
    let value = draft.trim();
    if (current.id === 'phone') value = normalizeDigits(value).slice(0, 10) || value;
    if (current.id === 'age') value = normalizeDigits(value).slice(0, 2) || value;
    const updated = { ...profile, [current.id]: value };
    setProfile(updated);
    if (index === qs.length - 1) onComplete(updated);
    else setIndex(i => i + 1);
  };
  const goBack = () => {
    if (index === 0) onExit();
    else setIndex(i => i - 1);
  };

  useEffect(() => {
    if (!voiceCommand) return;
    setVoiceCommand('');
    if (voiceCommand === 'yes') advance();
    if (voiceCommand === 'no') {
      voiceModeRef.current = 'answer';
      setConfirmed(false);
      setDraft('');
      setTimeout(speech.listen, 250);
    }
  }, [voiceCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  const beginAnswer = () => {
    voiceModeRef.current = 'answer';
    speech.listen();
  };

  return <main className="interview-shell">
    <aside className="interview-aside">
      <div className="eyebrow"><Sparkles size={15}/>{t.eyebrow}</div>
      <h2>A clearer path,<br/><span>one answer at a time.</span></h2>
      <p>{t.voiceTip}</p>
      <div className="aside-cube" aria-hidden="true"><div/><div/><div/><div/><div/><div/><div/><div/><div/></div>
      <div className="privacy"><ShieldCheck size={19}/><div><b>Your answers stay private</b><small>Used only to create this demo application.</small></div></div>
    </aside>
    <section className="question-panel">
      <StepRail index={index} total={qs.length} language={language}/>
      <button className="back-link" onClick={goBack}><ArrowLeft size={18}/>{t.back}</button>
      <div className="question-content" key={current.id}>
        <p className="question-number">{String(index + 1).padStart(2, '0')}</p>
        <h1>{current.prompt}</h1>
        {current.helper && <p className="question-helper">{current.helper}</p>}
        {!confirmed && <>
          <div className="orb-wrap">
            <VoiceOrb listening={speech.listening} onClick={speech.listening ? speech.stop : beginAnswer} label={t.tapSpeak}/>
            <p className={speech.listening ? 'accent' : ''}>{speech.listening ? t.listening : t.tapSpeak}</p>
          </div>
          {(speech.error || !speech.supported) && <div className="voice-warning"><MicOff size={17}/>{t.unsupported}</div>}
          {speech.ttsError && <div className="voice-warning voice-missing"><Volume2 size={17}/>{language.key === 'ta' ? 'தமிழ் குரல் இந்த சாதனத்தில் நிறுவப்படவில்லை. Windows மொழி அமைப்புகளில் Tamil speech-ஐ நிறுவி Chrome-ஐ மீண்டும் திறக்கவும்.' : language.key === 'hi' ? 'इस डिवाइस पर हिन्दी आवाज़ उपलब्ध नहीं है। Windows भाषा सेटिंग में Hindi speech स्थापित करके Chrome दोबारा खोलें।' : 'A matching English voice is not installed on this device.'}</div>}
          {speech.voiceLabel && <p className="active-voice"><Volume2 size={12}/>Voice: {speech.voiceLabel}</p>}
          <OptionGrid type={current.type} profile={profile} t={t} onChoose={choose}/>
          <button className="demo-link" onClick={() => choose(current.demo)}><Sparkles size={15}/>{t.demo}</button>
        </>}
        {confirmed && <div className="confirmation">
          <p className="mini-label">{t.heard}</p>
          <div className="transcript"><span>“{displayValue(current.id, draft)}”</span><button onClick={() => speech.speak(displayValue(current.id, draft))}><Volume2 size={19}/></button></div>
          <h3>{t.correct}</h3>
          <div className="confirm-actions">
            <button className="primary" onClick={advance}><Check size={18}/>{t.yes}</button>
            <button className="secondary" onClick={() => { voiceModeRef.current = 'answer'; setConfirmed(false); setDraft(''); setTimeout(speech.listen, 100); }}><RotateCcw size={17}/>{t.no}</button>
          </div>
          <p className="voice-confirm-hint"><Mic size={14}/>{speech.listening ? t.listening : `${t.yes} / ${t.no}`}</p>
        </div>}
        <button className="repeat" onClick={() => speech.speak(current.prompt)}><Speaker size={17}/>{t.repeat}</button>
      </div>
    </section>
  </main>;
}

const spokenDistricts = {
  Chennai: ['chennai', 'சென்னை', 'चेन्नई'],
  Coimbatore: ['coimbatore', 'kovai', 'கோயம்புத்தூர்', 'கோவை', 'कोयंबटूर'],
  Madurai: ['madurai', 'மதுரை', 'मदुरै'],
  Tiruchirappalli: ['tiruchirappalli', 'trichy', 'திருச்சிராப்பள்ளி', 'திருச்சி', 'तिरुचिरापल्ली', 'त्रिची'],
  Salem: ['salem', 'சேலம்', 'सेलम'],
  Dharmapuri: ['dharmapuri', 'தர்மபுரி', 'धर्मपुरी'],
};

function normaliseInterviewAnswer(id, text) {
  const lower = String(text).toLowerCase().trim();
  if (id === 'phone') return normalizeDigits(lower).slice(0, 10) || text;
  if (id === 'age') return normalizeDigits(lower).slice(0, 2) || text;
  if (id === 'district') {
    return Object.entries(spokenDistricts).find(([, aliases]) => aliases.some(alias => lower.includes(alias)))?.[0] || text;
  }
  if (id === 'gender') {
    if (['woman','female','महिला','பெண்'].some(x => lower.includes(x))) return 'female';
    if (['man','male','पुरुष','ஆண்'].some(x => lower.includes(x))) return 'male';
    return 'other';
  }
  if (id === 'education') {
    if (['graduate','degree','स्नातक','பட்ட'].some(x => lower.includes(x))) return 'graduate';
    if (['diploma','iti','डिप्लोमा','ஐடிஐ','டிப்ளமா'].some(x => lower.includes(x))) return 'diploma';
    if (['12','higher','बारह','பன்னிரண்டு'].some(x => lower.includes(x))) return 'higher';
    return 'school';
  }
  if (id === 'goal') {
    if (['own','self','business','स्वरोज','अपना','சொந்த','தொழில்'].some(x => lower.includes(x))) return 'self';
    if (['job','नौकरी','வேலை'].some(x => lower.includes(x))) return 'job';
    return 'income';
  }
  if (id === 'consent') return 'yes';
  return text.trim();
}

function ConversationInterview({ language, t, profile, setProfile, onComplete, onExit }) {
  const qs = questions[language.key];
  const [index, setIndex] = useState(0);
  const [liveText, setLiveText] = useState('');
  const [followUp, setFollowUp] = useState('');
  const current = qs[index];
  const profileRef = useRef(profile);
  const phoneDigitsRef = useRef(profile.phone || '');
  const awaitingAnswerRef = useRef(false);

  const handleSpeech = useCallback((text, isFinal) => {
    setLiveText(text);
    if (!isFinal) return;
    awaitingAnswerRef.current = false;
    if (current.id === 'phone') {
      const chunk = normalizeDigits(text);
      if (!chunk) {
        awaitingAnswerRef.current = true;
        setFollowUp(language.key === 'ta' ? 'எண்கள் சரியாகக் கேட்கவில்லை. ஒவ்வொரு எண்ணாக மெதுவாகச் சொல்லுங்கள்.' : language.key === 'hi' ? 'नंबर साफ़ सुनाई नहीं दिए। एक-एक अंक धीरे बोलिए।' : 'I did not hear any digits. Please say them slowly, one digit at a time.');
        return;
      }
      const existing = phoneDigitsRef.current;
      const combined = (chunk.length === 10 ? chunk : `${existing}${chunk}`).slice(0, 10);
      phoneDigitsRef.current = combined;
      setLiveText(`${combined.split('').join('  ')}  ·  ${combined.length}/10`);
      const partial = { ...profileRef.current, phone: combined };
      profileRef.current = partial;
      setProfile(partial);
      if (combined.length < 10) {
        awaitingAnswerRef.current = true;
        const remaining = 10 - combined.length;
        setFollowUp(language.key === 'ta' ? `${combined.length} எண்கள் கிடைத்தன. இன்னும் ${remaining} எண்களைச் சொல்லுங்கள்.` : language.key === 'hi' ? `${combined.length} अंक मिल गए। बाकी ${remaining} अंक बोलिए।` : `I got ${combined.length} digits. Please say the remaining ${remaining} digits.`);
        return;
      }
      setLiveText('');
      if (index === qs.length - 1) onComplete(partial);
      else setIndex(value => value + 1);
      return;
    }
    const value = normaliseInterviewAnswer(current.id, text);
    const updated = { ...profileRef.current, [current.id]: value };
    profileRef.current = updated;
    setProfile(updated);
    setLiveText('');
    if (index === qs.length - 1) onComplete(updated);
    else setIndex(value => value + 1);
  }, [current.id, index, language.key, onComplete, qs.length, setProfile]);

  const speech = useSpeech(language, handleSpeech);

  useEffect(() => {
    const timer = setTimeout(() => {
      awaitingAnswerRef.current = true;
      const ask = () => speech.speak(current.prompt, () => setTimeout(speech.listen, 280));
      if (index > 0) {
        const acknowledgement = language.key === 'ta' ? 'சரி, பதிவு செய்துவிட்டேன். அடுத்ததாக.' : language.key === 'hi' ? 'ठीक है, मैंने दर्ज कर लिया। अगला सवाल।' : 'Got it. I have saved that. Next question.';
        speech.speak(acknowledgement, ask);
      } else ask();
    }, 350);
    return () => clearTimeout(timer);
  }, [current.prompt, index, language.key, speech.listen, speech.speak]);

  useEffect(() => {
    if (!followUp) return;
    const message = followUp;
    setFollowUp('');
    speech.speak(message, () => setTimeout(speech.listen, 300));
  }, [followUp, speech.listen, speech.speak]);

  useEffect(() => {
    if (!awaitingAnswerRef.current || speech.speaking || speech.listening || followUp) return;
    const retry = setTimeout(() => {
      if (awaitingAnswerRef.current) speech.listen();
    }, 700);
    return () => clearTimeout(retry);
  }, [followUp, speech.listening, speech.speaking, speech.listen]);

  const choose = value => {
    const updated = { ...profileRef.current, [current.id]: value };
    profileRef.current = updated;
    setProfile(updated);
    if (index === qs.length - 1) onComplete(updated);
    else setIndex(i => i + 1);
  };

  const completed = qs.slice(0, index).filter(q => profile[q.id]);
  const display = (id, value) => id === 'gender' ? t.genders[value] : id === 'education' ? t.levels[value] : id === 'goal' ? t.goals[value] : id === 'consent' ? t.yes : value;

  return <main className="conversation-shell">
    <div className="conversation-top">
      <button className="brand" onClick={onExit}><BrandMark/><span>Skill<span>Cube</span></span></button>
      <div className="live-status"><i className={speech.listening || speech.speaking ? 'on' : ''}/>{speech.speaking ? 'Speaking…' : speech.listening ? t.listening : 'Thinking…'}</div>
    </div>
    <section className="conversation-stage">
      <div className="conversation-heading"><div className="eyebrow"><Sparkles size={15}/>{t.eyebrow}</div><h1>{language.key === 'ta' ? 'நாம் பேசலாம்.' : language.key === 'hi' ? 'आइए बात करते हैं।' : "Let's talk."}</h1><p>{language.key === 'ta' ? 'இயல்பாகப் பேசுங்கள். ஒவ்வொரு பதிலுக்குப் பிறகும் அடுத்த கேள்விக்குச் செல்வேன்.' : language.key === 'hi' ? 'स्वाभाविक रूप से बोलें। हर जवाब के बाद मैं अगला सवाल पूछूँगा।' : "Speak naturally. I'll move to the next question after each answer."}</p></div>
      <div className="conversation-window">
        <div className="conversation-history">
          {completed.slice(-3).map(q => <div className="history-line" key={q.id}><span><Check size={13}/>{localizedLabels[language.key]?.[q.id] || labels[q.id]}</span><b>{display(q.id, profile[q.id])}</b></div>)}
        </div>
        <div className="assistant-line"><div className="assistant-avatar"><BrandMark/></div><div><small>SKILLGRADE</small><h2>{current.prompt}</h2>{current.helper && <p>{current.helper}</p>}</div></div>
        <div className={`listening-line ${speech.listening ? 'active' : ''}`}>
          <VoiceOrb listening={speech.listening} onClick={speech.listening ? speech.stop : speech.listen} label={t.tapSpeak}/>
          <div><span>{speech.listening ? t.listening : t.tapSpeak}</span><b>{liveText || (speech.listening ? '…' : t.voiceTip)}</b></div>
        </div>
        {(speech.error || !speech.supported) && <div className="voice-warning"><MicOff size={17}/>{t.unsupported}</div>}
        {current.type && <div className="fallback-choices"><span>Quick choice</span><OptionGrid type={current.type} profile={profile} t={t} onChoose={choose}/></div>}
      </div>
      <div className="conversation-progress"><span>{index + 1} of {qs.length}</span><div><i style={{width:`${((index + 1) / qs.length) * 100}%`}}/></div><button onClick={onExit}><X size={15}/>Exit</button></div>
    </section>
  </main>;
}

function applySpokenCorrection(profile, transcript) {
  const spoken = transcript.trim();
  const lower = spoken.toLowerCase();
  const district = Object.entries(spokenDistricts).find(([, aliases]) => aliases.some(alias => lower.includes(alias)))?.[0];
  let field = '';
  if (['phone','mobile','number','मोबाइल','கைபேசி','மொபைல்','phone number'].some(x => lower.includes(x))) field = 'phone';
  else if (['age','vayasu','उम्र','वय','வயது'].some(x => lower.includes(x))) field = 'age';
  else if (['name','peyar','naam','नाम','பெயர்'].some(x => lower.includes(x))) field = 'name';
  else if (['district','mavattam','zilla','ज़िला','जिला','மாவட்ட'].some(x => lower.includes(x)) || district) field = 'district';
  else if (['block','area','paguthi','vattaram','ब्लॉक','क्षेत्र','வட்டாரம்','பகுதி'].some(x => lower.includes(x))) field = 'block';
  else if (['village','locality','ooru','gramam','गाँव','गांव','கிராமம்','ஊர்'].some(x => lower.includes(x))) field = 'village';
  else if (['education','padippu','kalvi','पढ़ाई','शिक्षा','கல்வி'].some(x => lower.includes(x))) field = 'education';
  else if (['skill','work','coding','velai','thiran','काम','कौशल','திறன்','வேலை'].some(x => lower.includes(x))) field = 'skill';
  else if (['goal','lakshyam','ilakku','लक्ष्य','இலக்கு'].some(x => lower.includes(x))) field = 'goal';
  else if (['gender','लिंग','பாலினம்'].some(x => lower.includes(x))) field = 'gender';
  if (!field) return null;

  let value;
  if (field === 'district') value = district;
  else if (['age','phone','gender','education','goal'].includes(field)) value = normaliseInterviewAnswer(field, spoken);
  else {
    const keywordPattern = /^(please\s+)?(change|correct|update|my|the|என்|என்னுடைய|मेरा|मेरी)?\s*(name|skill|work|block|area|village|locality|பெயர்|திறன்|வேலை|வட்டாரம்|பகுதி|கிராமம்|ஊர்|नाम|काम|कौशल|ब्लॉक|क्षेत्र|गाँव|गांव)\s*(is|to|as|என்பது|ஆக|है|को)?\s*/i;
    value = spoken.replace(keywordPattern, '').trim();
  }
  if (!value) return null;
  return { profile: { ...profile, [field]: value }, field, value };
}

function spokenSummary(profile, language, t) {
  if (language.key === 'ta') return `உங்கள் பெயர் ${profile.name}. வயது ${profile.age}. நீங்கள் ${profile.district} மாவட்டம், ${profile.block}, ${profile.village} பகுதியில் வசிக்கிறீர்கள். உங்கள் கல்வித் தகுதி ${t.levels[profile.education]}. உங்களுக்கு விருப்பமான வேலை ${profile.skill}. உங்கள் இலக்கு ${t.goals[profile.goal]}. ஏதேனும் தவறு இருந்தால், எதை மாற்ற வேண்டும் என்று சொல்லுங்கள். அனைத்தும் சரி என்றால், எல்லாம் சரி என்று சொல்லுங்கள்.`;
  if (language.key === 'hi') return `आपका नाम ${profile.name} है। उम्र ${profile.age} वर्ष। आप ${profile.district} ज़िले के ${profile.block}, ${profile.village} में रहते हैं। आपकी शिक्षा ${t.levels[profile.education]} है। आपका कौशल ${profile.skill} है और लक्ष्य ${t.goals[profile.goal]} है। कोई गलती हो तो बताइए क्या बदलना है। सब सही हो तो कहिए सब सही है।`;
  return `Your name is ${profile.name}. You are ${profile.age} years old and live in ${profile.village}, ${profile.block}, ${profile.district}. Your education is ${t.levels[profile.education]}. Your skill or interest is ${profile.skill}, and your goal is to ${t.goals[profile.goal].toLowerCase()}. If anything is wrong, tell me what to change. Otherwise, say everything is correct.`;
}

function VoiceSummary({ language, t, profile, setProfile, onConfirmed, onBack }) {
  const profileRef = useRef(profile);
  const awaitingCorrectionRef = useRef(false);
  const [heard, setHeard] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const handleSpeech = useCallback((text, isFinal) => {
    setHeard(text);
    if (!isFinal) return;
    awaitingCorrectionRef.current = false;
    const lower = text.toLowerCase();
    const correct = ['everything is correct','all correct','सब सही','सभी सही','எல்லாம் சரி','அனைத்தும் சரி'].some(x => lower.includes(x));
    if (correct) {
      setPendingAction({ type: 'complete', text: language.key === 'ta' ? 'சரி. இப்போது உங்களுக்கான பயிற்சிகளைத் தேடுகிறேன்.' : language.key === 'hi' ? 'ठीक है। अब आपके लिए कोर्स खोज रहा हूँ।' : 'Great. I am finding the best courses for you now.' });
      return;
    }
    const correction = applySpokenCorrection(profileRef.current, text);
    if (correction) {
      profileRef.current = correction.profile;
      setProfile(correction.profile);
      setNotice(`${localizedLabels[language.key]?.[correction.field] || labels[correction.field]} → ${correction.value}`);
      setPendingAction({ type: 'listen', text: language.key === 'ta' ? `${correction.value} என்று மாற்றிவிட்டேன். வேறு ஏதேனும் மாற்றம் உள்ளதா?` : language.key === 'hi' ? `${correction.value} कर दिया है। क्या कुछ और बदलना है?` : `I changed it to ${correction.value}. Is there anything else to correct?` });
    } else {
      setPendingAction({ type: 'listen', text: language.key === 'ta' ? 'மன்னிக்கவும், எந்த விவரத்தை மாற்ற வேண்டும் என்று புரியவில்லை. உதாரணமாக, என் வயது முப்பது என்று சொல்லுங்கள்.' : language.key === 'hi' ? 'मुझे समझ नहीं आया। उदाहरण के लिए कहें, मेरी उम्र तीस साल है।' : 'I did not catch which detail to change. For example, say: my age is thirty.' });
    }
    setHeard('');
  }, [language.key, setProfile]);
  const speech = useSpeech(language, handleSpeech);

  useEffect(() => {
    const timer = setTimeout(() => {
      awaitingCorrectionRef.current = true;
      speech.speak(spokenSummary(profileRef.current, language, t), () => setTimeout(speech.listen, 300));
    }, 450);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    awaitingCorrectionRef.current = action.type === 'listen';
    speech.speak(action.text, () => action.type === 'complete' ? onConfirmed(profileRef.current) : setTimeout(speech.listen, 300));
  }, [pendingAction, onConfirmed, speech.listen, speech.speak]);

  useEffect(() => {
    if (!awaitingCorrectionRef.current || speech.speaking || speech.listening || pendingAction) return;
    const retry = setTimeout(() => {
      if (awaitingCorrectionRef.current) speech.listen();
    }, 700);
    return () => clearTimeout(retry);
  }, [pendingAction, speech.listening, speech.speaking, speech.listen]);

  const fields = ['name','age','phone','district','block','village','education','skill','goal'];
  const value = id => id === 'education' ? t.levels[profile[id]] : id === 'goal' ? t.goals[profile[id]] : profile[id];
  return <main className="summary-page content-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={18}/>{t.back}</button>
    <div className="summary-heading"><div className="eyebrow"><Volume2 size={15}/>VOICE REVIEW</div><h1>{language.key === 'ta' ? 'நான் சரியாகப் புரிந்துகொண்டேனா?' : language.key === 'hi' ? 'क्या मैंने सही समझा?' : 'Did I understand correctly?'}</h1><p>{language.key === 'ta' ? 'சுருக்கத்தைக் கேளுங்கள். தவறு இருந்தால் இயல்பாகச் சொல்லித் திருத்தலாம்.' : language.key === 'hi' ? 'सारांश सुनें। कोई गलती हो तो बोलकर सुधारें।' : 'Listen to the summary. If anything is wrong, simply say the correction.'}</p></div>
    <section className="spoken-summary-card">
      <div className="summary-fields">{fields.map(id => <div key={id}><span>{localizedLabels[language.key]?.[id] || labels[id]}</span><b>{value(id)}</b>{notice.startsWith(localizedLabels[language.key]?.[id] || labels[id]) && <i>Updated</i>}</div>)}</div>
      <div className="correction-console"><VoiceOrb listening={speech.listening} onClick={speech.listening ? speech.stop : speech.listen} label="Speak a correction"/><div><span>{speech.listening ? t.listening : 'SAY A CORRECTION'}</span><h3>{heard || (language.key === 'ta' ? '“என் வயது 30” அல்லது “எல்லாம் சரி”' : language.key === 'hi' ? '“मेरी उम्र 30 है” या “सब सही है”' : '“My age is 30” or “Everything is correct”')}</h3>{notice && <p><CheckCircle2 size={14}/>{notice}</p>}</div></div>
      <div className="summary-actions"><button className="listen-button" onClick={() => speech.speak(spokenSummary(profileRef.current, language, t))}><Volume2 size={18}/>Hear summary again</button><button className="primary" onClick={() => onConfirmed(profileRef.current)}>Everything is correct<ArrowRight size={18}/></button></div>
    </section>
  </main>;
}

function Recommendations({ language, t, profile, ranked, selected, setSelected, onContinue, onBack, geminiSpeak }) {
  const sayResults = () => {
    const names = ranked.map(c => c[language.key] || c.name).join(', ');
    const prefix = language.key === 'hi' ? 'आपके लिए सुझाए गए कोर्स हैं: ' : language.key === 'ta' ? 'உங்களுக்கான பரிந்துரைக்கப்பட்ட படிப்புகள்: ' : 'Your recommended courses are: ';
    geminiSpeak?.(prefix + names);
  };
  useEffect(() => { const timer = setTimeout(sayResults, 500); return () => clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <main className="content-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={18}/>{t.back}</button>
    <div className="page-heading">
      <div><div className="eyebrow"><Sparkles size={15}/>PERSONALISED GUIDANCE</div><h1>{t.recommendations}</h1><p>{t.recommendationsSub}</p></div>
      <button className="listen-button" onClick={sayResults}><Volume2 size={19}/>Listen to recommendations</button>
    </div>
    <div className="profile-strip">
      <span><BriefcaseBusiness size={17}/>{profile.skill}</span><span><MapPin size={17}/>{profile.district}</span><span><Sparkles size={17}/>{t.goals[profile.goal]}</span>
    </div>
    <section className="course-grid">
      {ranked.map((course, i) => <article className={`course-card ${selected === course.id ? 'chosen' : ''}`} key={course.id}>
        <div className="course-top"><span className={`rank rank-${i + 1}`}>0{i + 1}</span><span className="score">{course.score}% {t.match}</span></div>
        <div className="course-icon"><GraduationCap size={24}/></div>
        <p className="course-code">NSQF · {course.id}</p>
        <h2>{course[language.key] || course.name}</h2>
        {language.key !== 'en' && <p className="english-name">{course.name}</p>}
        <div className="course-meta"><span><span>LEVEL</span><b>{course.level}</b></span><span><Clock3 size={15}/><b>{course.duration}</b></span><span><MapPin size={15}/><b>{course.distance} km</b></span></div>
        <div className="reason-box"><p>{t.why}</p>{course.reasons.slice(0,3).map(r => <span key={r}><CheckCircle2 size={15}/>{r}</span>)}</div>
        <button className={selected === course.id ? 'selected-course' : 'choose-course'} onClick={() => setSelected(course.id)}>{selected === course.id ? <><Check size={18}/>{t.selected}</> : <>{t.select}<ChevronRight size={18}/></>}</button>
      </article>)}
    </section>
    <div className="sticky-action"><div><ShieldCheck size={19}/><span><b>Explainable recommendations</b><small>Every match shows why it was selected.</small></span></div><button className="primary" disabled={!selected} onClick={onContinue}>Review application<ArrowRight size={18}/></button></div>
  </main>;
}

function Review({ language, t, profile, selectedCourse, onBack, onSubmit, submitting, geminiSpeak }) {
  const fields = ['name','age','gender','phone','district','block','village','education','skill','goal'];
  const value = id => id === 'gender' ? t.genders[profile[id]] : id === 'education' ? t.levels[profile[id]] : id === 'goal' ? t.goals[profile[id]] : profile[id];
  const readForm = () => {
    const courseName = selectedCourse?.[language.key] || selectedCourse?.name;
    const intro = language.key === 'ta' ? 'உங்கள் விண்ணப்ப விவரம். ' : language.key === 'hi' ? 'आपके आवेदन का विवरण। ' : 'Your application summary. ';
    const text = `${intro}${fields.map(id => `${labels[id]}: ${value(id)}`).join('. ')}. Course: ${courseName}`;
    geminiSpeak?.(text);
  };
  useEffect(() => { const timer = setTimeout(readForm, 500); return () => clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <main className="content-page review-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={18}/>{t.back}</button>
    <div className="page-heading"><div><div className="eyebrow"><ShieldCheck size={15}/>APPLICATION PREVIEW</div><h1>{t.reviewTitle}</h1><p>{t.reviewSub}</p></div><button className="listen-button" onClick={readForm}><Volume2 size={19}/>Read aloud</button></div>
    <div className="review-layout">
      <section className="form-card">
        <div className="form-header"><div><BrandMark/><span><small>GOVERNMENT OF TAMIL NADU</small><b>Skill Training Expression of Interest</b></span></div><span className="draft-badge">DEMO · DRAFT</span></div>
        <div className="fields-grid">
          {fields.map(id => <div className={id === 'skill' ? 'wide' : ''} key={id}><span>{localizedLabels[language.key]?.[id] || labels[id]}</span><b>{value(id) || '—'}</b></div>)}
        </div>
        <div className="selected-program"><div className="course-icon"><GraduationCap size={22}/></div><div><span>SELECTED TRAINING PROGRAMME</span><b>{selectedCourse?.[language.key] || selectedCourse?.name}</b><small>NSQF Level {selectedCourse?.level} · {selectedCourse?.duration} · {selectedCourse?.id}</small></div><CheckCircle2 size={22}/></div>
        <div className="consent-line"><CheckCircle2 size={18}/><span>{t.consentText}</span></div>
      </section>
      <aside className="submit-card">
        <div className="seal"><ShieldCheck size={30}/></div><h2>Ready to submit</h2><p>This demo sends the confirmed application to the local prototype service.</p>
        <ul><li><Check size={16}/>All required fields completed</li><li><Check size={16}/>Course selected</li><li><Check size={16}/>Voice consent recorded</li></ul>
        <button className="primary" disabled={submitting} onClick={onSubmit}>{submitting ? <><RefreshCcw className="spin" size={18}/>{t.submitting}</> : <>{t.submit}<ArrowRight size={18}/></>}</button>
        <small>No Aadhaar or sensitive identity document is collected.</small>
      </aside>
    </div>
  </main>;
}

function Success({ language, t, reference, onReset, onBack, geminiSpeak }) {
  useEffect(() => {
    const text = language.key === 'hi' ? `आपका आवेदन जमा हो गया है। संदर्भ संख्या ${reference}` : language.key === 'ta' ? `உங்கள் விண்ணப்பம் சமர்ப்பிக்கப்பட்டது. குறிப்பு எண் ${reference}` : `Your application has been submitted. Reference number ${reference}`;
    const timer = setTimeout(() => geminiSpeak?.(text), 400);
    return () => clearTimeout(timer);
  }, [geminiSpeak, language, reference]);
  return <main className="success-page"><button className="back-link success-back" onClick={onBack}><ArrowLeft size={18}/>Back to roadmap</button><div className="success-art"><span/><span/><span/><div><Check size={42}/></div></div><p className="eyebrow"><CheckCircle2 size={15}/>SUBMISSION RECEIVED</p><h1>{t.complete}</h1><p>{t.doneText}</p><div className="reference"><span>{t.ref}</span><b>{reference}</b><button onClick={() => navigator.clipboard?.writeText(reference)}><SquarePen size={16}/></button></div><div className="agency"><ShieldCheck size={22}/><span><small>SIMULATED SUBMISSION TO</small><b>Tamil Nadu Skill Development Corporation</b></span></div><button className="primary" onClick={onReset}><RefreshCcw size={18}/>{t.newApp}</button></main>;
}

function Dashboard({ t, profile, ranked, selectedCourse, reference }) {
  if (!profile.name) return <main className="dashboard empty-dashboard"><div className="empty-icon"><BarChart3 size={29}/></div><h1>{t.dashboard}</h1><p>{t.noData}</p></main>;
  return <main className="dashboard">
    <div className="page-heading"><div><div className="eyebrow"><BarChart3 size={15}/>OFFICIAL VIEW</div><h1>{t.dashboard}</h1><p>{t.dashboardSub}</p></div><div className="status-pill"><span/>{reference ? 'Submitted' : t.status}</div></div>
    <section className="stat-grid"><div><span>APPLICATION</span><b>{reference || 'Draft'}</b><small>Current status</small></div><div><span>DISTRICT</span><b>{profile.district}</b><small>{profile.block}</small></div><div><span>TOP MATCH</span><b>{ranked[0]?.score}%</b><small>Explainable score</small></div><div><span>COURSE</span><b>{selectedCourse?.id || 'Not selected'}</b><small>NSQF aligned</small></div></section>
    <div className="dashboard-grid">
      <section className="dash-card"><div className="dash-title"><CircleUserRound size={20}/><h2>{t.applicant}</h2></div><div className="profile-list">{['name','age','phone','district','block','village','education'].map(id => <div key={id}><span>{labels[id]}</span><b>{id === 'education' ? t.levels[profile[id]] : profile[id]}</b></div>)}</div></section>
      <section className="dash-card"><div className="dash-title"><Sparkles size={20}/><h2>{t.extracted}</h2></div><div className="extraction"><span>SKILL / INTEREST</span><h3>{profile.skill}</h3><small>Normalised category: {inferSkill(profile.skill)}</small></div><div className="extraction"><span>EMPLOYMENT GOAL</span><h3>{t.goals[profile.goal]}</h3><small>Goal code: {profile.goal}</small></div><div className="tag-row">{districtDetails[profile.district]?.demand.slice(0,4).map(x => <span key={x}>{x}</span>)}</div></section>
      <section className="dash-card scoring-card"><div className="dash-title"><BarChart3 size={20}/><h2>{t.scoring}</h2></div>{ranked.map((course, i) => <div className="score-row" key={course.id}><span className="rank">0{i+1}</span><div><b>{course.name}</b><small>{course.reasons.join(' · ')}</small><div className="score-bar"><i style={{width:`${course.score}%`}}/></div></div><strong>{course.score}</strong></div>)}</section>
    </div>
  </main>;
}

export default function App() {
  const [currentUser,setCurrentUser]=useState(loadSession);
  const [language, setLanguage] = useState(languageOptions[0]);
  const [view, setView] = useState('home');
  const [stage, setStage] = useState('landing');
  const [profile, setProfile] = useState({});
  const [ranked, setRanked] = useState([]);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [prefetchedCredential, setPrefetchedCredential] = useState(null);
  const [sessionCredential, setSessionCredential] = useState(null);
  const [liveStarted, setLiveStarted] = useState(false);
  const [detailCourse, setDetailCourse] = useState(null);
  const [savedRecords, setSavedRecords] = useState([]);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const activeRecordIdRef = useRef(null);
  const geminiVoiceRef = useRef(null);
  const t = copy[language.key];
  const selectedCourse = ranked.find(c => c.id === selected);

  useEffect(()=>{ setSavedRecords(loadSavedProfiles(currentUser?.id)); },[currentUser]);

  const assignActiveRecord = useCallback(id => { activeRecordIdRef.current=id; setActiveRecordId(id); },[]);
  const persistProfile = useCallback((profileValue, extra = {}) => {
    const id = extra.id || activeRecordIdRef.current || globalThis.crypto?.randomUUID?.() || `SG-${Date.now()}`;
    assignActiveRecord(id);
    setSavedRecords(previous => {
      const existing = previous.find(item => item.id === id) || {};
      const record = {...existing,id,profile:profileValue,language:language.key,status:extra.status||existing.status||'profile',selected:extra.selected??existing.selected??'',reference:extra.reference??existing.reference??'',updatedAt:new Date().toISOString()};
      const next = [record,...previous.filter(item => item.id !== id)];
      if(currentUser?.id)localStorage.setItem(savedProfilesKey(currentUser.id),JSON.stringify(next));
      return next;
    });
    return id;
  }, [assignActiveRecord, currentUser, language.key]);
  useEffect(()=>{
    if(!currentUser?.id || !['live','form'].includes(stage) || !Object.values(profile).some(Boolean))return;
    const timer=setTimeout(()=>persistProfile(profile,{status:'draft'}),350);
    return()=>clearTimeout(timer);
  },[currentUser,stage,profile,persistProfile]);
  const finishInterview = useCallback(updated => { setProfile(updated); setStage('summary'); }, []);
  const confirmProfile = useCallback(updated => { setProfile(updated); persistProfile(updated,{status:'profile'}); setStage('profile'); }, [persistProfile]);
  const analyseProfile = useCallback(() => {
    const result = recommendPathways(profile, 5);
    setRanked(result);
    setSelected(result[0]?.id || '');
    persistProfile(profile,{status:'recommended',selected:result[0]?.id||''});
    setStage('recommendations');
  }, [persistProfile, profile]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/gemini/token', { method: 'POST' })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (!cancelled && value) setPrefetchedCredential({ ...value, fetchedAt: Date.now() }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const startLive = useCallback(() => {
    setSessionCredential(prefetchedCredential);
    setLiveStarted(true);
    setStage('live');
  }, [prefetchedCredential]);
  const registerGeminiVoice = useCallback(api => { geminiVoiceRef.current = api; }, []);
  const speakWithGemini = useCallback(text => geminiVoiceRef.current?.speak(text) || false, []);
  const submit = async () => {
    setSubmitting(true);
    let ref;
    try {
      const response = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, accountId: currentUser.id, selectedCourse: selected, language: language.key }) });
      if (!response.ok) throw new Error('offline');
      ref = (await response.json()).reference;
    } catch {
      ref = `TNS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      localStorage.setItem('skillgrade-last-application', JSON.stringify({ profile, selected, ref, submittedAt: new Date().toISOString() }));
    }
    setReference(ref); persistProfile(profile,{status:'submitted',selected,reference:ref}); setSubmitting(false); setStage('success');
  };
  const openSavedProfile = record => { window.speechSynthesis?.cancel(); setLiveStarted(false); setSessionCredential(null); geminiVoiceRef.current=null; assignActiveRecord(record.id); setProfile(record.profile); const result=recommendPathways(record.profile,3); setRanked(result); setSelected(record.selected||result[0]?.id||''); setDetailCourse(null); setReference(record.reference||''); setView('home'); setStage(record.status==='draft'?'form':'profile'); };
  const removeSavedProfile = id => setSavedRecords(previous => { const next=previous.filter(item=>item.id!==id); if(currentUser?.id)localStorage.setItem(savedProfilesKey(currentUser.id),JSON.stringify(next)); if(activeRecordId===id)assignActiveRecord(null); return next; });
  const reset = () => { window.speechSynthesis?.cancel(); setLiveStarted(false); setSessionCredential(null); geminiVoiceRef.current = null; assignActiveRecord(null); setProfile({}); setRanked([]); setSelected(''); setDetailCourse(null); setReference(''); setStage('landing'); setView('home'); };
  const authenticate=user=>{sessionStorage.setItem(SESSION_KEY,JSON.stringify(user));setCurrentUser(user)};
  const logout=()=>{reset();sessionStorage.removeItem(SESSION_KEY);setSavedRecords([]);setCurrentUser(null)};

  if(!currentUser)return <div className="app-shell auth-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="grid-bg"/><AuthScreen onAuthenticated={authenticate}/></div>;

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="grid-bg"/>
    {stage !== 'interview' && stage !== 'live' && <Header t={t} view={view} setView={setView} compact={stage !== 'landing'} user={currentUser} onLogout={logout}/>} 
    {liveStarted && <div className={stage === 'live' ? 'live-session-visible' : 'live-session-hidden'}><GeminiLive language={language} profile={profile} setProfile={setProfile} onComplete={confirmProfile} onExit={() => { setLiveStarted(false); setStage('landing'); }} onFallback={() => { setLiveStarted(false); setStage('form'); }} credential={sessionCredential} active={stage === 'live'} onVoiceReady={registerGeminiVoice}/></div>}
    {view === 'dashboard' ? <CounsellorAdmin profile={profile} ranked={ranked} reference={reference} onBack={() => setView('home')}/> : <>
      {stage === 'landing' && <Landing language={language} setLanguage={setLanguage} onStart={startLive} onForm={() => setStage('form')} onSaved={() => setStage('saved')} onBack={logout} savedCount={savedRecords.length} t={t}/>} 
      {stage === 'saved' && <SavedProfiles records={savedRecords} onOpen={openSavedProfile} onBack={() => setStage('landing')} onRemove={removeSavedProfile}/>} 
      {stage === 'form' && <AssessmentForm profile={profile} onChange={setProfile} onComplete={confirmProfile} onBack={() => setStage('landing')}/>} 
      {stage === 'interview' && <ConversationInterview language={language} t={t} profile={profile} setProfile={setProfile} onComplete={finishInterview} onExit={() => setStage('landing')}/>} 
      {stage === 'summary' && <VoiceSummary language={language} t={t} profile={profile} setProfile={setProfile} onConfirmed={confirmProfile} onBack={() => setStage('interview')}/>} 
      {stage === 'profile' && <ProfileSummary profile={profile} onChange={setProfile} onAnalyse={analyseProfile} onBack={() => setStage(liveStarted ? 'live' : 'form')} speak={speakWithGemini}/>} 
      {stage === 'recommendations' && <OpportunityRecommendations profile={profile} ranked={ranked} onDetails={course => { setDetailCourse(course); setSelected(course.id); setStage('details'); }} onRoadmap={course => { setDetailCourse(course); setSelected(course.id); setStage('roadmap'); }} onBack={() => setStage('profile')} speak={speakWithGemini}/>} 
      {stage === 'details' && <OpportunityDetails course={detailCourse || selectedCourse} onBack={() => setStage('recommendations')} onRoadmap={course => { setDetailCourse(course); setStage('roadmap'); }} speak={speakWithGemini}/>} 
      {stage === 'roadmap' && <PersonalizedRoadmap profile={profile} course={detailCourse || selectedCourse} onBack={() => setStage('details')} onSubmit={submit} submitting={submitting} speak={speakWithGemini}/>} 
      {stage === 'success' && <Success language={language} t={t} reference={reference} onReset={reset} onBack={() => setStage('roadmap')} geminiSpeak={speakWithGemini}/>} 
    </>}
    <footer><span><i/>VOICE SERVICES: GEMINI LIVE</span><span>Built for inclusive access · Tamil Nadu</span></footer>
  </div>;
}
