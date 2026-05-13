import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo } from '../../components/primitives/index.jsx';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

const RED      = '#DC2626';
const RED_SOFT = '#FEF2F2';
const GREEN    = '#16A34A';
const GREEN_SOFT = '#F0FDF4';

// ── Access guard ─────────────────────────────────────────────────────────────
const Passcode = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const secret = import.meta.env.VITE_ADMIN_PASSCODE || 'studybuddy-admin';
  const go = () => {
    if (code === secret) { sessionStorage.setItem('sb_admin', '1'); onUnlock(); }
    else setErr('Incorrect passcode.');
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: 360, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: FONTS.serif, fontSize: 26, fontWeight: 400, margin: '0 0 8px' }}>Admin access</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px' }}>Enter your admin passcode</p>
        {err && <div style={{ background: RED_SOFT, color: RED, fontSize: 13, padding: '8px 12px',
          borderRadius: 8, marginBottom: 14 }}>{err}</div>}
        <input type="password" value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Passcode" style={{
            width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
            border: '1.5px solid var(--border)', fontFamily: FONTS.sans, fontSize: 15,
            color: 'var(--ink)', background: 'var(--bg)', outline: 'none', marginBottom: 12,
          }} />
        <button onClick={go} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none',
          background: 'var(--ink)', color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONTS.sans }}>
          Enter
        </button>
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 6 }}>{children}</div>
);

const Field = ({ label, value }) => value ? (
  <div>
    <SectionLabel>{label}</SectionLabel>
    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{value}</div>
  </div>
) : null;

const Divider = () => (
  <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
);

const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HOURS = (() => { const o=[]; for(let h=8;h<=21;h++){const p=h>=12?'PM':'AM';const d=h>12?h-12:h;o.push(`${d}:00 ${p}`);}return o; })();

