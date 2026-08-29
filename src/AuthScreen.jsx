import { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';

export const ACCOUNTS_KEY='skillgrade-accounts-v1';
const bytesToText=bytes=>btoa(String.fromCharCode(...bytes));
const textToBytes=text=>Uint8Array.from(atob(text),char=>char.charCodeAt(0));
async function passwordHash(password,salt) {
  const passwordBytes=new TextEncoder().encode(password), merged=new Uint8Array(salt.length+passwordBytes.length);
  merged.set(salt); merged.set(passwordBytes,salt.length);
  return bytesToText(new Uint8Array(await crypto.subtle.digest('SHA-256',merged)));
}
function accounts() { try { const value=JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'[]'); return Array.isArray(value)?value:[] } catch { return [] } }

export default function AuthScreen({onAuthenticated}) {
  const [mode,setMode]=useState('login'),[name,setName]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const submit=async event=>{
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const id=username.trim().toLowerCase();
      if(!/^[a-z0-9._-]{3,40}$/.test(id))throw new Error('Use at least 3 letters or numbers for the username.');
      if(password.length<6)throw new Error('Password must contain at least 6 characters.');
      const list=accounts(), existing=list.find(account=>account.id===id);
      if(mode==='register'){
        if(!name.trim())throw new Error('Enter the beneficiary name.');
        if(existing)throw new Error('That username already exists. Sign in instead.');
        const salt=crypto.getRandomValues(new Uint8Array(16));
        const account={id,name:name.trim(),salt:bytesToText(salt),passwordHash:await passwordHash(password,salt),createdAt:new Date().toISOString()};
        localStorage.setItem(ACCOUNTS_KEY,JSON.stringify([...list,account]));
        onAuthenticated({id:account.id,name:account.name});
      } else {
        if(!existing)throw new Error('Account not found. Create an account first.');
        const supplied=await passwordHash(password,textToBytes(existing.salt));
        if(supplied!==existing.passwordHash)throw new Error('Incorrect password.');
        onAuthenticated({id:existing.id,name:existing.name});
      }
    } catch(reason) { setError(reason.message||'Unable to continue.'); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><section className="auth-intro"><img src="/skillgrade-logo.png" alt="SkillGrade SG symbol"/><div className="eyebrow"><ShieldCheck size={15}/>PRIVATE LIVELIHOOD GUIDANCE</div><h1>Welcome to <span>SkillGrade</span></h1><p>Sign in before viewing saved beneficiary profiles and livelihood roadmaps.</p></section><form className="auth-card" onSubmit={submit}><div className="auth-tabs"><button type="button" className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>Sign in</button><button type="button" className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Create account</button></div><div className="auth-lock"><LockKeyhole size={22}/></div><h2>{mode==='login'?'Continue your journey':'Create a private account'}</h2>{mode==='register'&&<label><span>Beneficiary name</span><div><UserRound size={17}/><input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></div></label>}<label><span>Username</span><div><UserRound size={17}/><input autoCapitalize="none" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Choose or enter username"/></div></label><label><span>Password</span><div><LockKeyhole size={17}/><input type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters"/></div></label>{error&&<p className="auth-error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}<ArrowRight size={18}/></button><small className="auth-disclaimer">Prototype login: credentials and profiles stay in this browser. Production deployment requires a secure authenticated server database.</small></form></main>;
}
