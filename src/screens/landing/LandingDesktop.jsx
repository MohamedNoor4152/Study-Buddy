import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Icon, Logo, Btn, CourseTag } from '../../components/primitives/index.jsx';
import { HeroGradeReport, HeroNotebook, HeroTypeGrid, HeroQuote } from '../../components/HeroVariants.jsx';
import { CLASSES } from '../../data.js';
import { useAuth } from '../../AuthContext.jsx';
import { SBUserMenu } from '../basics/BasicScreens.jsx';

const ThemeToggle = ({ compact }) => {
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  const handleToggle = () => {
    const next = isDark ? 'campus' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('sb-theme', next); } catch (_) {}
    setIsDark(!isDark);
  };

  return (
    <button onClick={handleToggle} title={isDark ? 'Switch to Campus mode' : 'Switch to Dark mode'} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: compact ? '6px 10px' : '7px 12px',
      borderRadius: 100,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      color: 'var(--ink-2)',
      fontFamily: FONTS.sans, fontSize: 12.5, fontWeight: 500,
      cursor: 'pointer', transition: 'background .12s, border-color .12s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
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

const LandingDesktop = ({ heroVariant = 'gradeReport' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const heroVisual = heroVariant === 'notebook' ? <HeroNotebook />
    : heroVariant === 'typeGrid' ? <HeroTypeGrid />
    : heroVariant === 'quote' ? <HeroQuote />
    : <HeroGradeReport />;

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 56px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Logo size={24} />
        <div style={{ display: 'flex', gap: 28, fontSize: 14, color: 'var(--ink-2)' }}>
          {user && <span onClick={scrollToHowItWorks} style={{ cursor: 'pointer' }}>How it works</span>}
          <span onClick={() => navigate(user ? '/browse' : '/signup', { state: { role: 'student' } })} style={{ cursor: 'pointer' }}>Browse classes</span>
          <span onClick={() => navigate('/signup', { state: { role: 'tutor' } })} style={{ cursor: 'pointer' }}>Become a tutor</span>
        </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle />
          {user ? (
            <SBUserMenu />
          ) : (
            <>
              <Btn variant="plain" size="sm" onClick={() => navigate('/signin')}>Log in</Btn>
              <Btn variant="dark" size="sm" onClick={() => navigate('/signup')}>Sign up</Btn>
            </>
          )}
        </div>
      </nav>

      <section style={{ padding: '72px 56px 56px', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 10px 5px 5px', borderRadius: 100,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--ink-2)', marginBottom: 20,
          }}>
            <span style={{
              background: 'var(--accent)', color: 'var(--accent-ink)',
              padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
            }}>NEW</span>
            <span>Live at <strong style={{ color: 'var(--ink)' }}>San Diego State</strong> · expanding soon</span>
          </div>
          <h1 style={{
            fontFamily: FONTS.serif, fontSize: 72, fontWeight: 400, lineHeight: 0.95,
            letterSpacing: -1.5, margin: '0 0 24px', color: 'var(--ink)',
          }}>
            Find a classmate<br/>
            who <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>already</em> aced it.
          </h1>
          <p style={{
            fontSize: 18, lineHeight: 1.5, color: 'var(--ink-2)',
            maxWidth: 480, margin: '0 0 32px',
          }}>
            Study Buddy connects you with SDSU students who took your exact class,
            with your exact professor, and got the grade you want.
          </p>

          <Btn size="lg" onClick={() => navigate('/signup', { state: { role: 'student' } })} style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 32px', fontSize: 16 }}>
            Find a tutor
          </Btn>

          <div style={{ display: 'flex', gap: 24, marginTop: 28, fontSize: 13, color: 'var(--ink-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={13} style={{ color: 'var(--accent)' }} /> Verified SDSU students
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={13} style={{ color: 'var(--accent)' }} /> Free to browse
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={13} style={{ color: 'var(--accent)' }} /> Rated sessions
            </div>
          </div>
        </div>

        {heroVisual}
      </section>

      <section style={{ padding: '56px 56px 72px', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 700, marginBottom: 40 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>
            Why Study Buddy
          </div>
          <h2 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: -0.8 }}>
            Not a stranger with a whiteboard.<br/>
            <span style={{ color: 'var(--ink-3)' }}>A student who just sat where you're sitting.</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            { k: '01', t: 'Same exact class', b: 'Filter down to CHEM 200 with Dr. Nakamura. Your tutor took that class, not a generic version of it.' },
            { k: '02', t: 'Relatable help', b: "They remember what tripped them up. No gatekeeping, no lecturing — just study sessions." },
            { k: '03', t: 'Campus pricing', b: 'Typical session runs $22–38/hr. Paid directly to the student, not a company.' },
          ].map(v => (
            <div key={v.k}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: 'var(--accent)', marginBottom: 14, fontWeight: 500 }}>{v.k}</div>
              <h3 style={{ fontFamily: FONTS.serif, fontSize: 24, fontWeight: 400, margin: '0 0 8px', letterSpacing: -0.3 }}>{v.t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>{v.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" style={{ padding: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: -0.6 }}>
            Most-tutored at SDSU this week
          </h2>
          <span onClick={() => navigate('/browse')} style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            Browse all <Icon name="arrow" size={13} />
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {CLASSES.slice(0, 6).map(c => (
            <div key={c.code} onClick={() => navigate(`/class/${encodeURIComponent(c.code)}`)} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 18, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <CourseTag code={c.code} />
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.tutors} tutors</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.dept} · ~${c.avgRate}/hr avg</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '32px 56px 72px' }}>
        <div style={{
          background: 'var(--ink)', color: 'var(--surface)',
          borderRadius: 16, padding: '48px 56px',
          display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'oklch(0.75 0.16 25)', marginBottom: 12, fontWeight: 600 }}>
              For tutors
            </div>
            <h2 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, lineHeight: 1.05, letterSpacing: -0.8, margin: '0 0 14px' }}>
              Got an A? Turn that transcript into $600/mo.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: 'oklch(0.75 0.01 70)', margin: '0 0 24px', maxWidth: 480 }}>
              Set your own rate. Pick hours that fit your schedule. Average Study Buddy tutor earns $480–720 a month.
            </p>
            <Btn size="lg" onClick={() => navigate('/signup')} style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none' }}>
              Become a tutor
            </Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { n: '4.9★', l: 'Average tutor rating' },
              { n: '$31', l: 'Median hourly rate' },
              { n: '~12h', l: 'Typical weekly hours' },
              { n: '92%', l: 'Rebooking rate' },
            ].map(s => (
              <div key={s.l} style={{ padding: '16px 0', borderTop: '1px solid oklch(0.32 0.014 60)' }}>
                <div style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: 'oklch(0.7 0.01 70)', marginTop: 6 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ padding: '32px 56px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
        <Logo size={18} />
        <div style={{ display: 'flex', gap: 24 }}>
          <span style={{ cursor: 'pointer' }} onClick={scrollToHowItWorks}>How it works</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/signup', { state: { role: 'tutor' } })}>Become a tutor</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/help')}>Help</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/terms')}>Terms</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/privacy')}>Privacy</span>
        </div>
        <div>© 2026 Study Buddy</div>
      </footer>
    </div>
  );
};

export default LandingDesktop;
