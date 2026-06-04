import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Card, Badge, SectionHeader, Btn, Input, Select, EmptyState, Spinner } from '../components/ui';
import { C, DEFAULT_CLASSES, SESSION_OPTS } from '../utils/theme';

// ── HELPERS ──────────────────────────────────────────────────────
function exportCSV(rows, headers, filename) {
  const csv = [headers, ...rows.map(r => headers.map(h => r[h] || ''))].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(u);
}

// ── ADMIN DASHBOARD ──────────────────────────────────────────────
export function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, events: 0, registrations: 0, penalties: 0 });
  const [events, setEvents] = useState([]);
  const [readySignals, setReadySignals] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [u, e, r, p, rs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('*, registrations(id)').order('date'),
        supabase.from('registrations').select('id', { count: 'exact', head: true }),
        supabase.from('penalties').select('id', { count: 'exact', head: true }),
        supabase.from('ready_signals').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      setStats({ users: u.count || 0, events: e.count || 0, registrations: r.count || 0, penalties: p.count || 0 });
      setEvents(e.data || []);
      setReadySignals(rs.data || []);
    };
    load();

    // Realtime ready signals
    const ch = supabase.channel('admin-ready').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ready_signals' }, payload => {
      setReadySignals(prev => [payload.new, ...prev]);
    }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <SectionHeader title="Dashboard" subtitle="Rotax Danmark 2026" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[['KØRERE', stats.users, C.red], ['LØB', stats.events, C.orange], ['TILMELD.', stats.registrations, C.green], ['STRAFFE', stats.penalties, C.orange], ['KLAR-SIGN.', readySignals.length, C.cyan]].map(([l, v, c]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${c}`, borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ color: C.textMuted, fontSize: 9, letterSpacing: 1 }}>{l}</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: c, fontFamily: "'Barlow Condensed', sans-serif" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Ready signals */}
      {readySignals.length > 0 && (
        <Card accentColor={C.cyan}>
          <div style={{ color: C.cyan, fontSize: 10, letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>✓ KLAR-SIGNALER MODTAGET</div>
          {readySignals.slice(0, 5).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontSize: 12 }}>{s.class} · {s.session} · {s.signal_type}</span>
              <span style={{ color: C.textMuted, fontSize: 10 }}>{new Date(s.created_at).toLocaleTimeString('da-DK')}</span>
            </div>
          ))}
        </Card>
      )}

      <SectionHeader title="Løbs-status" />
      {events.map(ev => (
        <Card key={ev.id} style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{ev.name}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>📅 {ev.date} · 📍 {ev.location}</div>
            </div>
            <Badge color={ev.registration_open ? C.green : C.orange} style={{ fontSize: 10 }}>{ev.registration_open ? 'ÅBEN' : 'LUKKET'}</Badge>
          </div>
          <div style={{ background: C.bg, borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ((ev.registrations?.length || 0) / 120) * 100)}%`, height: '100%', background: C.red, borderRadius: 4 }} />
          </div>
          <div style={{ color: C.textMuted, fontSize: 10, marginTop: 3 }}>{ev.registrations?.length || 0} tilmeldte</div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN EVENTS ─────────────────────────────────────────────────
