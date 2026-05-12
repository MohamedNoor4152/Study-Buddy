import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo, Btn, Avatar, CourseTag, Icon, Chip } from '../../components/primitives/index.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { SBUserMenu, SBFooter } from '../basics/BasicScreens.jsx';
import { supabase } from '../../supabase.js';

// ─── Shared tutor nav bar — used by layout AND standalone tutor pages ─────────
export const TutorDashboardNav = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pathname } = useLocation();

  const navLink = (label, path) => {
    const active = pathname === path || pathname.startsWith(path + '/');
    // Dashboard should only be exact-active
    const isActive = path === '/tutor-dashboard' ? pathname === path : active;
    return (
      <span
        key={path}
        onClick={isActive ? undefined : () => navigate(path)}
        style={{
          color: isActive ? 'var(--ink)' : 'var(--ink-3)',
          fontWeight: isActive ? 500 : 400,
          cursor: isActive ? 'default' : 'pointer',
          fontSize: 13,
          ...(isActive ? { borderBottom: '2px solid var(--ink)', paddingBottom: 2 } : {}),
        }}
      >{label}</span>
    );
  };

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 56px', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <div style={{ display: 'flex', gap: 24 }}>
          {navLink('Dashboard', '/tutor-dashboard')}
          {navLink('Schedule', '/tutor-dashboard/schedule')}
          {navLink('Edit profile', '/tutor-dashboard/profile')}
          {navLink('Earnings', '/payouts')}
          {navLink('Messages', '/tutor-messages')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="ghost" size="sm" onClick={() => navigate(`/tutor/${user?.id || 't3'}`)}>My profile</Btn>
        <SBUserMenu />
      </div>
    </nav>
  );
};

// ─── Shared tutor dashboard layout (nested routes: dashboard / schedule / profile)
export const TutorDashboardLayout = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
    <TutorDashboardNav />
    <div style={{ flex: 1 }}>
      <Outlet />
    </div>
    <SBFooter slim />
  </div>
);

// Module-level cache — survives re-mounts, gives instant data on tab switch
const _dashCache = {};

