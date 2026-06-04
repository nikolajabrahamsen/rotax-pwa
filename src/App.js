import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SlideMenu } from './components/SlideMenu';
import { RotaxLogo, LoadingScreen } from './components/ui';
import { C } from './utils/theme';
import LoginScreen from './screens/LoginScreen';
import CalendarScreen from './screens/CalendarScreen';
import ProfileScreen from './screens/ProfileScreen';
import { PenaltiesScreen, DocumentsScreen, StandingsScreen, LiveTimingScreen, NotificationsScreen } from './screens/DataScreens';

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

function PlaceholderScreen({ title }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 10 }}>
      <div style={{ fontSize: 36 }}>🚧</div>
      <div style={{ color: C.textMuted, fontSize: 14 }}>{title}</div>
      <div style={{ color: C.textDim, fontSize: 11 }}>Implementeres løbende</div>
    </div>
  );
}

function AppShell() {
  const { profile, loading, isOfficial, isAdmin, isGuest, signOut } = useAuth();
  const [tab, setTab] = useState('calendar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('da');

  if (loading) return <LoadingScreen message="Logger ind..." />;
  if (!profile) return <LoginScreen />;

  const tabs = isGuest ? GUEST_TABS : [...MAIN_TABS, ...(isOfficial || isAdmin ? OFFICIAL_TABS : [])];
  const activeTab = tabs.find(t => t.id === tab) || tabs[0];

  const navigate = (id) => { setTab(id); setMenuOpen(false); };

  const renderScreen = () => {
    switch (tab) {
      case 'calendar':  return <CalendarScreen />;
      case 'docs':      return <DocumentsScreen />;
      case 'standings': return <StandingsScreen />;
      case 'timing':    return <LiveTimingScreen />;
      case 'penalties': return <PenaltiesScreen />;
      case 'notif':     return <NotificationsScreen isOfficial={isOfficial || isAdmin} />;
      case 'profile':   return <ProfileScreen />;
      default:          return <PlaceholderScreen title={activeTab?.label} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg, position: 'relative' }}>
      {/* Guest banner */}
      {isGuest && (
        <div style={{ background: '#1a1400', borderBottom: `1px solid ${C.orange}44`, padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👁</span>
            <span style={{ color: C.orange, fontSize: 12, fontWeight: 700 }}>GÆSTEADGANG</span>
            <span style={{ color: C.textDim, fontSize: 11 }}>· Kun Docs & Livetiming</span>
          </div>
          <button onClick={signOut} style={{ background: 'transparent', border: `1px solid ${C.orange}44`, borderRadius: 6, padding: '4px 10px', color: C.orange, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>LOG IND</button>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
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
            {menuOpen
              ? <span style={{ color: '#fff', fontSize: 16 }}>✕</span>
              : <>{[0, 1, 2].map(i => <div key={i} style={{ width: 18, height: 2, background: C.text, borderRadius: 1 }} />)}</>
            }
          </button>
        )}
      </div>

      {/* Screen */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>

      {/* Slide menu */}
      <SlideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeTab={tab}
        tabs={tabs}
        onNavigate={navigate}
        lang={lang}
        onLangChange={setLang}
        onLogout={signOut}
        isGuest={isGuest}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
