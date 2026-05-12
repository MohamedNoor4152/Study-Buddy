import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FONTS } from '../../tokens.js';
import { Icon, Logo, Btn, Avatar, Chip, CourseTag } from '../../components/primitives/index.jsx';
import { TUTORS } from '../../data.js';
import { resolveTutorIdForSession } from '../../demoTutor.js';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';

// Stripe is loaded once; falls back gracefully if key not yet configured
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── Payment step — rendered inside <Elements> after PaymentIntent is created ──
const cardElementStyle = {
  style: {
    base: {
      fontSize: '15px',
      fontFamily: 'system-ui, sans-serif',
      color: '#1a1a1a',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
};

const PaymentStep = ({ clientSecret, sessionPayload, onSuccess, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError('');

    const cardElement = elements.getElement(CardElement);

    // Confirm the card authorization — card is held but NOT captured until tutor accepts.
    const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (confirmErr) {
      setPaying(false);
      setPayError(confirmErr.message);
      return;
    }

    // Card authorized — insert the session into the DB
    const { error: dbErr } = await supabase.from('sessions').insert({
      ...sessionPayload,
      payment_intent_id: paymentIntent?.id ?? null,
    });

    if (dbErr) {
      // Release the Stripe hold so the student isn't left with a dangling authorization
      if (paymentIntent?.id) {
        supabase.functions.invoke('cancel-payment-intent', {
          body: { paymentIntentId: paymentIntent.id },
        }).catch(e => console.warn('cancel-payment-intent (orphan cleanup):', e));
      }
      setPaying(false);
      setPayError('Could not save your booking. Your card has not been charged — please try again.');
      return;
    }

    // Notify the tutor by email (fire and forget — don't block on it)
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
    }).catch(e => console.warn('notify-tutor-booking:', e));

    setPaying(false);
    onSuccess({ paymentIntentId: paymentIntent?.id });
  };

  return (
    <form onSubmit={handlePay}>
      <div style={{
        marginBottom: 20,
        border: '1px solid #d1d5db',
        borderRadius: 8,
        padding: '12px 14px',
        background: '#fff',
      }}>
        <CardElement options={cardElementStyle} />
      </div>
      {payError && (
        <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          {payError}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn type="button" variant="ghost" size="lg" onClick={onBack} style={{ flex: '0 0 auto' }}>
          Back
        </Btn>
        <Btn type="submit" fullWidth size="lg" style={{ opacity: stripe ? 1 : 0.4 }}>
          {paying ? 'Authorizing…' : 'Confirm & request session'}
        </Btn>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
        Your card is held but <strong>not charged</strong> until the tutor accepts.
      </div>
    </form>
  );
};

// ── Main booking page ────────────────────────────────────────────────────────
const BookingDesktop = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const passed = location.state || {};
  // Use catalog entry only for rate/name fallbacks — display initials/color come from nav state
  const catalogTutor = TUTORS.find(t => t.id === passed.tutorId) ?? null;
  const tutorName = passed.tutorName || catalogTutor?.name || 'Your tutor';
  const tutorInitials = passed.tutorInitials || catalogTutor?.initials || tutorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const tutorColor = passed.tutorColor || catalogTutor?.color || undefined;
  const classCode = passed.classCode || '';
  const rate = passed.rate || catalogTutor?.rate || 38;

  const today = new Date().toISOString().split('T')[0];
  const [duration, setDuration] = useState(60);
  const [locationChoice, setLocationChoice] = useState('Library');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(passed.date || today);
  const [time, setTime] = useState(passed.time || '14:00');
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredits, setUseCredits] = useState(false);

  // Payment step state
  const [step, setStep] = useState('details'); // 'details' | 'payment'
  const [clientSecret, setClientSecret] = useState('');
  const [pendingPayload, setPendingPayload] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setCreditBalance(data?.balance || 0));
  }, [user]);

  const fee = Math.round(rate * duration / 60);
  const svc = Math.round(fee * 0.08);
  const gross = fee + svc;
  const creditsApplied = useCredits ? Math.min(Number(creditBalance), gross) : 0;
  const total = Math.max(0, gross - creditsApplied);
  const totalCents = Math.round(total * 100);

  const handleRequestSession = async () => {
    setCreatingIntent(true);
    setIntentError('');
    try {
      await _doRequestSession();
    } catch (e) {
      console.error('handleRequestSession:', e);
      setIntentError('Something went wrong. Please try again.');
    } finally {
      setCreatingIntent(false);
    }
  };

  const _doRequestSession = async () => {

    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
    const tutorIdForDb = await resolveTutorIdForSession(passed.tutorId, tutorName, classCode);

    if (!tutorIdForDb) {
      setIntentError('This tutor isn\'t available for booking right now. Try another tutor or contact support.');
      return;
    }

    // Build the session payload (inserted after payment authorization)
    const payload = {
      student_id: user.id,
      tutor_id: tutorIdForDb,
      student_name: studentName,
      tutor_name: tutorName,
      class_code: classCode,
      scheduled_at: scheduledAt,
      duration_min: duration,
      location: locationChoice,
      status: 'pending',
      note,
      earnings: fee,
    };

    // If Stripe is not yet configured, fall back to the old no-payment flow
    if (!stripePromise || totalCents < 50) {
      const { error } = await supabase.from('sessions').insert(payload);
      if (error) { setIntentError('Could not save booking. Try again.'); return; }

      if (creditsApplied > 0) {
        const newBalance = Number(creditBalance) - creditsApplied;
        await supabase.from('user_credits').upsert({ user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() });
        await supabase.from('credit_transactions').insert({ user_id: user.id, amount: creditsApplied, type: 'spent', note: `Credits applied to booking with ${tutorName}` });
      }

      supabase.functions.invoke('notify-tutor-booking', {
        body: { tutorId: payload.tutor_id, tutorName: payload.tutor_name, studentName: payload.student_name, classCode: payload.class_code, scheduledAt: payload.scheduled_at, durationMin: payload.duration_min, location: payload.location, note: payload.note, earnings: payload.earnings },
      }).catch(e => console.warn('notify-tutor-booking:', e));

      navigate('/payment-confirm', { state: { tutorName, classCode, scheduledAt, duration, locationChoice, fee, creditsApplied, total } });
      return;
    }

    // Create a PaymentIntent via edge function
    const res = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amountCents: totalCents,
        tutorId: tutorIdForDb,
        description: `Study Buddy: ${classCode} with ${tutorName}`,
      },
    });

    if (res.error || !res.data?.clientSecret) {
      setIntentError('Could not initialize payment. Please try again.');
      return;
    }

    setPendingPayload(payload);
    setClientSecret(res.data.clientSecret);
    setStep('payment');
  };

  const handlePaymentSuccess = async ({ paymentIntentId }) => {
    // Deduct lesson credits if applied
    if (creditsApplied > 0) {
      const newBalance = Number(creditBalance) - creditsApplied;
      await supabase.from('user_credits').upsert({ user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() });
      await supabase.from('credit_transactions').insert({ user_id: user.id, amount: creditsApplied, type: 'spent', note: `Credits applied to booking with ${tutorName}` });
    }
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    navigate('/payment-confirm', { state: { tutorName, classCode, scheduledAt, duration, locationChoice, fee, creditsApplied, total, paymentIntentId } });
  };

  // Guard: if essential booking state is missing (direct URL visit, lost nav state)
  if (!tutorName || tutorName === 'Your tutor' || !classCode) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)', gap: 20 }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div onClick={() => navigate('/browse')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
            <Icon name="chevLeft" size={12} /> Browse tutors
          </div>
        </nav>
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, marginBottom: 12 }}>Missing booking info</div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 32 }}>
            This page needs to be opened from a tutor's profile. Please browse and select a tutor to book a session.
          </p>
          <Btn size="lg" onClick={() => navigate('/browse')}>Browse tutors</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)', gap: 20 }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        {step === 'payment' ? (
          <button onClick={() => setStep('details')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20, background: 'none', border: 'none', padding: 0 }}>
            <Icon name="chevLeft" size={12} /> Back to details
          </button>
        ) : (
          <div onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
            <Icon name="chevLeft" size={12} /> Back to profile
          </div>
        )}
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 40px 56px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
          {step === 'details' ? 'Confirm booking details' : 'Add payment method'}
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: '0 0 32px', letterSpacing: -0.8 }}>
          {step === 'details' ? 'Confirm your session' : 'Authorize payment'}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
          {/* Left column */}
          <div>
            {/* Tutor card — always visible */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
              <Avatar initials={tutorInitials} color={tutorColor} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{tutorName}</div>
                  <Icon name="verified" size={13} stroke={0} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>Tutor for {classCode}</div>
              </div>
              <CourseTag code={classCode} />
            </div>

            {step === 'details' ? (
              <>
                {/* When */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontFamily: FONTS.serif, fontSize: 20, fontWeight: 400, margin: '0 0 14px' }}>When</h3>

                  {/* Selected slot summary */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 14px', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Selected slot</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                        {(() => {
                          try {
                            const d = new Date(`${date}T${time}`);
                            return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                          } catch { return `${date} at ${time}`; }
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(-1)}
                      style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Date</div>
                      <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} style={{
                        width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px',
                        fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
                      }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Time</div>
                      <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
                        width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px',
                        fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
                      }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Duration</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[30, 60, 90, 120].map(d => (
                        <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>{d} min</Chip>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Where */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontFamily: FONTS.serif, fontSize: 20, fontWeight: 400, margin: '0 0 4px' }}>Where</h3>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Pick a meeting location</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { k: 'Library', s: 'Love Library, SDSU' },
                      { k: 'Video', s: 'Study Buddy call' },
                      { k: 'Coffee shop', s: 'Student choice' },
                    ].map(o => (
                      <div key={o.k} onClick={() => setLocationChoice(o.k)} style={{
                        padding: 14, borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${locationChoice === o.k ? 'var(--ink)' : 'var(--border)'}`,
                        background: locationChoice === o.k ? 'var(--surface-2)' : 'var(--surface)',
                      }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{o.k}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{o.s}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ fontFamily: FONTS.serif, fontSize: 20, fontWeight: 400, margin: '0 0 4px' }}>What do you want to work on?</h3>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>{tutorName.split(' ')[0]} will prep with this in mind.</div>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="e.g. Chapter 8 problem set, exam prep…" style={{
                    width: '100%', border: '1px solid var(--border)', borderRadius: 8,
                    padding: 12, fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)',
                    background: 'var(--bg)', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }} />
                </div>
              </>
            ) : (
              /* Payment step — Stripe Elements */
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontFamily: FONTS.serif, fontSize: 20, fontWeight: 400, margin: '0 0 4px' }}>Payment details</h3>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>
                  Your card is <strong>authorized but not charged</strong> until {tutorName.split(' ')[0]} accepts.
                </div>
                {clientSecret && stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <PaymentStep
                      clientSecret={clientSecret}
                      sessionPayload={pendingPayload}
                      onSuccess={handlePaymentSuccess}
                      onBack={() => setStep('details')}
                    />
                  </Elements>
                ) : (
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading payment form…</div>
                )}
              </div>
            )}
          </div>

          {/* Right column — receipt (sticky) */}
          <div>
            <div style={{ position: 'sticky', top: 90, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 14 }}>Receipt</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0', color: 'var(--ink-2)' }}>
                <span>Session · {duration} min</span>
                <span style={{ fontFamily: FONTS.mono, color: 'var(--ink)' }}>${fee}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0', color: 'var(--ink-2)' }}>
                <span>Service fee</span>
                <span style={{ fontFamily: FONTS.mono, color: 'var(--ink)' }}>${svc}.00</span>
              </div>

              {creditBalance > 0 && step === 'details' && (
                <div style={{ margin: '10px 0', padding: '10px 12px', background: 'oklch(0.97 0.04 65)', border: '1px solid oklch(0.88 0.08 65)', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={useCredits} onChange={e => setUseCredits(e.target.checked)} style={{ accentColor: 'oklch(0.55 0.16 60)', width: 15, height: 15 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.45 0.14 60)' }}>Apply ${Number(creditBalance).toFixed(2)} lesson credits</div>
                      {creditsApplied > 0 && <div style={{ fontSize: 11, color: 'oklch(0.55 0.16 60)' }}>−${creditsApplied.toFixed(2)} off your total</div>}
                    </div>
                  </label>
                </div>
              )}
              {creditsApplied > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', color: 'oklch(0.5 0.15 60)' }}>
                  <span>Lesson credits</span>
                  <span style={{ fontFamily: FONTS.mono }}>−${creditsApplied.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, padding: '14px 0', borderTop: '1px solid var(--border)', marginTop: 6, fontWeight: 600 }}>
                <span>Total</span>
                <span style={{ fontFamily: FONTS.mono, color: 'var(--accent)', fontSize: 20 }}>${total.toFixed(2)}</span>
              </div>

              {step === 'details' && (
                <>
                  {intentError && (
                    <div style={{ color: 'oklch(0.55 0.18 25)', fontSize: 12, marginBottom: 10, padding: '8px 10px', background: 'oklch(0.97 0.02 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 8 }}>
                      {intentError}
                    </div>
                  )}
                  <Btn fullWidth size="lg" style={{ marginTop: 8 }} onClick={handleRequestSession} disabled={creatingIntent}>
                    {creatingIntent ? 'Preparing…' : 'Request session'}
                  </Btn>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                    {tutorName.split(' ')[0]} has a median response time of 30 min. You won't be charged until they accept.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDesktop;
