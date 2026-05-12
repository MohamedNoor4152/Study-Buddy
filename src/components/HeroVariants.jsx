// Landing hero right-side visual variations
import { FONTS } from '../tokens.js';
import { Icon, Avatar, CourseTag } from './primitives/index.jsx';

export const HeroGradeReport = () => {
  const rows = [
    { code: 'CHEM 200', name: 'General Chemistry', grade: 'A', hi: true },
    { code: 'CHEM 201', name: 'Organic Chemistry I', grade: 'A', hi: true },
    { code: 'MATH 151', name: 'Calculus II', grade: 'A-', hi: false },
    { code: 'PHYS 182B', name: 'Physics II', grade: 'A', hi: true },
    { code: 'BIOL 203', name: 'Cell & Molecular', grade: 'B+', hi: false },
  ];
  return (
    <div style={{ position: 'relative', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 420, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '32px 36px', boxShadow: '0 30px 60px rgba(0,0,0,.12), 0 2px 0 rgba(0,0,0,.04)',
        transform: 'rotate(-2deg)', position: 'relative',
        backgroundImage: 'repeating-linear-gradient(var(--bg) 0 1px, transparent 1px 32px)',
        backgroundPosition: '0 50px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid var(--ink)' }}>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.15em', color: 'var(--ink-3)', fontWeight: 600 }}>OFFICIAL TRANSCRIPT</div>
            <div style={{ fontFamily: FONTS.serif, fontSize: 22, marginTop: 4, letterSpacing: -0.3 }}>Priya Rangan</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Chemistry · Senior · SDSU</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FONTS.serif, fontSize: 32, color: 'var(--accent)', lineHeight: 1 }}>3.94</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: 'var(--ink-3)' }}>GPA</div>
          </div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px dotted var(--border)' : 'none' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{r.code}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{r.name}</span>
            <span style={{
              fontFamily: FONTS.serif, fontSize: 22, textAlign: 'center',
              color: r.hi ? 'var(--accent)' : 'var(--ink-3)',
              fontWeight: r.hi ? 600 : 400,
              background: r.hi ? 'var(--accent-soft)' : 'transparent',
              borderRadius: 4, padding: '2px 0',
            }}>{r.grade}</span>
          </div>
        ))}
        <div style={{ marginTop: 18, fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', textAlign: 'center' }}>
          Tutors tagged with transcripts just like this one.
        </div>
      </div>
      <div style={{
        position: 'absolute', top: 40, right: 20,
        width: 110, height: 110, borderRadius: '50%',
        border: '2px solid var(--accent)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', lineHeight: 1.3,
        transform: 'rotate(12deg)', opacity: 0.85,
      }}>
        VERIFIED<br/>BY<br/>STUDY BUDDY
      </div>
    </div>
  );
};

export const HeroNotebook = () => {
  return (
    <div style={{ position: 'relative', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 400, height: 440, background: 'var(--surface)',
        borderRadius: 4, boxShadow: '0 30px 60px rgba(0,0,0,.15)',
        border: '1px solid var(--border)',
        backgroundImage: 'repeating-linear-gradient(var(--surface) 0 27px, var(--border) 27px 28px)',
        position: 'relative', padding: '28px 32px 32px 72px',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 56, top: 0, bottom: 0, width: 1, background: 'var(--accent)', opacity: 0.4 }} />
        {[...Array(11)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: 18, top: 30 + i * 38,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--bg)', border: '1px solid var(--border)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,.15)',
          }} />
        ))}

        <div style={{ fontFamily: FONTS.serif, fontSize: 28, color: 'var(--ink)', lineHeight: 1, marginBottom: 6, letterSpacing: -0.3 }}>
          Classes I need help in:
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: 20 }}>— Alex, sophomore</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.4 }}>
          {[
            { c: 'CHEM 200', n: '3 tutors online', strike: true },
            { c: 'MATH 151', n: 'found one ✓', strike: true, check: true },
            { c: 'PHYS 182B', n: 'looking...', strike: false },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONTS.mono, fontSize: 15 }}>
              <span style={{
                width: 14, height: 14, border: '1.5px solid var(--ink-2)',
                borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: r.check ? 'var(--accent)' : 'transparent',
                borderColor: r.check ? 'var(--accent)' : 'var(--ink-2)',
              }}>
                {r.check && <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="2"><path d="M1 4.5L3.5 7 8 2"/></svg>}
              </span>
              <span style={{
                fontWeight: 600, color: r.strike ? 'var(--ink-3)' : 'var(--ink)',
                textDecoration: r.strike ? 'line-through' : 'none',
              }}>{r.c}</span>
              <span style={{ fontFamily: FONTS.sans, fontSize: 12, color: r.check ? 'var(--accent)' : 'var(--ink-3)' }}>
                {r.n}
              </span>
            </div>
          ))}
        </div>

        <svg width="120" height="90" viewBox="0 0 120 90" style={{ position: 'absolute', right: 10, top: 180 }}>
          <path d="M10 10 Q 40 30, 50 60 Q 55 75, 100 78" stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M95 72 L100 78 L94 82" stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{
          position: 'absolute', right: 24, top: 170, transform: 'rotate(-8deg)',
          fontFamily: '"Caveat", "Marker Felt", cursive', fontSize: 18, color: 'var(--accent)',
          fontWeight: 600,
        }}>
          found in<br/>2 clicks!
        </div>

        <div style={{
          position: 'absolute', bottom: 24, right: 28, transform: 'rotate(-4deg)',
          padding: '8px 14px', background: 'oklch(0.95 0.08 90)', color: 'oklch(0.35 0.1 60)',
          fontFamily: '"Caveat", cursive', fontSize: 17, fontWeight: 600,
          borderRadius: 3, boxShadow: '0 2px 4px rgba(0,0,0,.08)',
        }}>
          study buddy ♡
        </div>
      </div>
    </div>
  );
};

