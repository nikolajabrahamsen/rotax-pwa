import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, SectionHeader, Btn, Select, Input, EmptyState, Spinner } from '../components/ui';
import { C } from '../utils/theme';

export default function CalendarScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [step, setStep] = useState(0);
  const [regLoading, setRegLoading] = useState(false);
  const [selClass, setSelClass] = useState('');
  const [paddock, setPaddock] = useState('');
  const [tyreMode, setTyreMode] = useState(false);
  const [slicks, setSlicks] = useState([]);
  const [wets, setWets] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*, registrations(id, user_id, class)')
      .order('date', { ascending: true });
    setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isReg = ev => ev.registrations?.some(r => r.user_id === profile?.id);

  const register = async () => {
    if (!profile?.id || profile.id === 'guest') return;
    setRegLoading(true);
    await supabase.from('registrations').insert({
      event_id: sel.id, user_id: profile.id,
      class: selClass || sel.classes?.[0] || '',
      paddock_space: paddock, slicks, wets, paid: false,
    });
    await load();
    setStep(0); setSel(null); setPaddock(''); setSlicks([]); setWets([]); setTyreMode(false);
    setRegLoading(false);
  };

  const scanTyre = (list, setList) => () => {
    if (list.length < 4) setList(l => [...l, `EAN-${String(Math.floor(Math.random() * 9000) + 1000)}`]);
  };

  if (loading) return <Spinner />;

  // Registration flow
  if (sel && step > 0) {
    const evClasses = sel.classes || [];
    return (
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        <Btn small variant="ghost" onClick={() => setStep(step > 1 ? step - 1 : 0)} style={{ marginBottom: 12 }}>← Tilbage</Btn>
        <SectionHeader title={sel.name} subtitle={`Trin ${step} af 3`} />
        {step === 1 && <>
          <Card>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>DINE OPLYSNINGER</div>
            {[['Navn', profile?.name], ['Licens', profile?.license_number], ['Kart #', profile?.kart_number], ['Transponder', profile?.transponder]].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.textMuted, fontSize: 12 }}>{k}</span>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 12 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: 8, background: profile?.license_valid ? C.green + '11' : C.orange + '11', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{profile?.license_valid ? '✅' : '⚠️'}</span>
              <span style={{ color: profile?.license_valid ? C.green : C.orange, fontSize: 12, fontWeight: 700 }}>{profile?.license_valid ? 'Licens godkendt' : 'Licens ikke verificeret'}</span>
            </div>
          </Card>
          <Select label="Klasse" value={selClass || evClasses[0] || ''} onChange={setSelClass} options={evClasses} />
          <Input label="Plads i ryttergård" value={paddock} onChange={setPaddock} placeholder="f.eks. 6m x 4m, 1 telt" />
          <Btn onClick={() => setStep(2)} fullWidth>FORTSÆT →</Btn>
        </>}
        {step === 2 && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: C.textMuted, fontSize: 12 }}>Dæk-registrering er valgfrit</span>
            <button onClick={() => setTyreMode(!tyreMode)} style={{ background: tyreMode ? C.green + '22' : C.surface2, border: `1px solid ${tyreMode ? C.green : C.border}`, borderRadius: 20, padding: '4px 12px', color: tyreMode ? C.green : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{tyreMode ? '✓ Tilvalgt' : '+ Tilføj dæk'}</button>
          </div>
          {tyreMode && <>
            <Card>
              <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>SLICKS ({slicks.length}/4)</div>
              {slicks.map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}><span style={{ color: C.textMuted, fontSize: 11 }}>Slick {i + 1}</span><span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12 }}>{s}</span></div>)}
              {slicks.length < 4 && <div onClick={scanTyre(slicks, setSlicks)} style={{ textAlign: 'center', padding: 12, background: C.bg, borderRadius: 6, border: `2px dashed ${C.border}`, cursor: 'pointer', marginTop: 6 }}><div style={{ fontSize: 18 }}>📷</div><div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>Scan slick</div></div>}
            </Card>
            <Card>
              <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>WETS ({wets.length}/4)</div>
              {wets.map((w, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}><span style={{ color: C.textMuted, fontSize: 11 }}>Wet {i + 1}</span><span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12 }}>{w}</span></div>)}
              {wets.length < 4 && <div onClick={scanTyre(wets, setWets)} style={{ textAlign: 'center', padding: 12, background: C.bg, borderRadius: 6, border: `2px dashed ${C.border}`, cursor: 'pointer', marginTop: 6 }}><div style={{ fontSize: 18 }}>📷</div><div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>Scan wet</div></div>}
            </Card>
          </>}
          <Btn onClick={() => setStep(3)} fullWidth>FORTSÆT →</Btn>
        </>}
        {step === 3 && <>
          <Card>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>ORDREOVERSIGT</div>
            {[['Gebyr', `${sel.fee} kr.`], ['Klasse', selClass || evClasses[0]], ['Ryttergård', paddock || '—'], ['Slicks', slicks.length + ' stk'], ['Wets', wets.length + ' stk']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.textMuted, fontSize: 12 }}>{k}</span>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 12 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: C.text }}>TOTAL</span>
              <span style={{ fontWeight: 900, color: C.red, fontSize: 18 }}>{sel.fee} kr.</span>
            </div>
            <div style={{ marginTop: 8, padding: 8, background: C.surface2, borderRadius: 6, fontSize: 11, color: C.textMuted }}>
              Betaling: <strong style={{ color: C.text }}>{sel.payment_type === 'mobilepay' ? `MobilePay #${sel.payment_number}` : 'Betalingskort (Stripe)'}</strong>
            </div>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[['📱', 'MobilePay'], ['💳', 'Kort']].map(([icon, label]) => (
              <div key={label} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{label}</div>
              </div>
            ))}
          </div>
          <Btn onClick={register} loading={regLoading} fullWidth style={{ background: '#006633' }}>✓ BEKRÆFT & BETAL</Btn>
        </>}
      </div>
    );
  }

  // Event detail
  if (sel) return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <Btn small variant="ghost" onClick={() => setSel(null)} style={{ marginBottom: 12 }}>← Tilbage</Btn>
      <div style={{ background: `linear-gradient(135deg,${C.redDark},#1a0003)`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{sel.date} – {sel.end_date}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: "'Barlow Condensed', sans-serif" }}>{sel.name}</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>📍 {sel.location}</div>
      </div>
      <Card>{[['Tilmeldingsfrist', sel.deadline], ['Gebyr', `${sel.fee} kr.`], ['Tilmeldte', `${sel.registrations?.length || 0}`]].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.textMuted, fontSize: 12 }}>{k}</span>
          <span style={{ color: C.text, fontWeight: 600, fontSize: 12 }}>{v}</span>
        </div>
      ))}</Card>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>KLASSER</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(sel.classes || []).map(c => <Badge key={c}>{c}</Badge>)}
        </div>
      </div>
      {isReg(sel)
        ? <div style={{ background: '#00331a', border: '1px solid #00CC6644', borderRadius: 8, padding: 14, textAlign: 'center', color: C.green, fontWeight: 700 }}>✓ Du er tilmeldt</div>
        : sel.registration_open
          ? <Btn onClick={() => setStep(1)} fullWidth>TILMELD →</Btn>
          : <div style={{ background: C.orange + '11', border: `1px solid ${C.orange}44`, borderRadius: 8, padding: 12, textAlign: 'center', color: C.orange, fontSize: 13 }}>Tilmelding åbner senere</div>
      }
    </div>
  );

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Løbskalender" subtitle="Rotax Danmark 2026" />
      {events.length === 0 && <EmptyState icon="📅" message="Ingen løb oprettet endnu" />}
      {events.map(ev => (
        <Card key={ev.id} accentColor={isReg(ev) ? C.green : ev.registration_open ? C.red : C.textDim} onClick={() => { setSel(ev); setSelClass(ev.classes?.[0] || ''); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{ev.name}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>📍 {ev.location}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>📅 {ev.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {isReg(ev) ? <Badge color={C.green}>TILMELDT</Badge> : ev.registration_open ? <Badge color={C.red}>ÅBEN</Badge> : <Badge color={C.textDim}>KOMMENDE</Badge>}
              <div style={{ color: C.textDim, fontSize: 10, marginTop: 4 }}>{ev.registrations?.length || 0} tilm.</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
