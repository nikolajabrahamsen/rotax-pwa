import React, { useEffect, useRef } from 'react';
import { C } from '../utils/theme';
import { RotaxLogo } from './ui';

export function SlideMenu({ open, onClose, activeTab, tabs, onNavigate, lang, onLangChange, onLogout, isGuest }) {
  const panelRef = useRef();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const mainTabs = tabs.filter(t => t.group === 'main');
  const officialTabs = tabs.filter(t => t.group === 'official');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }} />
      {/* Panel */}
      <div ref={panelRef} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: Math.min(window.innerWidth * 0.78, 320),
        background: C.surface, borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.22s ease',
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}`}</style>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: `2px solid ${C.red}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <RotaxLogo size={18} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '6px 18px 4px', color: C.textDim, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>NAVIGATION</div>
          {mainTabs.map(tab => (
            <NavRow key={tab.id} tab={tab} active={activeTab === tab.id} color={C.red} onClick={() => onNavigate(tab.id)} />
          ))}
          {officialTabs.length > 0 && <>
            <div style={{ height: 1, background: C.border, margin: '8px 18px' }} />
            <div style={{ padding: '4px 18px', color: C.purple, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔒</span> OFFICIAL
            </div>
            {officialTabs.map(tab => (
              <NavRow key={tab.id} tab={tab} active={activeTab === tab.id} color={C.purple} onClick={() => onNavigate(tab.id)} />
            ))}
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          {!isGuest && (
            <div style={{ display: 'flex', gap: 4 }}>
              {['da', 'en', 'de'].map(l => (
                <button key={l} onClick={() => onLangChange(l)} style={{
                  background: lang === l ? C.red : C.surface2,
                  color: lang === l ? '#fff' : C.textMuted,
                  border: `1px solid ${lang === l ? C.red : C.border}`,
                  borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 700
                }}>{l.toUpperCase()}</button>
              ))}
            </div>
          )}
          <button onClick={onLogout} style={{
            background: '#400010', border: '1px solid #FF446644', borderRadius: 6,
            padding: 12, color: '#FF4466', fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>
            {isGuest ? 'Log ind / Opret profil' : 'Log ud'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavRow({ tab, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: active ? color + '18' : 'transparent',
      border: 'none', borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
      cursor: 'pointer', padding: '13px 18px',
      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{tab.icon}</span>
      <span style={{ flex: 1, fontSize: 15, color: active ? color : C.text, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
      {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
    </button>
  );
}
