import React from 'react';
import { C } from '../utils/theme';

export function Badge({ children, color = C.red, style = {} }) {
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, display: 'inline-block', ...style
    }}>{children}</span>
  );
}

export function Card({ children, style = {}, onClick, accentColor }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
      borderRadius: 8, padding: 14, marginBottom: 10,
      cursor: onClick ? 'pointer' : 'default', ...style
    }}>{children}</div>
  );
}

export function Btn({ children, onClick, variant = 'primary', small, disabled, loading, style = {}, fullWidth }) {
  const vs = {
    primary:   { background: C.red,      color: '#fff' },
    secondary: { background: C.surface2, color: C.text,     border: `1px solid ${C.border}` },
    ghost:     { background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}` },
    danger:    { background: '#400010',  color: '#FF4466',  border: '1px solid #FF446644' },
    success:   { background: '#003322',  color: C.green,    border: `1px solid ${C.green}44` },
    green:     { background: C.green,    color: '#000' },
  };
  return (
    <button onClick={disabled || loading ? undefined : onClick} style={{
      ...vs[variant], border: 'none', borderRadius: 6,
      padding: small ? '5px 12px' : '10px 20px',
      fontSize: small ? 12 : 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, width: fullWidth ? '100%' : undefined,
      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
      transition: 'all 0.15s', ...style
    }}>
      {loading ? '⏳' : children}
    </button>
  );
}

export function Input({ label, value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13,
          boxSizing: 'border-box', outline: 'none', ...style
        }}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13,
        outline: 'none',
      }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ height: 3, width: 36, background: C.red, borderRadius: 2, marginBottom: 8 }} />
      <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, color: C.text, textTransform: 'uppercase' }}>{title}</h2>
      {subtitle && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

export function RotaxLogo({ size = 32 }) {
  return (
    <svg width={size * 3.2} height={size} viewBox="0 0 128 40" fill="none">
      <rect width="128" height="40" rx="4" fill="#E30613" />
      <text x="64" y="29" textAnchor="middle" fontFamily="'Barlow Condensed', Arial Black, sans-serif" fontWeight="900" fontSize="26" letterSpacing="4" fill="white">ROTAX</text>
      <rect x="4" y="34" width="120" height="2" rx="1" fill="white" opacity="0.4" />
    </svg>
  );
}

export function LoadingScreen({ message = 'Indlæser...' }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 12 }}>
      <RotaxLogo size={36} />
      <div style={{ color: C.textMuted, fontSize: 13 }}>{message}</div>
    </div>
  );
}

export function EmptyState({ icon = '📭', message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 10 }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <span style={{ color: C.textMuted, fontSize: 14, textAlign: 'center' }}>{message}</span>
    </div>
  );
}

export function OfficialBanner() {
  return (
    <div style={{ background: '#1a001a', border: '1px solid #9B59B644', borderRadius: 6, padding: 8, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
      <span>🔒</span>
      <span style={{ color: C.purple, fontSize: 11, fontWeight: 700 }}>Kun synlig for officials & admin</span>
    </div>
  );
}

export function Spinner() {
  return <div style={{ textAlign: 'center', padding: 32, color: C.textMuted }}>⏳ Indlæser...</div>;
}
