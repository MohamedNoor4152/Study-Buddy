import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo } from '../../components/primitives/index.jsx';
import { supabase } from '../../supabase.js';

// ── Color constants ──────────────────────────────────────────────────────────
const RED      = '#DC2626';
const RED_SOFT = '#FEF2F2';
const RED_MID  = '#FECACA';

// ── Static data ──────────────────────────────────────────────────────────────
const SDSU_CLASSES = [
  { dept: 'Chemistry',       codes: ['CHEM 100', 'CHEM 200', 'CHEM 201', 'CHEM 232', 'CHEM 342', 'CHEM 365'] },
  { dept: 'Mathematics',     codes: ['MATH 120', 'MATH 150', 'MATH 151', 'MATH 245', 'MATH 254', 'MATH 342', 'MATH 524'] },
  { dept: 'Physics',         codes: ['PHYS 180', 'PHYS 195', 'PHYS 196', 'PHYS 197', 'PHYS 296'] },
  { dept: 'Biology',         codes: ['BIOL 100', 'BIOL 200', 'BIOL 210', 'BIOL 212', 'BIOL 350'] },
  { dept: 'Computer Science',codes: ['CS 150', 'CS 160', 'CS 250', 'CS 310', 'CS 320', 'CS 370'] },
  { dept: 'Accounting',      codes: ['ACCT 201', 'ACCT 202', 'ACCT 301', 'ACCT 302'] },
  { dept: 'Economics',       codes: ['ECON 101', 'ECON 102', 'ECON 321', 'ECON 322'] },
  { dept: 'Statistics',      codes: ['STAT 119', 'STAT 250', 'STAT 350'] },
  { dept: 'Engineering',     codes: ['ME 101', 'EE 101', 'CE 101', 'IE 201'] },
  { dept: 'Psychology',      codes: ['PSYC 101', 'PSYC 270', 'PSYC 350'] },
  { dept: 'Business',        codes: ['BUS 101', 'FIN 323', 'MKTG 370', 'MGMT 350'] },
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina',
  'Brazil','Bulgaria','Cambodia','Canada','Chile','China','Colombia','Croatia','Cuba',
  'Cyprus','Czech Republic','Denmark','Ecuador','Egypt','El Salvador','Estonia','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan',
  'Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Latvia','Lebanon','Libya','Lithuania',
  'Luxembourg','Malaysia','Maldives','Mexico','Moldova','Mongolia','Morocco','Mozambique',
  'Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman',
  'Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania',
  'Russia','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia',
  'South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Trinidad and Tobago','Tunisia','Turkey',
  'Turkmenistan','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States',
  'Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe','Other',
];

const TIMEZONES = [
  { label: 'Pacific Time — San Diego (PT)', value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)',             value: 'America/Denver' },
  { label: 'Central Time (CT)',              value: 'America/Chicago' },
  { label: 'Eastern Time (ET)',              value: 'America/New_York' },
  { label: 'Hawaii (HT)',                    value: 'Pacific/Honolulu' },
  { label: 'London (GMT/BST)',               value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)',           value: 'Europe/Paris' },
  { label: 'Dubai (GST)',                    value: 'Asia/Dubai' },
  { label: 'India (IST)',                    value: 'Asia/Kolkata' },
  { label: 'Korea / Japan (KST/JST)',        value: 'Asia/Seoul' },
  { label: 'China Standard (CST)',           value: 'Asia/Shanghai' },
  { label: 'Australia Eastern (AEST)',       value: 'Australia/Sydney' },
];

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Photo' },
  { id: 3, label: 'Certification' },
  { id: 4, label: 'Education' },
  { id: 5, label: 'Profile' },
  { id: 6, label: 'Video' },
  { id: 7, label: 'Schedule' },
  { id: 8, label: 'Pricing' },
];

const SCHEDULE_HOURS = (() => {
  const out = [];
  for (let h = 8; h <= 21; h++) {
    const period = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h;
    out.push(`${display}:00 ${period}`);
  }
  return out;
})();
const SCHEDULE_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Shared input styles ───────────────────────────────────────────────────────
const inp = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid var(--border)', borderRadius: 10,
  padding: '12px 14px', fontFamily: FONTS.sans, fontSize: 15,
  color: 'var(--ink)', background: 'var(--surface)', outline: 'none',
};

// ── Primitive UI helpers ──────────────────────────────────────────────────────
const FL = ({ children, req }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.09em' }}>
    {children}{req && <span style={{ color: RED, marginLeft: 3 }}>*</span>}
  </div>
);

const TInp = ({ label, req, value, onChange, placeholder, type = 'text', hint }) => (
  <div>
    {label && <FL req={req}>{label}</FL>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={inp} />
    {hint && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>{hint}</div>}
  </div>
);

const SelInp = ({ label, req, value, onChange, options, placeholder }) => (
  <div>
    {label && <FL req={req}>{label}</FL>}
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: 32 }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--ink-3)', fontSize: 11 }}>▾</div>
    </div>
  </div>
);