export const TutorDashboardDesktop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(' ')[0] || 'there';
  const [requests, setRequests] = useState(() => _dashCache[uid]?.requests || []);
  const [upcoming, setUpcoming] = useState(() => _dashCache[uid]?.upcoming || []);
  /** Confirmed sessions whose time passed — tutors mark `completed` so students can review. */
  const [needsWrapUp, setNeedsWrapUp] = useState(() => _dashCache[uid]?.needsWrapUp || []);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [completingId, setCompletingId] = useState(null);

  // Stripe Connect payout onboarding state
  const [connectId, setConnectId] = useState(() => _dashCache[uid]?.connectId ?? null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(() => _dashCache[uid]?.payoutsEnabled ?? false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    setLoadError('');

    // Initial data load — results also populate module-level cache for instant re-renders
    supabase.from('sessions').select('*').eq('tutor_id', user.id).eq('status', 'pending').then(({ data, error }) => {
      const d = data || [];
      setRequests(d);
      _dashCache[uid] = { ..._dashCache[uid], requests: d };
      if (error?.message) setLoadError(prev => prev || error.message);
    });
    supabase.from('sessions').select('*').eq('tutor_id', user.id).eq('status', 'confirmed').gte('scheduled_at', now).order('scheduled_at').then(({ data, error }) => {
      const d = data || [];
      setUpcoming(d);
      _dashCache[uid] = { ..._dashCache[uid], upcoming: d };
      if (error?.message) setLoadError(prev => prev || error.message);
    });
    supabase.from('sessions').select('*').eq('tutor_id', user.id).eq('status', 'confirmed').lt('scheduled_at', now).order('scheduled_at', { ascending: false }).then(({ data, error }) => {
      const d = data || [];
      setNeedsWrapUp(d);
      _dashCache[uid] = { ..._dashCache[uid], needsWrapUp: d };
      if (error?.message) setLoadError(prev => prev || error.message);
    });
    supabase.from('tutor_profiles').select('stripe_connect_id, payouts_enabled').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setConnectId(data.stripe_connect_id || null);
        setPayoutsEnabled(data.payouts_enabled || false);
        _dashCache[uid] = { ..._dashCache[uid], connectId: data.stripe_connect_id || null, payoutsEnabled: data.payouts_enabled || false };
      }
    });

    // Real-time subscription — keeps requests/upcoming/wrapUp in sync without refresh
    const channel = supabase
      .channel(`tutor-sessions:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `tutor_id=eq.${user.id}`,
      }, (payload) => {
        const s = payload.new;
        const id = s?.id ?? payload.old?.id;
        const sessionNow = new Date().toISOString();

        if (payload.eventType === 'INSERT') {
          if (s.status === 'pending') {
            setRequests(prev => prev.find(r => r.id === id) ? prev : [s, ...prev]);
          }
          return;
        }

        if (payload.eventType === 'UPDATE') {
          // Remove from all buckets first, then place in the right one
          setRequests(prev => prev.filter(r => r.id !== id));
          setUpcoming(prev => prev.filter(r => r.id !== id));
          setNeedsWrapUp(prev => prev.filter(r => r.id !== id));

          if (s.status === 'pending') {
            setRequests(prev => [s, ...prev]);
          } else if (s.status === 'confirmed') {
            if (s.scheduled_at >= sessionNow) {
              setUpcoming(prev => [...prev, s].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
            } else {
              setNeedsWrapUp(prev => [s, ...prev]);
            }
          }
          return;
        }

        if (payload.eventType === 'DELETE') {
          setRequests(prev => prev.filter(r => r.id !== id));
          setUpcoming(prev => prev.filter(r => r.id !== id));
          setNeedsWrapUp(prev => prev.filter(r => r.id !== id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleMarkComplete = async (id) => {
    setActionError('');
    setCompletingId(id);
    const { error } = await supabase.from('sessions').update({ status: 'completed' }).eq('id', id);
    setCompletingId(null);
    if (error) {
      setActionError(error.message || String(error));
      return;
    }
    setUpcoming(u => u.filter(s => s.id !== id));
    setNeedsWrapUp(w => w.filter(s => s.id !== id));
  };

  const handleAccept = async (id) => {
    setActionError('');

    // Capture payment FIRST — only confirm the session if the charge succeeds.
    const captureResult = await supabase.functions.invoke('capture-payment', { body: { sessionId: id } });
    const cData = captureResult.data;
    const cErr  = captureResult.error;

    // Treat as success if: no error, OR explicitly skipped/alreadyCaptured, OR Stripe says PI already succeeded
    const captureOk = (cData?.ok || cData?.skipped || cData?.alreadyCaptured)
      || (!cErr && !cData?.error);

    if (!captureOk) {
      // Surface the real reason — helps with debugging
      const reason = cData?.error || cErr?.message || JSON.stringify(cErr) || 'Unknown error';
      console.error('[capture-payment] failed:', reason, captureResult);
      setActionError(`Payment could not be captured: ${reason}`);
      return;
    }

    const { error } = await supabase.from('sessions').update({ status: 'confirmed', reschedule_status: null, original_scheduled_at: null }).eq('id', id);
    if (error) {
      setActionError(error.message || String(error));
      return;
    }
    const accepted = requests.find(s => s.id === id);
    setRequests(r => r.filter(s => s.id !== id));
    if (accepted) setUpcoming(u => [...u, { ...accepted, status: 'confirmed', reschedule_status: null }]);

    // Send confirmation email — fire and forget
    supabase.functions.invoke('send-session-confirmed', { body: { sessionId: id } })
      .catch(e => console.warn('send-session-confirmed:', e));
  };

  const handleMessageStudent = async (session) => {
    if (!user || !session.student_id) {
      navigate('/tutor-messages');
      return;
    }
    // Find or create the conversation for this tutor↔student pair
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('tutor_demo_id', user.id)
      .eq('student_id', session.student_id)
      .maybeSingle();

    if (existing?.id) {
      navigate('/tutor-messages', { state: { convId: existing.id } });
      return;
    }

    // Create a new conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        tutor_demo_id: user.id,
        student_id: session.student_id,
        tutor_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tutor',
        student_name: session.student_name || 'Student',
      })
      .select('id')
      .single();

    if (convErr) {
      console.error('Could not create conversation:', convErr.message);
      setActionError(`Could not open messages: ${convErr.message}. Run the SQL fix in your Supabase dashboard.`);
      return;
    }

    navigate('/tutor-messages', { state: { convId: conv?.id ?? null } });
  };

  const handleSetupPayouts = async () => {
    setConnectLoading(true);
    setConnectError('');
    const origin = window.location.origin;
    const { data, error } = await supabase.functions.invoke('create-connect-account', {
      body: {
        returnUrl: `${origin}/tutor-dashboard?payout_setup=success`,
        refreshUrl: `${origin}/tutor-dashboard?payout_setup=refresh`,
      },
    });
    setConnectLoading(false);
    if (error || !data?.accountLinkUrl) {
      setConnectError('Could not start payout setup. Please try again.');
      return;
    }
    window.location.href = data.accountLinkUrl;
  };
  const handleDecline = async (id) => {
    setActionError('');
    const sess = requests.find(s => s.id === id);
    const isReschedule = sess?.reschedule_status === 'pending_reschedule';

    // Declining an original booking: cancel the Stripe hold before marking cancelled
    // so the student's card is released immediately.
    if (!isReschedule && sess?.payment_intent_id) {
      supabase.functions.invoke('cancel-payment-intent', {
        body: { paymentIntentId: sess.payment_intent_id },
      }).catch(e => console.warn('cancel-payment-intent on decline:', e));
    }

    const updates = isReschedule
      ? { reschedule_status: 'reschedule_declined', status: 'pending' }
      : { status: 'cancelled' };
    const { error } = await supabase.from('sessions').update(updates).eq('id', id);
    if (error) { setActionError(error.message || String(error)); return; }
    setRequests(r => r.filter(s => s.id !== id));
    // Notify the student (fire-and-forget)
    supabase.functions.invoke('notify-student-declined', {
      body: { sessionId: id, isRescheduleDeclne: isReschedule },
    }).catch(e => console.warn('notify-student-declined:', e));
  };

  const sectionLabel = (text, right = null) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{text}</div>
      {right && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{right}</span>}
    </div>
  );

  return (
    <div>

      <section style={{ padding: '40px 56px 0' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Welcome back, {firstName}</div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: '0 0 24px', letterSpacing: -0.8 }}>
          Tutor dashboard
        </h1>
      </section>

      <section style={{ padding: '0 56px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { n: '$' + upcoming.reduce((sum, s) => sum + (s.earnings || 0), 0), l: 'Upcoming earnings', accent: true },
          { n: String(upcoming.length + needsWrapUp.length + requests.length), l: 'Active sessions' },
          { n: String(upcoming.length + needsWrapUp.length), l: 'Confirmed sessions' },
          { n: String(requests.length), l: 'Pending requests' },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.accent ? 'oklch(0.97 0.04 65)' : 'var(--surface)',
            border: `1px solid ${s.accent ? 'oklch(0.88 0.08 65)' : 'var(--border)'}`,
            borderRadius: 10, padding: 18,
          }}>
            <div style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, color: s.accent ? 'oklch(0.55 0.16 60)' : 'var(--ink)', lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 12, color: s.accent ? 'oklch(0.55 0.16 60)' : 'var(--ink-3)', marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </section>

      {loadError && (
        <section style={{ padding: '0 56px 16px' }}>
          <div style={{ background: 'oklch(0.97 0.04 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'oklch(0.42 0.18 25)' }}>
            <strong>Could not load sessions:</strong> {loadError}.
          </div>
        </section>
      )}

      {actionError && (
        <section style={{ padding: '0 56px 16px' }}>
          <div style={{ background: 'oklch(0.97 0.04 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'oklch(0.42 0.18 25)' }}>
            <strong>Could not update:</strong> {actionError}
          </div>
        </section>
      )}

      <section style={{ padding: '0 56px 40px' }}>
        {sectionLabel(`Pending requests · ${requests.length}`, 'Respond within 30 min')}
        {requests.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            No pending requests right now.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar initials={(r.student_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)} size={40} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.student_name || 'Student'}</div>
                        {r.reschedule_status === 'pending_reschedule' && (
                          <span style={{ fontSize: 10, fontWeight: 600, background: 'oklch(0.92 0.08 65)', color: 'oklch(0.45 0.14 60)', borderRadius: 4, padding: '2px 6px' }}>RESCHEDULE</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        New time: {new Date(r.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {r.original_scheduled_at && (
                          <span style={{ color: 'var(--ink-3)' }}> · was {new Date(r.original_scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CourseTag code={r.class_code} />
                </div>
                {r.note && <p style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-2)', margin: '0 0 14px', fontStyle: 'italic' }}>"{r.note}"</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>{r.duration_min} min · <strong style={{ color: 'var(--accent)', fontFamily: FONTS.mono }}>${r.earnings}</strong></span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ghost" size="sm" onClick={() => handleDecline(r.id)}>Decline</Btn>
                    <Btn size="sm" onClick={() => handleAccept(r.id)}>Accept</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ padding: needsWrapUp.length ? '0 56px 40px' : '0', display: needsWrapUp.length ? 'block' : 'none' }}>
        {sectionLabel('Needs wrap-up', 'Mark complete so students can leave a review')}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {needsWrapUp.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto auto',
              gap: 12, alignItems: 'center', padding: '16px 20px',
              borderBottom: i < needsWrapUp.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar initials={(u.student_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)} size={32} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{u.student_name || 'Student'}</div>
                  <CourseTag code={u.class_code} size={10} />
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{new Date(u.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{u.location}</div>
              <Btn variant="ghost" size="sm" icon="chat" onClick={() => handleMessageStudent(u)}>Message</Btn>
              <Btn size="sm" onClick={() => handleMarkComplete(u.id)} disabled={completingId === u.id}>
                {completingId === u.id ? 'Saving…' : 'Mark complete'}
              </Btn>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 56px 40px' }}>
        {sectionLabel('Upcoming sessions', <span onClick={() => navigate('/tutor-dashboard/schedule')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Edit availability <Icon name="arrow" size={12} /></span>)}
        {upcoming.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            No upcoming sessions yet.
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {upcoming.map((u, i) => (
              <div key={u.id} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto auto',
                gap: 12, alignItems: 'center', padding: '16px 20px',
                borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar initials={(u.student_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)} size={32} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{u.student_name || 'Student'}</div>
                    <CourseTag code={u.class_code} size={10} />
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{new Date(u.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{u.location}</div>
                <Btn variant="ghost" size="sm" icon="chat" onClick={() => handleMessageStudent(u)}>Message</Btn>
                <Btn variant="ghost" size="sm" onClick={() => handleMarkComplete(u.id)} disabled={completingId === u.id} title="If you already met or the student canceled outside the app">
                  {completingId === u.id ? 'Saving…' : 'Mark complete'}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payout setup / status */}
      <section style={{ padding: '0 56px 32px' }}>
        {payoutsEnabled ? (
          <div style={{ background: 'oklch(0.97 0.04 140)', border: '1px solid oklch(0.85 0.1 140)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'oklch(0.6 0.18 140)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.4 0.14 140)' }}>Payouts active</div>
                <div style={{ fontSize: 12, color: 'oklch(0.55 0.1 140)' }}>Earnings are transferred to your bank after each confirmed session.</div>
              </div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => navigate('/payouts')}>View earnings</Btn>
          </div>
        ) : (
          <div style={{ background: 'oklch(0.97 0.04 65)', border: '1px solid oklch(0.88 0.1 65)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.45 0.14 60)', marginBottom: 4 }}>Set up payouts to get paid</div>
              <div style={{ fontSize: 13, color: 'oklch(0.55 0.08 60)' }}>
                {connectId
                  ? 'Your Stripe account is created but onboarding isn\'t complete. Finish setup to receive earnings.'
                  : 'Connect your bank account via Stripe to receive session earnings directly.'}
              </div>
              {connectError && <div style={{ fontSize: 12, color: 'oklch(0.55 0.18 25)', marginTop: 6 }}>{connectError}</div>}
            </div>
            <Btn size="sm" onClick={handleSetupPayouts} disabled={connectLoading} style={{ flexShrink: 0 }}>
              {connectLoading ? 'Loading…' : connectId ? 'Continue setup' : 'Set up payouts'}
            </Btn>
          </div>
        )}
      </section>

      <section style={{ padding: '0 56px 64px' }}>
        <div style={{ background: 'var(--ink)', color: 'var(--surface)', borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'oklch(0.75 0.16 25)', fontWeight: 600, marginBottom: 8 }}>Grow your bookings</div>
          <h3 style={{ fontFamily: FONTS.serif, fontSize: 26, fontWeight: 400, margin: '0 0 6px', letterSpacing: -0.4 }}>Add an intro video</h3>
          <p style={{ fontSize: 13, color: 'oklch(0.75 0.01 70)', margin: 0, lineHeight: 1.5 }}>
            Profiles with intro videos get 3.2× more booking requests. Video upload is coming soon — we'll notify you when it's ready.
          </p>
        </div>
      </section>
    </div>
  );
};

// ─── Shared accent constant used by both schedule sub-components ─────────────
const ACCENT = 'oklch(0.48 0.17 25)';

// ─── ScheduleCalendar: one-month grid showing override status per day ─────────
const ScheduleCalendar = ({ year, month, overrides, selectedDate, onSelectDate }) => {
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>{monthLabel}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
          <div key={i} style={{ fontSize: 10, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600, paddingBottom: 4 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPast = new Date(year, month, day).setHours(0, 0, 0, 0) < todayMs;
          const override = overrides.get(dateStr);
          const isOff = override?.mode === 'off';
          const isCustom = override?.mode === 'custom';
          const isSelected = selectedDate === dateStr;

          let bg = 'transparent', color = isPast ? 'var(--ink-3)' : 'var(--ink)', border = '1px solid transparent';
          if (isSelected)       { bg = 'var(--ink)';  color = 'var(--surface)'; border = `1px solid var(--ink)`; }
          else if (isOff)       { bg = '#fee2e2';  color = isPast ? '#fca5a5' : '#b91c1c'; border = '1px solid #fecaca'; }
          else if (isCustom)    { bg = 'oklch(0.94 0.05 250)'; color = 'oklch(0.38 0.16 250)'; border = '1px solid oklch(0.82 0.1 250)'; }

          return (
            <div key={dateStr} onClick={() => !isPast && onSelectDate(isSelected ? null : dateStr)}
              title={isPast ? '' : isOff ? 'Day off' : isCustom ? `${override.hours?.length || 0} custom hours` : 'Default (weekly schedule)'}
              style={{ position: 'relative', fontSize: 12, textAlign: 'center', lineHeight: '32px', height: 32,
                borderRadius: 7, cursor: isPast ? 'default' : 'pointer', background: bg, color, border,
                opacity: isPast ? 0.35 : 1, fontWeight: (isOff || isCustom || isSelected) ? 700 : 400,
                transition: 'background .1s',
              }}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── DayEditorPanel: right-side panel for editing a selected date ─────────────
const DayEditorPanel = ({ dateStr, override, onSetMode, onToggleHour, scheduleHours }) => {
  if (!dateStr) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--ink-3)', gap: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 28, opacity: 0.3 }}>☞</div>
        <div style={{ fontSize: 13 }}>Click a date on the calendar<br/>to customize it</div>
      </div>
    );
  }

  const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const mode = override?.mode || 'default';
  const MODE_OPTIONS = [
    { value: 'default', label: 'Weekly default', desc: 'Follows your recurring weekly schedule' },
    { value: 'custom',  label: 'Custom hours',   desc: 'Set exactly when you\'re free this day' },
    { value: 'off',     label: 'Day off',         desc: 'Completely hidden from students' },
  ];

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{dateLabel}</div>
      <div style={{ marginBottom: 14 }}>
        {MODE_OPTIONS.map(opt => (
          <div key={opt.value} onClick={() => onSetMode(dateStr, opt.value)} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 12px',
            borderRadius: 8, cursor: 'pointer', marginBottom: 5,
            border: `1px solid ${mode === opt.value ? 'var(--ink)' : 'var(--border)'}`,
            background: mode === opt.value ? 'var(--surface-2)' : 'transparent',
            transition: 'border-color .1s, background .1s',
          }}>
            <div style={{
              width: 15, height: 15, borderRadius: '50%', flexShrink: 0, marginTop: 3,
              border: `2px solid ${mode === opt.value ? 'var(--ink)' : 'var(--border)'}`,
              background: mode === opt.value ? 'var(--ink)' : 'transparent',
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {mode === 'custom' && (
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>
            Available hours · {(override?.hours?.length || 0)} selected
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
            {scheduleHours.map(h => {
              const on = override?.hours?.includes(h);
              return (
                <div key={h} onClick={() => onToggleHour(dateStr, h)} style={{
                  padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, fontFamily: FONTS.mono, textAlign: 'center',
                  background: on ? ACCENT : 'var(--surface-2)',
                  color: on ? '#fff' : 'var(--ink-2)',
                  border: `1px solid ${on ? ACCENT : 'var(--border)'}`,
                  transition: 'all .08s',
                }}>{h}</div>
              );
            })}
          </div>
          {!override?.hours?.length && (
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 8 }}>
              Select at least one hour, or choose "Day off".
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Generate hourly labels from 8 AM to 9 PM in "H:00 AM/PM" format (matching hourTo24 in TutorProfile)
const SCHEDULE_HOURS = (() => {
  const out = [];
  for (let h = 8; h <= 21; h++) {
    const period = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h;
    out.push(`${display}:00 ${period}`);
  }
  return out; // 14 slots: 8:00 AM … 9:00 PM
})();

const SCHEDULE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const _schedCache = {};

export const ScheduleEditorDesktop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('weekly'); // 'weekly' | 'custom'

  // ── Weekly schedule state ─────────────────────────────────────────────────
  const [slots, setSlots] = useState(() => _schedCache[uid]?.slots || {});
  const [rate, setRate] = useState(() => _schedCache[uid]?.rate ?? 38);
  const [peerAvg, setPeerAvg] = useState(null);
  const [session, setSession] = useState(() => _schedCache[uid]?.session ?? 60);

  // ── Custom days state (date overrides) ───────────────────────────────────
  // Map<dateStr, { mode: 'off' | 'custom', hours: string[] }>
  const [dateOverrides, setDateOverrides] = useState(() => {
    const cached = _schedCache[uid]?.overrides;
    return cached ? new Map(cached) : new Map();
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [calView, setCalView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const calNext = calView.month === 11
    ? { year: calView.year + 1, month: 0 }
    : { year: calView.year, month: calView.month + 1 };
  const advanceCal = (dir) => setCalView(v => {
    let m = v.month + dir, y = v.year;
    if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; }
    return { year: y, month: m };
  });

  const setDayMode = (dateStr, mode) => {
    setDateOverrides(prev => {
      const next = new Map(prev);
      if (mode === 'default') { next.delete(dateStr); }
      else { next.set(dateStr, { ...(next.get(dateStr) || { hours: [] }), mode }); }
      return next;
    });
  };
  const toggleDayHour = (dateStr, hour) => {
    setDateOverrides(prev => {
      const next = new Map(prev);
      const existing = next.get(dateStr) || { mode: 'custom', hours: [] };
      const hours = existing.hours.includes(hour)
        ? existing.hours.filter(h => h !== hour)
        : [...existing.hours, hour];
      next.set(dateStr, { ...existing, mode: 'custom', hours });
      return next;
    });
  };
  const removeOverride = (dateStr) => {
    setDateOverrides(prev => { const next = new Map(prev); next.delete(dateStr); return next; });
    if (selectedDate === dateStr) setSelectedDate(null);
  };

  const upcomingOverrides = [...dateOverrides.entries()]
    .filter(([d]) => new Date(d + 'T12:00:00') >= new Date(new Date().toDateString()))
    .sort(([a], [b]) => a.localeCompare(b));

  // ── Save/error state ──────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // ── Load from DB ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from('tutor_availability').select('*').eq('tutor_id', user.id).then(({ data }) => {
      if (!data) return;
      const loaded = {};
      data.forEach(row => {
        const h = /^\d+:\d+/.test(row.hour) ? row.hour : row.hour.replace(/^(\d+) /, '$1:00 ');
        loaded[`${row.day}-${h}`] = true;
      });
      setSlots(loaded);
      const r = data[0]?.rate ?? 38;
      const s = data[0]?.min_session ?? 60;
      if (data[0]) { setRate(r); setSession(s); }
      _schedCache[uid] = { ..._schedCache[uid], slots: loaded, rate: r, session: s };
    });
    // Load date overrides (replaces blocked_dates)
    supabase.from('tutor_date_overrides').select('*').eq('tutor_id', user.id).then(({ data }) => {
      if (data?.length) {
        const map = new Map();
        data.forEach(r => map.set(r.date, { mode: r.mode, hours: r.hours || [] }));
        setDateOverrides(map);
        _schedCache[uid] = { ..._schedCache[uid], overrides: [...map.entries()] };
      }
    });
    // Peer avg rate
    supabase.from('tutor_profiles').select('class_codes').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: profile }) => {
        if (!profile?.class_codes?.length) return;
        const { data: peers } = await supabase.from('tutor_profiles').select('rate')
          .eq('transcript_submitted', true).neq('user_id', user.id)
          .overlaps('class_codes', profile.class_codes);
        if (peers?.length) {
          setPeerAvg(Math.round(peers.reduce((s, p) => s + (Number(p.rate) || 0), 0) / peers.length));
        }
      });
  }, [user]);

  const key = (d, h) => `${d}-${h}`;
  const isOn = (d, h) => !!slots[key(d, h)];
  const count = Object.values(slots).filter(Boolean).length;
  const countForDay = (d) => SCHEDULE_HOURS.filter(h => isOn(d, h)).length;

  const toggle = (d, h) => setSlots(s => ({ ...s, [key(d, h)]: !s[key(d, h)] }));

  // Click day header → toggle entire column
  const toggleDay = (d) => {
    const allOn = SCHEDULE_HOURS.every(h => isOn(d, h));
    setSlots(s => {
      const next = { ...s };
      SCHEDULE_HOURS.forEach(h => { next[key(d, h)] = !allOn; });
      return next;
    });
  };

  // Click time label → toggle entire row
  const toggleHour = (h) => {
    const allOn = SCHEDULE_DAYS.every(d => isOn(d, h));
    setSlots(s => {
      const next = { ...s };
      SCHEDULE_DAYS.forEach(d => { next[key(d, h)] = !allOn; });
      return next;
    });
  };

  // Quick presets
  const applyPreset = (preset) => {
    if (preset === 'clear') { setSlots({}); return; }
    if (preset === 'weekdays9to5') {
      const next = {};
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(d => {
        SCHEDULE_HOURS.forEach(h => {
          const hr = parseInt(h);
          const period = h.includes('PM') ? 'PM' : 'AM';
          const hour24 = period === 'PM' && hr !== 12 ? hr + 12 : hr;
          if (hour24 >= 9 && hour24 < 17) next[key(d, h)] = true;
        });
      });
      setSlots(next);
    }
    if (preset === 'evenings') {
      const next = {};
      SCHEDULE_DAYS.forEach(d => {
        SCHEDULE_HOURS.forEach(h => {
          const hr = parseInt(h);
          const period = h.includes('PM') ? 'PM' : 'AM';
          const hour24 = period === 'PM' && hr !== 12 ? hr + 12 : hr;
          if (hour24 >= 17) next[key(d, h)] = true;
        });
      });
      setSlots(next);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setSaveError('');
    try {
      // Weekly schedule
      const { error: delErr } = await supabase.from('tutor_availability').delete().eq('tutor_id', user.id);
      if (delErr) throw new Error(delErr.message);
      const rows = Object.entries(slots).filter(([, v]) => v).map(([k]) => {
        const idx = k.indexOf('-');
        return { tutor_id: user.id, day: k.slice(0, idx), hour: k.slice(idx + 1), rate, min_session: session };
      });
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('tutor_availability').insert(rows);
        if (insErr) throw new Error(insErr.message);
      }
      await supabase.from('tutor_profiles').update({ rate, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      // Date overrides (unified: replaces tutor_blocked_dates)
      await supabase.from('tutor_date_overrides').delete().eq('tutor_id', user.id);
      if (dateOverrides.size > 0) {
        const overrideRows = [...dateOverrides.entries()].map(([date, { mode, hours }]) => ({
          tutor_id: user.id, date, mode, hours: hours || [],
        }));
        const { error: ovErr } = await supabase.from('tutor_date_overrides').insert(overrideRows);
        if (ovErr) throw new Error(ovErr.message);
      }
      _schedCache[uid] = { slots, rate, session, overrides: [...dateOverrides.entries()] };
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Shared tab button style helper ───────────────────────────────────────
  const tabBtn = (id) => ({
    padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', border: 'none', transition: 'background .1s, color .1s',
    background: tab === id ? 'var(--ink)' : 'transparent',
    color: tab === id ? 'var(--surface)' : 'var(--ink-3)',
  });

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* Header + tabs */}
      <div style={{ padding: '40px 56px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Set your own hours</div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: 0, letterSpacing: -0.8 }}>
              When are you available?
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <Btn size="sm" onClick={handleSave} style={{ minWidth: 130 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save availability'}
            </Btn>
          </div>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 4 }}>
          <button onClick={() => setTab('weekly')} style={tabBtn('weekly')}>Weekly schedule</button>
          <button onClick={() => setTab('custom')} style={tabBtn('custom')}>
            Custom days
            {dateOverrides.size > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, background: ACCENT, color: '#fff', borderRadius: 10, padding: '1px 6px' }}>
                {dateOverrides.size}
              </span>
            )}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>
          {tab === 'weekly'
            ? 'Your recurring default — applies every week unless overridden. Click any cell, day label, or time label.'
            : 'Exceptions to your weekly pattern. Pick a date to set custom hours or mark it as a day off.'}
        </p>
      </div>

      {saveError && (
        <div style={{ margin: '12px 56px 0', padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>
          {saveError}
        </div>
      )}

      {/* ── Weekly tab ─────────────────────────────────────────────────────── */}
      {tab === 'weekly' && (
        <div style={{ padding: '20px 56px 56px', display: 'grid', gridTemplateColumns: '1fr 304px', gap: 32 }}>
          {/* Grid */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 16px 12px', overflowX: 'auto' }}>
            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[['weekdays9to5','Weekdays 9–5'],['evenings','Evenings'],['clear','Clear all']].map(([id, label]) => (
                <button key={id} onClick={() => applyPreset(id)} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--ink-2)', cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              <div />
              {SCHEDULE_DAYS.map(d => {
                const n = countForDay(d);
                const allOn = SCHEDULE_HOURS.every(h => isOn(d, h));
                return (
                  <div key={d} onClick={() => toggleDay(d)} style={{
                    fontSize: 11, fontWeight: 600, color: allOn ? ACCENT : 'var(--ink-2)',
                    textAlign: 'center', padding: '6px 2px', borderRadius: 6, cursor: 'pointer',
                    background: allOn ? 'var(--accent-soft)' : 'transparent', userSelect: 'none',
                  }}>
                    {d}
                    {n > 0 && <div style={{ fontSize: 9, color: ACCENT, marginTop: 1 }}>{n}h</div>}
                  </div>
                );
              })}
            </div>
            {/* Time rows */}
            {SCHEDULE_HOURS.map(h => {
              const rowOn = SCHEDULE_DAYS.every(d => isOn(d, h));
              return (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', gap: 4, marginBottom: 3 }}>
                  <div onClick={() => toggleHour(h)} style={{
                    fontSize: 10, color: rowOn ? ACCENT : 'var(--ink-3)', fontFamily: FONTS.mono,
                    textAlign: 'right', paddingRight: 6, display: 'flex', alignItems: 'center',
                    justifyContent: 'flex-end', cursor: 'pointer', userSelect: 'none', fontWeight: rowOn ? 700 : 400,
                  }}>{h}</div>
                  {SCHEDULE_DAYS.map(d => {
                    const on = isOn(d, h);
                    return (
                      <div key={d} onClick={() => toggle(d, h)} style={{
                        height: 28, borderRadius: 5, cursor: 'pointer',
                        background: on ? ACCENT : 'var(--surface-2)',
                        border: `1px solid ${on ? ACCENT : 'var(--border)'}`,
                        transition: 'background .07s, border-color .07s', opacity: on ? 1 : 0.7,
                      }} />
                    );
                  })}
                </div>
              );
            })}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--ink-3)' }}>
              <strong style={{ color: ACCENT }}>{count}</strong> hours/week
              {count < 5 && count > 0 && <span style={{ color: '#b45309', marginLeft: 8 }}>· Add more for better visibility</span>}
              {count === 0 && <span style={{ color: '#b45309', marginLeft: 8 }}>· Select slots to appear in search</span>}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>Your rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                <span style={{ fontFamily: FONTS.serif, fontSize: 40, color: ACCENT, lineHeight: 1 }}>${rate}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>/hour</span>
              </div>
              <input type="range" min="15" max="80" value={rate} onChange={e => setRate(+e.target.value)} style={{ width: '100%', accentColor: ACCENT }} />
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>$15</span>
                {peerAvg != null ? <span style={{ color: ACCENT, fontWeight: 600 }}>Peers avg ${peerAvg}</span> : <span>Typical $32–$45</span>}
                <span>$80</span>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>Minimum session</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>Students can't book shorter than this.</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[30, 60, 90].map(d => <Chip key={d} active={session === d} onClick={() => setSession(d)}>{d} min</Chip>)}
              </div>
            </div>
            <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: ACCENT, fontWeight: 600, marginBottom: 4 }}>Projected earnings</div>
              <div style={{ fontFamily: FONTS.serif, fontSize: 28, color: ACCENT, lineHeight: 1 }}>
                ${Math.round(count * rate * 0.6)}–${count * rate}
                <span style={{ fontSize: 12, fontFamily: FONTS.sans, marginLeft: 4 }}>/week</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6 }}>
                {count} open slots · ${rate}/hr · 60–100% fill rate assumed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom days tab ─────────────────────────────────────────────────── */}
      {tab === 'custom' && (
        <div style={{ padding: '20px 56px 56px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32 }}>
          {/* Left: calendars + upcoming list */}
          <div>
            {/* Month nav + legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-3)', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'oklch(0.94 0.05 250)', border: '1px solid oklch(0.82 0.1 250)' }} />
                  Custom hours
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#fee2e2', border: '1px solid #fecaca' }} />
                  Day off
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
                  Weekly default
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[-1, 1].map(dir => (
                  <button key={dir} onClick={() => advanceCal(dir)} style={{
                    width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
                    background: 'var(--surface)', cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{dir < 0 ? '‹' : '›'}</button>
                ))}
              </div>
            </div>

            {/* Two-month calendars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 28 }}>
              <ScheduleCalendar year={calView.year} month={calView.month} overrides={dateOverrides} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              <ScheduleCalendar year={calNext.year} month={calNext.month} overrides={dateOverrides} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </div>

            {/* Upcoming overrides list */}
            {upcomingOverrides.length > 0 && (
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>
                  Upcoming exceptions · {upcomingOverrides.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {upcomingOverrides.map(([dateStr, ov]) => {
                    const isOff = ov.mode === 'off';
                    return (
                      <div key={dateStr} onClick={() => setSelectedDate(dateStr)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${selectedDate === dateStr ? 'var(--ink)' : isOff ? '#fecaca' : 'oklch(0.82 0.1 250)'}`,
                        background: selectedDate === dateStr ? 'var(--surface-2)' : isOff ? '#fff5f5' : 'oklch(0.97 0.03 250)',
                        transition: 'border-color .1s',
                      }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isOff ? '#f87171' : 'oklch(0.55 0.18 250)' }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                              {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                              {isOff ? 'Day off' : `${ov.hours?.length || 0} hour${ov.hours?.length !== 1 ? 's' : ''} available`}
                            </div>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeOverride(dateStr); }} style={{
                          fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px',
                        }}>Reset</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: day editor */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, height: 'fit-content', position: 'sticky', top: 20 }}>
            <DayEditorPanel
              dateStr={selectedDate}
              override={selectedDate ? dateOverrides.get(selectedDate) : null}
              onSetMode={setDayMode}
              onToggleHour={toggleDayHour}
              scheduleHours={SCHEDULE_HOURS}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EditTutorProfileDesktop ──────────────────────────────────────────────────
const YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Postgrad'];
const SUGGESTED_CLASSES = [
  'CHEM 200','CHEM 201','CHEM 365','MATH 150','MATH 151','MATH 152','MATH 254',
  'BIO 100','BIO 200','PHYS 195','PHYS 197','CS 150','CS 310','CS 370',
  'ECON 101','ECON 201','ACCT 201','PSYC 101',
];

const _profileCache = {};

export const EditTutorProfileDesktop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;
  const [bio, setBio] = useState(() => _profileCache[uid]?.bio ?? '');
  const [major, setMajor] = useState(() => _profileCache[uid]?.major ?? '');
  const [year, setYear] = useState(() => _profileCache[uid]?.year ?? '');
  const [classCodes, setClassCodes] = useState(() => _profileCache[uid]?.classCodes || []);
  const [classInput, setClassInput] = useState('');
  const [loading, setLoading] = useState(!_profileCache[uid]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('tutor_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const b = data.bio && data.bio !== 'Verified Study Buddy tutor.' ? data.bio : '';
          const m = data.major || '';
          const y = data.year || '';
          const c = data.class_codes || [];
          setBio(b); setMajor(m); setYear(y); setClassCodes(c);
          _profileCache[uid] = { bio: b, major: m, year: y, classCodes: c };
        }
        setLoading(false);
      });
  }, [user]);

  const addCode = () => {
    const code = classInput.trim().toUpperCase();
    if (code && !classCodes.includes(code)) setClassCodes(c => [...c, code]);
    setClassInput('');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setSaveError('');
    try {
      if (classCodes.length === 0) throw new Error('Add at least one class you tutor.');
      const bioVal = bio.trim() || 'Verified Study Buddy tutor.';
      const { error: dbErr } = await supabase.from('tutor_profiles').update({
        bio: bioVal,
        major: major.trim() || 'Student',
        year: year || null,
        class_codes: classCodes,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (dbErr) throw new Error(dbErr.message);
      await supabase.auth.updateUser({
        data: { bio: bioVal, major: major.trim(), year, classes: classCodes.join(',') },
      });
      _profileCache[uid] = { bio: bio.trim(), major: major.trim(), year, classCodes };
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 8,
    padding: '10px 12px', fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)',
    background: 'var(--bg)', outline: 'none',
  };
  const labelStyle = {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6, display: 'block',
  };

  if (loading) return null;

  return (
    <div style={{ background: 'var(--bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Your public profile</div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: 0, letterSpacing: -0.8 }}>Edit profile</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <Btn size="sm" onClick={handleSave} style={{ minWidth: 120 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
            </Btn>
          </div>
        </div>

        {saveError && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Major</label>
            <input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Chemistry" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Year</label>
            <select value={year} onChange={e => setYear(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select year…</option>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>
            Bio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— shown on your public profile</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={5}
            maxLength={600}
            placeholder="Tell students who you are, your tutoring style, and why you're great at these subjects…"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, textAlign: 'right' }}>{bio.length}/600</div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>Classes you tutor</label>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 12px' }}>
            Students find you by browsing these classes. Use the exact course code (e.g. CHEM 200).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 34 }}>
            {classCodes.map(code => (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: 'var(--accent-soft)', border: '1px solid var(--accent)', fontSize: 12.5, fontWeight: 500 }}>
                {code}
                <button onClick={() => setClassCodes(c => c.filter(x => x !== code))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--accent)', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
            {classCodes.length === 0 && <span style={{ fontSize: 13, color: 'var(--ink-3)', alignSelf: 'center' }}>No classes added yet.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={classInput}
              onChange={e => setClassInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCode(); } }}
              placeholder="Type a course code and press Enter, e.g. MATH 150"
              style={{ ...inputStyle, flex: 1 }}
            />
            <Btn size="sm" variant="ghost" onClick={addCode} style={{ flexShrink: 0 }}>Add</Btn>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Quick-add common SDSU courses:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {SUGGESTED_CLASSES.filter(c => !classCodes.includes(c)).map(c => (
                <button key={c} onClick={() => setClassCodes(prev => [...prev, c])} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 14,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--ink-2)', cursor: 'pointer',
                }}>+ {c}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn size="lg" onClick={handleSave} style={{ minWidth: 140 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
          </Btn>
          <Btn size="lg" variant="ghost" onClick={() => navigate(`/tutor/${user?.id}`)}>
            Preview public profile
          </Btn>
        </div>
      </div>
    </div>
  );
};
