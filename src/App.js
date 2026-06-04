import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SlideMenu } from './components/SlideMenu';
import { RotaxLogo, LoadingScreen } from './components/ui';
import { C } from './utils/theme';
import LoginScreen from './screens/LoginScreen';
import CalendarScreen from './screens/CalendarScreen';
import ProfileScreen from './screens/ProfileScreen';
import { PenaltiesScreen, DocumentsScreen, StandingsScreen, LiveTimingScreen, NotificationsScreen } from './screens/DataScreens';
import { AdminDashboard, AdminEvents, AdminRegistrations, AdminUsers, AdminPenalties, AdminDocuments, AdminNotifications, AdminStandings } from './screens/AdminScreens';

// ── USER TABS ─────────────────────────────────────────────────────
const MAIN_TABS = [
  { id: 'calendar',  icon: '📅', label: 'Kalender',       group: 'main' },
  { id: 'docs',      icon: '📄', label: 'Dokumenter',     group: 'main' },
  { id: 'standings', icon: '🏆', label: 'Mesterskab',     group: 'main' },
  { id: 'timing',    icon: '⏱️', label: 'Livetiming',     group: 'main' },
  { id: 'penalties', icon: '⚠️', label: 'Straffe',        group: 'main' },
  { id: 'regs',      icon: '📋', label: 'Reglementer',    group: 'main' },
  { id: 'notif',     icon: '🔔', label: 'Notifikationer', group: 'main' },
  { id: 'profile',   icon: '👤', label: 'Profil',         group: 'main' },
];
const OFFICIAL_TABS = [
  { id: 'weight',       icon: '⚖️', label: 'Vægt',           group: 'official' },
  { id: 'nose',         icon: '🔧', label: 'Snude',          group: 'official' },
  { id: 'reporting',    icon: '🔍', label: 'Indrapportering', group: 'official' },
  { id: 'licensecheck', icon: '🪪', label: 'Licenskontrol',  group: 'official' },
  { id: 'driverlist',   icon: '👥', label: 'Kørerliste',     group: 'official' },
];
const GUEST_TABS = [
  { id: 'docs',   icon: '📄', label: 'Dokumenter', group: 'main' },
  { id: 'timing', icon: '⏱️', label: 'Livetiming', group: 'main' },
];

// ── ADMIN TABS ────────────────────────────────────────────────────
const ADMIN_TABS = [
  { id: 'dashboard',     icon: '📊', label: 'Dashboard' },
  { id: 'events',        icon: '📅', label: 'Løb' },
  { id: 'registrations', icon: '📝', label: 'Tilmeldinger' },
  { id: 'users',         icon: '👥', label: 'Brugere' },
  { id: 'penalties',     icon: '⚠️', label: 'Straffe' },
  { id: 'documents',     icon: '📄', label: 'Dokumenter' },
  { id: 'notifications', icon: '🔔', label: 'Notifikationer' },
  { id: 'standings',     icon: '🏆', label: 'Mesterskab' },
];

function PlaceholderScreen({ title }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 10 }}>
      <div style={{ fontSize: 36 }}>🚧</div>
      <div style={{ color: C.textMuted, fontSize: 14 }}>{title}</div>
      <div style={{ color: C.textDim, fontSize: 11 }}>Implementeres løbende</div>
    </div>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────