const TArea = ({ label, req, value, onChange, placeholder, hint, rows = 5 }) => (
  <div>
    {label && <FL req={req}>{label}</FL>}
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
    {hint && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>{hint}</div>}
  </div>
);

const ErrBox = ({ msg }) => msg ? (
  <div style={{ background: RED_SOFT, border: `1px solid ${RED_MID}`, borderRadius: 10,
    padding: '12px 16px', fontSize: 14, color: RED, marginBottom: 20 }}>
    {msg}
  </div>
) : null;

const StepH = ({ step, title, sub }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: RED,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{step}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Step {step} of 8
      </div>
    </div>
    <h2 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '0 0 8px', letterSpacing: -0.5 }}>{title}</h2>
    {sub && <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: 0, lineHeight: 1.6, maxWidth: 560 }}>{sub}</p>}
  </div>
);

const ContBtn = ({ onClick, disabled, loading, label = 'Continue' }) => (
  <button onClick={onClick} disabled={disabled || loading} style={{
    padding: '14px 40px', borderRadius: 12, border: 'none',
    background: disabled || loading ? 'var(--border)' : RED,
    color: disabled || loading ? 'var(--ink-3)' : '#fff',
    fontFamily: FONTS.sans, fontSize: 15, fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all .12s', minWidth: 160, letterSpacing: 0.2,
  }}>
    {loading ? 'Saving…' : label}
  </button>
);

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)', padding: '0 0 24px', fontFamily: FONTS.sans,
  }}>
    ← Back
  </button>
);

// ── Progress stepper ──────────────────────────────────────────────────────────
const Stepper = ({ current, completed, onGoTo }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 32px 12px',
    background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto', gap: 0 }}>
    {STEPS.map((s, i) => {
      const done = completed.has(s.id);
      const active = s.id === current;
      const clickable = done || s.id < current;
      return (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div onClick={() => clickable && onGoTo(s.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              cursor: clickable ? 'pointer' : 'default', minWidth: 54, userSelect: 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: 13, transition: 'all .15s',
              background: done ? RED : active ? 'var(--ink)' : 'var(--surface)',
              color: done || active ? '#fff' : 'var(--ink-3)',
              border: done ? `2px solid ${RED}` : active ? '2px solid var(--ink)' : '2px solid var(--border)',
              boxShadow: active ? '0 0 0 3px rgba(220,38,38,0.12)' : 'none',
            }}>
              {done ? '✓' : s.id}
            </div>
            <div style={{ fontSize: 10, color: active ? 'var(--ink)' : done ? RED : 'var(--ink-3)',
              fontWeight: active || done ? 600 : 400, whiteSpace: 'nowrap' }}>
              {s.label}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: done ? RED : 'var(--border)',
              margin: '0 2px', marginBottom: 22, transition: 'background .25s', minWidth: 8 }} />
          )}
        </div>
      );
    })}
  </div>
);

