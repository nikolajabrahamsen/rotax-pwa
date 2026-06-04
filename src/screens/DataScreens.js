import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Card, Badge, SectionHeader, EmptyState, Spinner } from '../components/ui';
import { C } from '../utils/theme';

// ── PENALTIES ────────────────────────────────────────────────────
export function PenaltiesScreen() {
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cf, setCf] = useState('Alle');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('penalties').select('*').order('created_at', { ascending: false });
      setPenalties(data || []);
      setLoading(false);
    };
    load();
    // Realtime
    const ch = supabase.channel('penalties-user').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'penalties' }, payload => {
      setPenalties(prev => [payload.new, ...prev]);
    }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const classes = ['Alle', ...new Set(penalties.map(p => p.class).filter(Boolean))];
  const filtered = cf === 'Alle' ? penalties : penalties.filter(p => p.class === cf);

  if (loading) return <Spinner />;

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Straffe" subtitle="Live straf-liste" />
      <div style={{ background: C.orange + '11', border: `1px solid ${C.orange}44`, borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 11, color: C.orange }}>⚡ Opdateres live</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
        {classes.map((cls, i) => (
          <button key={i + '_' + cls} onClick={() => setCf(cls)} style={{ background: cf === cls ? C.orange : C.surface2, color: cf === cls ? '#fff' : C.textMuted, border: `1px solid ${cf === cls ? C.orange : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{cls}</button>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon="✅" message="Ingen straffe registreret" />}
      {filtered.map((p, i) => (
        <Card key={p.id || i} accentColor={p.type === 'Diskvalifikation' ? C.red : C.orange} style={{ padding: '11px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{p.driver_name}</span>
            <Badge color={p.type === 'Diskvalifikation' ? C.red : C.orange} style={{ fontSize: 10 }}>{p.type}{p.seconds > 0 ? ` +${p.seconds}s` : ''}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 3 }}>
            <Badge color={C.blue} style={{ fontSize: 10 }}>#{p.kart_no}</Badge>
            <Badge style={{ fontSize: 10 }}>{p.class}</Badge>
            <Badge color={C.textMuted} style={{ fontSize: 10 }}>{p.session}</Badge>
          </div>
          <div style={{ color: C.textMuted, fontSize: 11 }}>{p.reason}</div>
          <div style={{ color: C.textDim, fontSize: 10, marginTop: 3 }}>🕐 {new Date(p.created_at).toLocaleString('da-DK')}</div>
        </Card>
      ))}
    </div>
  );
}

// ── DOCUMENTS ────────────────────────────────────────────────────
export function DocumentsScreen() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cf, setCf] = useState('Alle');
  const [tf, setTf] = useState('Alle');
  const SESSION_LABELS = { kval: 'Kval', heat: 'Heat', prefinale: 'Prefinale', finale: 'Finale' };

  useEffect(() => {
    supabase.from('documents').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setDocs(data || []);
      setLoading(false);
    });
  }, []);

  const classes = ['Alle', ...new Set(docs.map(d => d.class).filter(x => x && x !== 'Alle'))];
  const types = ['Alle', 'Startgrid', 'Resultat', 'Opslagstavle'];
  const filtered = docs.filter(d => (cf === 'Alle' || d.class === cf) && (tf === 'Alle' || d.type === tf));

  if (loading) return <Spinner />;

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Dokumenter" />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 6, paddingBottom: 2 }}>
        {classes.map((cls, i) => <button key={i + '_' + cls} onClick={() => setCf(cls)} style={{ background: cf === cls ? C.red : C.surface2, color: cf === cls ? '#fff' : C.textMuted, border: `1px solid ${cf === cls ? C.red : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{cls}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
        {types.map((t, i) => <button key={i + '_' + t} onClick={() => setTf(t)} style={{ background: tf === t ? C.blue : C.surface2, color: tf === t ? '#fff' : C.textMuted, border: `1px solid ${tf === t ? C.blue : C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>)}
      </div>
      {filtered.length === 0 && <EmptyState icon="📄" message="Ingen dokumenter uploadet endnu" />}
      {filtered.map((d, i) => (
        <Card key={d.id || i} style={{ cursor: 'pointer', padding: '12px 14px' }} onClick={() => d.file_url && d.file_url !== '#' && window.open(d.file_url, '_blank')}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 22 }}>{d.type === 'Startgrid' ? '🏁' : d.type === 'Resultat' ? '🏆' : '📋'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{d.title}</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                <Badge color={d.type === 'Startgrid' ? C.blue : d.type === 'Resultat' ? C.gold : C.textMuted} style={{ fontSize: 10 }}>{d.type}</Badge>
                {d.session_type && <Badge color={C.orange} style={{ fontSize: 10 }}>{SESSION_LABELS[d.session_type] || d.session_type}</Badge>}
                <Badge style={{ fontSize: 10 }}>{d.class}</Badge>
              </div>
              <div style={{ color: C.textDim, fontSize: 10, marginTop: 2 }}>🕐 {new Date(d.created_at).toLocaleString('da-DK')}</div>
            </div>
            <div style={{ color: C.red, fontSize: 16 }}>↓</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── STANDINGS ────────────────────────────────────────────────────
export function StandingsScreen() {
  const [championships, setChampionships] = useState([]);
  const [standings, setStandings] = useState([]);
  const [champId, setChampId] = useState('');
  const [activeClass, setActiveClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('championships').select('*').then(({ data }) => {
      setChampionships(data || []);
      if (data?.[0]) setChampId(data[0].id);
      setLoading(false);
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

  const classes = [...new Set(standings.map(r => r.class))];
  const rows = standings.filter(r => r.class === activeClass);
  const rounds = rows[0] ? [rows[0].r1, rows[0].r2, rows[0].r3, rows[0].r4, rows[0].r5, rows[0].r6].filter(v => v !== null && v !== undefined).length : 0;

  if (loading) return <Spinner />;

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Mesterskab" />
      {championships.length > 0 && (
        <select value={champId} onChange={e => setChampId(e.target.value)} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, marginBottom: 12 }}>
          {championships.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {classes.map(cls => <button key={cls} onClick={() => setActiveClass(cls)} style={{ background: activeClass === cls ? C.red : C.surface2, color: activeClass === cls ? '#fff' : C.textMuted, border: `1px solid ${activeClass === cls ? C.red : C.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>{cls}</button>)}
      </div>
      {rows.length === 0 && <EmptyState icon="🏆" message="Ingen stillinger uploadet endnu" />}
      {rows.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: C.surface2 }}>
                {['#', 'Kart', 'Kører', ...Array.from({ length: rounds }, (_, i) => `R${i + 1}`), 'Pt', 'Sejre'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', color: C.textMuted, fontWeight: 600, textAlign: 'left', fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: i === 0 ? 'rgba(255,215,0,0.04)' : 'transparent' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 900, color: i === 0 ? C.gold : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : C.textMuted, fontSize: 14 }}>{r.position}</td>
                    <td style={{ padding: '9px 10px', color: C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>#{r.kart_no}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: C.text }}>{r.driver_name}</td>
                    {Array.from({ length: rounds }, (_, j) => <td key={j} style={{ padding: '9px 10px', color: C.textMuted }}>{r[`r${j + 1}`] ?? '-'}</td>)}
                    <td style={{ padding: '9px 10px', fontWeight: 900, color: C.red, fontSize: 14 }}>{r.points}</td>
                    <td style={{ padding: '9px 10px', color: C.textMuted }}>{r.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── LIVE TIMING ──────────────────────────────────────────────────
export function LiveTimingScreen() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 2000); return () => clearInterval(i); }, []);
  const mockDrivers = [
    { pos: 1, kartNo: 98, name: 'Kristian Kempel Sejersen', lastLap: '58.234', bestLap: '57.891', gap: '—' },
    { pos: 2, kartNo: 37, name: 'William Sterup Nielsen', lastLap: '58.441', bestLap: '58.102', gap: '+0.211' },
    { pos: 3, kartNo: 7, name: 'Magnus Andersen', lastLap: '58.612', bestLap: '58.231', gap: '+0.899' },
    { pos: 4, kartNo: 246, name: 'Malik Arsland', lastLap: '58.891', bestLap: '58.445', gap: '+1.554' },
    { pos: 5, kartNo: 145, name: 'Erik Brandsborg', lastLap: '59.102', bestLap: '58.612', gap: '+2.112' },
  ];
  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Livetiming" subtitle="MyLaps Orbit 5 integration" />
      <div style={{ background: C.green + '11', border: `1px solid ${C.green}44`, borderRadius: 8, padding: 10, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
        <span style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>LIVE – Rotax Junior – Heat 2 – Omgang {10 + tick}</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}`}</style>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: C.surface2 }}>
              {['#', 'Kart', 'Kører', 'Sidst', 'Bedst', 'Gap'].map(h => <th key={h} style={{ padding: '8px 10px', color: C.textMuted, fontWeight: 600, textAlign: 'left', fontSize: 10, letterSpacing: 1 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {mockDrivers.map((d, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i === 0 ? 'rgba(255,215,0,0.06)' : 'transparent' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 900, color: i === 0 ? C.gold : C.textMuted, fontSize: 14 }}>{d.pos}</td>
                  <td style={{ padding: '9px 10px', color: C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>#{d.kartNo}</td>
                  <td style={{ padding: '9px 10px', fontWeight: 700, color: C.text }}>{d.name}</td>
                  <td style={{ padding: '9px 10px', color: i === 0 ? C.gold : C.text, fontFamily: 'monospace' }}>{d.lastLap}</td>
                  <td style={{ padding: '9px 10px', color: C.cyan, fontFamily: 'monospace' }}>{d.bestLap}</td>
                  <td style={{ padding: '9px 10px', color: d.gap === '—' ? C.green : C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>{d.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ background: C.orange + '11', border: `1px solid ${C.orange}44`, borderRadius: 8, padding: 10, marginTop: 8, fontSize: 11, color: C.orange }}>⚠️ Preview – kræver MyLaps Orbit 5 API i produktion.</div>
    </div>
  );
}

// ── NOTIFICATIONS ────────────────────────────────────────────────
export function NotificationsScreen({ isOfficial }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let q = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (!isOfficial) q = q.eq('officials_only', false);
      const { data } = await q;
      setNotifs(data || []);
      setLoading(false);
    };
    load();
    const ch = supabase.channel('notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
      if (isOfficial || !payload.new.officials_only) setNotifs(prev => [payload.new, ...prev]);
    }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [isOfficial]);

  if (loading) return <Spinner />;

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <SectionHeader title="Notifikationer" />
      {notifs.length === 0 && <EmptyState icon="🔔" message="Ingen notifikationer" />}
      {notifs.map((n, i) => (
        <Card key={n.id || i} accentColor={n.officials_only ? C.purple : C.red} style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{n.title}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {n.target_class !== 'Alle' && <Badge style={{ fontSize: 9 }}>{n.target_class}</Badge>}
              {n.officials_only && <Badge color={C.purple} style={{ fontSize: 9 }}>OFFICIALS</Badge>}
            </div>
          </div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>{n.body}</div>
          <div style={{ color: C.textDim, fontSize: 10, marginTop: 3 }}>🕐 {new Date(n.created_at).toLocaleString('da-DK')}</div>
        </Card>
      ))}
    </div>
  );
}
