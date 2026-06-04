import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, SectionHeader, Btn } from '../components/ui';
import { C } from '../utils/theme';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [licMsg, setLicMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const fileRef = useRef();
  const CURRENT_YEAR = new Date().getFullYear();

  const checkLicense = async (file) => {
    setChecking(true); setLicMsg('Analyserer licens...');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(',')[1];
      try {
        // Upload to Supabase Storage
        const filename = `licenses/${profile.id}_${Date.now()}.jpg`;
        await supabase.storage.from('licenses').upload(filename, file);
        const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(filename);

        // AI analysis
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300,
            messages: [{ role: 'user', content: [
              { type: 'image', source: { type: 'base64', media_type: file.type, data: b64 } },
              { type: 'text', text: `Er dette et gyldigt DASU karting kørerlicens ${CURRENT_YEAR}? Svar KUN JSON: {"valid":true/false,"year":"årstal","reason":"forklaring"}` }
            ]}]
          })
        });
        const data = await res.json();
        const p = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim());
        const ok = p.valid === true && (parseInt(p.year) >= CURRENT_YEAR);

        // Update profile in Supabase
        await supabase.from('profiles').update({
          license_valid: ok,
          license_img_url: publicUrl,
          license_year: parseInt(p.year) || null,
        }).eq('id', profile.id);

        await refreshProfile();
        setLicMsg(p.reason || (ok ? 'Licens godkendt ✓' : 'Ugyldig licens ✗'));
      } catch {
        setLicMsg('Fejl – prøv igen');
      }
      setChecking(false);
    };
    reader.readAsDataURL(file);
  };

  if (!profile) return null;

  const isExpired = profile.license_year && profile.license_year < CURRENT_YEAR;

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Profil" />

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${C.red},${C.redDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: 'white', flexShrink: 0 }}>
          {profile.name?.charAt(0) || '?'}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{profile.name}</div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>{profile.email || ''}</div>
          <Badge color={profile.type === 'admin' ? C.orange : profile.type === 'official' ? C.purple : profile.type === 'parent' ? C.blue : C.red}>
            {profile.type === 'admin' ? 'ADMIN' : profile.type === 'official' ? 'OFFICIAL' : profile.type === 'parent' ? 'FORÆLDER' : 'KØRER'}
          </Badge>
        </div>
      </div>

      {/* License expiry warning */}
      {isExpired && (
        <div style={{ background: C.red + '11', border: `1px solid ${C.red}44`, borderRadius: 8, padding: 12, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: C.red, fontSize: 13 }}>Licens udløbet – {profile.license_year}</div>
            <div style={{ color: C.textMuted, fontSize: 12 }}>Upload din nye {CURRENT_YEAR} licens</div>
          </div>
        </div>
      )}

      {/* License card */}
      {profile.type !== 'admin' && (
        <Card accentColor={profile.license_valid === true ? C.green : profile.license_valid === false ? C.red : C.orange}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2 }}>KARTING LICENS</div>
            <Badge color={profile.license_valid === true ? C.green : profile.license_valid === false ? C.red : C.orange}>
              {profile.license_valid === true ? 'GODKENDT' : profile.license_valid === false ? 'UGYLDIG' : 'IKKE TJEKKET'}
            </Badge>
          </div>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 4 }}>{profile.license_number || 'Ingen licens registreret'}</div>
          {licMsg && <div style={{ color: profile.license_valid ? C.green : C.red, fontSize: 12, marginBottom: 6 }}>{licMsg}</div>}
          <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 8, padding: 12, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 20 }}>{checking ? '⏳' : '📷'}</div>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{checking ? 'Analyserer...' : 'Upload licens-billede'}</div>
            <div style={{ color: C.textMuted, fontSize: 10 }}>AI-verifikation</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && checkLicense(e.target.files[0])} />
          {profile.license_img_url && (
            <img src={profile.license_img_url} style={{ width: '100%', borderRadius: 6, marginTop: 8, border: `1px solid ${C.border}` }} alt="Licens" />
          )}
        </Card>
      )}

      {/* Driver data */}
      {(profile.license_number || profile.kart_number) && (
        <Card>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>KØRERDATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Licens', profile.license_number], ['Transponder', profile.transponder], ['Klasse', profile.kart_class], ['Kart #', profile.kart_number], ['Klub', profile.club], ['Telefon', profile.phone]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <div style={{ color: C.textDim, fontSize: 10 }}>{k}</div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Btn variant="danger" onClick={signOut} fullWidth>Log ud</Btn>
    </div>
  );
}