// ── Subjects dropdown ─────────────────────────────────────────────────────────
const SubjectsDropdown = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = code => onChange(
    selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code]
  );
  const toggleDept = codes => {
    const allOn = codes.every(c => selected.includes(c));
    onChange(allOn ? selected.filter(c => !codes.includes(c)) : [...new Set([...selected, ...codes])]);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <FL req>Subjects you can teach</FL>
      <button onClick={() => setOpen(o => !o)} style={{
        ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', background: 'var(--surface)', textAlign: 'left',
        borderColor: open ? 'var(--ink)' : 'var(--border)',
      }}>
        <span style={{ color: selected.length ? 'var(--ink)' : 'var(--ink-3)', fontSize: 15 }}>
          {selected.length === 0
            ? 'Click to select subjects…'
            : `${selected.length} subject${selected.length !== 1 ? 's' : ''} selected`}
        </span>
        <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)', maxHeight: 380, overflowY: 'auto',
        }}>
          {SDSU_CLASSES.map(({ dept, codes }) => {
            const allOn = codes.every(c => selected.includes(c));
            return (
              <div key={dept} style={{ borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => toggleDept(codes)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', cursor: 'pointer', background: allOn ? RED_SOFT : 'transparent',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: allOn ? RED : 'var(--ink-2)' }}>{dept}</span>
                  <span style={{ fontSize: 11, color: allOn ? RED : 'var(--ink-3)' }}>
                    {allOn ? 'Deselect all' : 'Select all'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '4px 12px 10px' }}>
                  {codes.map(code => {
                    const on = selected.includes(code);
                    return (
                      <div key={code} onClick={() => toggle(code)} style={{
                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                        background: on ? RED : 'var(--surface-2)',
                        border: `1.5px solid ${on ? RED : 'var(--border)'}`,
                        color: on ? '#fff' : 'var(--ink-2)',
                        fontSize: 12, fontWeight: on ? 600 : 400,
                        fontFamily: FONTS.mono, textAlign: 'center',
                        transition: 'all .1s',
                      }}>{code}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {selected.length > 0 && (
            <div style={{ padding: '10px 16px', background: RED_SOFT, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: RED, fontWeight: 600 }}>{selected.length} selected</span>
              <button onClick={() => { onChange([]); setOpen(false); }}
                style={{ fontSize: 12, color: RED, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {selected.map(code => (
            <div key={code} onClick={() => toggle(code)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20,
              background: RED_SOFT, border: `1px solid ${RED_MID}`,
              fontSize: 12, color: RED, fontWeight: 600, cursor: 'pointer',
            }}>
              {code} <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Step 1: Basics ────────────────────────────────────────────────────────────
const S1 = ({ d, up, next }) => {
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);

  const go = () => {
    if (!d.firstName.trim() || !d.lastName.trim()) return setErr('First and last name are required.');
    if (!d.country && !d.countryOther?.trim()) return setErr('Please select your country of birth.');
    if (d.subjects.length === 0) return setErr('Select at least one subject you can tutor.');
    if (!d.email.trim() || !d.email.includes('@')) return setErr('Enter a valid email address.');
    if (d.password.length < 8) return setErr('Password must be at least 8 characters.');
    setErr('');
    next();
  };

  return (
    <div>
      <StepH step={1} title="Let's start with the basics."
        sub="Tell us who you are and which courses you'll be tutoring at SDSU." />
      <ErrBox msg={err} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <TInp label="First name" req value={d.firstName} onChange={v => up('firstName', v)} placeholder="Jane" />
        <TInp label="Last name" req value={d.lastName} onChange={v => up('lastName', v)} placeholder="Doe" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <SelInp label="Country of birth" req value={d.country} onChange={v => { up('country', v); if (v !== 'Other') up('countryOther', ''); }}
          options={COUNTRIES} placeholder="Select your country" />
        {d.country === 'Other' && (
          <input value={d.countryOther || ''} onChange={e => up('countryOther', e.target.value)}
            placeholder="Type your country…" style={{ ...inp, marginTop: 8 }} />
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <SubjectsDropdown selected={d.subjects} onChange={v => up('subjects', v)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <TInp label="Email" req type="email" value={d.email}
          onChange={v => up('email', v)} placeholder="you@sdsu.edu" />
        <div>
          <FL req>Password</FL>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={d.password}
              onChange={e => up('password', e.target.value)} placeholder="At least 8 characters"
              style={inp} />
            <button onClick={() => setShowPw(v => !v)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)',
            }}>{showPw ? 'Hide' : 'Show'}</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 36 }}>
        <TInp label="Phone number" type="tel" value={d.phone} onChange={v => up('phone', v)}
          placeholder="+1 (619) 000-0000"
          hint="Optional — students contact you through in-app messaging, not this number." />
      </div>

      <ContBtn onClick={go} />
    </div>
  );
};

// ── Step 2: Photo ─────────────────────────────────────────────────────────────
const S2 = ({ d, up, next, back }) => {
  const [err, setErr] = useState('');
  const ref = useRef(null);

  const handleFile = f => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setErr('Please upload a JPG, PNG, or image file.');
    if (f.size > 5 * 1024 * 1024) return setErr('Image must be under 5 MB.');
    setErr('');
    up('photoFile', f);
    up('photoUrl', URL.createObjectURL(f));
  };

  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={2} title="Add your profile photo."
        sub="Students are significantly more likely to book tutors with a clear, warm headshot." />
      <ErrBox msg={err} />

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 36 }}>
        <div onClick={() => ref.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          style={{
            width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            border: `3px dashed ${d.photoUrl ? RED : 'var(--border)'}`,
            background: d.photoUrl ? 'transparent' : 'var(--surface)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color .2s',
          }}>
          {d.photoUrl
            ? <img src={d.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.4 }}>Click or drag<br />to upload</div>
              </div>
          }
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ background: RED_SOFT, border: `1px solid ${RED_MID}`, borderRadius: 12,
            padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 10 }}>Photo guidelines</div>
            {['Face clearly visible, eyes at camera level', 'Good lighting, neutral background',
              'Professional or smart-casual attire', 'Recent, genuine photo — no avatars',
              'JPG or PNG, under 5 MB'].map(tip => (
              <div key={tip} style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 7,
                display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: RED, flexShrink: 0, marginTop: 1 }}>✓</span> {tip}
              </div>
            ))}
          </div>
          {d.photoUrl && (
            <button onClick={() => ref.current?.click()} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
            }}>Change photo</button>
          )}
        </div>
      </div>

      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])} />

      <div style={{ display: 'flex', gap: 12 }}>
        <ContBtn onClick={() => { if (!d.photoUrl) return setErr('Please upload a photo to continue.'); next(); }} />
        <button onClick={next} style={{
          padding: '14px 24px', borderRadius: 12, border: '1.5px solid var(--border)',
          background: 'transparent', cursor: 'pointer', fontSize: 14,
          color: 'var(--ink-3)', fontFamily: FONTS.sans,
        }}>Skip for now</button>
      </div>
    </div>
  );
};