// ── Application card ──────────────────────────────────────────────────────────
const AppCard = ({ app, onApprove, onReject, processing }) => {
  const [expanded, setExpanded] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const date = app.updated_at
    ? new Date(app.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // Load schedule when expanded
  useEffect(() => {
    if (!expanded || schedule !== null) return;
    supabase.from('tutor_availability').select('day,hour').eq('tutor_id', app.user_id)
      .then(({ data }) => setSchedule(data || []));
  }, [expanded]);

  const slotSet = new Set((schedule || []).map(r => `${r.day}-${r.hour}`));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      marginBottom: 14, overflow: 'hidden' }}>

      {/* ── Summary row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
        {app.photo_url
          ? <img src={app.photo_url} alt={app.first_name}
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: RED_SOFT,
              border: `2px solid ${RED}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: RED, flexShrink: 0 }}>
              {(app.first_name?.[0] || '?').toUpperCase()}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              {app.first_name} {app.last_name}
            </span>
            {app.has_certification && (
              <span style={{ padding: '2px 8px', borderRadius: 20, background: '#EFF6FF',
                color: '#1D4ED8', fontSize: 11, fontWeight: 600 }}>🏅 Certified</span>
            )}
            {app.application_status === 'approved' && (
              <span style={{ padding: '2px 8px', borderRadius: 20, background: GREEN_SOFT,
                color: GREEN, fontSize: 11, fontWeight: 600 }}>✓ Approved</span>
            )}
            {app.application_status === 'rejected' && (
              <span style={{ padding: '2px 8px', borderRadius: 20, background: RED_SOFT,
                color: RED, fontSize: 11, fontWeight: 600 }}>✕ Rejected</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            {app.email} · {app.year} · {app.major} · {app.school}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>
            <span style={{ color: RED, fontWeight: 600 }}>${app.rate}/hr</span>
            {' · '}
            {(app.class_codes || []).slice(0, 5).join(', ')}
            {(app.class_codes || []).length > 5 && ` +${app.class_codes.length - 5} more`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{date}</div>
          <button onClick={() => setExpanded(e => !e)} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: expanded ? 'var(--ink)' : 'transparent',
            color: expanded ? '#fff' : 'var(--ink-2)',
            cursor: 'pointer', fontSize: 12, fontFamily: FONTS.sans, transition: 'all .12s',
          }}>{expanded ? 'Collapse ▲' : 'Full application ▼'}</button>
        </div>
      </div>

      {/* ── Full details ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '24px 24px 8px' }}>

          {/* Headline */}
          {app.headline && (
            <div style={{ background: RED_SOFT, border: `1px solid ${RED_MID}`, borderRadius: 10,
              padding: '12px 16px', marginBottom: 20 }}>
              <SectionLabel>Headline</SectionLabel>
              <div style={{ fontSize: 15, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{app.headline}"
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left column */}
            <div>
              {/* Bio */}
              {app.bio && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Bio</SectionLabel>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65,
                    whiteSpace: 'pre-wrap' }}>{app.bio}</div>
                </div>
              )}

              {/* Teaching experience */}
              {app.teaching_experience && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Teaching experience</SectionLabel>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65,
                    whiteSpace: 'pre-wrap' }}>{app.teaching_experience}</div>
                </div>
              )}

              <Divider />

              {/* Education */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Education</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="School" value={app.school} />
                  <Field label="Year" value={app.year} />
                  <Field label="Major" value={app.major} />
                  <Field label="GPA" value={app.gpa || 'Not provided'} />
                </div>
              </div>

              <Divider />

              {/* Personal info */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Personal info</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Email" value={app.email} />
                  <Field label="Phone" value={app.phone || 'Not provided'} />
                  <Field label="Country of birth" value={app.country} />
                  <Field label="Timezone" value={app.timezone} />
                </div>
              </div>

              <Divider />

              {/* Pricing */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Pricing</SectionLabel>
                <div style={{ fontSize: 22, fontWeight: 700, color: RED }}>${app.rate}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)' }}>/hr</span></div>
              </div>
            </div>

            {/* Right column */}
            <div>
              {/* Video */}
              {app.video_url ? (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Intro video</SectionLabel>
                  <video src={app.video_url} controls poster={app.video_thumbnail_url || undefined}
                    style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 220 }} />
                </div>
              ) : (
                <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--surface-2)',
                  borderRadius: 10, fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                  No intro video uploaded
                </div>
              )}

              {/* Certification */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Teaching certification</SectionLabel>
                {app.certification_path
                  ? <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE',
                      borderRadius: 8, fontSize: 13, color: '#1D4ED8', fontWeight: 500 }}>
                      🏅 Certification uploaded — view in Supabase Storage → certifications/{app.user_id}
                    </div>
                  : <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No certification uploaded</div>
                }
              </div>

              <Divider />

              {/* Subjects */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Subjects ({(app.class_codes || []).length})</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(app.class_codes || []).map(c => (
                    <span key={c} style={{ padding: '4px 10px', borderRadius: 20, background: RED_SOFT,
                      border: `1px solid ${RED_MID}`, color: RED, fontSize: 12, fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Schedule */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Weekly availability</SectionLabel>
                {schedule === null ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Loading schedule…</div>
                ) : schedule.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No availability set yet</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: 320 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
                        <div />
                        {DAYS.map(d => (
                          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700,
                            color: 'var(--ink-3)', textTransform: 'uppercase' }}>{d}</div>
                        ))}
                      </div>
                      {HOURS.map(h => (
                        <div key={h} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
                          <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: FONTS.mono,
                            textAlign: 'right', paddingRight: 4, paddingTop: 3 }}>{h}</div>
                          {DAYS.map(day => {
                            const on = slotSet.has(`${day}-${h}`);
                            return <div key={day} style={{ height: 16, borderRadius: 3,
                              background: on ? RED : 'var(--surface-2)',
                              border: `1px solid ${on ? RED : 'var(--border)'}` }} />;
                          })}
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                        {schedule.length} available hour{schedule.length !== 1 ? 's' : ''}/week · {app.timezone}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      {app.application_status === 'pending_review' && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px',
          borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => onApprove(app.user_id, app.first_name)} disabled={processing === app.user_id}
            style={{ padding: '11px 28px', borderRadius: 10, border: 'none',
              background: processing === app.user_id ? 'var(--border)' : GREEN,
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: processing === app.user_id ? 'default' : 'pointer', fontFamily: FONTS.sans }}>
            {processing === app.user_id ? 'Processing…' : '✓ Approve'}
          </button>
          <button onClick={() => onReject(app.user_id, app.first_name)} disabled={processing === app.user_id}
            style={{ padding: '11px 28px', borderRadius: 10, border: `1.5px solid ${RED}`,
              background: 'transparent', color: RED, fontSize: 14, fontWeight: 600,
              cursor: processing === app.user_id ? 'default' : 'pointer', fontFamily: FONTS.sans }}>
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main admin dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem('sb_admin'));
  const [tab, setTab] = useState('pending_review');
  const [apps, setApps] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    if (!unlocked) return;
    setFetching(true);
    supabase.from('tutor_profiles').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { setApps(data || []); setFetching(false); });
  }, [unlocked]);

  const handleApprove = async (userId, name) => {
    setProcessing(userId);
    try {
      const { error } = await supabase.functions.invoke('approve-tutor', { body: { tutorUserId: userId } });
      if (error) throw error;
      setApps(prev => prev.map(a => a.user_id === userId ? { ...a, application_status: 'approved' } : a));
      showToast(`✓ ${name} approved and notified by email`);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId, name) => {
    if (!confirm(`Reject ${name}'s application? They will be notified by email.`)) return;
    setProcessing(userId);
    try {
      const { error } = await supabase.functions.invoke('reject-tutor', { body: { tutorUserId: userId } });
      if (error) throw error;
      setApps(prev => prev.map(a => a.user_id === userId ? { ...a, application_status: 'rejected' } : a));
      showToast(`${name}'s application rejected`);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  if (!unlocked) return <Passcode onUnlock={() => setUnlocked(true)} />;
  if (loading) return null;

  const filtered = apps.filter(a => a.application_status === tab);
  const counts = {
    pending_review: apps.filter(a => a.application_status === 'pending_review').length,
    approved:       apps.filter(a => a.application_status === 'approved').length,
    rejected:       apps.filter(a => a.application_status === 'rejected').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setFetching(true); supabase.from('tutor_profiles').select('*').order('updated_at', { ascending: false }).then(({ data }) => { setApps(data || []); setFetching(false); }); }}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)', fontFamily: FONTS.sans }}>
            ↻ Refresh
          </button>
          <button onClick={() => { sessionStorage.removeItem('sb_admin'); setUnlocked(false); }}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)', fontFamily: FONTS.sans }}>
            Lock
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, margin: '0 0 6px', letterSpacing: -0.5 }}>
          Tutor applications
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 28px' }}>
          {counts.pending_review} pending review
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
          {[
            { id: 'pending_review', label: 'Pending', count: counts.pending_review, color: '#F59E0B' },
            { id: 'approved',       label: 'Approved', count: counts.approved,       color: GREEN },
            { id: 'rejected',       label: 'Rejected', count: counts.rejected,       color: RED },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: FONTS.sans, fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {t.label}
              <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: tab === t.id ? t.color : 'var(--border)',
                color: tab === t.id ? '#fff' : 'var(--ink-3)' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              {tab === 'pending_review' ? '🎉' : tab === 'approved' ? '✓' : '—'}
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>
              {tab === 'pending_review' ? 'No pending applications' : `No ${tab} applications yet`}
            </div>
          </div>
        ) : (
          filtered.map(app => (
            <AppCard key={app.user_id} app={app}
              onApprove={handleApprove} onReject={handleReject} processing={processing} />
          ))
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,.2)',
          maxWidth: 400, textAlign: 'center' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
