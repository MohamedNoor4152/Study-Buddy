import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo } from '../../components/primitives/index.jsx';
import { supabase } from '../../supabase.js';

const RED      = '#DC2626';
const RED_SOFT = '#FEF2F2';
const RED_MID  = '#FECACA';
const GREEN    = '#16A34A';
const GREEN_SOFT = '#F0FDF4';

// ── Access guard ─────────────────────────────────────────────────────────────
const Passcode = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const secret = import.meta.env.VITE_ADMIN_PASSCODE || 'studybuddy-admin';
  const go = () => {
    if (code === secret) {
      sessionStorage.setItem('sb_admin', '1');
      sessionStorage.setItem('sb_admin_pc', code);
      onUnlock();
    } else setErr('Incorrect passcode.');
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

const Field = ({ label, value }) => {
  const t = safeText(value);
  return t ? (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{t}</div>
    </div>
  ) : null;
};

const Divider = () => (
  <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
);

const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HOURS = (() => { const o=[]; for(let h=8;h<=21;h++){const p=h>=12?'PM':'AM';const d=h>12?h-12:h;o.push(`${d}:00 ${p}`);}return o; })();

/** class_codes may be text[], JSON string, or comma-separated (legacy). */
const normalizeClassCodes = (cc) => {
  if (!cc) return [];
  if (Array.isArray(cc)) return cc.map(String).filter(Boolean);
  if (typeof cc === 'string') {
    try {
      const j = JSON.parse(cc);
      if (Array.isArray(j)) return j.map(String).filter(Boolean);
    } catch { /* ignore */ }
    return cc.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const safeText = (v) => {
  if (v == null || v === '') return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
};

/** Prefer split names; fall back to legacy full_name and email (service-role rows include everything). */
const tutorDisplayName = (app) => {
  const split = [app.first_name, app.last_name].filter(Boolean).join(' ').trim();
  if (split) return split;
  const fn = typeof app.full_name === 'string' ? app.full_name.trim() : '';
  if (fn) return fn;
  const em = typeof app.email === 'string' ? app.email.trim() : '';
  if (em) return em;
  return '(no name)';
};

// ── Error-safe card wrapper ───────────────────────────────────────────────────
class SafeAppCard extends React.Component {
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
          marginBottom: 14, padding: '16px 20px', display: 'flex', alignItems: 'center',
          gap: 12, color: 'var(--ink-3)', fontSize: 13 }}>
          <span>⚠</span>
          <span>Could not render this application (old format). User ID: {this.props.app?.user_id}</span>
          {this.props.app?.application_status !== 'approved' && this.props.app?.application_status !== 'rejected' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => this.props.onApprove(this.props.app.user_id, 'this applicant')}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: GREEN,
                  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              <button onClick={() => this.props.onReject(this.props.app.user_id, 'this applicant')}
                style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${RED}`,
                  color: RED, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none' }}>Reject</button>
            </div>
          )}
        </div>
      );
    }
    return <AppCard {...this.props} />;
  }
}

// ── Application card ──────────────────────────────────────────────────────────
const AppCard = ({ app, onApprove, onReject, processing }) => {
  const [expanded, setExpanded] = useState(false);
  // _schedule is pre-fetched by the edge function using service role (bypasses RLS)
  const schedule = Array.isArray(app._schedule) ? app._schedule : null;
  const date = app.updated_at
    ? new Date(app.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const codes = normalizeClassCodes(app.class_codes);
  const name   = tutorDisplayName(app);
  const initials = name !== '(no name)' ? String(name)[0].toUpperCase() : '?';


  const slotSet = new Set(
    (schedule || []).filter((r) => r?.day && r?.hour).map((r) => `${r.day}-${r.hour}`),
  );

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      marginBottom: 14, overflow: 'hidden' }}>

      {/* ── Summary row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
        {app.photo_url
          ? <img src={app.photo_url} alt={name}
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: RED_SOFT,
              border: `2px solid ${RED}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: RED, flexShrink: 0 }}>
              {initials}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              {name}
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
            {safeText(app.email)} · {safeText(app.year)} · {safeText(app.major)} · {safeText(app.school)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>
            <span style={{ color: RED, fontWeight: 600 }}>${safeText(app.rate) || '—'}/hr</span>
            {codes.length > 0 && <> · {codes.slice(0, 5).join(', ')}{codes.length > 5 && ` +${codes.length - 5} more`}</>}
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
          {safeText(app.headline) && (
            <div style={{ background: RED_SOFT, border: `1px solid ${RED_MID}`, borderRadius: 10,
              padding: '12px 16px', marginBottom: 20 }}>
              <SectionLabel>Headline</SectionLabel>
              <div style={{ fontSize: 15, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{safeText(app.headline)}"
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left column */}
            <div>
              {/* Bio */}
              {safeText(app.bio) && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Bio</SectionLabel>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65,
                    whiteSpace: 'pre-wrap' }}>{safeText(app.bio)}</div>
                </div>
              )}

              {/* Teaching experience */}
              {safeText(app.teaching_experience) && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Teaching experience</SectionLabel>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65,
                    whiteSpace: 'pre-wrap' }}>{safeText(app.teaching_experience)}</div>
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
                  <Field label="GPA" value={app.gpa ? safeText(app.gpa) : 'Not provided'} />
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
                <div style={{ fontSize: 22, fontWeight: 700, color: RED }}>${safeText(app.rate) || '—'}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)' }}>/hr</span></div>
              </div>
            </div>

            {/* Right column */}
            <div>
              {/* Video */}
              {safeText(app.video_url) ? (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Intro video</SectionLabel>
                  <video src={safeText(app.video_url)} controls poster={safeText(app.video_thumbnail_url) || undefined}
                    style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 220 }} />
                </div>
              ) : (
                <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--surface-2)',
                  borderRadius: 10, fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                  No intro video uploaded
                </div>
              )}

              {/* Transcript */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Unofficial transcript</SectionLabel>
                {app.certification_path
                  ? <div style={{ padding: '10px 14px', background: RED_SOFT, border: `1px solid ${RED_MID}`,
                      borderRadius: 8, fontSize: 13, color: RED, fontWeight: 500 }}>
                      📄 Transcript uploaded — view in Supabase Storage → certifications/{app.user_id}
                    </div>
                  : <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No transcript uploaded</div>
                }
              </div>

              <Divider />

              {/* Subjects */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Subjects ({codes.length})</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {codes.length === 0
                    ? <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>None listed</span>
                    : codes.map((c, i) => (
                        <span key={`${c}-${i}`} style={{ padding: '4px 10px', borderRadius: 20, background: RED_SOFT,
                          border: `1px solid ${RED_MID}`, color: RED, fontSize: 12, fontWeight: 600 }}>{c}</span>
                      ))
                  }
                </div>
              </div>

              <Divider />

              {/* Schedule */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Weekly availability</SectionLabel>
                {!schedule ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Not available</div>
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
                        {schedule.length} available hour{schedule.length !== 1 ? 's' : ''}/week · {safeText(app.timezone) || '—'}
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
      {app.application_status !== 'approved' && app.application_status !== 'rejected' && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px',
          borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => onApprove(app.user_id, name)} disabled={processing === app.user_id}
            style={{ padding: '11px 28px', borderRadius: 10, border: 'none',
              background: processing === app.user_id ? 'var(--border)' : GREEN,
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: processing === app.user_id ? 'default' : 'pointer', fontFamily: FONTS.sans }}>
            {processing === app.user_id ? 'Processing…' : '✓ Approve'}
          </button>
          <button onClick={() => onReject(app.user_id, name)} disabled={processing === app.user_id}
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
const REJECT_REASONS = [
  'Incomplete or very short bio',
  'Profile photo missing or unclear',
  'Subjects already have enough tutors',
  'Rate set too high for a new tutor',
  'Insufficient teaching experience listed',
  'Intro video missing or low quality',
  'Application did not meet our standards',
];

const RejectModal = ({ name, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');
  const finalReason = selected === '__custom__' ? custom.trim() : selected;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 460,
        padding: 28, boxShadow: '0 16px 56px rgba(0,0,0,.2)' }}>
        <h3 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: '0 0 6px' }}>
          Reject {name}?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>
          Their account will be deleted so they can reapply. Choose a reason to include in the email — they'll see this.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {REJECT_REASONS.map(r => (
            <div key={r} onClick={() => setSelected(r)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 10, cursor: 'pointer', transition: 'all .1s',
              border: `1.5px solid ${selected === r ? RED : 'var(--border)'}`,
              background: selected === r ? RED_SOFT : 'var(--surface)',
            }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${selected === r ? RED : 'var(--border)'}`,
                background: selected === r ? RED : 'transparent', transition: 'all .1s' }} />
              <span style={{ fontSize: 13, color: selected === r ? RED : 'var(--ink)', fontWeight: selected === r ? 600 : 400 }}>{r}</span>
            </div>
          ))}
          <div onClick={() => setSelected('__custom__')} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            borderRadius: 10, cursor: 'pointer', transition: 'all .1s',
            border: `1.5px solid ${selected === '__custom__' ? RED : 'var(--border)'}`,
            background: selected === '__custom__' ? RED_SOFT : 'var(--surface)',
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${selected === '__custom__' ? RED : 'var(--border)'}`,
              background: selected === '__custom__' ? RED : 'transparent', transition: 'all .1s' }} />
            <span style={{ fontSize: 13, color: selected === '__custom__' ? RED : 'var(--ink)',
              fontWeight: selected === '__custom__' ? 600 : 400 }}>Write a custom reason…</span>
          </div>
        </div>

        {selected === '__custom__' && (
          <textarea value={custom} onChange={e => setCustom(e.target.value)} rows={3}
            placeholder="Enter your reason here — the applicant will see this in their email."
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
              border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: FONTS.sans,
              fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', resize: 'vertical',
              outline: 'none', marginBottom: 16 }} />
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => onConfirm(finalReason)} disabled={!finalReason}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: finalReason ? RED : 'var(--border)',
              color: finalReason ? '#fff' : 'var(--ink-3)',
              fontSize: 14, fontWeight: 600, cursor: finalReason ? 'pointer' : 'not-allowed',
              fontFamily: FONTS.sans }}>
            Reject &amp; notify
          </button>
          <button onClick={onCancel} style={{ padding: '12px 20px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'transparent',
            fontSize: 14, color: 'var(--ink-3)', cursor: 'pointer', fontFamily: FONTS.sans }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() =>
    !!sessionStorage.getItem('sb_admin') && !!sessionStorage.getItem('sb_admin_pc'));
  const [tab, setTab] = useState('pending_review');
  const [apps, setApps] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // { userId, name }

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadApplications = async () => {
    const pc = sessionStorage.getItem('sb_admin_pc');
    if (!pc) {
      setApps([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    const { data, error } = await supabase.functions.invoke('admin-list-applications', {
      body: { passcode: pc },
    });
    setFetching(false);

    let detail = '';
    if (error?.context && typeof error.context.clone === 'function') {
      try {
        const body = await error.context.clone().json();
        if (body?.error) detail = body.error;
      } catch {
        try {
          const t = await error.context.clone().text();
          if (t) detail = t.slice(0, 240);
        } catch { /* ignore */ }
      }
    }
    const msg = detail || error?.message || '';

    if (error) {
      showToast(msg ? `Could not load applications: ${msg}` : 'Could not load applications.');
      setApps([]);
      return;
    }
    if (data?.error) {
      showToast(data.error);
      setApps([]);
      return;
    }
    setApps(data?.applications || []);
  };

  useEffect(() => {
    if (!unlocked) return;
    loadApplications();
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

  const handleReject = (userId, name) => {
    setRejectTarget({ userId, name });
  };

  const confirmReject = async (reason) => {
    const { userId, name } = rejectTarget;
    setRejectTarget(null);
    setProcessing(userId);
    try {
      const { error } = await supabase.functions.invoke('reject-tutor', {
        body: { tutorUserId: userId, reason },
      });
      if (error) throw error;
      setApps(prev => prev.filter(a => a.user_id !== userId));
      showToast(`${name} rejected and notified. They can reapply with the same email.`);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  if (!unlocked) return <Passcode onUnlock={() => setUnlocked(true)} />;

  const normalize = a => ({
    ...a,
    application_status: a.application_status || 'pending_review',
  });
  const normalized = apps.map(normalize);
  const filtered = normalized.filter(a => a.application_status === tab);

  const counts = {
    pending_review: normalized.filter(a => a.application_status === 'pending_review').length,
    approved:       normalized.filter(a => a.application_status === 'approved').length,
    rejected:       normalized.filter(a => a.application_status === 'rejected').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {rejectTarget && (
        <RejectModal
          name={rejectTarget.name}
          onConfirm={confirmReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}
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
          <button onClick={() => loadApplications()}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)', fontFamily: FONTS.sans }}>
            ↻ Refresh
          </button>
          <button onClick={() => { sessionStorage.removeItem('sb_admin'); sessionStorage.removeItem('sb_admin_pc'); setUnlocked(false); }}
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
            <SafeAppCard key={app.user_id} app={app}
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