export const HeroTypeGrid = () => {
  const tiles = [
    { c: 'CHEM', n: '200', sub: '14 tutors', hi: true, big: true },
    { c: 'MATH', n: '151', sub: '9 tutors' },
    { c: 'PHYS', n: '182B', sub: '7 tutors' },
    { c: 'BIOL', n: '203', sub: '6 tutors' },
    { c: 'STATS', n: '119', sub: '11 tutors', hi: true },
    { c: 'CHEM', n: '201', sub: '8 tutors' },
  ];
  return (
    <div style={{ position: 'relative', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: 460 }}>
        {tiles.map((t, i) => (
          <div key={i} style={{
            aspectRatio: '1',
            background: t.hi ? 'var(--accent)' : 'var(--surface)',
            color: t.hi ? 'var(--accent-ink)' : 'var(--ink)',
            border: t.hi ? 'none' : '1px solid var(--border)',
            borderRadius: 10, padding: 16,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.85 }}>
              {t.c}
            </div>
            <div style={{
              fontFamily: FONTS.serif, fontSize: 54, lineHeight: 0.85,
              letterSpacing: -2, fontWeight: 400, marginBottom: 4,
            }}>
              {t.n}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>
              {t.sub}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        position: 'absolute', top: 20, right: 0,
        background: 'var(--ink)', color: 'var(--surface)',
        padding: '10px 16px', borderRadius: 100,
        boxShadow: '0 8px 24px rgba(0,0,0,.15)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: 'oklch(0.72 0.18 150)' }} />
        <span style={{ fontSize: 12, fontFamily: FONTS.mono, fontWeight: 500 }}>247 tutors online</span>
      </div>
    </div>
  );
};

export const HeroQuote = () => {
  return (
    <div style={{ position: 'relative', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '44px 44px 36px',
        width: 440, boxShadow: '0 30px 60px rgba(0,0,0,.1)',
        position: 'relative',
      }}>
        <div style={{
          fontFamily: FONTS.serif, fontSize: 120, color: 'var(--accent)',
          lineHeight: 0.6, marginBottom: 0, fontStyle: 'italic',
        }}>"</div>
        <p style={{
          fontFamily: FONTS.serif, fontSize: 26, lineHeight: 1.3,
          margin: '0 0 28px', color: 'var(--ink)', letterSpacing: -0.3,
          fontStyle: 'italic', fontWeight: 400,
        }}>
          I failed CHEM 200 my first try. My Study Buddy tutor took it with the same prof — <span style={{ color: 'var(--accent)', fontStyle: 'normal' }}>I retook it and got an A.</span>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Avatar initials="JK" size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Jenny Kim</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Biology, Junior · SDSU</div>
          </div>
          <div style={{
            fontFamily: FONTS.mono, fontSize: 11, color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="verified" size={14} style={{ color: 'var(--accent)' }} />
            Verified
          </div>
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 40, left: 0,
        background: 'var(--ink)', color: 'var(--surface)',
        padding: '14px 20px', borderRadius: 100, boxShadow: '0 12px 32px rgba(0,0,0,.18)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontFamily: FONTS.serif, fontSize: 28, lineHeight: 1, color: 'oklch(0.82 0.16 80)' }}>4.94★</div>
        <div style={{ fontSize: 11, opacity: 0.75, maxWidth: 110, lineHeight: 1.3 }}>avg rating across 2,400+ sessions</div>
      </div>
      <div style={{
        position: 'absolute', top: 30, right: 10,
        background: 'var(--accent)', color: 'var(--accent-ink)',
        padding: '6px 12px', borderRadius: 100,
        fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600,
        letterSpacing: '0.04em', transform: 'rotate(3deg)',
      }}>
        CHEM 200 · Fall '24
      </div>
    </div>
  );
};
