import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import { syncTutorProfileFromUser } from '../../tutorProfileSync.js';
import { FONTS } from '../../tokens.js';
import { Logo, Btn, Avatar, Icon, Chip, CourseTag } from '../../components/primitives/index.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { TutorDashboardNav } from '../tutor/TutorDashboard.jsx';

// ────────────────────────── Field helper ──────────────────────────
const Field = ({ label, value, onChange, placeholder }) => (
  <div>
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      width: '100%', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 14px', fontFamily: FONTS.sans, fontSize: 15, color: 'var(--ink)',
      background: 'var(--surface)', outline: 'none', boxSizing: 'border-box',
    }} />
  </div>
);

// ────────────────────────── Add Card (now redirects — payment collected at booking) ──────────────────────────
export const AddCardScreen = () => {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)', gap: 20 }}>
        <Logo size={22} />
        <div onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
          <Icon name="chevLeft" size={12} /> Back
        </div>
      </nav>
      <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'oklch(0.97 0.04 65)', border: '1px solid oklch(0.88 0.1 65)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Icon name="check" size={28} style={{ color: 'oklch(0.5 0.14 60)' }} />
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.6 }}>Payment collected at booking</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 32px', lineHeight: 1.6 }}>
          Your card is collected securely via Stripe when you book a session — there's no need to add a card separately. It is held but <strong>not charged</strong> until your tutor accepts.
        </p>
        <Btn size="lg" onClick={() => navigate('/browse')}>Browse tutors</Btn>
      </div>
    </div>
  );
};

// ────────────────────────── Payment Confirmation ──────────────────────────
export const PaymentConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const s = location.state || {};
  const tutorName = s.tutorName || 'Your tutor';
  const when = s.scheduledAt ? new Date(s.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const fee = s.fee || 0;
  const svc = Math.round(fee * 0.08);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
        <Logo size={22} />
      </nav>
      <div style={{ maxWidth: 540, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 36, margin: '0 auto 24px',
          background: 'var(--accent)', color: 'var(--accent-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={36} stroke={2.4} />
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.8 }}>
          Request sent.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: '0 0 32px', lineHeight: 1.5 }}>
          {tutorName.split(' ')[0]} will confirm shortly. You won't be charged until they accept.
        </p>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>REQUEST SUMMARY</div>
          {[
            ['Tutor', tutorName],
            ['Class', s.classCode || '—'],
            ['When', when],
            ['Duration', `${s.duration || 60} min`],
            ['Location', s.locationChoice || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--ink-3)' }}>{k}</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', fontSize: 15 }}>
            <span style={{ fontWeight: 600 }}>Total (held on accept)</span>
            <span style={{ fontFamily: FONTS.mono, fontWeight: 600, color: 'var(--accent)' }}>${fee + svc}.00</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn fullWidth variant="ghost" size="lg" icon="chat" onClick={() => navigate('/messages')}>Message {tutorName.split(' ')[0]}</Btn>
          <Btn fullWidth size="lg" onClick={() => navigate('/dashboard')}>View my sessions</Btn>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--ink-3)' }}>
          Need to cancel? Free if pending · full refund if confirmed &gt;12h before · 50% if less.
        </div>
      </div>
    </div>
  );
};

// ────────────────────────── Payouts ──────────────────────────
const _payoutsCache = {};

