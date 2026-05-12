// Study Buddy — shared UI primitives
import { THEMES, FONTS } from '../../tokens.js';

export const Icon = ({ name, size = 16, stroke = 1.6, style }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
    starFill: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    dollar: <><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    check: <path d="M20 6L9 17l-5-5"/>,
    chevRight: <path d="M9 18l6-6-6-6"/>,
    chevLeft: <path d="M15 18l-6-6 6-6"/>,
    chevDown: <path d="M6 9l6 6 6-6"/>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></>,
    filter: <path d="M3 6h18M6 12h12M10 18h4"/>,
    verified: <><path d="M12 2l2.4 2.8 3.6-.6.6 3.6L21 10.4 18.6 12.8l.4 3.6-3.6.6L12 19.6 9.6 17l-3.6-.6-.6-3.6L3 10.4 5.4 8l.6-3.6 3.6.6L12 2z"/><path d="M9 12l2 2 4-4" stroke="var(--surface)" strokeWidth="2"/></>,
    home: <path d="M3 12l9-9 9 9v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>,
    book: <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4zM4 16a4 4 0 0 1 4-4h12"/>,
    heart: <path d="M12 21s-8-5.3-8-11.2A5 5 0 0 1 12 6a5 5 0 0 1 8 3.8C20 15.7 12 21 12 21z"/>,
    send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>,
    arrow: <><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></>,
    map: <><path d="M9 2L3 5v17l6-3 6 3 6-3V2l-6 3z"/><path d="M9 2v17M15 5v17"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></>,
    video: <><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4V8z"/></>,
    graduation: <><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5a6 6 0 0 0 12 0v-5"/></>,
    cal: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

export const Avatar = ({ initials, src, color, size = 40, style, onClick }) => (
  <div onClick={onClick} style={{
    width: size, height: size, flexShrink: 0,
    borderRadius: '50%',
    background: color || 'var(--accent-soft)',
    color: 'oklch(0.25 0.02 60)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONTS.sans, fontWeight: 600, fontSize: size * 0.38,
    letterSpacing: '0.02em',
    overflow: 'hidden',
    ...style,
  }}>
    {src
      ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      : initials}
  </div>
);

export const Stars = ({ rating, size = 12, showNumber = false, reviews }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'oklch(0.65 0.15 60)' }}>
      {[...Array(5)].map((_, i) => (
        <Icon key={i} name={i < full || (i === full && half) ? 'starFill' : 'star'} size={size} stroke={1.4} />
      ))}
      {showNumber && (
        <span style={{ marginLeft: 4, color: 'var(--ink)', fontWeight: 600, fontSize: size + 1, fontFamily: FONTS.sans }}>
          {rating.toFixed(2)}
          {reviews != null && <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 4 }}>({reviews})</span>}
        </span>
      )}
    </div>
  );
};

export const CourseTag = ({ code, size = 12, style }) => (
  <span style={{
    fontFamily: FONTS.mono, fontSize: size, fontWeight: 500,
    color: 'var(--ink)', background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    padding: '2px 7px', borderRadius: 4, letterSpacing: '0.02em',
    display: 'inline-flex', alignItems: 'center',
    whiteSpace: 'nowrap',
    ...style,
  }}>{code}</span>
);

export const Btn = ({ children, variant = 'primary', size = 'md', icon, onClick, style, fullWidth }) => {
  const sizes = {
    sm: { padding: '7px 12px', fontSize: 13, borderRadius: 7, gap: 6 },
    md: { padding: '10px 16px', fontSize: 14, borderRadius: 8, gap: 8 },
    lg: { padding: '14px 22px', fontSize: 15, borderRadius: 10, gap: 8 },
  };
  const variants = {
    primary: { background: 'var(--accent)', color: 'var(--accent-ink)', border: '1px solid var(--accent)' },
    dark: { background: 'var(--ink)', color: 'var(--surface)', border: '1px solid var(--ink)' },
    ghost: { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--border)' },
    plain: { background: 'transparent', color: 'var(--ink)', border: '1px solid transparent' },
  };
  return (
    <button onClick={onClick} style={{
      ...sizes[size], ...variants[variant],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONTS.sans, fontWeight: 500,
      cursor: 'pointer', lineHeight: 1,
      width: fullWidth ? '100%' : 'auto',
      transition: 'background .12s, transform .08s',
      ...style,
    }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 16 : 14} />}
      {children}
    </button>
  );
};

export const Chip = ({ children, active, onClick, icon, style }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 11px', borderRadius: 100,
    fontFamily: FONTS.sans, fontSize: 12.5, fontWeight: 500,
    border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
    background: active ? 'var(--ink)' : 'var(--surface)',
    color: active ? 'var(--surface)' : 'var(--ink-2)',
    cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all .12s',
    ...style,
  }}>
    {icon && <Icon name={icon} size={12} />}
    {children}
  </button>
);

export const Placeholder = ({ label, style, children }) => (
  <div style={{
    background: `repeating-linear-gradient(135deg, var(--surface-2), var(--surface-2) 6px, var(--bg) 6px, var(--bg) 12px)`,
    color: 'var(--ink-3)',
    fontFamily: FONTS.mono, fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)',
    ...style,
  }}>
    {children || label}
  </div>
);

export const Logo = ({ size = 22, color, textColor, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, ...style }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: color || 'var(--accent)',
      color: 'var(--accent-ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONTS.serif, fontWeight: 400, fontSize: size * 0.7,
      lineHeight: 1, paddingBottom: 1,
    }}>s</div>
    <span style={{
      fontFamily: FONTS.serif, fontSize: size * 0.95, fontWeight: 400,
      color: textColor || 'var(--ink)', letterSpacing: -0.2, lineHeight: 1,
    }}>studybuddy</span>
  </div>
);

export const Themed = ({ theme, density = 'spacious', children, style }) => {
  const t = THEMES[theme] || THEMES.campus;
  const vars = {
    '--bg': t.bg,
    '--surface': t.surface,
    '--surface-2': t.surface2,
    '--border': t.border,
    '--ink': t.ink,
    '--ink-2': t.ink2,
    '--ink-3': t.ink3,
    '--accent': t.accent,
    '--accent-ink': t.accentInk,
    '--accent-soft': t.accentSoft,
    '--positive': t.positive,
    '--warning': t.warning,
    '--density': density === 'compact' ? '0.78' : '1',
  };
  return (
    <div style={{
      ...vars,
      background: 'var(--bg)',
      color: 'var(--ink)',
      fontFamily: FONTS.sans,
      width: '100%',
      minHeight: '100%',
      ...style,
    }}>
      {children}
    </div>
  );
};