export function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', end_date: '', location: '', deadline: '', fee: '750', registration_open: true, payment_type: 'mobilepay', payment_number: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('events').select('*, registrations(id)').order('date');
    setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.name || !form.date) return;
    setSaving(true);
    await supabase.from('events').insert({
      name: form.name, date: form.date, end_date: form.end_date || form.date,
      location: form.location, deadline: form.deadline || form.date,
      fee: parseInt(form.fee) || 750, registration_open: form.registration_open,
      payment_type: form.payment_type, payment_number: form.payment_number,
      classes: Object.keys(DEFAULT_CLASSES),
    });
    setSaving(false);
    setShowNew(false);
    setForm({ name: '', date: '', end_date: '', location: '', deadline: '', fee: '750', registration_open: true, payment_type: 'mobilepay', payment_number: '' });
    load();
  };

  const toggleReg = async (ev) => {
    await supabase.from('events').update({ registration_open: !ev.registration_open }).eq('id', ev.id);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <SectionHeader title="Løb" />
        <Btn small onClick={() => setShowNew(!showNew)}>+ Nyt løb</Btn>
      </div>

      {showNew && (
        <Card accentColor={C.red} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: C.red, marginBottom: 10, fontSize: 13 }}>Opret nyt løb</div>
          <Input label="Løbsnavn" value={form.name} onChange={v => setF('name', v)} placeholder="Rotax DM Runde 4" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input label="Start dato" value={form.date} onChange={v => setF('date', v)} placeholder="2026-09-20" />
            <Input label="Slut dato" value={form.end_date} onChange={v => setF('end_date', v)} placeholder="2026-09-21" />
          </div>
          <Input label="Sted" value={form.location} onChange={v => setF('location', v)} placeholder="Horslunde Motorpark" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input label="Tilm. frist" value={form.deadline} onChange={v => setF('deadline', v)} placeholder="2026-09-06" />
            <Input label="Gebyr (kr.)" value={form.fee} onChange={v => setF('fee', v)} placeholder="750" type="number" />
          </div>
          <Select label="Betalingstype" value={form.payment_type} onChange={v => setF('payment_type', v)} options={[{ value: 'mobilepay', label: 'MobilePay' }, { value: 'card', label: 'Betalingskort (Stripe)' }]} />
          {form.payment_type === 'mobilepay' && <Input label="MobilePay #" value={form.payment_number} onChange={v => setF('payment_number', v)} placeholder="12345" />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ color: C.textMuted, fontSize: 11 }}>Tilmelding åben</span>
            <button onClick={() => setF('registration_open', !form.registration_open)} style={{ background: form.registration_open ? C.green + '33' : C.surface2, border: `1px solid ${form.registration_open ? C.green : C.border}`, borderRadius: 20, padding: '4px 12px', color: form.registration_open ? C.green : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{form.registration_open ? '✓ ÅBEN' : 'LUKKET'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small onClick={create} loading={saving}>Opret løb</Btn>
            <Btn small variant="ghost" onClick={() => setShowNew(false)}>Annuller</Btn>
          </div>
        </Card>
      )}

      {events.map(ev => (
        <Card key={ev.id} style={{ padding: '11px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{ev.name}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>{ev.location} · {ev.date}</div>
              <div style={{ color: C.textDim, fontSize: 10 }}>{ev.payment_type === 'mobilepay' ? `MobilePay #${ev.payment_number}` : 'Stripe'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <Badge color={C.green} style={{ fontSize: 10 }}>{ev.registrations?.length || 0} tilm.</Badge>
              <button onClick={() => toggleReg(ev)} style={{ background: ev.registration_open ? C.green + '22' : C.surface2, border: `1px solid ${ev.registration_open ? C.green : C.border}`, borderRadius: 20, padding: '3px 10px', color: ev.registration_open ? C.green : C.textMuted, cursor: 'pointer', fontSize: 10 }}>{ev.registration_open ? 'ÅBEN' : 'LUKKET'}</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN REGISTRATIONS ──────────────────────────────────────────
export function AdminRegistrations() {
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selEv) return;
    setLoading(true);
    supabase.from('registrations').select('*, profiles(name, email, phone, kart_number, license_number, license_valid, transponder, club)').eq('event_id', selEv).then(({ data }) => {
      setRegs(data || []);
      setLoading(false);
    });
  }, [selEv]);

  const doExport = () => {
    exportCSV(
      regs.map(r => ({
        'Navn': r.profiles?.name || '', 'E-mail': r.profiles?.email || '',
        'Klasse': r.class || '', 'Kart #': r.profiles?.kart_number || '',
        'Licens': r.profiles?.license_number || '', 'Betalt': r.paid ? 'Ja' : 'Nej',
        'Licens OK': r.profiles?.license_valid === true ? 'Ja' : r.profiles?.license_valid === false ? 'Nej' : '?',
        'Ryttergård': r.paddock_space || '', 'Slicks': (r.slicks || []).join(';'),
      })),
      ['Navn', 'E-mail', 'Klasse', 'Kart #', 'Licens', 'Betalt', 'Licens OK', 'Ryttergård', 'Slicks'],
      `tilmeldinger`
    );
  };

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <SectionHeader title="Tilmeldinger" />
      <Select label="Løb" value={selEv} onChange={setSelEv} options={events.map(e => ({ value: e.id, label: e.name }))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color: C.textMuted, fontSize: 12 }}>{regs.length} tilmeldte</div>
        <Btn small variant="secondary" onClick={doExport}>⬇ CSV</Btn>
      </div>
      {loading ? <Spinner /> : regs.length === 0 ? <EmptyState icon="📝" message="Ingen tilmeldinger" /> : regs.map((r, i) => (
        <Card key={r.id || i} style={{ padding: '11px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{r.profiles?.name}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>{r.class} · #{r.profiles?.kart_number}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>🅿 {r.paddock_space || '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <Badge color={r.paid ? C.green : C.red} style={{ fontSize: 10 }}>{r.paid ? 'BETALT' : 'UBETALT'}</Badge>
              <Badge color={r.profiles?.license_valid === true ? C.green : C.orange} style={{ fontSize: 10 }}>{r.profiles?.license_valid === true ? 'LICENS ✓' : 'LICENS ?'}</Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN USERS ──────────────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => supabase.from('profiles').select('*').order('name').then(({ data }) => { setUsers(data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name || '', phone: u.phone || '',
      license_number: u.license_number || '', license_valid: u.license_valid ?? null,
      transponder: u.transponder || '', kart_class: u.kart_class || '',
      kart_number: u.kart_number || '', dob: u.dob || '',
      club: u.club || '', type: u.type || 'driver', is_official: u.is_official || false,
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      name: editForm.name, phone: editForm.phone || null,
      license_number: editForm.license_number || null,
      license_valid: editForm.license_valid,
      transponder: editForm.transponder || null,
      kart_class: editForm.kart_class || null,
      kart_number: editForm.kart_number ? parseInt(editForm.kart_number) : null,
      dob: editForm.dob || null, club: editForm.club || null,
      type: editForm.type, is_official: editForm.is_official,
    }).eq('id', editUser.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const setF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  if (loading) return <Spinner />;

  // Edit panel
  if (editUser) return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <Btn small variant="ghost" onClick={() => setEditUser(null)} style={{ marginBottom: 14 }}>← Tilbage</Btn>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg,${C.red},${C.redDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: 'white', flexShrink: 0 }}>{editUser.name?.charAt(0)}</div>
        <div>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{editUser.name}</div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>{editUser.email}</div>
        </div>
      </div>

      <Card accentColor={C.red}>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>BRUGERTYPE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {[['driver', 'KØRER', C.red], ['parent', 'FORÆLDER', C.blue], ['official', 'OFFICIAL', C.purple], ['admin', 'ADMIN', C.orange]].map(([val, label, col]) => (
            <button key={val} onClick={() => setF('type', val)} style={{ background: editForm.type === val ? col + '33' : C.surface2, border: `1px solid ${editForm.type === val ? col : C.border}`, borderRadius: 20, padding: '5px 14px', color: editForm.type === val ? col : C.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: editForm.type === val ? 700 : 400 }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ color: C.textMuted, fontSize: 11 }}>Official-rolle</span>
          <button onClick={() => setF('is_official', !editForm.is_official)} style={{ background: editForm.is_official ? C.purple + '33' : C.surface2, border: `1px solid ${editForm.is_official ? C.purple : C.border}`, borderRadius: 20, padding: '4px 12px', color: editForm.is_official ? C.purple : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{editForm.is_official ? '✓ AKTIV' : 'INAKTIV'}</button>
        </div>
      </Card>

      <Card>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>PERSONLIGE OPLYSNINGER</div>
        <Input label="Navn" value={editForm.name} onChange={v => setF('name', v)} placeholder="Fuldt navn" />
        <Input label="Telefon" value={editForm.phone} onChange={v => setF('phone', v)} placeholder="Mobilnummer" />
        <Input label="Fødselsdato" value={editForm.dob} onChange={v => setF('dob', v)} placeholder="YYYY-MM-DD" />
        <Input label="Klub" value={editForm.club} onChange={v => setF('club', v)} placeholder="Klubnavn" />
      </Card>

      <Card>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>KØRERDATA</div>
        <Input label="Licensnummer" value={editForm.license_number} onChange={v => setF('license_number', v)} placeholder="DK-2026-XXXX" />
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Licens status</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[[true, '✅ Godkendt', C.green], [false, '❌ Ugyldig', C.red], [null, '⏳ Ikke tjekket', C.orange]].map(([val, label, col]) => (
              <button key={String(val)} onClick={() => setF('license_valid', val)} style={{ background: editForm.license_valid === val ? col + '22' : C.surface2, border: `1px solid ${editForm.license_valid === val ? col : C.border}`, borderRadius: 6, padding: '5px 10px', color: editForm.license_valid === val ? col : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{label}</button>
            ))}
          </div>
        </div>
        <Input label="Transpondernummer" value={editForm.transponder} onChange={v => setF('transponder', v)} placeholder="T-XXXX" />
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Klasse</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(DEFAULT_CLASSES).map(([cls, rule]) => (
              <button key={cls} onClick={() => setF('kart_class', cls)} style={{ background: editForm.kart_class === cls ? rule.color + '33' : C.surface2, border: `1px solid ${editForm.kart_class === cls ? rule.color : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: editForm.kart_class === cls ? rule.color : C.textMuted }}>{cls}</button>
            ))}
          </div>
        </div>
        <Input label="Kart-nummer" value={String(editForm.kart_number || '')} onChange={v => setF('kart_number', v)} placeholder="eks. 98" type="number" />
      </Card>

      {saved
        ? <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 8, padding: 14, textAlign: 'center', color: C.green, fontWeight: 700 }}>✅ Gemt!</div>
        : <Btn onClick={saveEdit} loading={saving} fullWidth>💾 GEM ÆNDRINGER</Btn>
      }
    </div>
  );

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <SectionHeader title="Brugere" subtitle={`${users.length} registrerede`} />
      <Input value={search} onChange={setSearch} placeholder="Søg på navn eller e-mail..." />
      {filtered.map(u => (
        <Card key={u.id} style={{ padding: '11px 14px', cursor: 'pointer' }} onClick={() => openEdit(u)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{u.name}</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>{u.email || '(ingen email)'}</div>
              {u.kart_class && <div style={{ color: C.textMuted, fontSize: 11 }}>{u.kart_class} · #{u.kart_number}</div>}
              {u.license_number && <div style={{ color: C.textDim, fontSize: 10 }}>{u.license_number} {u.license_valid === true ? '✅' : u.license_valid === false ? '❌' : '⏳'}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <Badge color={u.type === 'admin' ? C.orange : u.type === 'official' ? C.purple : u.type === 'parent' ? C.blue : C.red} style={{ fontSize: 10 }}>
                {u.type === 'admin' ? 'ADMIN' : u.type === 'official' ? 'OFFICIAL' : u.type === 'parent' ? 'FORÆLDER' : 'KØRER'}
              </Badge>
              {u.is_official && u.type !== 'official' && <Badge color={C.purple} style={{ fontSize: 10 }}>+OFFICIAL</Badge>}
              <span style={{ color: C.textDim, fontSize: 18 }}>›</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN PENALTIES ──────────────────────────────────────────────
export function AdminPenalties() {
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState('');
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAlert, setNewAlert] = useState(false);
  const [cf, setCf] = useState('Alle');
  const [sf, setSf] = useState('Alle');
  const [form, setForm] = useState({ kart_no: '', driver_name: '', class: 'Rotax Junior', session: 'Heat 1', type: 'Tidsstraf', seconds: '5', reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setSelEv(data[0].id);
    });
  }, []);

  const loadPenalties = useCallback(async () => {
    if (!selEv) return;
    setLoading(true);
    const { data } = await supabase.from('penalties').select('*').eq('event_id', selEv).order('created_at', { ascending: false });
    setPenalties(data || []);
    setLoading(false);
  }, [selEv]);

  useEffect(() => { loadPenalties(); }, [loadPenalties]);

  // Realtime
  useEffect(() => {
    if (!selEv) return;
    const ch = supabase.channel('admin-penalties').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'penalties', filter: `event_id=eq.${selEv}` }, payload => {
      setPenalties(prev => [payload.new, ...prev]);
      setNewAlert(true);
      setTimeout(() => setNewAlert(false), 5000);
      // Play sound
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2o=').play(); } catch {}
    }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [selEv]);

  const addPenalty = async () => {
    if (!form.driver_name) return;
    setSaving(true);
    await supabase.from('penalties').insert({
      event_id: selEv, kart_no: parseInt(form.kart_no) || 0,
      driver_name: form.driver_name, class: form.class,
      session: form.session, type: form.type,
      seconds: parseInt(form.seconds) || 0, reason: form.reason, source: 'manual',
    });
    setForm(f => ({ ...f, driver_name: '', kart_no: '', reason: '' }));
    setSaving(false);
  };

  const classes = ['Alle', ...new Set(penalties.map(p => p.class).filter(Boolean))];
  const sessions = ['Alle', ...new Set(penalties.map(p => p.session).filter(Boolean))];
  const filtered = penalties.filter(p => (cf === 'Alle' || p.class === cf) && (sf === 'Alle' || p.session === sf));

  const doExport = () => exportCSV(
    filtered.map(p => ({ 'Kart #': p.kart_no, 'Kører': p.driver_name, 'Klasse': p.class, 'Session': p.session, 'Type': p.type, 'Sekunder': p.seconds, 'Årsag': p.reason, 'Kilde': p.source, 'Tid': new Date(p.created_at).toLocaleString('da-DK') })),
    ['Kart #', 'Kører', 'Klasse', 'Session', 'Type', 'Sekunder', 'Årsag', 'Kilde', 'Tid'],
    'straffe'
  );

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <SectionHeader title="Straffe" />

      {newAlert && (
        <div style={{ background: C.orange + '22', border: `1px solid ${C.orange}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center', animation: 'slideIn 0.3s ease' }}>
          <style>{`@keyframes slideIn{from{transform:translateY(-8px);opacity:0;}to{transform:translateY(0);opacity:1;}}`}</style>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.orange, flexShrink: 0 }} />
          <span style={{ color: C.orange, fontWeight: 700, fontSize: 13 }}>🔔 NY STRAF MODTAGET!</span>
        </div>
      )}

      <Select label="Løb" value={selEv} onChange={v => { setSelEv(v); setCf('Alle'); setSf('Alle'); }} options={events.map(e => ({ value: e.id, label: e.name }))} />

      <Card accentColor={C.orange}>
        <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>TILFØJ STRAF</div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
          <Input label="Kart #" value={form.kart_no} onChange={v => setForm(f => ({ ...f, kart_no: v }))} placeholder="98" type="number" />
          <Input label="Kørernavn" value={form.driver_name} onChange={v => setForm(f => ({ ...f, driver_name: v }))} placeholder="Fuldt navn" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Select label="Klasse" value={form.class} onChange={v => setForm(f => ({ ...f, class: v }))} options={Object.keys(DEFAULT_CLASSES)} />
          <Select label="Session" value={form.session} onChange={v => setForm(f => ({ ...f, session: v }))} options={SESSION_OPTS} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Straftype</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Tidsstraf +3 sek', 'Tidsstraf +5 sek', 'Tidsstraf +10 sek', 'Advarsel', 'Sortflag', 'Diskvalifikation', 'Placering sidst'].map(opt => {
              const active = form.type === opt.split(' ')[0] && (opt.includes('+') ? form.seconds === opt.match(/\d+/)?.[0] : true);
              return (
                <button key={opt} onClick={() => {
                  const sec = opt.match(/\d+/)?.[0] || '0';
                  setForm(f => ({ ...f, type: opt.includes('Tidsstraf') ? 'Tidsstraf' : opt, seconds: sec }));
                }} style={{ background: form.reason === opt || (opt.includes('+' + form.seconds) && form.type === 'Tidsstraf') ? C.orange + '33' : C.surface2, border: `1px solid ${form.reason === opt || (opt.includes('+' + form.seconds) && form.type === 'Tidsstraf') ? C.orange : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', color: C.textMuted }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        <Input label="Årsag" value={form.reason} onChange={v => setForm(f => ({ ...f, reason: v }))} placeholder="Beskriv forseelsen..." />
        <Btn onClick={addPenalty} loading={saving} fullWidth variant="secondary">+ TILFØJ STRAF</Btn>
      </Card>

      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 5 }}>
        {classes.map((c, i) => <button key={i} onClick={() => setCf(c)} style={{ background: cf === c ? C.orange : C.surface2, color: cf === c ? '#fff' : C.textMuted, border: `1px solid ${cf === c ? C.orange : C.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 8 }}>
        {sessions.map((s, i) => <button key={i} onClick={() => setSf(s)} style={{ background: sf === s ? C.blue : C.surface2, color: sf === s ? '#fff' : C.textMuted, border: `1px solid ${sf === s ? C.blue : C.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{s}</button>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: C.textMuted, fontSize: 11 }}>{filtered.length} straffe</span>
        <Btn small variant="secondary" onClick={doExport}>⬇ CSV</Btn>
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon="✅" message="Ingen straffe" /> : filtered.map((p, i) => (
        <Card key={p.id || i} accentColor={p.type === 'Diskvalifikation' ? C.red : C.orange} style={{ padding: '10px 14px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 12 }}>{p.driver_name} #{p.kart_no}</span>
            <Badge color={p.type === 'Diskvalifikation' ? C.red : C.orange} style={{ fontSize: 9 }}>{p.type}{p.seconds > 0 ? ` +${p.seconds}s` : ''}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Badge style={{ fontSize: 9 }}>{p.class}</Badge>
            <Badge color={C.blue} style={{ fontSize: 9 }}>{p.session}</Badge>
          </div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>{p.reason}</div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN DOCUMENTS ──────────────────────────────────────────────
export function AdminDocuments() {
  const [events, setEvents] = useState([]);
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ title: '', type: 'Startgrid', session_type: 'kval', class: 'Rotax Junior', event_id: '', file_url: '#' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setForm(f => ({ ...f, event_id: data[0].id }));
    });
    supabase.from('documents').select('*').order('created_at', { ascending: false }).then(({ data }) => setDocs(data || []));
  }, []);

  const upload = async () => {
    if (!form.title || !form.event_id) return;
    setSaving(true);
    await supabase.from('documents').insert({ ...form });
    // Send notification
    await supabase.from('notifications').insert({ event_id: form.event_id, title: `Nyt dokument: ${form.title}`, body: `${form.class} – uploadet`, target_class: form.class, officials_only: false, sent_by: 'Admin' });
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocs(data || []);
    setForm(f => ({ ...f, title: '' }));
    setSaving(false);
  };

  const ST = [{ value: 'kval', label: 'Kvalifikation' }, { value: 'heat', label: 'Heat' }, { value: 'prefinale', label: 'Prefinale' }, { value: 'finale', label: 'Finale' }];

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <SectionHeader title="Dokumenter" />
      <Card accentColor={C.red}>
        <Select label="Løb" value={form.event_id} onChange={v => setForm(f => ({ ...f, event_id: v }))} options={events.map(e => ({ value: e.id, label: e.name }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Select label="Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={['Startgrid', 'Resultat', 'Opslagstavle']} />
          <Select label="Session" value={form.session_type} onChange={v => setForm(f => ({ ...f, session_type: v }))} options={ST} />
        </div>
        <Select label="Klasse" value={form.class} onChange={v => setForm(f => ({ ...f, class: v }))} options={['Alle', ...Object.keys(DEFAULT_CLASSES)]} />
        <Input label="Titel" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="f.eks. Startgrid – Junior Kval." />
        <Input label="PDF Link (URL)" value={form.file_url === '#' ? '' : form.file_url} onChange={v => setForm(f => ({ ...f, file_url: v || '#' }))} placeholder="https://..." />
        <div style={{ border: `2px dashed ${C.border}`, borderRadius: 6, padding: 12, textAlign: 'center', marginBottom: 10, cursor: 'pointer' }}>
          <div style={{ fontSize: 20 }}>📎</div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>Fil-upload via Supabase Storage (kræver opsætning)</div>
        </div>
        <Btn onClick={upload} loading={saving} fullWidth>⬆ UPLOAD & SEND NOTIFIKATION</Btn>
      </Card>
      {docs.map((d, i) => (
        <Card key={d.id || i} style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 12 }}>{d.title}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                <Badge color={d.type === 'Startgrid' ? C.blue : d.type === 'Resultat' ? C.gold : C.textMuted} style={{ fontSize: 9 }}>{d.type}</Badge>
                <Badge style={{ fontSize: 9 }}>{d.class}</Badge>
              </div>
            </div>
            <div style={{ color: C.textDim, fontSize: 10 }}>{new Date(d.created_at).toLocaleString('da-DK')}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN NOTIFICATIONS ──────────────────────────────────────────
export function AdminNotifications() {
  const [events, setEvents] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', target_class: 'Alle', event_id: '', officials_only: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setForm(f => ({ ...f, event_id: data[0].id }));
    });
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).then(({ data }) => setNotifs(data || []));
  }, []);

  const send = async () => {
    if (!form.title) return;
    setSaving(true);
    await supabase.from('notifications').insert({ ...form, sent_by: 'Admin' });
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    setNotifs(data || []);
    setForm(f => ({ ...f, title: '', body: '' }));
    setSaving(false);
  };

  const classes = ['Alle', ...Object.keys(DEFAULT_CLASSES)];

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <SectionHeader title="Notifikationer" />
      <Card accentColor={C.red}>
        <Select label="Løb" value={form.event_id} onChange={v => setForm(f => ({ ...f, event_id: v }))} options={events.map(e => ({ value: e.id, label: e.name }))} />
        <Select label="Klasse" value={form.target_class} onChange={v => setForm(f => ({ ...f, target_class: v }))} options={classes} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ color: C.textMuted, fontSize: 11 }}>Kun officials</span>
          <button onClick={() => setForm(f => ({ ...f, officials_only: !f.officials_only }))} style={{ background: form.officials_only ? C.purple + '33' : C.surface2, border: `1px solid ${form.officials_only ? C.purple : C.border}`, borderRadius: 20, padding: '3px 12px', color: form.officials_only ? C.purple : C.textMuted, cursor: 'pointer', fontSize: 11 }}>{form.officials_only ? '✓ KUN OFFICIALS' : 'ALLE'}</button>
        </div>
        <Input label="Titel" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Overskrift..." />
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>Besked</div>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={2} placeholder="Beskedtekst..." style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <Btn onClick={send} loading={saving} fullWidth>📣 SEND</Btn>
      </Card>
      {notifs.map((n, i) => (
        <Card key={n.id || i} style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 12 }}>{n.title}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Badge style={{ fontSize: 9 }}>{n.target_class}</Badge>
              {n.officials_only && <Badge color={C.purple} style={{ fontSize: 9 }}>OFFICIALS</Badge>}
            </div>
          </div>
          <div style={{ color: C.textMuted, fontSize: 11 }}>{n.body}</div>
        </Card>
      ))}
    </div>
  );
}

// ── ADMIN STANDINGS ──────────────────────────────────────────────
export function AdminStandings() {
  const [championships, setChampionships] = useState([]);
  const [standings, setStandings] = useState([]);
  const [champId, setChampId] = useState('');
  const [activeClass, setActiveClass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [champForm, setChampForm] = useState({ name: '', classes: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('championships').select('*').then(({ data }) => {
      setChampionships(data || []);
      if (data?.[0]) setChampId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!champId) return;
    supabase.from('standings').select('*').eq('championship_id', champId).order('position').then(({ data }) => {
      setStandings(data || []);
      const cls = [...new Set((data || []).map(r => r.class))];
      if (cls[0]) setActiveClass(cls[0]);
    });
  }, [champId]);

  const createChamp = async () => {
    if (!champForm.name) return;
    setSaving(true);
    const { data } = await supabase.from('championships').insert({ name: champForm.name, classes: Object.keys(DEFAULT_CLASSES) }).select().single();
    setChampionships(prev => [...prev, data]);
    setChampId(data.id);
    setShowNew(false);
    setSaving(false);
  };

  const classes = [...new Set(standings.map(r => r.class))];
  const rows = standings.filter(r => r.class === activeClass);

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <SectionHeader title="Mesterskab" />
        <Btn small onClick={() => setShowNew(!showNew)}>+ Nyt mesterskab</Btn>
      </div>

      {showNew && (
        <Card accentColor={C.red} style={{ marginBottom: 12 }}>
          <Input label="Mesterskabsnavn" value={champForm.name} onChange={v => setChampForm(f => ({ ...f, name: v }))} placeholder="Rotax DM 2027" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small onClick={createChamp} loading={saving}>Opret</Btn>
            <Btn small variant="ghost" onClick={() => setShowNew(false)}>Annuller</Btn>
          </div>
        </Card>
      )}

      <div style={{ background: C.orange + '11', border: `1px solid ${C.orange}44`, borderRadius: 6, padding: 8, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>📊</span>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: C.orange, fontSize: 12 }}>Excel-import</div><div style={{ color: C.textMuted, fontSize: 11 }}>Upload .xlsx via API for at opdatere stillinger</div></div>
        <Btn small variant="ghost">Upload Excel</Btn>
      </div>

      {championships.length > 0 && (
        <select value={champId} onChange={e => setChampId(e.target.value)} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, marginBottom: 10 }}>
          {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10 }}>
        {classes.map(c => <button key={c} onClick={() => setActiveClass(c)} style={{ background: activeClass === c ? C.red : C.surface2, color: activeClass === c ? '#fff' : C.textMuted, border: `1px solid ${activeClass === c ? C.red : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c}</button>)}
      </div>

      {rows.length === 0 ? <EmptyState icon="🏆" message="Ingen stillinger endnu – upload via Excel" /> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: C.surface2 }}>
                {['#', 'Kart', 'Kører', 'R1', 'R2', 'R3', 'Pt', 'Sejre'].map(h => <th key={h} style={{ padding: '8px 10px', color: C.textMuted, fontWeight: 600, textAlign: 'left', fontSize: 10 }}>{h}</th>)}
              </tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '9px 10px', fontWeight: 900, color: i === 0 ? C.gold : C.textMuted, fontSize: 14 }}>{r.position}</td>
                  <td style={{ padding: '9px 10px', color: C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>#{r.kart_no}</td>
                  <td style={{ padding: '9px 10px', fontWeight: 700, color: C.text }}>{r.driver_name}</td>
                  {[r.r1, r.r2, r.r3].map((v, j) => <td key={j} style={{ padding: '9px 10px', color: C.textMuted }}>{v ?? '-'}</td>)}
                  <td style={{ padding: '9px 10px', fontWeight: 900, color: C.red, fontSize: 14 }}>{r.points}</td>
                  <td style={{ padding: '9px 10px', color: C.textMuted }}>{r.wins}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