function AdminPanel({ signOut }) {
  const [sec, setSec] = useState('dashboard');
  const active = ADMIN_TABS.find(t => t.id === sec) || ADMIN_TABS[0];
  const penaltyCount = 0; // could wire realtime here

  const renderScreen = () => {
    switch (sec) {
      case 'dashboard':     return <AdminDashboard />;
      case 'events':        return <AdminEvents />;
      case 'registrations': return <AdminRegistrations />;
      case 'users':         return <AdminUsers />;
      case 'penalties':     return <AdminPenalties />;
      case 'documents':     return <AdminDocuments />;
      case 'notifications': return <AdminNotifications />;
      case 'standings':     return <AdminStandings />;
      default:              return <PlaceholderScreen title={active?.label} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#0a0a0a' }}>
      {/* Sidebar */}
      <div style={{ width: 180, background: '#111', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: `2px solid ${C.red}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RotaxLogo size={15} />
          <span style={{ color: C.textDim, fontSize: 9, letterSpacing: 2 }}>ADMIN</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {ADMIN_TABS.map(n => (
            <button key={n.id} onClick={() => setSec(n.id)} style={{ width: '100%', background: sec === n.id ? C.red + '22' : 'transparent', color: sec === n.id ? C.red : C.textMuted, border: 'none', cursor: 'pointer', padding: '9px 14px', fontSize: 12, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, borderLeft: sec === n.id ? `3px solid ${C.red}` : '3px solid transparent' }}>
              <span style={{ fontSize: 13 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === 'penalties' && penaltyCount > 0 && <span style={{ background: C.red, color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900 }}>{penaltyCount}</span>}
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={signOut} style={{ width: '100%', background: '#400010', border: '1px solid #FF446644', borderRadius: 6, padding: 10, color: '#FF4466', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Log ud</button>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>
    </div>
  );
}

// ── USER APP ──────────────────────────────────────────────────────
function UserApp({ signOut, profile, isOfficial, isGuest }) {
  const [tab, setTab] = useState('calendar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('da');

  const tabs = isGuest ? GUEST_TABS : [...MAIN_TABS, ...(isOfficial ? OFFICIAL_TABS : [])];
  const activeTab = tabs.find(t => t.id === tab) || tabs[0];

  const renderScreen = () => {
    switch (tab) {
      case 'calendar':  return <CalendarScreen />;
      case 'docs':      return <DocumentsScreen />;
      case 'standings': return <StandingsScreen />;
      case 'timing':    return <LiveTimingScreen />;
      case 'penalties': return <PenaltiesScreen />;
      case 'notif':     return <NotificationsScreen isOfficial={isOfficial} />;
      case 'profile':   return <ProfileScreen />;
      default:          return <PlaceholderScreen title={activeTab?.label} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg, position: 'relative' }}>
      {isGuest && (
        <div style={{ background: '#1a1400', borderBottom: `1px solid ${C.orange}44`, padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👁</span>
            <span style={{ color: C.orange, fontSize: 12, fontWeight: 700 }}>GÆSTEADGANG</span>
            <span style={{ color: C.textDim, fontSize: 11 }}>· Kun Docs & Livetiming</span>
          </div>
          <button onClick={signOut} style={{ background: 'transparent', border: `1px solid ${C.orange}44`, borderRadius: 6, padding: '4px 10px', color: C.orange, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>LOG IND</button>
        </div>
      )}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <RotaxLogo size={20} />
          {activeTab && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: C.textDim }}>·</span>
              <span style={{ fontSize: 14 }}>{activeTab.icon}</span>
              <span style={{ color: C.text, fontSize: 13, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>{activeTab.label}</span>
            </div>
          )}
        </div>
        {!isGuest && (
          <button onClick={() => setMenuOpen(o => !o)} style={{ background: menuOpen ? C.red : C.surface2, border: `1px solid ${menuOpen ? C.red : C.border}`, borderRadius: 8, width: 38, height: 38, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
            {menuOpen ? <span style={{ color: '#fff', fontSize: 16 }}>✕</span> : <>{[0, 1, 2].map(i => <div key={i} style={{ width: 18, height: 2, background: C.text, borderRadius: 1 }} />)}</>}
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} activeTab={tab} tabs={tabs} onNavigate={id => { setTab(id); setMenuOpen(false); }} lang={lang} onLangChange={setLang} onLogout={signOut} isGuest={isGuest} />
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────
function AppShell() {
  const { profile, loading, isOfficial, isAdmin, isGuest, signOut } = useAuth();

  if (loading) return <LoadingScreen message="Logger ind..." />;
  if (!profile) return <LoginScreen />;

  // Admin gets full admin panel
  if (isAdmin) return <AdminPanel signOut={signOut} />;

  // Everyone else gets user app
  return <UserApp signOut={signOut} profile={profile} isOfficial={isOfficial} isGuest={isGuest} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
