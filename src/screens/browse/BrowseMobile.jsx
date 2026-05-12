import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Icon, Chip, CourseTag } from '../../components/primitives/index.jsx';
import { MobileStatusBar, MobileTabBar } from '../landing/LandingMobile.jsx';
import { CLASSES } from '../../data.js';

const BrowseMobile = () => {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ padding: '8px 22px 12px' }}>
        <div onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginBottom: 10 }}>
          <Icon name="chevLeft" size={12} /> Home
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, margin: '0 0 14px', letterSpacing: -0.6 }}>
          Browse
        </h1>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="search" size={14} style={{ color: 'var(--ink-3)' }} />
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Search by course…</span>
        </div>
      </div>

      <div style={{ padding: '8px 22px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['All', 'Chemistry', 'Physics', 'Math', 'Biology'].map((d, i) => (
          <Chip key={d} active={i === 0}>{d}</Chip>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {CLASSES.map(c => (
            <div key={c.code} onClick={() => navigate(`/class/${encodeURIComponent(c.code)}`)} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ marginBottom: 10 }}>
                <CourseTag code={c.code} size={10} />
              </div>
              <div style={{ fontFamily: FONTS.serif, fontSize: 16, lineHeight: 1.15, letterSpacing: -0.2 }}>{c.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 8 }}>{c.tutors} tutors · ~${c.avgRate}/hr</div>
            </div>
          ))}
        </div>
      </div>

      <MobileTabBar active="browse" />
    </div>
  );
};

export default BrowseMobile;