export const PayoutsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;
  const [sessions, setSessions] = useState(() => _payoutsCache[uid]?.sessions || []);
  const [loading, setLoading] = useState(!_payoutsCache[uid]);
  const [payoutsEnabled, setPayoutsEnabled] = useState(() => _payoutsCache[uid]?.payoutsEnabled ?? false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('sessions')
        .select('id, student_name, class_code, earnings, scheduled_at, status, payment_captured')
        .eq('tutor_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('scheduled_at', { ascending: false })
        .limit(50),
      supabase
        .from('tutor_profiles')
        .select('payouts_enabled')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([{ data: sessData }, { data: profileData }]) => {
      const s = sessData || [];
      const p = profileData?.payouts_enabled || false;
      setSessions(s);
      setPayoutsEnabled(p);
      setLoading(false);
      _payoutsCache[uid] = { sessions: s, payoutsEnabled: p };
    });
  }, [user]);

  const captured = sessions.filter(s => s.payment_captured);
  const totalEarned = captured.reduce((sum, s) => sum + (Number(s.earnings) || 0), 0);
  const sessionCount = captured.length;
  const avgSession = sessionCount > 0 ? Math.round(totalEarned / sessionCount) : 0;

  // Find the most booked class
  const classCounts = captured.reduce((acc, s) => {
    if (s.class_code) acc[s.class_code] = (acc[s.class_code] || 0) + 1;
    return acc;
  }, {});
  const topClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TutorDashboardNav />

      <div style={{ padding: '40px 56px 16px' }}>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: 0, letterSpacing: -0.8 }}>Earnings & payouts</h1>
      </div>

      {!payoutsEnabled && (
        <div style={{ padding: '0 56px 16px' }}>
          <div style={{ background: 'oklch(0.97 0.04 65)', border: '1px solid oklch(0.88 0.1 65)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'oklch(0.45 0.14 60)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>Payout setup is incomplete. Complete onboarding to receive earnings.</span>
            <Btn size="sm" onClick={() => navigate('/tutor-dashboard')}>Set up payouts</Btn>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 56px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>Total earned</div>
          {loading ? (
            <div style={{ height: 64, background: 'var(--border)', borderRadius: 8, opacity: 0.4 }} />
          ) : (
            <>
              <div style={{ fontFamily: FONTS.serif, fontSize: 64, color: 'var(--accent)', lineHeight: 1, marginBottom: 4 }}>
                ${Math.floor(totalEarned)}.<span style={{ fontSize: 32 }}>{String(Math.round((totalEarned % 1) * 100)).padStart(2, '0')}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Across {sessionCount} paid session{sessionCount !== 1 ? 's' : ''} · paid out via Stripe
              </div>
            </>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => window.open('https://dashboard.stripe.com/express', '_blank')}>
              Stripe dashboard
            </Btn>
          </div>
        </div>
        <div style={{ background: 'var(--ink)', color: 'var(--surface)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.7, fontWeight: 600, marginBottom: 8 }}>Stats</div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 40, color: 'oklch(0.85 0.16 75)', lineHeight: 1 }}>
            {loading ? '—' : sessionCount}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Completed & paid sessions</div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.12)', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ opacity: 0.7 }}>Avg session</span>
              <span>{loading ? '—' : `$${avgSession}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ opacity: 0.7 }}>Top class</span>
              <span>{loading ? '—' : topClass}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 56px 56px' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 14 }}>Recent sessions</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.4 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 52, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            No completed sessions yet.
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {sessions.map((t, i) => {
              const isPaid = t.payment_captured;
              const isCancelled = t.status === 'cancelled';
              return (
                <div key={t.id ?? i} style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 1fr 90px 100px',
                  gap: 16, alignItems: 'center', padding: '14px 20px',
                  borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 13,
                }}>
                  <span style={{ fontFamily: FONTS.mono, color: 'var(--ink-3)', fontSize: 12 }}>
                    {new Date(t.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {t.student_name?.split(' ')[0] || 'Student'} {t.student_name?.split(' ')[1]?.[0] ? t.student_name.split(' ')[1][0] + '.' : ''}
                  </span>
                  <CourseTag code={t.class_code} size={10} />
                  <span style={{
                    fontFamily: FONTS.mono, fontWeight: 600,
                    color: isCancelled ? 'var(--ink-3)' : 'var(--ink)',
                    textDecoration: isCancelled ? 'line-through' : 'none',
                  }}>${Number(t.earnings || 0).toFixed(2)}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                    color: isCancelled ? 'var(--ink-3)' : isPaid ? 'var(--positive)' : 'oklch(0.55 0.15 60)',
                  }}>
                    {isCancelled ? 'CANCELLED' : isPaid ? 'PAID' : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────── Review ──────────────────────────

const initialsFromName = (name) => {
  const s = (name || '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || '';
  return (a + b).toUpperCase() || '?';
};

const formatCompletedSessionWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const ReviewScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const state = location.state || {};
  const sessionId = state.sessionId || searchParams.get('session') || '';

  const [sess, setSess] = useState(null);
  const [checking, setChecking] = useState(!!sessionId);
  const [loadError, setLoadError] = useState('');
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [tip, setTip] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const tagOpts = ['Patient', 'Clear explainer', "Knew the prof's style", 'Came prepared', 'Worth the price', 'Would book again'];
  const toggleTag = (t) => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);

  const tutorNameDisplay = sess?.tutor_name || state.tutorName || 'Your tutor';
  const classCodeDisplay = sess?.class_code || state.classCode || 'CHEM 200';

  useEffect(() => {
    if (!sessionId) {
      setLoadError('Pick a completed session from your dashboard to leave a review.');
      setChecking(false);
      return;
    }
    if (!user?.id) return;

    let cancelled = false;
    (async () => {
      setChecking(true);
      setLoadError('');
      const { data: existing } = await supabase.from('session_reviews').select('id').eq('session_id', sessionId).maybeSingle();
      if (cancelled) return;
      if (existing) {
        setAlreadyDone(true);
        setChecking(false);
        return;
      }

      const { data: row, error } = await supabase.from('sessions').select('*').eq('id', sessionId).eq('student_id', user.id).maybeSingle();
      if (cancelled) return;
      if (error?.message || !row) {
        setLoadError('Could not load this session.');
        setChecking(false);
        return;
      }
      if (row.status !== 'completed') {
        setLoadError('You can leave a review after your tutor marks this session complete.');
        setChecking(false);
        return;
      }
      setSess(row);
      setChecking(false);
    })();

    return () => { cancelled = true; };
  }, [sessionId, user?.id]);

  const handleSubmit = async () => {
    if (!sess || !user) return;
    setSubmitError('');
    setSubmitting(true);
    const { error } = await supabase.from('session_reviews').insert({
      session_id: sess.id,
      student_id: user.id,
      tutor_id: sess.tutor_id || null,
      class_code: sess.class_code || classCodeDisplay,
      rating: stars,
      tags,
      body: text.trim(),
      tip_dollars: tip,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '23505' || error.message?.includes('unique')) setSubmitError('You already reviewed this session.');
      else setSubmitError('Could not save your review.');
      return;
    }
    navigate('/dashboard');
  };

  if (!sessionId) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
          <Logo size={22} />
          <div style={{ flex: 1 }} />
          <span onClick={() => navigate('/dashboard')} style={{ fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}>Back to dashboard</span>
        </nav>
        <div style={{ maxWidth: 560, margin: '56px auto', padding: '0 24px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Open <strong>Past sessions</strong> on your dashboard and tap <strong>Rate session</strong> on a completed lesson.
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', padding: '48px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
        Loading session…
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
          <Logo size={22} />
          <div style={{ flex: 1 }} />
        </nav>
        <div style={{ maxWidth: 560, margin: '56px auto', padding: '0 24px' }}>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, letterSpacing: -0.5 }}>Thanks — you’ve already reviewed this session.</h1>
          <Btn style={{ marginTop: 28 }} size="lg" onClick={() => navigate('/dashboard')}>Back to dashboard</Btn>
        </div>
      </div>
    );
  }

  if (loadError || !sess) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
          <Logo size={22} />
          <div style={{ flex: 1 }} />
          <span onClick={() => navigate('/dashboard')} style={{ fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}>Back to dashboard</span>
        </nav>
        <div style={{ maxWidth: 560, margin: '56px auto', padding: '0 24px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          {loadError || 'Something went wrong.'}
        </div>
      </div>
    );
  }

  const whenStr = formatCompletedSessionWhen(sess.scheduled_at);
  const mins = sess.duration_min || 60;
  const locationStr = sess.location || state.location || '—';

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
        <Logo size={22} />
        <div style={{ flex: 1 }} />
        <span onClick={() => navigate('/dashboard')} style={{ fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}>Skip for now</span>
      </nav>

      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
          <Avatar initials={initialsFromName(tutorNameDisplay)} color="oklch(0.72 0.1 100)" size={56} />
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 2 }}>Session with</div>
            <div style={{ fontFamily: FONTS.serif, fontSize: 28, lineHeight: 1, letterSpacing: -0.4 }}>{tutorNameDisplay}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>
              <CourseTag code={classCodeDisplay} size={11} /> · {mins} min · {whenStr} · {locationStr}
            </div>
          </div>
        </div>

        <h1 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '0 0 8px', letterSpacing: -0.6 }}>How&apos;d it go?</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 28px' }}>
          Your review helps the next student. Other students won&apos;t see your name on this by default.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setStars(n)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill={n <= stars ? 'oklch(0.78 0.16 75)' : 'transparent'} stroke={n <= stars ? 'oklch(0.78 0.16 75)' : 'var(--ink-3)'} strokeWidth="1.4">
                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
              </svg>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>What stood out?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tagOpts.map(t => <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</Chip>)}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>Add a note (optional)</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Priya broke down stoichiometry in a way I finally got. Booked again for midterm prep."
            style={{
              width: '100%', minHeight: 100, resize: 'vertical', boxSizing: 'border-box',
              border: '1px solid var(--border)', borderRadius: 10, padding: 14,
              fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)',
              background: 'var(--surface)', outline: 'none', lineHeight: 1.5,
            }} />
        </div>

        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, padding: 18, marginBottom: 28 }}>
          <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Add a tip?</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 14 }}>100% goes to {tutorNameDisplay.split(' ')[0] || 'your tutor'} (shown for bookkeeping — payouts can be wired later).</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 3, 5, 10].map(n => (
              <Chip key={n} active={tip === n} onClick={() => setTip(n)}>{n === 0 ? 'No tip' : `$${n}`}</Chip>
            ))}
          </div>
        </div>

        {submitError && <div style={{ color: 'oklch(0.55 0.18 25)', fontSize: 13, marginBottom: 14 }}>{submitError}</div>}
        <Btn fullWidth size="lg" onClick={() => submitting ? undefined : handleSubmit()} style={{ opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Submitting…' : 'Submit review'}
        </Btn>
      </div>
    </div>
  );
};

// ────────────────────────── Verify Email ──────────────────────────
export const VerifyEmailScreen = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendBlocked, setResendBlocked] = useState(false);
  const [cooldown, setCooldown] = useState(60); // email just sent on arrival
  const refs = useRef([]);

  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const filled = code.every(c => c);

  const handleVerify = async () => {
    if (!filled || loading) return;
    setLoading(true);
    setVerifyError('');
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.join(''),
      type: 'signup',
    });
    setLoading(false);
    if (error) { setVerifyError('That code is wrong or expired. Try resending.'); return; }
    navigate('/home');
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (resending) return;
    // If cooldown is still running, reveal the live timer — don't send
    if (cooldown > 0) {
      setResendBlocked(true);
      return;
    }
    setResending(true);
    setResendMsg('');
    setResendBlocked(false);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      setResendMsg(error.message);
    } else {
      setCooldown(60);
      setResendMsg('Code sent! Check your inbox.');
      setTimeout(() => setResendMsg(''), 4000);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
      </nav>
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 30, margin: '0 auto 24px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="verified" size={28} stroke={0} />
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '0 0 14px', letterSpacing: -0.6 }}>Check your email.</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 32px' }}>
          {email
            ? <>We sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Enter it below to verify your account.</>
            : <>Enter the 6-digit verification code we sent you.</>
          }
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {code.map((c, i) => (
            <input key={i} ref={el => refs.current[i] = el} value={c}
              onChange={e => set(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              maxLength={1} inputMode="numeric"
              style={{
                width: 50, height: 60, textAlign: 'center', fontSize: 26,
                fontFamily: FONTS.serif, color: 'var(--ink)', background: 'var(--surface)',
                border: `1.5px solid ${c ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, outline: 'none',
              }} />
          ))}
        </div>
        {verifyError && (
          <p style={{ fontSize: 13, color: 'oklch(0.55 0.18 25)', marginBottom: 14 }}>{verifyError}</p>
        )}
        <Btn fullWidth size="lg" onClick={handleVerify} style={{ opacity: (filled && !loading) ? 1 : 0.4 }}>
          {loading ? 'Verifying…' : 'Verify & continue'}
        </Btn>
        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
          {resendBlocked && cooldown > 0 && (
            <div style={{ fontWeight: 500, color: 'oklch(0.55 0.18 25)', marginBottom: 6 }}>
              Email already sent — wait for the timer then try again.{' '}
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>({cooldown}s)</span>
            </div>
          )}
          {resendMsg && !resendBlocked && (
            <div style={{ fontWeight: 500, color: resendMsg.startsWith('Code sent') ? 'var(--accent)' : 'oklch(0.55 0.18 25)', marginBottom: 6 }}>
              {resendMsg}
            </div>
          )}
          Didn't get it? <span onClick={resending ? undefined : handleResend} style={{ color: 'var(--accent)', cursor: resending ? 'default' : 'pointer', textDecoration: 'underline', opacity: resending ? 0.5 : 1 }}>
            {resending ? 'Sending…' : 'Resend code'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────── Tutor Verification ──────────────────────────
export const TutorVerificationScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [uploaded, setUploaded] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setUploaded(true); setSubmitError(''); }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Upload transcript to Supabase Storage (bucket: transcripts)
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('transcripts')
        .upload(path, file, { upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      // Record the path and submission time in the tutor profile
      await supabase.from('tutor_profiles').upsert({
        user_id: user.id,
        transcript_path: path,
        transcript_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Mark in user metadata for fast checks
      await supabase.auth.updateUser({ data: { transcript_submitted: true } });
      await syncTutorProfileFromUser(user);

      navigate('/verify-email', { state: { email } });
    } catch (e) {
      setSubmitError(e.message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)', gap: 20 }}>
        <Logo size={22} />
        <div onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
          <Icon name="chevLeft" size={12} /> Back to onboarding
        </div>
      </nav>
      <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>TUTOR VERIFICATION</div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, margin: '0 0 14px', letterSpacing: -0.8 }}>Prove the grade.</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 32px', lineHeight: 1.5 }}>
          Upload a screenshot of your unofficial transcript showing CHEM 200 · A. We blur everything else. This is the trust we sell to students — we take it seriously.
        </p>

        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileChange} />
        <div onClick={() => fileInputRef.current?.click()} style={{
          border: `2px dashed ${uploaded ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12, padding: '40px 24px', textAlign: 'center',
          background: uploaded ? 'var(--accent-soft)' : 'var(--surface)',
          cursor: 'pointer', marginBottom: 24, transition: 'all .15s',
        }}>
          {uploaded ? (
            <>
              <Icon name="check" size={36} style={{ color: 'var(--accent)' }} />
              <div style={{ fontFamily: FONTS.serif, fontSize: 22, marginTop: 12 }}>{file?.name || 'transcript.png'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>
                Ready to submit · {file ? (file.size / 1024).toFixed(0) + ' KB' : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 10, textDecoration: 'underline' }}>Replace</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, color: 'var(--ink-3)', marginBottom: 8 }}>↑</div>
              <div style={{ fontFamily: FONTS.serif, fontSize: 22, marginBottom: 6 }}>Drop your transcript here</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>PDF, PNG, or JPG · reviewed by our team within 24h</div>
            </>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>What we check</div>
          {[
            'Course code matches what you listed',
            'Grade is B+ or higher',
            'Name matches your verified email',
            'Document is from sdsu.edu',
          ].map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13, color: 'var(--ink-2)' }}>
              <Icon name="check" size={14} style={{ color: 'var(--accent)' }} />
              {c}
            </div>
          ))}
        </div>

        {submitError && (
          <div style={{ color: 'oklch(0.55 0.18 25)', fontSize: 13, marginBottom: 12, padding: '10px 14px', background: 'oklch(0.97 0.02 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 8 }}>
            {submitError}
          </div>
        )}
        <Btn fullWidth size="lg" onClick={handleSubmit} disabled={submitting} style={{ opacity: uploaded ? 1 : 0.4, pointerEvents: uploaded ? 'auto' : 'none' }}>
          {submitting ? 'Uploading…' : uploaded ? 'Submit for review · usually < 24h' : 'Upload to continue'}
        </Btn>
      </div>
    </div>
  );
};

// ────────────────────────── States Showcase ──────────────────────────
export const StatesShowcase = () => (
  <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', padding: '32px 56px' }}>
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600 }}>STATES · ALL IN ONE FRAME</div>
      <h1 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '6px 0 0', letterSpacing: -0.6 }}>Empty, loading, error</h1>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px 28px', textAlign: 'center', minHeight: 280 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 14 }}>EMPTY · No tutors yet</div>
        <div style={{ fontSize: 44, marginBottom: 12, fontFamily: FONTS.serif, color: 'var(--accent)', lineHeight: 1 }}>—</div>
        <div style={{ fontFamily: FONTS.serif, fontSize: 26, marginBottom: 8, letterSpacing: -0.3 }}>No tutors for ASTR 109 yet.</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 320, margin: '0 auto 18px', lineHeight: 1.5 }}>
          Be the first to be notified when one signs up — or refer a classmate who aced it.
        </div>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <Btn variant="ghost" size="sm">Notify me</Btn>
          <Btn size="sm">Refer a tutor</Btn>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px 28px', textAlign: 'center', minHeight: 280 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 14 }}>EMPTY · No sessions yet</div>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ margin: '0 auto 14px', display: 'block' }}>
          <rect x="14" y="20" width="52" height="46" rx="4" fill="none" stroke="var(--border)" strokeWidth="1.5"/>
          <path d="M14 32 L66 32" stroke="var(--border)" strokeWidth="1.5"/>
          <circle cx="26" cy="14" r="2" fill="var(--accent)"/><circle cx="54" cy="14" r="2" fill="var(--accent)"/>
          <path d="M26 11 L26 22 M54 11 L54 22" stroke="var(--accent)" strokeWidth="1.5"/>
        </svg>
        <div style={{ fontFamily: FONTS.serif, fontSize: 26, marginBottom: 8, letterSpacing: -0.3 }}>Your calendar's clear.</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 320, margin: '0 auto 18px', lineHeight: 1.5 }}>
          Browse classes you're taking and book your first session. Most students book 2–3 a week.
        </div>
        <Btn size="sm">Find my first tutor</Btn>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, minHeight: 280 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 18 }}>LOADING · Tutor list</div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--border)', animation: 'sb-pulse 1.4s ease-in-out infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: '55%', borderRadius: 4, background: 'var(--border)', marginBottom: 8, animation: 'sb-pulse 1.4s ease-in-out infinite' }} />
              <div style={{ height: 10, width: '38%', borderRadius: 4, background: 'var(--border)', animation: 'sb-pulse 1.4s ease-in-out infinite' }} />
            </div>
            <div style={{ width: 60, height: 28, borderRadius: 6, background: 'var(--border)', animation: 'sb-pulse 1.4s ease-in-out infinite' }} />
          </div>
        ))}
        <style>{`@keyframes sb-pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }`}</style>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid oklch(0.72 0.16 25)', borderRadius: 12, padding: '40px 28px', textAlign: 'center', minHeight: 280 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'oklch(0.55 0.18 25)', fontWeight: 600, marginBottom: 14 }}>ERROR · Connection lost</div>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="oklch(0.55 0.18 25)" strokeWidth="1.6" style={{ margin: '0 auto 12px', display: 'block' }}>
          <path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="oklch(0.55 0.18 25)" strokeWidth="1.6"/>
        </svg>
        <div style={{ fontFamily: FONTS.serif, fontSize: 24, marginBottom: 8, letterSpacing: -0.3 }}>We lost the connection.</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 320, margin: '0 auto 18px', lineHeight: 1.5 }}>
          Check your wifi and try again. Your data is safe.
        </div>
        <Btn size="sm">Try again</Btn>
      </div>

      <div style={{ gridColumn: 'span 2', background: 'oklch(0.96 0.04 25)', border: '1px solid oklch(0.72 0.16 25)', borderRadius: 12, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'oklch(0.55 0.18 25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4M12 16h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'oklch(0.45 0.18 25)', fontWeight: 600, marginBottom: 4 }}>ERROR · Payment failed</div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 22, marginBottom: 4, letterSpacing: -0.3 }}>Your card was declined.</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Card ending •••• 4242 — try a different card or contact your bank. <span style={{ color: 'oklch(0.45 0.18 25)', cursor: 'pointer', textDecoration: 'underline' }}>Use a different card</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
