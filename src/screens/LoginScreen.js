import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input, Btn, RotaxLogo, Card } from '../components/ui';
import { C, DEFAULT_CLASSES } from '../utils/theme';

// ── REGISTER ─────────────────────────────────────────────────────
function RegisterScreen({ onBack }) {
  const { signUp } = useAuth();
  const YEAR = new Date().getFullYear();
  const [step, setStep] = useState(0);
  const [hasLicense, setHasLicense] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const [licenseImg, setLicenseImg] = useState(null);
  const [licenseValid, setLicenseValid] = useState(null);
  const [licenseYear, setLicenseYear] = useState(null);
  const [profileType, setProfileType] = useState('driver');
  const [form, setForm] = useState({ name:'',email:'',password:'',password2:'',phone:'',license:'',transponder:'',kartClass:'',kartNumber:'',dob:'',club:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef();

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const analyzeLicense = async (file) => {
    setAnalyzing(true); setAnalyzeMsg('Analyserer licens med AI...');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(',')[1];
      setLicenseImg(e.target.result);
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600,
            messages: [{ role: 'user', content: [
              { type: 'image', source: { type: 'base64', media_type: file.type, data: b64 } },
              { type: 'text', text: `Udtræk oplysninger fra dette DASU karting licenskort. Returner KUN JSON: {"valid":true/false,"year":"årstal","name":"navn","licenseNumber":"licensnr","dob":"YYYY-MM-DD eller null","club":"klub eller null","class":"klasse eller null","reason":"forklaring hvis ugyldig"}` }
            ]}]
          })
        });
        const data = await res.json();
        const p = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim());
        const yr = parseInt(p.year) || 0;
        const ok = p.valid === true && yr >= YEAR;
        setLicenseValid(ok); setLicenseYear(yr);
        setForm(f => ({ ...f, name: p.name || f.name, license: p.licenseNumber || f.license, dob: p.dob || f.dob, club: p.club || f.club, kartClass: p.class || f.kartClass }));
        setAnalyzeMsg(ok ? `✅ Licens ${yr} godkendt – data auto-udfyldt` : `⚠️ ${p.reason || 'Licens ikke godkendt'}`);
        setStep(3);
      } catch {
        setAnalyzeMsg('Kunne ikke læse licensen – udfyld manuelt');
        setStep(3);
      }
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const finish = async () => {
    if (!form.name.trim()) { setErr('Navn er påkrævet'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setErr('Ugyldig e-mail'); return; }
    if (form.password.length < 6) { setErr('Adgangskode skal være mindst 6 tegn'); return; }
    if (form.password !== form.password2) { setErr('Adgangskoder matcher ikke'); return; }
    setLoading(true); setErr('');
    const profileData = {
      type: hasLicense ? 'driver' : profileType,
      name: form.name.trim(), phone: form.phone,
      license_number: form.license, license_valid: licenseValid,
      license_year: licenseYear, transponder: form.transponder,
      kart_class: form.kartClass, kart_number: form.kartNumber ? parseInt(form.kartNumber) : null,
      dob: form.dob || null, club: form.club, is_official: profileType === 'official',
    };
    const { error } = await signUp(form.email.trim().toLowerCase(), form.password, profileData);
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setSuccess(true);
  };

  if (success) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, background: C.bg }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontWeight: 700, color: C.green, fontSize: 18, textAlign: 'center' }}>Profil oprettet!<br/>Tjek din e-mail for bekræftelse.</div>
      <Btn onClick={onBack}>Gå til login</Btn>
    </div>
  );

  if (step === 0) return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', background: C.bg }}>
      <button onClick={onBack} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', color: C.textMuted, cursor: 'pointer', marginBottom: 24, alignSelf: 'flex-start' }}>← Tilbage</button>
      <div style={{ textAlign: 'center', marginBottom: 32 }}><RotaxLogo size={30} /><div style={{ marginTop: 8, color: C.textMuted, fontSize: 11, letterSpacing: 3 }}>OPRET PROFIL</div></div>
      <div style={{ height: 3, width: 36, background: C.red, borderRadius: 2, marginBottom: 8 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>HAR DU EN AKTIV LICENS?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {[
          [true, '✅', C.green, 'Ja, jeg har en aktiv DASU licens', 'Upload dit licenskort – vi udfylder automatisk'],
          [false, '📋', C.orange, 'Nej, jeg har ikke en licens', 'Opret profil som forælder, mekaniker eller official'],
        ].map(([val, icon, col, label, sub]) => (
          <button key={String(val)} onClick={() => { setHasLicense(val); setStep(val ? 1 : 2); }} style={{ background: col + '11', border: `2px solid ${col}44`, borderRadius: 10, padding: '16px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 700, color: col, fontSize: 15 }}>{label}</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 1) return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: C.bg }}>
      <button onClick={() => setStep(0)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', color: C.textMuted, cursor: 'pointer', marginBottom: 24, alignSelf: 'flex-start' }}>← Tilbage</button>
      <div style={{ height: 3, width: 36, background: C.red, borderRadius: 2, marginBottom: 8 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>UPLOAD LICENS</div>
      <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Tag et foto eller upload et screenshot af dit DASU licenskort. AI'en læser oplysningerne automatisk.</div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => e.target.files[0] && analyzeLicense(e.target.files[0])} />
      {!analyzing ? <>
        <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${C.green}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: C.green + '08', marginBottom: 12 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📷</div>
          <div style={{ fontWeight: 700, color: C.green, fontSize: 16 }}>Tag foto eller vælg fil</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>JPG, PNG eller PDF</div>
        </div>
        <button onClick={() => { setLicenseValid(null); setStep(3); }} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', textAlign: 'center' }}>Spring over – udfyld manuelt</button>
      </> : (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <div style={{ color: C.text, fontWeight: 700 }}>{analyzeMsg}</div>
        </div>
      )}
    </div>
  );

  if (step === 2) return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: C.bg }}>
      <button onClick={() => setStep(0)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', color: C.textMuted, cursor: 'pointer', marginBottom: 24, alignSelf: 'flex-start' }}>← Tilbage</button>
      <div style={{ height: 3, width: 36, background: C.red, borderRadius: 2, marginBottom: 8 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif" }}>PROFIL-TYPE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[['parent','👨‍👩‍👧','Forælder / Mekaniker','Administrer kørere og se løbsdata'],['official','🏁','Official','Dommer, tidtager eller official'],['driver','🏎️','Kører uden licens','Du kører men har endnu ikke DASU licens']].map(([val,icon,label,sub]) => (
          <button key={val} onClick={() => { setProfileType(val); setStep(3); }} style={{ background: C.surface2, border: `2px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{icon}</span>
              <div><div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{label}</div><div style={{ color: C.textMuted, fontSize: 12 }}>{sub}</div></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 3) return (
    <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: C.bg }}>
      <button onClick={() => setStep(hasLicense ? 1 : 2)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', color: C.textMuted, cursor: 'pointer', marginBottom: 16 }}>← Tilbage</button>
      <div style={{ height: 3, width: 36, background: C.red, borderRadius: 2, marginBottom: 8 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>DIN PROFIL</div>
      {hasLicense && <div style={{ background: licenseValid ? C.green + '11' : C.orange + '11', border: `1px solid ${licenseValid ? C.green : C.orange}44`, borderRadius: 8, padding: 10, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{licenseValid ? '✅' : '⚠️'}</span>
        <div style={{ color: licenseValid ? C.green : C.orange, fontSize: 12, fontWeight: 700 }}>{analyzeMsg}</div>
      </div>}
      {licenseImg && <img src={licenseImg} style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 120, objectFit: 'cover', marginBottom: 12 }} alt="Licens" />}
      <Input label="Fuldt navn *" value={form.name} onChange={v => setF('name', v)} placeholder="For- og efternavn" />
      <Input label="E-mail *" value={form.email} onChange={v => setF('email', v)} placeholder="din@email.dk" type="email" />
      <Input label="Telefon" value={form.phone} onChange={v => setF('phone', v)} placeholder="Mobilnummer" />
      {hasLicense && <>
        <Input label="Licensnummer" value={form.license} onChange={v => setF('license', v)} placeholder="DK-2026-XXXX" />
        <Input label="Transpondernummer" value={form.transponder} onChange={v => setF('transponder', v)} placeholder="T-XXXX" />
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Klasse</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(DEFAULT_CLASSES).map(([cls, rule]) => (
              <button key={cls} onClick={() => setF('kartClass', cls)} style={{ background: form.kartClass === cls ? (rule.color + '33') : C.surface2, border: `1px solid ${form.kartClass === cls ? rule.color : C.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer', color: form.kartClass === cls ? rule.color : C.textMuted, fontWeight: form.kartClass === cls ? 700 : 400 }}>{cls}</button>
            ))}
          </div>
        </div>
        <Input label="Kart-nummer" value={form.kartNumber} onChange={v => setF('kartNumber', v)} placeholder="eks. 98" type="number" />
        <Input label="Fødselsdato" value={form.dob} onChange={v => setF('dob', v)} placeholder="YYYY-MM-DD" />
        <Input label="Klub" value={form.club} onChange={v => setF('club', v)} placeholder="Klubnavn" />
      </>}
      {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <Btn onClick={() => { setErr(''); setStep(4); }} fullWidth disabled={!form.name || !form.email}>FORTSÆT →</Btn>
    </div>
  );

  if (step === 4) return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: C.bg }}>
      <button onClick={() => setStep(3)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', color: C.textMuted, cursor: 'pointer', marginBottom: 16, alignSelf: 'flex-start' }}>← Tilbage</button>
      <div style={{ height: 3, width: 36, background: C.red, borderRadius: 2, marginBottom: 8 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif" }}>VÆLG ADGANGSKODE</div>
      <Input label="Adgangskode (min. 6 tegn)" value={form.password} onChange={v => setF('password', v)} placeholder="••••••••" type="password" />
      <Input label="Gentag adgangskode" value={form.password2} onChange={v => setF('password2', v)} placeholder="••••••••" type="password" />
      {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <Btn onClick={finish} fullWidth loading={loading}>OPRET PROFIL</Btn>
      <Card style={{ marginTop: 12 }}>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>RESUMÉ</div>
        <div style={{ color: C.text, fontWeight: 700 }}>{form.name}</div>
        <div style={{ color: C.textMuted, fontSize: 12 }}>{form.email}</div>
        {form.kartClass && <div style={{ color: C.textMuted, fontSize: 12 }}>{form.kartClass}{form.kartNumber ? ` · #${form.kartNumber}` : ''}</div>}
      </Card>
    </div>
  );

  return null;
}

// ── LOGIN ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { signIn, guestLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) return <RegisterScreen onBack={() => setShowRegister(false)} />;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setErr('Udfyld e-mail og adgangskode'); return; }
    setLoading(true); setErr('');
    const { error } = await signIn(email.trim().toLowerCase(), password.trim());
    if (error) setErr('Forkert e-mail eller adgangskode');
    setLoading(false);
  };

  return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', background: C.bg }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}><RotaxLogo size={34} /><div style={{ marginTop: 10, color: C.textMuted, fontSize: 11, letterSpacing: 3 }}>DANMARK</div></div>
      <Input label="E-mail" value={email} onChange={setEmail} placeholder="din@email.dk" type="email" />
      <Input label="Adgangskode" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
      {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{err}</div>}
      <Btn onClick={handleLogin} loading={loading} fullWidth style={{ marginBottom: 10 }}>LOG IND</Btn>
      <button onClick={() => setShowRegister(true)} style={{ background: C.green + '11', border: `1px solid ${C.green}44`, borderRadius: 6, padding: 11, color: C.green, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>✦ OPRET PROFIL</button>
      <button onClick={guestLogin} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: 11, color: C.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span>👁</span> FORTSÆT SOM GÆST <span style={{ fontSize: 10, color: C.textDim }}>(Docs & Livetiming)</span>
      </button>
    </div>
  );
}
