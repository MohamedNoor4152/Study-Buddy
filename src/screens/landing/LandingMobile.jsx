import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Icon, Logo, Btn, CourseTag } from '../../components/primitives/index.jsx';
import { CLASSES } from '../../data.js';

const ThemeToggle = ({ theme, onToggle, compact }) => {
  const isDark = theme === 'dark';
  return (
    <button onClick={onToggle} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: compact ? '6px 10px' : '7px 12px',
      borderRadius: 100,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      color: 'var(--ink-2)',
      fontFamily: FONTS.sans, fontSize: 12.5, fontWeight: 500,
      cursor: 'pointer',
    }}>
      {isDark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>
      )}
      <span>{isDark ? 'Campus' : 'Dark'}</span>
    </button>
  );
};

const MobileStatusBar = () => (
  <div style={{
    height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 22px', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
    fontFamily: FONTS.sans,
  }}>
    <span>9:41</span>
    <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="7" width="2" height="3"/><rect x="4" y="5" width="2" height="5"/><rect x="8" y="2" width="2" height="8"/><rect x="12" y="0" width="2" height="10"/></svg>
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="2" width="18" height="8" rx="2"/><rect x="2.5" y="3.5" width="15" height="5" fill="currentColor"/><rect x="20" y="4.5" width="1.5" height="3" fill="currentColor"/></svg>
    </span>
  </div>
);

const MobileTabBar = ({ active = 'home', onTab }) => {
  const tabs = [
    { k: 'home', i: 'home', l: 'Home' },
    { k: 'browse', i: 'search', l: 'Browse' },
    { k: 'sessions', i: 'calendar', l: 'Sessions' },
    { k: 'chat', i: 'chat', l: 'Messages' },
    { k: 'profile', i: 'user', l: 'You' },
  ];
  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '8px 8px 22px',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => (
        <div key={t.k} onClick={() => onTab && onTab(t.k)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
          color: active === t.k ? 'var(--accent)' : 'var(--ink-3)',
          padding: '4px 8px',
        }}>
          <Icon name={t.i} size={20} stroke={active === t.k ? 2 : 1.6} />
          <span style={{ fontSize: 10, fontWeight: active === t.k ? 600 : 500 }}>{t.l}</span>
        </div>
      ))}
    </div>
  );
};

const LandingMobile = ({ theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const handleTab = (k) => {
    if (k === 'home') navigate('/');
    else if (k === 'browse') navigate('/browse');
    else if (k === 'sessions') navigate('/dashboard');
    else if (k === 'chat') navigate('/messages');
    else if (k === 'profile') navigate('/dashboard');
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 32px' }}>
          <Logo size={22} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
            <Btn size="sm" variant="plain" onClick={() => navigate('/signin')}>Log in</Btn>
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px 4px 4px', borderRadius: 100,
          background: 'var(--surface)', border: '1px solid var(--border)',
          fontSize: 11, color: 'var(--ink-2)', marginBottom: 18,
        }}>
          <span style={{ background: 'var(--accent)', color: 'var(--accent-ink)', padding: '2px 6px', borderRadius: 100, fontSize: 9, fontWeight: 600 }}>NEW</span>
          <span>Live at SDSU</span>
        </div>

        <h1 style={{
          fontFamily: FONTS.serif, fontSize: 48, fontWeight: 400,
          lineHeight: 0.95, letterSpacing: -1.2, margin: '0 0 18px',
        }}>
          Find a classmate who <em style={{ color: 'var(--accent)' }}>already</em> aced it.
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.45, color: 'var(--ink-2)', margin: '0 0 24px' }}>
          SDSU students who took your exact class — with your exact professor.
        </p>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 14, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }} onClick={() => navigate('/browse')}>
          <Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
          <span style={{ fontSize: 14, color: 'var(--ink-3)', flex: 1 }}>Try "CHEM 200"…</span>
        </div>

        <Btn fullWidth size="lg" onClick={() => navigate('/browse')}>Find a tutor</Btn>
        <Btn fullWidth size="lg" variant="ghost" onClick={() => navigate('/signup')} style={{ marginTop: 10 }}>Become a tutor</Btn>

        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
            TRENDING
          </div>
          <h2 style={{ fontFamily: FONTS.serif, fontSize: 24, fontWeight: 400, margin: '0 0 16px', letterSpacing: -0.4 }}>
            Most-tutored at SDSU
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLASSES.slice(0, 4).map(c => (
              <div key={c.code} onClick={() => navigate(`/class/${encodeURIComponent(c.code)}`)} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CourseTag code={c.code} size={11} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{c.tutors} tutors · ~${c.avgRate}/hr</div>
                </div>
                <Icon name="chevRight" size={14} style={{ color: 'var(--ink-3)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <MobileTabBar active="home" onTab={handleTab} />
    </div>
  );
};

export { MobileStatusBar, MobileTabBar };
export default LandingMobile;