// ── Step 3: Certification ─────────────────────────────────────────────────────
const S3 = ({ d, up, next, back }) => {
  const ref = useRef(null);

  const handleFile = f => {
    if (!f) return;
    up('certFile', f);
    up('certFileName', f.name);
    up('hasCertification', true);
  };

  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={3} title="Do you hold a teaching certification?"
        sub="Certified tutors receive a verified badge on their profile, which significantly increases booking trust." />

      {/* Skip option */}
      <button onClick={() => { up('hasCertification', false); up('certFile', null); next(); }} style={{
        display: 'flex', alignItems: 'center', gap: 16, width: '100%',
        padding: '16px 20px', borderRadius: 12, marginBottom: 20, fontFamily: FONTS.sans,
        border: `1.5px solid ${d.hasCertification === false ? RED : 'var(--border)'}`,
        background: d.hasCertification === false ? RED_SOFT : 'var(--surface)',
        cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)',
          border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✕</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>
            I don't have a teaching certification
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            Skip and move to the next step — you can still be a great tutor
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--ink-3)' }}>→</div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>or upload your certification</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div onClick={() => ref.current?.click()} style={{
        border: `2px dashed ${d.certFile ? RED : 'var(--border)'}`,
        borderRadius: 12, padding: '40px 24px', textAlign: 'center',
        background: d.certFile ? RED_SOFT : 'var(--surface)',
        cursor: 'pointer', transition: 'all .15s', marginBottom: 16,
      }}>
        {d.certFile ? (
          <>
            <div style={{ fontSize: 36, color: RED, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: RED }}>{d.certFileName}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Click to replace</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32, color: 'var(--ink-3)', marginBottom: 8 }}>⬆</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
              Drop your certification here
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>PDF, JPG, or PNG · reviewed within 24 hours</div>
          </>
        )}
      </div>

      {d.certFile && (
        <>
          <div style={{ background: RED_SOFT, border: `1px solid ${RED_MID}`, borderRadius: 10,
            padding: '14px 16px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>🏅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: RED }}>Verified badge pending review</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Our team will add a ✓ badge to your profile once your certification is approved.
              </div>
            </div>
          </div>
          <ContBtn onClick={next} />
        </>
      )}

      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
};

// ── Step 4: Education ─────────────────────────────────────────────────────────
const S4 = ({ d, up, next, back }) => {
  const [err, setErr] = useState('');
  const go = () => {
    if (!d.school.trim()) return setErr('Enter your school or university name.');
    if (!d.year) return setErr('Please select your current academic year.');
    if (!d.major.trim()) return setErr('Enter your major or field of study.');
    setErr('');
    next();
  };
  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={4} title="Your educational background."
        sub="Help students understand your qualifications and academic standing at a glance." />
      <ErrBox msg={err} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36 }}>
        <TInp label="School / University" req value={d.school} onChange={v => up('school', v)}
          placeholder="San Diego State University" />
        <SelInp label="Academic year" req value={d.year} onChange={v => up('year', v)}
          placeholder="Select year"
          options={['Freshman','Sophomore','Junior','Senior','Graduate student','PhD student','Alumni','Faculty']} />
        <TInp label="Major / Field of study" req value={d.major} onChange={v => up('major', v)}
          placeholder="e.g. Chemistry, Computer Science, Finance" />
        <TInp label="GPA" value={d.gpa} onChange={v => up('gpa', v)} placeholder="e.g. 3.8"
          hint="Optional — only shown on your profile if you choose to display it." />
      </div>
      <ContBtn onClick={go} />
    </div>
  );
};

