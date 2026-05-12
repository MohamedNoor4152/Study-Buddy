import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FONTS } from '../../tokens.js';
import { Icon, Btn, Avatar, CourseTag } from '../../components/primitives/index.jsx';
import { MobileStatusBar, MobileTabBar } from '../landing/LandingMobile.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { supabase } from '../../supabase.js';
import { resolveTutorIdForSession } from '../../demoTutor.js';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const fmtDate = (iso) =>
  new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const getNextDays = () => {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { label: `${names[d.getDay()]} ${d.getDate()}`, dayName: names[d.getDay()], dateStr: d.toISOString().split('T')[0] };
  });
};

const hourTo24 = (label) => {
  const [time, period] = label.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ─── Student Dashboard (mobile) ──────────────────────────────────────────────

export const DashboardMobile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(' ')[0] || 'there';

  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const loadSessions = () => {
    if (!user) return;
    const now = new Date().toISOString();
    supabase.from('sessions').select('*')
      .eq('student_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', now)
      .order('scheduled_at')
      .then(({ data }) => { setUpcoming(data || []); setLoading(false); });
  };

  useEffect(() => {
    loadSessions();
  }, [user]);

  // Realtime: refresh when a session status changes (tutor accept/decline)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`dash-mobile-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `student_id=eq.${user.id}`,
      }, () => loadSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleCancel = async (sess) => {
    if (!window.confirm('Cancel this session?')) return;
    setCancellingId(sess.id);
    try {
      await supabase.functions.invoke('refund-payment', { body: { sessionId: sess.id } });
      await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sess.id);
      setUpcoming(u => u.filter(s => s.id !== sess.id));
    } catch (e) {
      console.error('cancel error:', e);
    } finally {
      setCancellingId(null);
    }
  };

  const next = upcoming[0];
  const rest = upcoming.slice(1);

  const handleTab = (k) => {
    if (k === 'home') navigate('/home');
    else if (k === 'browse') navigate('/browse');
    else if (k === 'sessions') navigate('/dashboard');
    else if (k === 'chat') navigate('/messages');
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ padding: '8px 22px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Welcome back</div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, margin: '2px 0 0', letterSpacing: -0.6 }}>{firstName}</h1>
          </div>
          <Avatar initials={initials(fullName)} color="oklch(0.8 0.06 60)" size={40} onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 10px' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        ) : next ? (
          <div style={{ background: 'var(--ink)', color: 'var(--surface)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'oklch(0.75 0.16 25)', fontWeight: 600, marginBottom: 12 }}>
              Next session · {next.status === 'pending' ? 'Awaiting confirmation' : 'Confirmed'}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <Avatar initials={initials(next.tutor_name)} size={44} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{next.tutor_name || 'Tutor'}</div>
                <div style={{ fontSize: 12, color: 'oklch(0.75 0.01 70)' }}>{next.class_code} · {next.location}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 14, borderTop: '1px solid oklch(0.32 0.014 60)' }}>
              <span style={{ fontFamily: FONTS.serif, fontSize: 22, lineHeight: 1 }}>{fmtDate(next.scheduled_at)}</span>
              <span style={{ fontSize: 12, color: 'oklch(0.75 0.01 70)' }}>· {next.duration_min} min</span>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: FONTS.serif, fontSize: 20, marginBottom: 8 }}>No upcoming sessions</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>Book a tutor to get started.</div>
            <Btn size="sm" onClick={() => navigate('/browse')}>Browse tutors</Btn>
          </div>
        )}

        {/* Next session cancel button */}
        {next && (
          <div style={{ marginTop: -12, marginBottom: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/messages')} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>
              Message tutor
            </button>
            {next.status === 'pending' && (
              <button onClick={() => handleCancel(next)} disabled={cancellingId === next.id} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff5f5', fontSize: 12, color: '#b91c1c', cursor: 'pointer' }}>
                {cancellingId === next.id ? 'Cancelling…' : 'Cancel request'}
              </button>
            )}
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>Upcoming</div>
            {rest.map(s => (
              <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={initials(s.tutor_name)} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.tutor_name || 'Tutor'}</span>
                      <CourseTag code={s.class_code} size={10} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{fmtDate(s.scheduled_at)} · {s.duration_min} min</div>
                  </div>
                  {s.status === 'pending' && (
                    <button onClick={() => handleCancel(s)} disabled={cancellingId === s.id} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', color: '#b91c1c', cursor: 'pointer' }}>
                      {cancellingId === s.id ? '…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <MobileTabBar active="sessions" onTab={handleTab} />
    </div>
  );
};

// ─── Booking (mobile) ─────────────────────────────────────────────────────────

const cardElementStyle = {
  style: {
    base: { fontSize: '15px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', '::placeholder': { color: '#9ca3af' } },
    invalid: { color: '#dc2626' },
  },
};

const MobilePaymentStep = ({ clientSecret, sessionPayload, onSuccess, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const { user } = useAuth();

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError('');

    const cardElement = elements.getElement(CardElement);
    const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (confirmErr) { setPaying(false); setPayError(confirmErr.message); return; }

    const { error: dbErr } = await supabase.from('sessions').insert({
      ...sessionPayload,
      payment_intent_id: paymentIntent?.id ?? null,
    });

    if (dbErr) {
      if (paymentIntent?.id) {
        supabase.functions.invoke('cancel-payment-intent', { body: { paymentIntentId: paymentIntent.id } })
          .catch(() => {});
      }
      setPaying(false);
      setPayError('Could not save booking. Your card has not been charged — please try again.');
      return;
    }

    supabase.functions.invoke('notify-tutor-booking', {
      body: {
        tutorId: sessionPayload.tutor_id,
        tutorName: sessionPayload.tutor_name,
        studentName: sessionPayload.student_name,
        classCode: sessionPayload.class_code,
        scheduledAt: sessionPayload.scheduled_at,
        durationMin: sessionPayload.duration_min,
        location: sessionPayload.location,
        note: sessionPayload.note,
        earnings: sessionPayload.earnings,
      },
    }).catch(() => {});

    setPaying(false);
    onSuccess({ paymentIntentId: paymentIntent?.id });
  };

  return (
    <form onSubmit={handlePay} style={{ padding: '16px 16px 24px' }}>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.5 }}>
        Your card is <strong>authorized but not charged</strong> until your tutor accepts.
      </div>
      <div style={{ border: '1px solid #d1d5db', borderRadius: 10, padding: '12px 14px', background: '#fff', marginBottom: 16 }}>
        <CardElement options={cardElementStyle} />
      </div>
      {payError && (
        <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          {payError}
        </div>
      )}
      <Btn type="button" variant="ghost" fullWidth style={{ marginBottom: 8 }} onClick={onBack}>Back</Btn>
      <Btn type="submit" fullWidth disabled={paying}>{paying ? 'Authorizing…' : 'Confirm & request session'}</Btn>
    </form>
  );
};

export const BookingMobile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const passed = location.state || {};

  const tutorName = passed.tutorName || 'Your tutor';
  const tutorInitials = passed.tutorInitials || tutorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const tutorColor = passed.tutorColor;
  const classCode = passed.classCode || 'CHEM 200';
  const rate = passed.rate || 38;

  const days = getNextDays();
  const times = ['9:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'];

  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState('');
  const [dur, setDur] = useState(60);
  const [loc, setLoc] = useState('Library');
  const [note, setNote] = useState('');

  const [step, setStep] = useState('details');
  const [clientSecret, setClientSecret] = useState('');
  const [pendingPayload, setPendingPayload] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fee = Math.round(rate * dur / 60);
  const svc = Math.round(fee * 0.08);
  const total = fee + svc;
  const totalCents = Math.round(total * 100);

  const handleContinue = async () => {
    if (!time) return;
    setCreating(true);
    setCreateError('');

    try {
      const scheduledAt = new Date(`${days[dayIdx].dateStr}T${hourTo24(time)}`).toISOString();
      const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
      const tutorIdForDb = await resolveTutorIdForSession(passed.tutorId, tutorName, classCode);

      if (!tutorIdForDb) {
        setCreateError('This tutor isn\'t available for booking right now.');
        return;
      }

      const payload = {
        student_id: user.id,
        tutor_id: tutorIdForDb,
        student_name: studentName,
        tutor_name: tutorName,
        class_code: classCode,
        scheduled_at: scheduledAt,
        duration_min: dur,
        location: loc,
        status: 'pending',
        note,
        earnings: fee,
      };

      if (!stripePromise || totalCents < 50) {
        const { error } = await supabase.from('sessions').insert(payload);
        if (error) { setCreateError('Could not save booking. Try again.'); return; }
        supabase.functions.invoke('notify-tutor-booking', {
          body: { tutorId: payload.tutor_id, tutorName, studentName, classCode, scheduledAt, durationMin: dur, location: loc, note, earnings: fee },
        }).catch(() => {});
        navigate('/payment-confirm', { state: { tutorName, classCode, scheduledAt, duration: dur, locationChoice: loc, fee, creditsApplied: 0, total } });
        return;
      }

      const res = await supabase.functions.invoke('create-payment-intent', {
        body: { amountCents: totalCents, tutorId: tutorIdForDb, description: `Study Buddy: ${classCode} with ${tutorName}` },
      });

      if (res.error || !res.data?.clientSecret) {
        setCreateError('Could not initialize payment. Please try again.');
        return;
      }

      setPendingPayload(payload);
      setClientSecret(res.data.clientSecret);
      setStep('payment');
    } catch (e) {
      setCreateError('Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handlePaymentSuccess = ({ paymentIntentId }) => {
    const scheduledAt = new Date(`${days[dayIdx].dateStr}T${hourTo24(time)}`).toISOString();
    navigate('/payment-confirm', { state: { tutorName, classCode, scheduledAt, duration: dur, locationChoice: loc, fee, creditsApplied: 0, total, paymentIntentId } });
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={step === 'payment' ? () => setStep('details') : () => navigate(-1)} style={{ border: 'none', background: 'transparent', padding: 4, marginLeft: -4, cursor: 'pointer' }}>
          <Icon name="chevLeft" size={18} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
          {step === 'details' ? 'Book session' : 'Payment'}
        </div>
        <div style={{ width: 22 }} />
      </div>

      {step === 'details' ? (
        <>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 24px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18 }}>
              <Avatar initials={tutorInitials} color={tutorColor} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.serif, fontSize: 17, lineHeight: 1.1 }}>{tutorName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{classCode} · ${rate}/hr</div>
              </div>
              <CourseTag code={classCode} size={10} />
            </div>

            <Section title="Pick a day">
              <div style={{ display: 'flex', gap: 6, overflow: 'auto', marginLeft: -16, paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}>
                {days.map((d, i) => (
                  <button key={i} onClick={() => setDayIdx(i)} style={{
                    flexShrink: 0, width: 50, padding: '10px 0', borderRadius: 10,
                    border: `1.5px solid ${dayIdx === i ? 'var(--accent)' : 'var(--border)'}`,
                    background: dayIdx === i ? 'var(--accent-soft)' : 'var(--surface)',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, color: dayIdx === i ? 'var(--accent)' : 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>{d.label.split(' ')[0]}</div>
                    <div style={{ fontFamily: FONTS.serif, fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{d.label.split(' ')[1]}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Time">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {times.map(t => (
                  <button key={t} onClick={() => setTime(t)} style={{
                    padding: '8px 14px', borderRadius: 999,
                    border: `1.5px solid ${time === t ? 'var(--accent)' : 'var(--border)'}`,
                    background: time === t ? 'var(--accent-soft)' : 'var(--surface)',
                    color: time === t ? 'var(--accent)' : 'var(--ink-2)',
                    fontFamily: FONTS.mono, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}>{t}</button>
                ))}
              </div>
            </Section>

            <Section title="Duration">
              <div style={{ display: 'flex', gap: 6 }}>
                {[30, 60, 90, 120].map(d => (
                  <button key={d} onClick={() => setDur(d)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    border: `1.5px solid ${dur === d ? 'var(--accent)' : 'var(--border)'}`,
                    background: dur === d ? 'var(--accent-soft)' : 'var(--surface)',
                    color: 'var(--ink)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>{d} min</button>
                ))}
              </div>
            </Section>

            <Section title="Where">
              {['Library', 'Video', 'Coffee shop'].map(l => (
                <button key={l} onClick={() => setLoc(l)} style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 6,
                  border: `1.5px solid ${loc === l ? 'var(--accent)' : 'var(--border)'}`,
                  background: loc === l ? 'var(--accent-soft)' : 'var(--surface)',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, color: 'var(--ink)',
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${loc === l ? 'var(--accent)' : 'var(--border)'}`, background: loc === l ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loc === l && <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent-ink)' }} />}
                  </div>
                  {l}
                </button>
              ))}
            </Section>

            <Section title={`Note for ${tutorName.split(' ')[0]} (optional)`}>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What do you want to focus on?"
                style={{ width: '100%', minHeight: 70, boxSizing: 'border-box', resize: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontFamily: FONTS.sans, fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', outline: 'none' }} />
            </Section>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 14px', background: 'var(--bg)' }}>
            {createError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{createError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{dur} min · {time || 'pick a time'} · {days[dayIdx].label}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>${total}</div>
            </div>
            <Btn fullWidth onClick={handleContinue} disabled={!time || creating}>
              {creating ? 'Preparing…' : 'Continue to payment'}
            </Btn>
          </div>
        </>
      ) : (
        clientSecret && stripePromise ? (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Elements stripe={stripePromise}>
              <MobilePaymentStep
                clientSecret={clientSecret}
                sessionPayload={pendingPayload}
                onSuccess={handlePaymentSuccess}
                onBack={() => setStep('details')}
              />
            </Elements>
          </div>
        ) : (
          <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading payment form…</div>
        )
      )}
    </div>
  );
};

// ─── Booking Confirmed (mobile) ───────────────────────────────────────────────

export const BookingConfirmedMobile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const s = location.state || {};
  const tutorName = s.tutorName || 'Your tutor';
  const when = s.scheduledAt ? fmtDate(s.scheduledAt) : '—';

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 18px' }}>
          <Icon name="check" size={32} stroke={2.4} />
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, textAlign: 'center', margin: '0 0 8px', letterSpacing: -0.5 }}>Request sent.</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
          {tutorName.split(' ')[0]} will confirm shortly. You won't be charged until they accept.
        </p>

        <div style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>SESSION DETAILS</div>
          {[
            ['Tutor', tutorName],
            ['Class', s.classCode || '—'],
            ['When', when],
            ['Duration', s.duration ? `${s.duration} min` : '—'],
            ['Location', s.locationChoice || '—'],
            ['Total', s.total != null ? `$${Number(s.total).toFixed(2)}` : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dotted var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)' }}>{k}</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <Btn variant="ghost" fullWidth style={{ marginBottom: 8 }} onClick={() => navigate('/messages')}>Open messages</Btn>
        <Btn fullWidth onClick={() => navigate('/dashboard')}>View my sessions</Btn>
      </div>
    </div>
  );
};

// ─── Messages list (mobile) ───────────────────────────────────────────────────

export const MessagesListMobile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversations')
      .select('*')
      .eq('student_id', user.id)
      .order('last_message_at', { ascending: false })
      .then(({ data }) => {
        setConversations(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleTab = (k) => {
    if (k === 'home') navigate('/home');
    else if (k === 'browse') navigate('/browse');
    else if (k === 'sessions') navigate('/dashboard');
    else if (k === 'chat') navigate('/messages');
  };

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ padding: '8px 20px 16px' }}>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: -0.5 }}>Messages</h1>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No messages yet. Message a tutor from their profile.
          </div>
        ) : conversations.map(c => (
          <div key={c.id} onClick={() => navigate(`/messages/${c.id}`)} style={{
            display: 'flex', gap: 12, padding: '12px 20px', cursor: 'pointer',
            borderBottom: '1px solid var(--border)', alignItems: 'center',
          }}>
            <Avatar initials={initials(c.tutor_name)} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.tutor_name || 'Tutor'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtTime(c.last_message_at)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.last_message || 'No messages yet'}
              </div>
            </div>
          </div>
        ))}
      </div>
      <MobileTabBar active="chat" onTab={handleTab} />
    </div>
  );
};

// ─── Message thread (mobile) ──────────────────────────────────────────────────

export const MessageThreadMobile = () => {
  const navigate = useNavigate();
  const { id: convId } = useParams();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!convId) return;
    supabase.from('conversations').select('*').eq('id', convId).maybeSingle()
      .then(({ data }) => setConv(data));
    supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at')
      .then(({ data }) => setMessages(data || []));

    const channel = supabase.channel(`mobile-msgs:${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !convId || !user) return;
    setSending(true);
    setSendError('');
    const text = draft.trim();
    setDraft('');
    const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

    const { data: newMsg, error: sendErr } = await supabase.from('messages')
      .insert({ conversation_id: convId, sender_id: user.id, sender_name: senderName, text })
      .select().single();

    if (sendErr) {
      setSendError('Failed to send.');
      setDraft(text);
      setSending(false);
      return;
    }
    if (newMsg) setMessages(prev => [...prev, newMsg]);
    const now = new Date().toISOString();
    await supabase.from('conversations').update({ last_message: text, last_message_at: now }).eq('id', convId);
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 12px', borderBottom: '1px solid var(--border)', gap: 10, flexShrink: 0 }}>
        <button onClick={() => navigate('/messages')} style={{ border: 'none', background: 'transparent', padding: 4, marginLeft: -4, cursor: 'pointer' }}>
          <Icon name="chevLeft" size={18} />
        </button>
        <Avatar initials={initials(conv?.tutor_name)} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>{conv?.tutor_name || 'Tutor'}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 40 }}>
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((m) => {
          const isSystem = m.sender_name === 'Study Buddy' && String(m.text).startsWith('✅');
          const isMe = m.sender_id === user?.id && !isSystem;
          if (isSystem) {
            return (
              <div key={m.id} style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--ink)', textAlign: 'center' }}>
                {m.text}
              </div>
            );
          }
          return (
            <div key={m.id} style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              background: isMe ? 'var(--ink)' : 'var(--surface)',
              color: isMe ? 'var(--surface)' : 'var(--ink)',
              border: isMe ? 'none' : '1px solid var(--border)',
              borderRadius: 16,
              borderBottomRightRadius: isMe ? 4 : 16,
              borderBottomLeftRadius: isMe ? 16 : 4,
              padding: '8px 12px', fontSize: 13.5, lineHeight: 1.4,
            }}>{m.text}</div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        {sendError && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 6 }}>{sendError}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={`Message ${conv?.tutor_name?.split(' ')[0] || ''}…`}
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 18, padding: '8px 14px', fontFamily: FONTS.sans, fontSize: 13.5, color: 'var(--ink)', background: 'var(--surface)', outline: 'none' }} />
          <button onClick={sendMessage} disabled={sending || !draft.trim()} style={{
            width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer',
            background: draft.trim() ? 'var(--accent)' : 'var(--border)', color: 'var(--accent-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Tutor Dashboard (mobile) ─────────────────────────────────────────────────

export const TutorDashboardMobile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(' ')[0] || 'there';

  const [requests, setRequests] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    Promise.all([
      supabase.from('sessions').select('*').eq('tutor_id', user.id).eq('status', 'pending'),
      supabase.from('sessions').select('*').eq('tutor_id', user.id).eq('status', 'confirmed').gte('scheduled_at', now).order('scheduled_at'),
    ]).then(([reqRes, upRes]) => {
      setRequests(reqRes.data || []);
      setUpcoming(upRes.data || []);
      setLoading(false);
    });

    // Real-time — same logic as desktop
    const channel = supabase.channel(`tutor-mobile:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `tutor_id=eq.${user.id}` },
        (payload) => {
          const s = payload.new;
          const id = s?.id ?? payload.old?.id;
          const now2 = new Date().toISOString();
          if (payload.eventType === 'INSERT') {
            if (s.status === 'pending') setRequests(prev => prev.find(r => r.id === id) ? prev : [s, ...prev]);
            return;
          }
          if (payload.eventType === 'UPDATE') {
            setRequests(prev => prev.filter(r => r.id !== id));
            setUpcoming(prev => prev.filter(r => r.id !== id));
            if (s.status === 'pending') setRequests(prev => [s, ...prev]);
            else if (s.status === 'confirmed' && s.scheduled_at >= now2) setUpcoming(prev => [...prev, s].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
          }
          if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(r => r.id !== id));
            setUpcoming(prev => prev.filter(r => r.id !== id));
          }
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleAccept = async (id) => {
    setActionError('');
    const captureResult = await supabase.functions.invoke('capture-payment', { body: { sessionId: id } });
    const captureOk = !captureResult.error || captureResult.data?.skipped || captureResult.data?.alreadyCaptured;
    if (!captureOk) { setActionError('Payment could not be processed. Please try again.'); return; }

    const { error } = await supabase.from('sessions').update({ status: 'confirmed', reschedule_status: null, original_scheduled_at: null }).eq('id', id);
    if (error) { setActionError(error.message); return; }

    const accepted = requests.find(s => s.id === id);
    setRequests(r => r.filter(s => s.id !== id));
    if (accepted) setUpcoming(u => [...u, { ...accepted, status: 'confirmed' }]);
    supabase.functions.invoke('send-session-confirmed', { body: { sessionId: id } }).catch(() => {});
  };

  const handleDecline = async (id) => {
    setActionError('');
    const sess = requests.find(s => s.id === id);
    const isReschedule = sess?.reschedule_status === 'pending_reschedule';
    // Release Stripe hold only for fresh booking declines (not reschedule declines)
    if (!isReschedule && sess?.payment_intent_id) {
      supabase.functions.invoke('cancel-payment-intent', { body: { paymentIntentId: sess.payment_intent_id } }).catch(() => {});
    }
    const updates = isReschedule
      ? { reschedule_status: 'reschedule_declined', status: 'pending' }
      : { status: 'cancelled' };
    const { error } = await supabase.from('sessions').update(updates).eq('id', id);
    if (error) { setActionError(error.message); return; }
    setRequests(r => r.filter(s => s.id !== id));
    // Notify student
    supabase.functions.invoke('notify-student-declined', {
      body: { sessionId: id, isRescheduleDeclne: isReschedule },
    }).catch(() => {});
  };

  const upcomingEarnings = upcoming.reduce((sum, s) => sum + (Number(s.earnings) || 0), 0);

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Tutor mode</div>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 30, fontWeight: 400, margin: '4px 0 0', letterSpacing: -0.5 }}>Hi, {firstName}</h1>
        </div>

        <div style={{ margin: '20px 16px 0', background: 'var(--ink)', color: 'var(--surface)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, fontWeight: 600 }}>Upcoming earnings</div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 44, color: 'oklch(0.85 0.16 75)', lineHeight: 1, marginTop: 4 }}>
            ${upcomingEarnings}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>{upcoming.length} confirmed session{upcoming.length !== 1 ? 's' : ''}</div>
          <button onClick={() => navigate('/payouts')} style={{ marginTop: 14, width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            View earnings
          </button>
        </div>

        {actionError && (
          <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: 'oklch(0.97 0.04 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 10, fontSize: 13, color: 'oklch(0.42 0.18 25)' }}>
            {actionError}
          </div>
        )}

        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>
            New requests · <span style={{ color: 'var(--accent)' }}>{requests.length}</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '20px 0' }}>Loading…</div>
          ) : requests.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              No pending requests.
            </div>
          ) : requests.map(r => (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <Avatar initials={initials(r.student_name)} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{r.student_name || 'Student'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{fmtDate(r.scheduled_at)} · {r.duration_min} min</div>
                </div>
                <CourseTag code={r.class_code} size={9} />
              </div>
              {r.note && <p style={{ fontSize: 12, color: 'var(--ink-2)', fontStyle: 'italic', margin: '0 0 10px' }}>"{r.note}"</p>}
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn fullWidth size="sm" variant="ghost" onClick={() => handleDecline(r.id)}>Decline</Btn>
                <Btn fullWidth size="sm" onClick={() => handleAccept(r.id)}>Accept · ${r.earnings}</Btn>
              </div>
            </div>
          ))}
        </div>

        {upcoming.length > 0 && (
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>Upcoming</div>
            {upcoming.map(s => (
              <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar initials={initials(s.student_name)} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.student_name || 'Student'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{fmtDate(s.scheduled_at)} · {s.duration_min} min</div>
                  </div>
                  <CourseTag code={s.class_code} size={9} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '24px 20px 24px' }}>
          <button onClick={() => navigate('/tutor-dashboard/schedule')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Manage availability</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>Set your open hours</div>
            </div>
            <Icon name="chevRight" size={14} />
          </button>
        </div>
      </div>

      <div style={{ height: 76, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', padding: '8px 0 0', background: 'var(--bg)', flexShrink: 0 }}>
        {[
          { i: 'home', l: 'Home', path: '/tutor-dashboard', a: true },
          { i: 'cal', l: 'Schedule', path: '/tutor-dashboard/schedule' },
          { i: 'chat', l: 'Messages', path: '/tutor-messages' },
        ].map(t => (
          <button key={t.l} onClick={() => navigate(t.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 72, border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0' }}>
            <Icon name={t.i} size={20} style={{ color: t.a ? 'var(--ink)' : 'var(--ink-3)' }} />
            <div style={{ fontSize: 10, color: t.a ? 'var(--ink)' : 'var(--ink-3)', fontWeight: t.a ? 600 : 400 }}>{t.l}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
