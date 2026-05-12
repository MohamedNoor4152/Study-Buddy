import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo, Btn, Avatar, CourseTag, Icon } from '../../components/primitives/index.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { SBUserMenu, SBFooter } from '../basics/BasicScreens.jsx';
import { supabase } from '../../supabase.js';

const DEFAULT_TIMES = ['9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'];

const getNextDays = () => {
  const days = [];
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    days.push({ label: `${names[d.getDay()]} ${d.getDate()}`, dayName: names[d.getDay()], dateStr: d.toISOString().split('T')[0] });
  }
  return days;
};

const hourTo24 = (label) => {
  const [time, period] = label.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

// ── Cancellation policy helpers ─────────────────────────────────────
// Pending → free. Confirmed >12h → 100% credit. Confirmed ≤12h → 50% credit.
const hoursUntil      = (isoDate) => (new Date(isoDate) - new Date()) / 36e5;
const canCancelFree   = (s) => s.status === 'pending';
const canCancelFull   = (s) => s.status === 'confirmed' && hoursUntil(s.scheduled_at) > 12;
const canCancelHalf   = (s) => s.status === 'confirmed' && hoursUntil(s.scheduled_at) <= 12;
const creditForCancel = (s) => {
  if (canCancelFree(s)) return 0;
  const fee = Number(s.earnings) || 0;
  if (canCancelFull(s)) return fee;
  if (canCancelHalf(s)) return Math.round(fee * 0.5);
  return 0;
};

const DashboardDesktop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(' ')[0] || 'there';

  const [tab, setTab] = useState('sessions');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [creditBalance, setCreditBalance] = useState(0);
  const [declined, setDeclined] = useState([]); // reschedule_declined sessions needing student action

  // cancel state
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // reschedule state
  const [reschedulingId, setReschedulingId] = useState(null);
  const [reschedDays] = useState(getNextDays());
  const [reschedDay, setReschedDay] = useState(0);
  const [reschedTime, setReschedTime] = useState(null);
  const [reschedAvail, setReschedAvail] = useState({});
  const [rescheduling, setRescheduling] = useState(false);
  const [pastReviewedSessionIds, setPastReviewedSessionIds] = useState([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    let cancelled = false;
    (async () => {
      const [upResp, paResp, svResp, crResp, dcResp] = await Promise.all([
        supabase.from('sessions').select('*').eq('student_id', user.id).in('status', ['confirmed', 'pending']).gte('scheduled_at', now).order('scheduled_at'),
        supabase.from('sessions').select('*').eq('student_id', user.id).eq('status', 'completed').order('scheduled_at', { ascending: false }),
        supabase.from('saved_tutors').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('sessions').select('*').eq('student_id', user.id).eq('reschedule_status', 'reschedule_declined'),
      ]);
      if (cancelled) return;
      const firstErr = [upResp, paResp, svResp, dcResp].find(r => r.error)?.error;
      if (firstErr) setLoadError(firstErr.message || 'Could not load your sessions.');
      const pa = paResp.data || [];
      let reviewed = [];
      if (pa.length > 0) {
        const ids = pa.map((p) => p.id).filter(Boolean);
        if (ids.length > 0) {
          const { data: rr } = await supabase.from('session_reviews').select('session_id').in('session_id', ids);
          reviewed = (rr || []).map((r) => r.session_id);
        }
      }
      setUpcoming(upResp.data || []);
      setPast(pa);
      setPastReviewedSessionIds(reviewed);
      setSaved(svResp.data || []);
      setCreditBalance(crResp.data?.balance || 0);
      setDeclined(dcResp.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);
  // load availability when reschedule opens
  useEffect(() => {
    if (!reschedulingId) return;
    const sess = upcoming.find(s => s.id === reschedulingId);
    if (!sess?.tutor_id) return;
    const isUuid = /^[0-9a-f-]{36}$/.test(sess.tutor_id);
    if (!isUuid) return;
    supabase.from('tutor_availability').select('*').eq('tutor_id', sess.tutor_id).then(({ data }) => {
      if (!data?.length) return;
      const map = {};
      data.forEach(r => { if (!map[r.day]) map[r.day] = []; map[r.day].push(r.hour); });
      setReschedAvail(map);
    });
  }, [reschedulingId]);

  const handleMessageTutor = async (session) => {
    if (!user) return;
    const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', user.id)
      .eq('tutor_demo_id', session.tutor_id)
      .maybeSingle();
    if (existing) {
      navigate('/messages', { state: { convId: existing.id } });
      return;
    }
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ student_id: user.id, tutor_demo_id: session.tutor_id, student_name: studentName, tutor_name: session.tutor_name })
      .select('id')
      .single();
    navigate('/messages', { state: { convId: conv?.id ?? null } });
  };

  const openReschedule = (id) => {
    setReschedulingId(id);
    setReschedDay(0);
    setReschedTime(null);
    setReschedAvail({});
  };

  const handleReschedule = async () => {
    if (!reschedTime || !reschedulingId) return;
    setRescheduling(true);
    const sess = upcoming.find(s => s.id === reschedulingId);
    const newAt = new Date(`${reschedDays[reschedDay].dateStr}T${hourTo24(reschedTime)}`).toISOString();
    const isLastMinute = sess && hoursUntil(sess.scheduled_at) <= 12;
    const updates = isLastMinute
      ? { scheduled_at: newAt, status: 'pending', reschedule_status: 'pending_reschedule', original_scheduled_at: sess.scheduled_at }
      : { scheduled_at: newAt, reschedule_status: null, original_scheduled_at: null };
    const { error } = await supabase.from('sessions').update(updates).eq('id', reschedulingId);
    if (!error) setUpcoming(u => u.map(s => s.id === reschedulingId ? { ...s, ...updates } : s));
    setRescheduling(false);
    setReschedulingId(null);
  };

  const handleCancel = async (sess) => {
    setCancellingId(sess.id);
    // Issue Stripe refund via edge function (handles authorize-only cancel too)
    const { error: refundErr } = await supabase.functions.invoke('refund-payment', { body: { sessionId: sess.id } });
    if (refundErr) console.warn('refund-payment:', refundErr.message);

    const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sess.id);
    if (!error) {
      setUpcoming(u => u.filter(s => s.id !== sess.id));
    }
    setCancellingId(null);
    setConfirmCancelId(null);
  };

  // Student actions after tutor declines a reschedule
  const handleRestoreOriginal = async (sess) => {
    const { error } = await supabase.from('sessions').update({
      scheduled_at: sess.original_scheduled_at,
      status: 'confirmed',
      reschedule_status: null,
      original_scheduled_at: null,
    }).eq('id', sess.id);
    if (!error) {
      setDeclined(d => d.filter(s => s.id !== sess.id));
      setUpcoming(u => [...u, { ...sess, scheduled_at: sess.original_scheduled_at, status: 'confirmed', reschedule_status: null }]);
    }
  };

  const handleCancelAfterDecline = async (sess) => {
    setCancellingId(sess.id);
    // 50% refund — tutor declined reschedule
    const { error: refundErr } = await supabase.functions.invoke('refund-payment', { body: { sessionId: sess.id } });
    if (refundErr) console.warn('refund-payment:', refundErr.message);

    const { error } = await supabase.from('sessions').update({ status: 'cancelled', reschedule_status: null }).eq('id', sess.id);
    if (!error) {
      setDeclined(d => d.filter(s => s.id !== sess.id));
    }
    setCancellingId(null);
  };

  const reschedTimesForDay = () => {
    const dayName = reschedDays[reschedDay]?.dayName;
    return reschedAvail[dayName]?.length > 0 ? reschedAvail[dayName] : DEFAULT_TIMES;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ flex: 1 }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
              <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/messages')}>Messages</span>
              <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/browse')}>Browse</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500, borderBottom: '2px solid var(--ink)', paddingBottom: 2 }}>Sessions</span>
              <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/settings')}>Settings</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user?.user_metadata?.role === 'tutor' && (
              <Btn variant="ghost" size="sm" onClick={() => navigate('/tutor-dashboard')}>Switch to tutor</Btn>
            )}
            <SBUserMenu />
          </div>
        </nav>

        <section style={{ padding: '40px 56px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Welcome back, {firstName}</div>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: '0 0 24px', letterSpacing: -0.8 }}>
            {tab === 'sessions' ? 'Your sessions' : 'Saved tutors'}
          </h1>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
            {[['sessions','Sessions'],['saved','Saved tutors']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: '10px 18px', fontSize: 13, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? 'var(--ink)' : 'var(--ink-3)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === key ? 'var(--ink)' : 'transparent'}`,
                marginBottom: -1, transition: 'all .12s',
              }}>{label}{key === 'saved' && saved.length > 0 ? ` (${saved.length})` : ''}</button>
            ))}
          </div>
        </section>

        {tab === 'sessions' && <>
          {loadError && (
            <section style={{ padding: '0 56px 16px' }}>
              <div style={{ background: 'oklch(0.97 0.04 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'oklch(0.42 0.18 25)' }}>
                Could not load your sessions — {loadError}. Check your connection or try refreshing.
              </div>
            </section>
          )}
          {/* Stats */}
          <section style={{ padding: '24px 56px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { n: String(upcoming.length), l: 'Upcoming sessions' },
              { n: String(upcoming.length + past.length), l: 'Total sessions' },
              { n: '$' + past.reduce((sum, s) => sum + (s.earnings || 0), 0), l: 'Spent total' },
              { n: `$${Number(creditBalance).toFixed(2)}`, l: 'Lesson credits', accent: true },
            ].map((s, i) => (
              <div key={i} style={{ background: s.accent ? 'oklch(0.97 0.04 65)' : 'var(--surface)', border: `1px solid ${s.accent ? 'oklch(0.88 0.08 65)' : 'var(--border)'}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, color: s.accent ? 'oklch(0.55 0.16 60)' : 'var(--ink)', lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: s.accent ? 'oklch(0.55 0.16 60)' : 'var(--ink-3)', marginTop: 6 }}>{s.l}</div>
              </div>
            ))}
          </section>

          {/* Declined reschedule — action needed */}
          {declined.length > 0 && (
            <section style={{ padding: '0 56px 24px' }}>
              <div style={{ fontSize: 11, color: 'oklch(0.55 0.18 25)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Action needed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {declined.map(s => (
                  <div key={s.id} style={{ background: 'oklch(0.98 0.02 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.45 0.18 25)', marginBottom: 3 }}>
                        {s.tutor_name} declined your reschedule request
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        Requested: {new Date(s.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {s.original_scheduled_at && (
                          <> · Original: {new Date(s.original_scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn size="sm" onClick={() => handleRestoreOriginal(s)}>
                        Keep original time
                      </Btn>
                      <Btn variant="ghost" size="sm" style={{ color: 'oklch(0.55 0.18 25)' }}
                        onClick={() => handleCancelAfterDecline(s)}
                        disabled={cancellingId === s.id}>
                        {cancellingId === s.id ? 'Cancelling…' : `Cancel for $${Math.round((s.earnings||0)*0.5)} credit`}
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          <section style={{ padding: '0 56px 40px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Upcoming</div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, opacity: 0.5 }}>
                {[1,2].map(i => <div key={i} style={{ height: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                No upcoming sessions. <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/browse')}>Browse tutors →</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {upcoming.map((u) => {
                  const freeCancel = canCancelFree(u);
                  const fullCredit = canCancelFull(u);
                  const halfCredit = canCancelHalf(u);
                  const refundAmt  = creditForCancel(u);
                  const isRescheduling = reschedulingId === u.id;
                  const times = reschedTimesForDay();

                  return (
                    <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <CourseTag code={u.class_code} />
                        {u.status === 'pending'
                          ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'oklch(0.65 0.15 60)', fontWeight: 500 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'oklch(0.65 0.15 60)' }} />Pending
                            </div>
                          : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--positive)', fontWeight: 500 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--positive)' }} />Confirmed
                            </div>
                        }
                      </div>

                      {/* Tutor row */}
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                        <Avatar initials={(u.tutor_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)} size={44} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 500 }}>{u.tutor_name || 'Tutor'}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{u.duration_min} min · ${u.earnings || 0}</div>
                        </div>
                      </div>

                      {/* Date/location */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, color: 'var(--ink-2)', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <div><div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2 }}>WHEN</div>{new Date(u.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        <div><div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2 }}>WHERE</div>{u.location}</div>
                      </div>

                      {/* Reschedule inline picker */}
                      {isRescheduling && (
                        <div style={{ marginTop: 14, padding: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>Pick a new date & time</div>
                          {hoursUntil(u.scheduled_at) <= 12 && (
                            <div style={{ fontSize: 11, color: 'oklch(0.55 0.16 60)', background: 'oklch(0.97 0.04 65)', border: '1px solid oklch(0.88 0.08 65)', borderRadius: 7, padding: '6px 10px', marginBottom: 10 }}>
                              Less than 12 hrs away — your reschedule will go back to <strong>pending</strong> and the tutor must re-accept the new time.
                            </div>
                          )}
                          {/* Day chips */}
                          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10 }}>
                            {reschedDays.map((d, i) => (
                              <div key={i} onClick={() => { setReschedDay(i); setReschedTime(null); }} style={{
                                padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap',
                                background: reschedDay === i ? 'var(--ink)' : 'var(--surface)',
                                color: reschedDay === i ? 'var(--surface)' : 'var(--ink-2)',
                                border: `1px solid ${reschedDay === i ? 'var(--ink)' : 'var(--border)'}`,
                              }}>{d.label}</div>
                            ))}
                          </div>
                          {/* Time chips */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {times.map(t => (
                              <div key={t} onClick={() => setReschedTime(t)} style={{
                                padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
                                background: reschedTime === t ? 'var(--accent)' : 'var(--surface)',
                                color: reschedTime === t ? '#fff' : 'var(--ink-2)',
                                border: `1px solid ${reschedTime === t ? 'var(--accent)' : 'var(--border)'}`,
                              }}>{t}</div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Btn size="sm" style={{ opacity: reschedTime ? 1 : 0.4 }} onClick={handleReschedule} disabled={!reschedTime || rescheduling}>
                              {rescheduling ? 'Saving…' : hoursUntil(u.scheduled_at) <= 12 ? 'Send for re-approval' : 'Confirm reschedule'}
                            </Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setReschedulingId(null)}>Cancel</Btn>
                          </div>
                        </div>
                      )}

                      {/* Action row */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Btn variant="ghost" size="sm" icon="chat" onClick={() => handleMessageTutor(u)}>Message</Btn>

                        {confirmCancelId === u.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                              {freeCancel
                                ? 'Cancel this request for free?'
                                : halfCredit
                                  ? `Cancel for $${refundAmt} credit (50%)? — $${refundAmt} goes to ${u.tutor_name?.split(' ')[0] || 'tutor'}`
                                  : `Cancel for $${refundAmt} credit (full refund)?`}
                            </span>
                            <Btn size="sm" style={{ background: 'oklch(0.55 0.18 25)', color: '#fff', border: 'none' }}
                              onClick={() => handleCancel(u)} disabled={cancellingId === u.id}>
                              {cancellingId === u.id ? 'Cancelling…' : 'Yes, cancel'}
                            </Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setConfirmCancelId(null)}>Keep</Btn>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                            {!isRescheduling && !freeCancel && (
                              <Btn variant="ghost" size="sm" onClick={() => openReschedule(u.id)}>Reschedule</Btn>
                            )}
                            <Btn variant="ghost" size="sm" style={{ color: 'oklch(0.55 0.18 25)' }}
                              onClick={() => setConfirmCancelId(u.id)}>Cancel</Btn>
                          </div>
                        )}
                      </div>

                      {/* Policy hint */}
                      {!isRescheduling && confirmCancelId !== u.id && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
                          {freeCancel
                            ? "Tutor hasn't accepted yet — you can cancel at no cost."
                            : fullCredit
                              ? `Cancel more than 12 hrs before to receive $${u.earnings || 0} in full lesson credits.`
                              : `Less than 12 hrs away — cancellation returns 50% ($${refundAmt}) as lesson credits.`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Past sessions */}
          <section style={{ padding: '0 56px 64px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Past sessions</div>
            {loading ? null : past.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                No past sessions yet.
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {past.map((p, i) => (
                  <div key={p.id ?? i} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr minmax(200px, 1fr)', gap: 16, alignItems: 'center', padding: '16px 20px', borderBottom: i < past.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Avatar initials={(p.tutor_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)} size={34} />
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.tutor_name || 'Tutor'}</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{new Date(p.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                    <CourseTag code={p.class_code} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {p.id && !pastReviewedSessionIds.includes(p.id) ? (
                        <Btn variant="ghost" size="sm" onClick={() => navigate('/review', {
                          state: {
                            sessionId: p.id,
                            tutorName: p.tutor_name,
                            classCode: p.class_code,
                            scheduled_at: p.scheduled_at,
                            duration_min: p.duration_min,
                            location: p.location,
                          },
                        })}>
                          Rate session
                        </Btn>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', padding: '6px 0' }}>Rated</span>
                      )}
                      <Btn variant="ghost" size="sm" onClick={() => {
                        const demoId = p.tutor_id || p.tutor_demo_id;
                        if (demoId) navigate(`/tutor/${demoId}`);
                        else navigate('/browse');
                      }}>Book again</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>}

        {tab === 'saved' && (
          <section style={{ padding: '24px 56px 64px' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, opacity: 0.5 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 130, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} />)}
              </div>
            ) : saved.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>♡</div>
                No saved tutors yet.
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  Hit <strong>Save</strong> on a tutor's profile to bookmark them here.{' '}
                  <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/browse')}>Browse now →</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {saved.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                      <Avatar initials={t.tutor_initials} color={t.tutor_color || 'oklch(0.72 0.1 100)'} size={48} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{t.tutor_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.tutor_class} · ${t.tutor_rate}/hr</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => navigate(`/tutor/${t.tutor_demo_id}`)}>View profile</Btn>
                      <Btn size="sm" style={{ flex: 1 }} onClick={() => navigate('/book', { state: { tutorId: t.tutor_id || t.tutor_demo_id, tutorName: t.tutor_name, tutorInitials: t.tutor_initials || t.tutor_name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2), tutorColor: t.tutor_color || 'oklch(0.72 0.1 100)', classCode: t.tutor_class || '', rate: t.tutor_rate } })}>Book</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      <SBFooter slim />
    </div>
  );
};

export default DashboardDesktop;
