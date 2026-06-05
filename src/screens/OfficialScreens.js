import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, SectionHeader, Btn, Input, Select, EmptyState, Spinner, OfficialBanner } from '../components/ui';
import { C, DEFAULT_CLASSES, SESSION_OPTS } from '../utils/theme';

// ── REGULATIONS ──────────────────────────────────────────────────
export function RegulationsScreen() {
  const regs = [
    { id: 1, title: 'Teknisk Reglement 2026', updated: '2026-01-15' },
    { id: 2, title: 'Sportligt Reglement 2026', updated: '2026-01-15' },
    { id: 3, title: 'Rotax Motor Reglement 2026', updated: '2026-02-01' },
    { id: 4, title: 'Sikkerhedsreglement', updated: '2026-01-10' },
    { id: 5, title: 'Dækregler 2026', updated: '2026-01-15' },
  ];
  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Reglementer" subtitle="Rotax Max Challenge Danmark 2026" />
      {regs.map(r => (
        <Card key={r.id} style={{ cursor: 'pointer', padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 24 }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{r.title}</div>
              <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Opdateret: {r.updated}</div>
            </div>
            <div style={{ color: C.red, fontSize: 16 }}>↓</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── OFFICIAL WEIGHT SCREEN ────────────────────────────────────────
export function OfficialWeightScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [selClass, setSelClass] = useState('');
  const [selSession, setSelSession] = useState('Heat 1');
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [flags, setFlags] = useState({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name, classes').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selEv) return;
    supabase.from('registrations').select('user_id, class, profiles(name, kart_number)').eq('event_id', selEv).then(({ data }) => {
      const filtered = (data || [])
        .filter(r => !selClass || r.class === selClass)
        .map(r => ({ ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles }))
        .sort((a, b) => (a.profiles?.kart_number || 0) - (b.profiles?.kart_number || 0));
      setDrivers(filtered);
    });
  }, [selEv, selClass]);

  const ev = events.find(e => e.id === selEv);
  const filtered = search
    ? drivers.filter(d => String(d.profiles?.kart_number).includes(search) || d.profiles?.name?.toLowerCase().includes(search.toLowerCase()))
    : drivers;

  const toggle = uid => setFlags(f => ({ ...f, [uid]: { ...f[uid], weight: !f[uid]?.weight } }));

  const submit = async () => {
    setSaving(true);
    const toAdd = Object.entries(flags).filter(([, fl]) => fl.weight);
    for (const [uid] of toAdd) {
      const d = drivers.find(d => d.user_id === uid);
      await supabase.from('penalties').insert({
        event_id: selEv, kart_no: d?.profiles?.kart_number, driver_name: d?.profiles?.name,
        class: selClass || '?', session: selSession, type: 'Placering sidst', seconds: 0,
        reason: 'Undervægt', source: 'weight_official',
      });
    }
    await supabase.from('ready_signals').insert({ event_id: selEv, class: selClass, session: selSession, signal_type: 'weight', sent_by: profile?.name });
    setFlags({}); setSaving(false); setDone(true);
  };

  if (done) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontWeight: 700, color: C.green, fontSize: 18, textAlign: 'center' }}>{selClass} – {selSession}<br />Klar-signal sendt!</div>
      <Btn onClick={() => { setDone(false); setFlags({}); }}>Ny indrapportering</Btn>
    </div>
  );

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Vægt" subtitle="Undervægt indrapportering" />
      <OfficialBanner />
      <Select label="Løb" value={selEv} onChange={setSelEv} options={events.map(e => ({ value: e.id, label: e.name }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Select label="Klasse" value={selClass} onChange={setSelClass} options={[{ value: '', label: 'Alle klasser' }, ...(ev?.classes || []).map(c => ({ value: c, label: c }))]} />
        <Select label="Session" value={selSession} onChange={setSelSession} options={SESSION_OPTS} />
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søg kart # eller navn..." style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} />
      {filtered.length === 0 ? <EmptyState icon="⚖️" message="Ingen kørere fundet" /> : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 64px', background: C.surface2, padding: '8px 12px', borderRadius: '6px 6px 0 0' }}>
            <span style={{ color: C.textMuted, fontSize: 10, fontWeight: 700 }}>KART #</span>
            <span style={{ color: C.textMuted, fontSize: 10 }}>NAVN</span>
            <span style={{ color: C.textMuted, fontSize: 10, textAlign: 'center' }}>⚖️</span>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0 0 6px 6px', marginBottom: 12 }}>
            {filtered.map((d, i) => {
              const fl = flags[d.user_id] || {};
              return (
                <div key={d.user_id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 64px', padding: '10px 12px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center', background: fl.weight ? C.red + '08' : 'transparent' }}>
                  <div style={{ fontWeight: 900, color: fl.weight ? C.red : C.text, fontSize: 20, fontFamily: "'Barlow Condensed', sans-serif" }}>#{d.profiles?.kart_number}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>{d.profiles?.name}</div>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => toggle(d.user_id)} style={{ width: 44, height: 36, borderRadius: 6, background: fl.weight ? C.red + '33' : C.surface2, border: `2px solid ${fl.weight ? C.red : C.border}`, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{fl.weight ? '❌' : ''}</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: C.orange + '11', border: `1px solid ${C.orange}44`, borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 12, color: C.orange }}>
            ⚠️ {Object.values(flags).filter(f => f.weight).length} undervægt · Placeres sidst i resultatlisten
          </div>
          <Btn onClick={submit} loading={saving} style={{ width: '100%', background: C.green, color: '#000', fontWeight: 900 }}>⚖️ INDRAPPORTER & SEND KLAR-SIGNAL</Btn>
        </div>
      )}
    </div>
  );
}

// ── OFFICIAL NOSE SCREEN ──────────────────────────────────────────
export function OfficialNoseScreen() {
  const { profile } = useAuth();
  const fileRef = useRef();
  const [photoTarget, setPhotoTarget] = useState(null);
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [selClass, setSelClass] = useState('');
  const [selSession, setSelSession] = useState('Heat 1');
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [flags, setFlags] = useState({});
  const [photos, setPhotos] = useState({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name, classes').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selEv) return;
    supabase.from('registrations').select('user_id, class, profiles(name, kart_number)').eq('event_id', selEv).then(({ data }) => {
      const filtered = (data || [])
        .filter(r => !selClass || r.class === selClass)
        .map(r => ({ ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles }))
        .sort((a, b) => (a.profiles?.kart_number || 0) - (b.profiles?.kart_number || 0));
      setDrivers(filtered);
    });
  }, [selEv, selClass]);

  const ev = events.find(e => e.id === selEv);
  const filtered = search
    ? drivers.filter(d => String(d.profiles?.kart_number).includes(search) || d.profiles?.name?.toLowerCase().includes(search.toLowerCase()))
    : drivers;

  const toggle = uid => {
    const wasOn = flags[uid]?.nose;
    setFlags(f => ({ ...f, [uid]: { ...f[uid], nose: !wasOn } }));
    if (!wasOn) {
      setPhotoTarget(uid);
      setTimeout(() => fileRef.current?.click(), 100);
    }
  };

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file || !photoTarget) return;
    const reader = new FileReader();
    reader.onload = ev2 => setPhotos(p => ({ ...p, [photoTarget]: [...(p[photoTarget] || []), ev2.target.result] }));
    reader.readAsDataURL(file);
    e.target.value = '';
    setPhotoTarget(null);
  };

  const isKval = selSession.toLowerCase().includes('kval');

  const submit = async () => {
    setSaving(true);
    const toAdd = Object.entries(flags).filter(([, fl]) => fl.nose);
    for (const [uid] of toAdd) {
      const d = drivers.find(d => d.user_id === uid);
      await supabase.from('penalties').insert({
        event_id: selEv, kart_no: d?.profiles?.kart_number, driver_name: d?.profiles?.name,
        class: selClass || '?', session: selSession,
        type: isKval ? 'Hurtigste tid fjernes' : 'Tidsstraf',
        seconds: isKval ? 0 : 5, reason: 'Trykket snude', source: 'nose_official',
      });
    }
    await supabase.from('ready_signals').insert({ event_id: selEv, class: selClass, session: selSession, signal_type: 'nose', sent_by: profile?.name });
    setFlags({}); setPhotos({}); setSaving(false); setDone(true);
  };

  if (done) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontWeight: 700, color: C.green, fontSize: 18, textAlign: 'center' }}>{selClass} – {selSession}<br />Klar-signal sendt!</div>
      <Btn onClick={() => { setDone(false); setFlags({}); setPhotos({}); }}>Ny indrapportering</Btn>
    </div>
  );

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Snude" subtitle={`Trykket snude · ${isKval ? 'Kval: fjern hurtigste tid' : '+5 sek'}`} />
      <OfficialBanner />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
      <Select label="Løb" value={selEv} onChange={setSelEv} options={events.map(e => ({ value: e.id, label: e.name }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Select label="Klasse" value={selClass} onChange={setSelClass} options={[{ value: '', label: 'Alle klasser' }, ...(ev?.classes || []).map(c => ({ value: c, label: c }))]} />
        <Select label="Session" value={selSession} onChange={setSelSession} options={SESSION_OPTS} />
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søg kart # eller navn..." style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
      <div style={{ background: C.blue + '11', border: `1px solid ${C.blue}44`, borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 11, color: C.blue }}>
        📷 Tryk 📷-knappen for at markere snude-straf – kameraet åbner automatisk
      </div>
      {filtered.length === 0 ? <EmptyState icon="🔧" message="Ingen kørere fundet" /> : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 72px', background: C.surface2, padding: '8px 12px', borderRadius: '6px 6px 0 0' }}>
            <span style={{ color: C.textMuted, fontSize: 10, fontWeight: 700 }}>KART #</span>
            <span style={{ color: C.textMuted, fontSize: 10 }}>NAVN</span>
            <span style={{ color: C.textMuted, fontSize: 10, textAlign: 'center' }}>🔧</span>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0 0 6px 6px', marginBottom: 12 }}>
            {filtered.map((d, i) => {
              const fl = flags[d.user_id] || {};
              const dPhotos = photos[d.user_id] || [];
              return (
                <div key={d.user_id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', background: fl.nose ? C.red + '08' : 'transparent' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 72px', padding: '10px 12px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: fl.nose ? C.red : C.text, fontSize: 20, fontFamily: "'Barlow Condensed', sans-serif" }}>#{d.profiles?.kart_number}</div>
                    <div>
                      <div style={{ color: C.textMuted, fontSize: 12 }}>{d.profiles?.name}</div>
                      {dPhotos.length > 0 && <div style={{ color: C.blue, fontSize: 10 }}>📷 {dPhotos.length} foto</div>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => toggle(d.user_id)} style={{ width: 52, height: 36, borderRadius: 6, background: fl.nose ? C.red + '33' : C.surface2, border: `2px solid ${fl.nose ? C.red : C.border}`, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{fl.nose ? '❌' : '📷'}</button>
                    </div>
                  </div>
                  {fl.nose && dPhotos.length > 0 && (
                    <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
                      {dPhotos.map((p, pi) => <img key={pi} src={p} style={{ height: 60, width: 80, objectFit: 'cover', borderRadius: 4, border: `1px solid ${C.border}`, flexShrink: 0 }} alt="Snude" />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ background: C.orange + '11', border: `1px solid ${C.orange}44`, borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 12, color: C.orange }}>
            ⚠️ {Object.values(flags).filter(f => f.nose).length} trykket snude · {isKval ? 'Hurtigste tid fjernes' : '+5 sek'}
          </div>
          <Btn onClick={submit} loading={saving} style={{ width: '100%', background: C.green, color: '#000', fontWeight: 900 }}>🔧 INDRAPPORTER & SEND KLAR-SIGNAL</Btn>
        </div>
      )}
    </div>
  );
}

// ── OFFICIAL INSPECTION SCREEN ────────────────────────────────────
export function OfficialInspectionScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [form, setForm] = useState({ class: 'Rotax Junior', session: 'Heat 1', video_ok: null, track_ok: null, tech_ok: null, notes: '', kart_no: '', offense: '', penalty: 'Tidsstraf +5 sek' });
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const PENALTY_OPTS = ['Tidsstraf +3 sek', 'Tidsstraf +5 sek', 'Tidsstraf +10 sek', 'Advarsel', 'Sortflag', 'Diskvalifikation', 'Placering sidst'];

  useEffect(() => {
    supabase.from('events').select('id, name, classes').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  const addPending = () => {
    if (!form.kart_no || !form.offense) return;
    setPending(p => [...p, { kart_no: form.kart_no, offense: form.offense, penalty: form.penalty, id: Date.now() }]);
    setForm(f => ({ ...f, kart_no: '', offense: '', penalty: 'Tidsstraf +5 sek' }));
  };

  const finish = async () => {
    setSaving(true);
    for (const p of pending) {
      const sec = p.penalty.includes('+3') ? 3 : p.penalty.includes('+5') ? 5 : p.penalty.includes('+10') ? 10 : 0;
      const type = p.penalty.includes('Tidsstraf') ? 'Tidsstraf' : p.penalty;
      await supabase.from('penalties').insert({
        event_id: selEv, kart_no: parseInt(p.kart_no) || 0,
        driver_name: `Kart #${p.kart_no}`, class: form.class,
        session: form.session, type, seconds: sec, reason: p.offense, source: 'inspection_official',
      });
    }
    await supabase.from('inspections').insert({ event_id: selEv, class: form.class, session: form.session, video_ok: form.video_ok, track_ok: form.track_ok, tech_ok: form.tech_ok, notes: form.notes, checked_by: profile?.name });
    await supabase.from('ready_signals').insert({ event_id: selEv, class: form.class, session: form.session, signal_type: 'inspection', sent_by: profile?.name });
    setPending([]); setSaving(false); setDone(true);
    setForm(f => ({ ...f, video_ok: null, track_ok: null, tech_ok: null, notes: '' }));
  };

  const ev = events.find(e => e.id === selEv);
  const checks = [['video_ok', '📹 Video'], ['track_ok', '🏁 Banen'], ['tech_ok', '🔩 Teknik']];

  if (done) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontWeight: 700, color: C.green, fontSize: 18, textAlign: 'center' }}>{form.class} – {form.session}<br />Klar-signal sendt!</div>
      <Btn onClick={() => setDone(false)}>Nyt heat</Btn>
    </div>
  );

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Indrapportering" subtitle="Video, Bane & Teknik" />
      <OfficialBanner />
      <Select label="Løb" value={selEv} onChange={setSelEv} options={events.map(e => ({ value: e.id, label: e.name }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Select label="Klasse" value={form.class} onChange={v => setForm(f => ({ ...f, class: v }))} options={ev?.classes || Object.keys(DEFAULT_CLASSES)} />
        <Select label="Session" value={form.session} onChange={v => setForm(f => ({ ...f, session: v }))} options={SESSION_OPTS} />
      </div>

      {/* Add penalty */}
      <Card accentColor={C.orange}>
        <div style={{ color: C.orange, fontSize: 10, letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>TILFØJ STRAF</div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, marginBottom: 8 }}>
          <Input label="Kart #" value={form.kart_no} onChange={v => setForm(f => ({ ...f, kart_no: v }))} placeholder="98" type="number" />
          <Input label="Forseelse" value={form.offense} onChange={v => setForm(f => ({ ...f, offense: v }))} placeholder="Beskriv forseelsen..." />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Straf</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PENALTY_OPTS.map(opt => (
              <button key={opt} onClick={() => setForm(f => ({ ...f, penalty: opt }))} style={{ background: form.penalty === opt ? C.orange + '33' : C.surface2, border: `1px solid ${form.penalty === opt ? C.orange : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', color: form.penalty === opt ? C.orange : C.textMuted, fontWeight: form.penalty === opt ? 700 : 400 }}>{opt}</button>
            ))}
          </div>
        </div>
        <Btn onClick={addPending} variant="secondary" fullWidth disabled={!form.kart_no || !form.offense}>+ GEM STRAF</Btn>
      </Card>

      {/* Pending penalties */}
      {pending.length > 0 && (
        <Card accentColor={C.red}>
          <div style={{ color: C.red, fontSize: 10, letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>STRAFFE KLAR ({pending.length})</div>
          {pending.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < pending.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ width: 40, height: 34, background: C.red + '22', border: `1px solid ${C.red}44`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: C.red, fontWeight: 900, fontSize: 13 }}>#{p.kart_no}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{p.offense}</div>
                <div style={{ color: C.orange, fontSize: 11 }}>{p.penalty}</div>
              </div>
              <button onClick={() => setPending(prev => prev.filter(x => x.id !== p.id))} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
            </div>
          ))}
        </Card>
      )}

      {/* Checklist */}
      <Card accentColor={C.purple}>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>TJEKLISTE</div>
        {checks.map(([key, label]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.text, fontSize: 13 }}>{label}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setForm(f => ({ ...f, [key]: true }))} style={{ background: form[key] === true ? C.green + '33' : C.surface2, border: `1px solid ${form[key] === true ? C.green : C.border}`, borderRadius: 5, padding: '5px 12px', color: form[key] === true ? C.green : C.textMuted, cursor: 'pointer', fontSize: 12 }}>✓ OK</button>
              <button onClick={() => setForm(f => ({ ...f, [key]: false }))} style={{ background: form[key] === false ? C.red + '33' : C.surface2, border: `1px solid ${form[key] === false ? C.red : C.border}`, borderRadius: 5, padding: '5px 12px', color: form[key] === false ? C.red : C.textMuted, cursor: 'pointer', fontSize: 12 }}>✗ Fejl</button>
            </div>
          </div>
        ))}
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Kommentarer..." style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', resize: 'vertical', marginTop: 10 }} />
      </Card>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{form.class} · {form.session}</div>
          {pending.length > 0 && <Badge color={C.red} style={{ fontSize: 10 }}>{pending.length} straf{pending.length > 1 ? 'fe' : ''}</Badge>}
        </div>
        <Btn onClick={finish} loading={saving} style={{ width: '100%', background: C.green, color: '#000', fontWeight: 900, fontSize: 14 }}>✓ AFSLUT HEAT & SEND KLAR-SIGNAL</Btn>
      </div>
    </div>
  );
}

// ── DRIVER LIST SCREEN ────────────────────────────────────────────
export function DriverListScreen() {
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [selClass, setSelClass] = useState('Alle');
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selDriver, setSelDriver] = useState(null);
  const [driverPenalties, setDriverPenalties] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name, classes').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  const loadDrivers = useCallback(async () => {
    if (!selEv) return;
    setLoading(true);
    const { data } = await supabase.from('registrations').select('user_id, class, slicks, wets, paddock_space, profiles(id, name, kart_number, license_number, license_valid, transponder, kart_class, club, dob, phone, email)').eq('event_id', selEv);
    setDrivers((data || []).map(r => ({ ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles })).sort((a, b) => (a.profiles?.kart_number || 0) - (b.profiles?.kart_number || 0)));
    setLoading(false);
  }, [selEv]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const openDriver = async (item) => {
    setSelDriver(item);
    setEditForm({
      name: item.profiles?.name || '', phone: item.profiles?.phone || '',
      license_number: item.profiles?.license_number || '', license_valid: item.profiles?.license_valid ?? null,
      transponder: item.profiles?.transponder || '', kart_class: item.profiles?.kart_class || '',
      kart_number: item.profiles?.kart_number || '', dob: item.profiles?.dob || '', club: item.profiles?.club || '',
    });
    const { data } = await supabase.from('penalties').select('*').or(`driver_name.eq.${item.profiles?.name},kart_no.eq.${item.profiles?.kart_number}`).order('created_at', { ascending: false });
    setDriverPenalties(data || []);
    setEditMode(false);
  };

  const saveDriver = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      name: editForm.name, phone: editForm.phone || null,
      license_number: editForm.license_number || null, license_valid: editForm.license_valid,
      transponder: editForm.transponder || null, kart_class: editForm.kart_class || null,
      kart_number: editForm.kart_number ? parseInt(editForm.kart_number) : null,
      dob: editForm.dob || null, club: editForm.club || null,
    }).eq('id', selDriver.profiles?.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadDrivers();
  };

  const ev = events.find(e => e.id === selEv);
  const classes = ['Alle', ...(ev?.classes || [])];
  const filtered = drivers.filter(d => (selClass === 'Alle' || d.class === selClass) && (!search || String(d.profiles?.kart_number).includes(search) || d.profiles?.name?.toLowerCase().includes(search.toLowerCase())));

  // Driver detail view
  if (selDriver) {
    const p = selDriver.profiles;
    return (
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Btn small variant="ghost" onClick={() => setSelDriver(null)}>← Tilbage</Btn>
          <Btn small variant={editMode ? 'secondary' : 'ghost'} onClick={() => setEditMode(!editMode)}>{editMode ? 'Annuller' : '✏️ Rediger'}</Btn>
        </div>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${C.redDark},#1a0003)`, borderRadius: 10, padding: 18, marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${C.red},${C.redDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: 22, flexShrink: 0 }}>{p?.name?.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: "'Barlow Condensed', sans-serif" }}>#{p?.kart_number}</div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: 15 }}>{p?.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{selDriver.class} · {p?.club || '—'}</div>
          </div>
        </div>

        {editMode ? (
          <Card>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>REDIGER OPLYSNINGER</div>
            <Input label="Navn" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} placeholder="Fuldt navn" />
            <Input label="Telefon" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} placeholder="Mobilnummer" />
            <Input label="Licensnummer" value={editForm.license_number} onChange={v => setEditForm(f => ({ ...f, license_number: v }))} placeholder="DK-2026-XXXX" />
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Licens status</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[[true, '✅ OK', C.green], [false, '❌ Ugyldig', C.red], [null, '⏳ Ikke tjekket', C.orange]].map(([val, label, col]) => (
                  <button key={String(val)} onClick={() => setEditForm(f => ({ ...f, license_valid: val }))} style={{ background: editForm.license_valid === val ? col + '22' : C.surface2, border: `1px solid ${editForm.license_valid === val ? col : C.border}`, borderRadius: 6, padding: '5px 10px', color: editForm.license_valid === val ? col : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{label}</button>
                ))}
              </div>
            </div>
            <Input label="Transponder" value={editForm.transponder} onChange={v => setEditForm(f => ({ ...f, transponder: v }))} placeholder="T-XXXX" />
            <Input label="Kart-nummer" value={String(editForm.kart_number || '')} onChange={v => setEditForm(f => ({ ...f, kart_number: v }))} placeholder="98" type="number" />
            <Input label="Klub" value={editForm.club} onChange={v => setEditForm(f => ({ ...f, club: v }))} placeholder="Klubnavn" />
            {saved ? <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 8, padding: 12, textAlign: 'center', color: C.green, fontWeight: 700 }}>✅ Gemt!</div> : <Btn onClick={saveDriver} loading={saving} fullWidth>💾 GEM ÆNDRINGER</Btn>}
          </Card>
        ) : (
          <Card>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>KØRERDATA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Licens', p?.license_number], ['Transponder', p?.transponder], ['Klasse', selDriver.class], ['Kart #', p?.kart_number], ['Klub', p?.club], ['Telefon', p?.phone]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><div style={{ color: C.textDim, fontSize: 10 }}>{k}</div><div style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: 8, background: p?.license_valid === true ? C.green + '11' : C.orange + '11', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{p?.license_valid === true ? '✅' : p?.license_valid === false ? '❌' : '⏳'}</span>
              <span style={{ color: p?.license_valid === true ? C.green : C.orange, fontSize: 12, fontWeight: 700 }}>{p?.license_valid === true ? 'Licens godkendt' : p?.license_valid === false ? 'Licens ugyldig' : 'Licens ikke tjekket'}</span>
            </div>
          </Card>
        )}

        {/* Penalties */}
        <Card accentColor={driverPenalties.length > 0 ? C.orange : C.green}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>STRAFFE ({driverPenalties.length})</div>
          {driverPenalties.length === 0 ? <div style={{ color: C.green, fontSize: 13 }}>✓ Ingen straffe registreret</div> : driverPenalties.map((pen, i) => (
            <div key={pen.id || i} style={{ padding: '8px 0', borderBottom: i < driverPenalties.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{pen.session}</span>
                <Badge color={C.orange} style={{ fontSize: 9 }}>{pen.type}{pen.seconds > 0 ? ` +${pen.seconds}s` : ''}</Badge>
              </div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>{pen.reason}</div>
            </div>
          ))}
        </Card>

        {/* Tyres */}
        {((selDriver.slicks || []).length > 0 || (selDriver.wets || []).length > 0) && (
          <Card>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>DÆKTILLADELSE</div>
            {(selDriver.slicks || []).map((s, i) => <div key={i} style={{ color: C.text, fontSize: 12, fontFamily: 'monospace', padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>{s}</div>)}
            {(selDriver.wets || []).map((w, i) => <div key={i} style={{ color: C.textMuted, fontSize: 12, fontFamily: 'monospace', padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>{w}</div>)}
          </Card>
        )}
      </div>
    );
  }

  // List view
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <SectionHeader title="Kørerliste" subtitle="Tilmeldte kørere" />
        <OfficialBanner />
        <Select label="Løb" value={selEv} onChange={v => { setSelEv(v); setSelClass('Alle'); }} options={events.map(e => ({ value: e.id, label: e.name }))} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
          {classes.map((cls, i) => <button key={i} onClick={() => setSelClass(cls)} style={{ background: selClass === cls ? C.red : C.surface2, color: selClass === cls ? '#fff' : C.textMuted, border: `1px solid ${selClass === cls ? C.red : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{cls}</button>)}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søg kart # eller navn..." style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
        <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 8 }}>{filtered.length} kørere</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {loading ? <Spinner /> : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {filtered.length === 0 && <EmptyState icon="👥" message="Ingen kørere fundet" />}
            {filtered.map((item, i) => (
              <div key={item.user_id} onClick={() => openDriver(item)} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', alignItems: 'center', padding: '12px 14px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}>
                <div style={{ fontWeight: 900, color: C.text, fontSize: 22, fontFamily: "'Barlow Condensed', sans-serif" }}>#{item.profiles?.kart_number}</div>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{item.profiles?.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>{item.class}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {item.profiles?.license_valid === true && <span style={{ fontSize: 14 }}>✅</span>}
                  {item.profiles?.license_valid === false && <span style={{ fontSize: 14 }}>❌</span>}
                  <span style={{ color: C.textDim, fontSize: 18 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LICENSE CONTROL SCREEN (user-facing) ─────────────────────────
export function LicenseControlScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [selClass, setSelClass] = useState('Alle');
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selDriver, setSelDriver] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name, classes').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  const loadDrivers = useCallback(async () => {
    if (!selEv) return;
    setLoading(true);
    const [regs, checks] = await Promise.all([
      supabase.from('registrations').select('user_id, class, profiles(id, name, kart_number, license_number, license_valid)').eq('event_id', selEv),
      supabase.from('license_checks').select('user_id, license_ok, friday_paid').eq('event_id', selEv),
    ]);
    const checkMap = {};
    (checks.data || []).forEach(c => { checkMap[c.user_id] = c; });
    setDrivers((regs.data || []).map(r => ({
      ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      license_ok: checkMap[r.user_id]?.license_ok ?? false,
      friday_paid: checkMap[r.user_id]?.friday_paid ?? false,
    })).sort((a, b) => (a.profiles?.kart_number || 0) - (b.profiles?.kart_number || 0)));
    setLoading(false);
  }, [selEv]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const toggle = async (userId, field, current) => {
    setDrivers(prev => prev.map(d => d.user_id === userId ? { ...d, [field]: !current } : d));
    await supabase.from('license_checks').upsert({ event_id: selEv, user_id: userId, [field]: !current, checked_by: profile?.name }, { onConflict: 'event_id,user_id' });
  };

  const openEdit = (d) => {
    setSelDriver(d);
    setEditForm({ name: d.profiles?.name || '', license_number: d.profiles?.license_number || '', license_valid: d.profiles?.license_valid ?? null, kart_number: d.profiles?.kart_number || '' });
  };

  const saveEdit = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ name: editForm.name, license_number: editForm.license_number || null, license_valid: editForm.license_valid, kart_number: editForm.kart_number ? parseInt(editForm.kart_number) : null }).eq('id', selDriver.profiles?.id);
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); setSelDriver(null); }, 1500);
    loadDrivers();
  };

  const ev = events.find(e => e.id === selEv);
  const classes = ['Alle', ...(ev?.classes || [])];
  const filtered = drivers.filter(d => (selClass === 'Alle' || d.class === selClass) && (!search || String(d.profiles?.kart_number).includes(search) || d.profiles?.name?.toLowerCase().includes(search.toLowerCase())));
  const totalOk = filtered.filter(d => d.license_ok).length;
  const totalFriday = filtered.filter(d => d.friday_paid).length;

  // Edit panel
  if (selDriver) return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <Btn small variant="ghost" onClick={() => setSelDriver(null)} style={{ marginBottom: 14 }}>← Tilbage</Btn>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${C.red},${C.redDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: 'white', flexShrink: 0 }}>{selDriver.profiles?.name?.charAt(0)}</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, fontFamily: "'Barlow Condensed', sans-serif" }}>#{selDriver.profiles?.kart_number}</div>
          <div style={{ fontWeight: 700, color: C.text }}>{selDriver.profiles?.name}</div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>{selDriver.class}</div>
        </div>
      </div>
      <Card accentColor={C.red}>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>REDIGER OPLYSNINGER</div>
        <Input label="Navn" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} placeholder="Fuldt navn" />
        <Input label="Licensnummer" value={editForm.license_number} onChange={v => setEditForm(f => ({ ...f, license_number: v }))} placeholder="DK-2026-XXXX" />
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Licens status</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[[true, '✅ Godkendt', C.green], [false, '❌ Ugyldig', C.red], [null, '⏳ Ikke tjekket', C.orange]].map(([val, label, col]) => (
              <button key={String(val)} onClick={() => setEditForm(f => ({ ...f, license_valid: val }))} style={{ background: editForm.license_valid === val ? col + '22' : C.surface2, border: `1px solid ${editForm.license_valid === val ? col : C.border}`, borderRadius: 6, padding: '5px 10px', color: editForm.license_valid === val ? col : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{label}</button>
            ))}
          </div>
        </div>
        <Input label="Kart-nummer" value={String(editForm.kart_number || '')} onChange={v => setEditForm(f => ({ ...f, kart_number: v }))} placeholder="98" type="number" />
        {saved ? <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 8, padding: 12, textAlign: 'center', color: C.green, fontWeight: 700 }}>✅ Gemt!</div> : <Btn onClick={saveEdit} loading={saving} fullWidth>💾 GEM ÆNDRINGER</Btn>}
      </Card>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <SectionHeader title="Licenskontrol" subtitle="Kontrol ved banen" />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 6, padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ color: C.green, fontWeight: 900, fontSize: 18 }}>{totalOk}/{filtered.length}</div>
              <div style={{ color: C.green, fontSize: 9, letterSpacing: 1 }}>LICENS</div>
            </div>
            <div style={{ background: C.blue + '22', border: `1px solid ${C.blue}44`, borderRadius: 6, padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ color: C.blue, fontWeight: 900, fontSize: 18 }}>{totalFriday}/{filtered.length}</div>
              <div style={{ color: C.blue, fontSize: 9, letterSpacing: 1 }}>FREDAG</div>
            </div>
          </div>
        </div>
        <Select label="Løb" value={selEv} onChange={setSelEv} options={events.map(e => ({ value: e.id, label: e.name }))} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
          {classes.map((cls, i) => <button key={i} onClick={() => setSelClass(cls)} style={{ background: selClass === cls ? C.red : C.surface2, color: selClass === cls ? '#fff' : C.textMuted, border: `1px solid ${selClass === cls ? C.red : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{cls}</button>)}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Søg kart # eller navn..." style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 80px 80px', background: C.surface2, padding: '8px 14px', borderRadius: '6px 6px 0 0', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
          <span style={{ color: C.textMuted, fontSize: 10 }}>KART #</span>
          <span style={{ color: C.textMuted, fontSize: 10 }}>NAVN</span>
          <span style={{ color: C.green, fontSize: 10, textAlign: 'center' }}>✓ LICENS</span>
          <span style={{ color: C.blue, fontSize: 10, textAlign: 'center' }}>💰 FREDAG</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {loading ? <Spinner /> : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
            {filtered.length === 0 && <EmptyState icon="🔍" message="Ingen kørere fundet" />}
            {filtered.map((d, i) => (
              <div key={d.user_id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 80px 80px', alignItems: 'center', padding: '10px 14px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', background: d.license_ok && d.friday_paid ? 'rgba(0,204,102,0.04)' : 'transparent' }}>
                <div onClick={() => openEdit(d)} style={{ fontWeight: 900, color: C.text, fontSize: 20, fontFamily: "'Barlow Condensed', sans-serif", cursor: 'pointer' }}>#{d.profiles?.kart_number}</div>
                <div onClick={() => openEdit(d)} style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{d.profiles?.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>{d.profiles?.license_number} {d.profiles?.license_valid === true ? '✅' : d.profiles?.license_valid === false ? '❌' : ''}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => toggle(d.user_id, 'license_ok', d.license_ok)} style={{ width: 44, height: 36, borderRadius: 6, background: d.license_ok ? C.green + '33' : C.surface2, border: `2px solid ${d.license_ok ? C.green : C.border}`, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{d.license_ok ? '✅' : '○'}</button>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => toggle(d.user_id, 'friday_paid', d.friday_paid)} style={{ width: 44, height: 36, borderRadius: 6, background: d.friday_paid ? C.blue + '33' : C.surface2, border: `2px solid ${d.friday_paid ? C.blue : C.border}`, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{d.friday_paid ? '💰' : '○'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