// ── Step 5: Profile description ───────────────────────────────────────────────
const S5 = ({ d, up, next, back }) => {
  const [err, setErr] = useState('');
  const go = () => {
    if (d.headline.trim().length < 10) return setErr('Headline must be at least 10 characters.');
    if (d.bio.trim().length < 50) return setErr('Bio must be at least 50 characters — give students a real sense of who you are.');
    setErr('');
    next();
  };
  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={5} title="Tell your story."
        sub="Your headline and bio are the first things students see. Be specific, warm, and genuine — it makes all the difference." />
      <ErrBox msg={err} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 36 }}>
        <div>
          <FL req>Headline</FL>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
            A short, catchy line that sums up your teaching style or expertise
          </div>
          <input value={d.headline} onChange={e => up('headline', e.target.value.slice(0, 100))}
            placeholder={`e.g. "Orgo isn't scary — I know the exact SDSU exam patterns"`}
            style={inp} />
          <div style={{ fontSize: 11, color: d.headline.length > 85 ? RED : 'var(--ink-3)',
            marginTop: 4, textAlign: 'right' }}>{d.headline.length}/100</div>
        </div>

        <TArea label="Bio" req value={d.bio} onChange={v => up('bio', v)} rows={6}
          placeholder="Who are you, why are you a great fit, and what makes your sessions different? Mention your experience with these courses, your teaching approach, and what students can expect from a session with you."
          hint={`${d.bio.length} characters · minimum 50`} />

        <TArea label="Teaching experience" value={d.teachingExperience}
          onChange={v => up('teachingExperience', v)} rows={4}
          placeholder="e.g. TA for CHEM 200 under Dr. Nakamura for 2 semesters; tutored 20+ students privately; ran weekly study groups..."
          hint="Optional but strongly recommended — mention any TA work, tutoring, or mentoring experience." />
      </div>
      <ContBtn onClick={go} />
    </div>
  );
};

