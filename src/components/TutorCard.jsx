import { FONTS } from '../tokens.js';
import { Avatar, Stars, CourseTag, Btn, Placeholder, Icon } from './primitives/index.jsx';

const TutorCard = ({ tutor, variant = 'portrait', density = 'spacious', onClick, showClass, topRated }) => {
  const pad = density === 'compact' ? 14 : 18;
  const gap = density === 'compact' ? 10 : 14;

  if (variant === 'portrait') {
    return (
      <div onClick={onClick} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: pad,
        cursor: 'pointer',
        transition: 'border-color .12s, transform .08s',
        position: 'relative',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
        {topRated && (
          <div style={{
            position: 'absolute', top: -1, right: 16,
            background: 'var(--ink)', color: 'var(--surface)',
            fontFamily: FONTS.sans, fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: '0 0 4px 4px',
          }}>Top tutor</div>
        )}
        <div style={{ display: 'flex', gap }}>
          <Avatar initials={tutor.initials} color={tutor.color} size={density === 'compact' ? 48 : 56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <h3 style={{
                margin: 0, fontFamily: FONTS.sans, fontSize: 15, fontWeight: 600,
                color: 'var(--ink)', letterSpacing: -0.1,
              }}>{tutor.name}</h3>
              {tutor.verified && <Icon name="verified" size={13} stroke={0} style={{ color: 'var(--accent)' }} />}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 6 }}>
              {tutor.major} · {tutor.year}
            </div>
            <Stars rating={tutor.rating} size={11} showNumber reviews={tutor.reviews} />
          </div>
        </div>

        <p style={{
          margin: `${gap}px 0 ${gap}px`,
          fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{tutor.bio}</p>

        {showClass && tutor.grades[showClass] && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 8px', background: 'var(--surface-2)',
            borderRadius: 6, marginBottom: gap,
            fontSize: 12, color: 'var(--ink-2)',
          }}>
            <CourseTag code={showClass} size={11} />
            <span>Earned</span>
            <span style={{
              fontFamily: FONTS.mono, fontWeight: 600, color: 'var(--ink)',
              background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 3,
            }}>{tutor.grades[showClass]}</span>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: gap, borderTop: '1px solid var(--border)',
        }}>
          <div>
            <div style={{
              fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400,
              color: 'var(--accent)', lineHeight: 1,
            }}>${tutor.rate}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: FONTS.sans, marginLeft: 2 }}>/hr</span></div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              Next: {tutor.nextSlot}
            </div>
          </div>
          <Btn size="sm" variant="dark">Book</Btn>
        </div>
      </div>
    );
  }

  if (variant === 'landscape') {
    return (
      <div onClick={onClick} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: pad,
        cursor: 'pointer',
        display: 'flex', gap: pad,
      }}>
        <Placeholder label="portrait" style={{ width: 130, height: 130, flexShrink: 0, borderRadius: 8 }}>
          <Avatar initials={tutor.initials} color={tutor.color} size={72} style={{ border: '3px solid var(--surface)' }} />
        </Placeholder>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{tutor.name}</h3>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
                {tutor.major} · {tutor.year}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONTS.serif, fontSize: 26, color: 'var(--accent)', lineHeight: 1 }}>
                ${tutor.rate}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: FONTS.sans }}>/hr</span>
              </div>
              <Stars rating={tutor.rating} size={11} showNumber reviews={tutor.reviews} />
            </div>
          </div>
          <p style={{ margin: '10px 0', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', flex: 1 }}>{tutor.bio}</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {tutor.classes.slice(0, 3).map(c => <CourseTag key={c} code={c} size={11} />)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div onClick={onClick} style={{
        background: 'oklch(0.15 0.008 60)',
        color: 'oklch(0.95 0.008 70)',
        borderRadius: 12, padding: pad, cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', gap }}>
          <Avatar initials={tutor.initials} color={tutor.color} size={56} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{tutor.name}</h3>
            <div style={{ fontSize: 12.5, color: 'oklch(0.7 0.01 70)' }}>{tutor.major}</div>
            <Stars rating={tutor.rating} size={11} showNumber reviews={tutor.reviews} />
          </div>
        </div>
        <p style={{ margin: `${gap}px 0`, fontSize: 13, color: 'oklch(0.8 0.01 70)', lineHeight: 1.5 }}>{tutor.bio}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: gap, borderTop: '1px solid oklch(0.3 0.01 60)' }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 22, color: 'oklch(0.75 0.16 25)' }}>${tutor.rate}/hr</div>
          <Btn size="sm" style={{ background: 'oklch(0.62 0.18 25)', color: 'oklch(0.99 0 0)', border: 'none' }}>Book</Btn>
        </div>
      </div>
    );
  }

  return null;
};

export default TutorCard;
