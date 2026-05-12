import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Icon, Logo, CourseTag } from '../../components/primitives/index.jsx';
import { CLASSES } from '../../data.js';
import { supabase } from '../../supabase.js';
import { SBUserMenu, SBFooter } from '../basics/BasicScreens.jsx';

// Build a catalog lookup from the static CLASSES array for metadata fallback
const CATALOG = Object.fromEntries(CLASSES.map(c => [c.code, c]));

function useLiveClasses() {
  const [rows, setRows] = useState(null); // null = loading

  useEffect(() => {
    supabase
      .from('tutor_profiles')
      .select('class_codes, rate')
      .eq('transcript_submitted', true)
      .then(({ data }) => {
        if (!data || data.length === 0) { setRows([]); return; }

        // Aggregate: class_code → { tutors, totalRate }
        const agg = {};
        data.forEach(p => {
          const codes = Array.isArray(p.class_codes) ? p.class_codes : [];
          codes.forEach(code => {
            if (!agg[code]) agg[code] = { tutors: 0, totalRate: 0 };
            agg[code].tutors += 1;
            agg[code].totalRate += Number(p.rate) || 0;
          });
        });

        // Also ensure catalog entries appear even with 0 live tutors
        CLASSES.forEach(c => {
          if (!agg[c.code]) agg[c.code] = { tutors: 0, totalRate: 0 };
        });

        const merged = Object.entries(agg).map(([code, { tutors, totalRate }]) => {
          const cat = CATALOG[code];
          return {
            code,
            title: cat?.title || code,
            dept: cat?.dept || code.replace(/\d.*/, '').trim(),
            difficulty: cat?.difficulty || 'Medium',
            tutors,
            avgRate: tutors > 0 ? Math.round(totalRate / tutors) : (cat?.avgRate || 0),
          };
        });

        // Sort: most tutors first, then alphabetically
        merged.sort((a, b) => b.tutors - a.tutors || a.code.localeCompare(b.code));
        setRows(merged);
      });
  }, []);

  return rows;
}

const BrowseDesktop = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const liveClasses = useLiveClasses();

  // While loading, fall back to the static catalog so the page isn't blank
  const allClasses = liveClasses ?? CLASSES;
  const filtered = useMemo(
    () => allClasses.filter(c =>
      q === '' ||
      c.code.toLowerCase().includes(q.toLowerCase()) ||
      c.title.toLowerCase().includes(q.toLowerCase())
    ),
    [allClasses, q]
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 56px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/messages')}>Messages</span>
            <span style={{ color: 'var(--ink)', fontWeight: 500, borderBottom: '2px solid var(--ink)', paddingBottom: 2 }}>Browse</span>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Sessions</span>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/settings')}>Settings</span>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 420, margin: '0 32px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 12px',
        }}>
          <Icon name="search" size={14} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by course or title…" style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontFamily: FONTS.sans, fontSize: 13.5, flex: 1, color: 'var(--ink)',
          }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="chat" size={16} style={{ color: 'var(--ink-2)' }} />
          <SBUserMenu />
        </div>
      </nav>

      <div style={{ padding: '40px 56px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>San Diego State University</div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, margin: 0, letterSpacing: -0.8 }}>
          Browse classes
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '8px 0 0', maxWidth: 560 }}>
          {liveClasses === null ? 'Loading…' : `${filtered.filter(c => c.tutors > 0).length} classes with active tutors.`} Click any course to see the roster.
        </p>
      </div>

      <div style={{ padding: '0 56px 64px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {filtered.map(c => (
          <div key={c.code} onClick={() => navigate(`/class/${encodeURIComponent(c.code)}`)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, cursor: 'pointer',
            transition: 'border-color .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <CourseTag code={c.code} size={13} />
              <div style={{
                fontSize: 11,
                padding: '2px 7px', borderRadius: 100,
                background: c.difficulty === 'Hard' ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: c.difficulty === 'Hard' ? 'var(--accent)' : 'var(--ink-2)',
              }}>{c.difficulty}</div>
            </div>
            <h3 style={{ fontFamily: FONTS.serif, fontSize: 20, fontWeight: 400, margin: '0 0 4px', letterSpacing: -0.3, lineHeight: 1.1 }}>
              {c.title}
            </h3>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 18 }}>{c.dept}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                <Icon name="user" size={12} />
                <span><strong style={{ color: 'var(--ink)' }}>{c.tutors}</strong> tutors</span>
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: 'var(--accent)' }}>
                ~${c.avgRate}/hr
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
      <SBFooter slim />
    </div>
  );
};

export default BrowseDesktop;