// ── Step 6: Video introduction ────────────────────────────────────────────────
const S6 = ({ d, up, next, back }) => {
  const [tab, setTab] = useState('upload');
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [recErr, setRecErr] = useState('');
  const videoRef    = useRef(null);
  const recorderRef = useRef(null);
  const streamRef   = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);
  const uploadRef   = useRef(null);
  const thumbRef    = useRef(null);

  const handleUpload = f => {
    if (!f) return;
    up('videoFile', f);
    up('videoUrl', URL.createObjectURL(f));
  };

  const handleThumb = f => {
    if (!f || !f.type.startsWith('image/')) return;
    up('thumbnailFile', f);
    up('thumbnailUrl', URL.createObjectURL(f));
  };

  const startRec = async () => {
    try {
      setRecErr('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        up('videoFile', blob);
        up('videoUrl', url);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.muted = false;
          videoRef.current.controls = true;
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start(100);
      recorderRef.current = mr;
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch {
      setRecErr('Camera access was denied. Please allow camera & microphone permissions and try again.');
    }
  };

  const stopRec = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const dos = [
    'Between 30 seconds and 2 minutes long',
    'Record in horizontal mode at eye level',
    'Good lighting and neutral background',
    'Use a stable surface — no shaky footage',
    'Face and eyes fully visible',
    'Highlight teaching experience and any certifications',
    'Greet students warmly and invite them to book',
  ];
  const donts = [
    "Include your surname or any contact details",
    "Include logos or links",
    "Use slideshows or presentations",
    "Have any other people visible in the video",
  ];

  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={6} title="Record your intro video."
        sub="A personal video dramatically increases your booking rate. Students love seeing who they'll be learning from." />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: upload / record */}
        <div style={{ flex: 2, minWidth: 300 }}>
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
            {[['upload', '⬆  Upload video'], ['record', '● Record now']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? RED : 'var(--ink-3)', fontFamily: FONTS.sans,
                borderBottom: tab === t ? `2px solid ${RED}` : '2px solid transparent',
                marginBottom: -2, transition: 'all .12s',
              }}>{l}</button>
            ))}
          </div>

          {tab === 'upload' && (
            <div>
              {!d.videoUrl ? (
                <div onClick={() => uploadRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files?.[0]); }}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px',
                    textAlign: 'center', background: 'var(--surface)', cursor: 'pointer', marginBottom: 16,
                  }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🎬</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--ink)' }}>
                    Drop your video here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>MP4, MOV, or WebM · max 200 MB</div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <video src={d.videoUrl} controls style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 300 }} />
                  <button onClick={() => { up('videoFile', null); up('videoUrl', ''); }}
                    style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Remove video
                  </button>
                </div>
              )}
              <input ref={uploadRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => handleUpload(e.target.files?.[0])} />
            </div>
          )}

          {tab === 'record' && (
            <div>
              {recErr && <ErrBox msg={recErr} />}
              <div style={{ borderRadius: 10, overflow: 'hidden', background: '#111', marginBottom: 12,
                position: 'relative', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} autoPlay muted={recording}
                  style={{ width: '100%', maxHeight: 300, display: recording || d.videoUrl ? 'block' : 'none' }} />
                {!recording && !d.videoUrl && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📹</div>
                    <div style={{ fontSize: 14, color: '#aaa' }}>Camera preview will appear here</div>
                  </div>
                )}
                {recording && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: RED, color: '#fff',
                    padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff',
                      animation: 'recpulse 1s infinite' }} />
                    {fmt(recTime)}
                  </div>
                )}
              </div>
              {!recording
                ? <button onClick={startRec} style={{ width: '100%', padding: '13px', borderRadius: 10,
                    border: 'none', background: RED, color: '#fff', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONTS.sans }}>▶ Start recording</button>
                : <button onClick={stopRec} style={{ width: '100%', padding: '13px', borderRadius: 10,
                    border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONTS.sans }}>■ Stop recording</button>
              }
            </div>
          )}

          {/* Thumbnail */}
          <div style={{ marginTop: 20, padding: 16, background: 'var(--surface-2)',
            borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Thumbnail <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
              Upload a custom image that appears as your video preview
            </div>
            {d.thumbnailUrl
              ? <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={d.thumbnailUrl} alt="Thumbnail"
                    style={{ width: 150, height: 84, objectFit: 'cover', borderRadius: 6 }} />
                  <button onClick={() => { up('thumbnailFile', null); up('thumbnailUrl', ''); }}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                      border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer',
                      fontSize: 14, lineHeight: '22px', padding: 0 }}>×</button>
                </div>
              : <button onClick={() => thumbRef.current?.click()} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--border)',
                  background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)',
                }}>+ Add thumbnail</button>
            }
            <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleThumb(e.target.files?.[0])} />
          </div>
        </div>

        {/* Right: requirements */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ background: RED_SOFT, border: `1px solid ${RED_MID}`, borderRadius: 12,
            padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: RED, textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 10 }}>Do's</div>
            {dos.map(t => (
              <div key={t} style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 7,
                display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span style={{ color: RED, flexShrink: 0 }}>✓</span>{t}
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 10 }}>Don'ts</div>
            {donts.map(t => (
              <div key={t} style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 7,
                display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>✕</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
        <ContBtn onClick={next} label={d.videoUrl ? 'Continue' : 'Skip for now'} />
      </div>

      <style>{`@keyframes recpulse { 0%,100%{opacity:1} 50%{opacity:.25} }`}</style>
    </div>
  );
};

// ── Step 7: Schedule + timezone ───────────────────────────────────────────────
const S7 = ({ d, up, next, back }) => {
  const [err, setErr] = useState('');
  const slotKey = (day, h) => `${day}-${h}`;
  const isOn = (day, h) => !!d.slots[slotKey(day, h)];
  const toggle = (day, h) => up('slots', { ...d.slots, [slotKey(day, h)]: !d.slots[slotKey(day, h)] });
  const toggleDay = day => {
    const allOn = SCHEDULE_HOURS.every(h => isOn(day, h));
    const next = { ...d.slots };
    SCHEDULE_HOURS.forEach(h => { next[slotKey(day, h)] = !allOn; });
    up('slots', next);
  };
  const count = Object.values(d.slots).filter(Boolean).length;

  const applyPreset = id => {
    if (id === 'clear') { up('slots', {}); return; }
    const next = {};
    const days = id === 'weekdays' ? ['Mon','Tue','Wed','Thu','Fri'] : SCHEDULE_DAYS;
    days.forEach(day => {
      SCHEDULE_HOURS.forEach(h => {
        const hr = parseInt(h), pm = h.includes('PM');
        const hr24 = pm && hr !== 12 ? hr + 12 : (!pm && hr === 12 ? 0 : hr);
        if (id === 'weekdays' && hr24 >= 9 && hr24 < 17) next[slotKey(day, h)] = true;
        if (id === 'evenings' && hr24 >= 17) next[slotKey(day, h)] = true;
      });
    });
    up('slots', next);
  };

  const go = () => {
    if (count === 0) return setErr('Select at least a few available time slots so students can book you.');
    if (!d.timezone) return setErr('Please select your timezone.');
    setErr('');
    next();
  };

  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={7} title="Set your weekly availability."
        sub="Students can only book you during these hours. You can always adjust this from your dashboard later." />
      <ErrBox msg={err} />

      <div style={{ marginBottom: 24 }}>
        <SelInp label="Your timezone" req value={d.timezone} onChange={v => up('timezone', v)}
          options={TIMEZONES} placeholder="Select timezone" />
      </div>

      {count > 0 && (
        <div style={{ padding: '9px 14px', background: RED_SOFT, border: `1px solid ${RED_MID}`,
          borderRadius: 8, fontSize: 13, color: RED, fontWeight: 600, marginBottom: 14, display: 'inline-block' }}>
          {count} hour{count !== 1 ? 's' : ''} selected per week
        </div>
      )}

      {/* Quick presets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['Weekdays 9–5', 'weekdays'], ['Evenings', 'evenings'], ['Clear all', 'clear']].map(([l, k]) => (
          <button key={k} onClick={() => applyPreset(k)} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)',
            fontFamily: FONTS.sans,
          }}>{l}</button>
        ))}
        <div style={{ fontSize: 12, color: 'var(--ink-3)', alignSelf: 'center', marginLeft: 4 }}>
          Click day headers to toggle entire column
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <div style={{ minWidth: 540 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            <div />
            {SCHEDULE_DAYS.map(day => (
              <div key={day} onClick={() => toggleDay(day)} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
                cursor: 'pointer', padding: '5px 0', borderRadius: 6, userSelect: 'none',
                transition: 'color .1s',
              }}>{day}</div>
            ))}
          </div>
          {SCHEDULE_HOURS.map(h => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: FONTS.mono,
                paddingTop: 5, paddingRight: 6, textAlign: 'right', lineHeight: 1 }}>{h}</div>
              {SCHEDULE_DAYS.map(day => {
                const on = isOn(day, h);
                return (
                  <div key={day} onClick={() => toggle(day, h)} style={{
                    height: 24, borderRadius: 4, cursor: 'pointer',
                    background: on ? RED : 'var(--surface-2)',
                    border: `1px solid ${on ? RED : 'var(--border)'}`,
                    transition: 'all .08s',
                  }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ContBtn onClick={go} />
    </div>
  );
};

// ── Step 8: Pricing + submit ──────────────────────────────────────────────────
const S8 = ({ d, up, onSubmit, submitting, submitError, back }) => {
  const [err, setErr] = useState('');
  const rate = Number(d.rate);

  const go = () => {
    if (!rate || rate < 5) return setErr('Please enter a valid hourly rate (minimum $5).');
    setErr('');
    onSubmit();
  };

  const feedback = !rate ? '' : rate < 20
    ? '⚠ This might be too low — consider $25–$35 to be taken seriously.'
    : rate <= 35 ? '✓ Great starting rate for a new tutor on Study Buddy.'
    : rate <= 50 ? '✓ Competitive — build a few reviews first and you\'ll fill up fast.'
    : '⚠ Consider starting a bit lower to land your first bookings, then raise your rate.';

  return (
    <div>
      <BackBtn onClick={back} />
      <StepH step={8} title="Set your hourly rate."
        sub="You can change this any time from your dashboard. Start accessible, build reviews, then raise your price." />
      <ErrBox msg={err || submitError} />

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <FL req>Hourly rate (USD)</FL>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 20, fontWeight: 600, color: 'var(--ink-2)' }}>$</span>
            <input type="number" min="5" max="300" value={d.rate}
              onChange={e => up('rate', e.target.value)} placeholder="35"
              style={{ ...inp, paddingLeft: 34, paddingRight: 44, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>/hr</span>
          </div>
          {feedback && (
            <div style={{
              padding: '10px 14px',
              background: feedback.startsWith('⚠') ? '#FFFBEB' : RED_SOFT,
              border: `1px solid ${feedback.startsWith('⚠') ? '#FCD34D' : RED_MID}`,
              borderRadius: 8, fontSize: 13,
              color: feedback.startsWith('⚠') ? '#92400E' : RED,
            }}>{feedback}</div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 12 }}>Pricing tips</div>
            {[
              'Most new tutors start at $25–$40/hr',
              'Once you have 3+ reviews, charge more easily',
              'Students tip well when sessions go great',
              'Study Buddy takes a 10% service fee',
              'You can update your rate from your dashboard anytime',
            ].map(t => (
              <div key={t} style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8,
                display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: RED, flexShrink: 0 }}>→</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', background: RED_SOFT, border: `1px solid ${RED_MID}`,
        borderRadius: 12, marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
          By submitting you agree to Study Buddy's{' '}
          <span style={{ color: RED, textDecoration: 'underline', cursor: 'pointer' }}>Tutor Terms of Service</span>
          {' '}and confirm all provided information is accurate.
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Our team reviews applications within 24–48 hours. You'll receive an email once approved and live.
        </div>
      </div>

      <ContBtn onClick={go} loading={submitting} label={submitting ? 'Submitting application…' : 'Submit application →'} />
    </div>
  );
};

// ── Submitted confirmation ────────────────────────────────────────────────────
const Submitted = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: RED_SOFT,
        border: `3px solid ${RED}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 36, marginBottom: 28 }}>✓</div>
      <h1 style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, margin: '0 0 14px', letterSpacing: -1 }}>
        Application submitted!
      </h1>
      <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 460, lineHeight: 1.65, margin: '0 0 36px' }}>
        Our team reviews applications within 24–48 hours. You'll receive an email once you're
        approved and live on Study Buddy.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => navigate('/')} style={{
          padding: '14px 36px', borderRadius: 12, border: 'none', background: 'var(--ink)',
          color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: FONTS.sans,
        }}>Back to home</button>
        <button onClick={() => navigate('/signin')} style={{
          padding: '14px 36px', borderRadius: 12, border: '1.5px solid var(--border)',
          background: 'transparent', color: 'var(--ink)', fontSize: 15, cursor: 'pointer',
          fontFamily: FONTS.sans,
        }}>Sign in</button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export default function TutorOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [d, setD] = useState({
    firstName: '', lastName: '', country: '', countryOther: '', subjects: [], email: '', password: '', phone: '',
    photoFile: null, photoUrl: '',
    hasCertification: null, certFile: null, certFileName: '',
    school: 'San Diego State University', year: '', major: '', gpa: '',
    headline: '', bio: '', teachingExperience: '',
    videoFile: null, videoUrl: '', thumbnailFile: null, thumbnailUrl: '',
    slots: {},
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
    rate: '',
  });

  const up = (key, val) => setD(prev => ({ ...prev, [key]: val }));

  const markDone = s => {
    setCompleted(prev => new Set([...prev, s]));
    setStep(s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goTo = s => {
    if (completed.has(s) || s <= step) {
      setStep(s);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: d.email, password: d.password,
          options: { data: { full_name: `${d.firstName} ${d.lastName}`, role: 'tutor', transcript_submitted: false, application_status: 'pending_review' } },
      });
      if (authErr) throw new Error(authErr.message);
      if (authData.user?.identities?.length === 0)
        throw new Error('An account with this email already exists. Please sign in instead.');

      const userId = authData.user?.id;
      const session = authData.session;

      // Helper: upload a file and return its public URL
      const upload = async (bucket, path, file) => {
        if (!file || !session) return '';
        const { data: u } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        if (!u?.path) return '';
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(u.path);
        return pub?.publicUrl || '';
      };

      const ext = f => (f?.name ?? '').split('.').pop() || 'bin';
      const [photoUrl, certPath, videoUrl, thumbUrl] = await Promise.all([
        upload('avatars',     `${userId}/profile.${ext(d.photoFile)}`,    d.photoFile),
        upload('certifications', `${userId}/cert.${ext(d.certFile)}`,     d.certFile),
        upload('intro-videos',`${userId}/intro.${ext(d.videoFile) || 'webm'}`, d.videoFile),
        upload('intro-videos',`${userId}/thumb.${ext(d.thumbnailFile)}`,  d.thumbnailFile),
      ]);

      await supabase.from('tutor_profiles').upsert({
        user_id: userId,
        email: d.email,
        first_name: d.firstName, last_name: d.lastName,
        country: d.country === 'Other' ? (d.countryOther || 'Other') : d.country, phone: d.phone,
        photo_url: photoUrl,
        has_certification: d.hasCertification === true,
        certification_path: certPath,
        school: d.school, year: d.year, major: d.major, gpa: d.gpa,
        headline: d.headline, bio: d.bio,
        teaching_experience: d.teachingExperience,
        video_url: videoUrl, video_thumbnail_url: thumbUrl,
        timezone: d.timezone,
        class_codes: d.subjects,
        rate: Number(d.rate),
        transcript_submitted: false,
        application_status: 'pending_review',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      const slotRows = Object.entries(d.slots).filter(([, v]) => v).map(([k]) => {
        const idx = k.indexOf('-');
        return { tutor_id: userId, day: k.slice(0, idx), hour: k.slice(idx + 1) };
      });
      if (slotRows.length > 0) await supabase.from('tutor_availability').insert(slotRows);

      // Notify admin by email (fire-and-forget — don't block on failure)
      supabase.functions.invoke('notify-new-application', {
        body: { name: `${d.firstName} ${d.lastName}`, email: d.email, subjects: d.subjects, rate: d.rate },
      }).catch(() => {});

      setSubmitted(true);
    } catch (e) {
      setSubmitError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <Submitted />;

  const shared = { d, up };
  const stepProps = n => ({ ...shared, next: () => markDone(n), back: () => goTo(n - 1) });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '14px 28px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', flexShrink: 0 }}><Logo size={22} /></div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>
          Tutor application
        </div>
        <div style={{ fontSize: 13, color: RED, fontWeight: 600, flexShrink: 0 }}>
          {completed.size}/8 completed
        </div>
      </nav>

      {/* Stepper */}
      <Stepper current={step} completed={completed} onGoTo={goTo} />

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 820, width: '100%', margin: '0 auto', padding: '44px 28px 100px' }}>
        {step === 1 && <S1 {...shared} next={() => markDone(1)} />}
        {step === 2 && <S2 {...stepProps(2)} />}
        {step === 3 && <S3 {...stepProps(3)} />}
        {step === 4 && <S4 {...stepProps(4)} />}
        {step === 5 && <S5 {...stepProps(5)} />}
        {step === 6 && <S6 {...stepProps(6)} />}
        {step === 7 && <S7 {...stepProps(7)} />}
        {step === 8 && <S8 {...shared} onSubmit={handleSubmit} submitting={submitting}
          submitError={submitError} back={() => goTo(7)} />}
      </div>
    </div>
  );
}
