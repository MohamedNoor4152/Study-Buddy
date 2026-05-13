import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo, Btn, Avatar, Icon, Chip, CourseTag } from '../../components/primitives/index.jsx';
import { CLASSES } from '../../data.js';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';

// ────────────────────────── Field helper ──────────────────────────
const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      width: '100%', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 14px', fontFamily: FONTS.sans, fontSize: 15, color: 'var(--ink)',
      background: 'var(--surface)', outline: 'none', boxSizing: 'border-box',
    }} />
  </div>
);

// ────────────────────────── Reusable input ──────────────────────────
const SBInput = ({ label, value, onChange, placeholder, type = 'text', hint, suffix }) => (
  <div>
    {label && <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>{label}</div>}
    <div style={{ position: 'relative' }}>
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid var(--border)', borderRadius: 10,
          padding: '12px 14px', paddingRight: suffix ? 80 : 14,
          fontFamily: FONTS.sans, fontSize: 15, color: 'var(--ink)',
          background: 'var(--surface)', outline: 'none',
        }} />
      {suffix && <span style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        fontSize: 11, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer',
      }}>{suffix}</span>}
    </div>
    {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{hint}</div>}
  </div>
);

const SBToggle = ({ on, onChange }) => (
  <button onClick={() => onChange?.(!on)} style={{
    width: 40, height: 22, borderRadius: 11, padding: 2, cursor: 'pointer',
    border: 'none', background: on ? 'var(--accent)' : 'var(--border)', transition: 'background .15s',
    flexShrink: 0,
  }}>
    <div style={{
      width: 18, height: 18, borderRadius: 9, background: '#fff',
      transform: `translateX(${on ? 18 : 0}px)`, transition: 'transform .15s',
      boxShadow: '0 1px 2px rgba(0,0,0,.2)',
    }} />
  </button>
);

// ────────────────────────── Universal Footer ──────────────────────────
export const SBFooter = ({ onNav, slim }) => {
  const navigate = useNavigate();
  const nav = (k) => {
    if (onNav) { onNav(k); return; }
    const routes = { help: '/help', terms: '/terms', privacy: '/privacy', about: '/about', browse: '/browse', signup: '/signup', 'tutor-apply': '/tutor-apply' };
    if (routes[k]) navigate(routes[k]);
  };

  if (slim) return (
    <footer style={{
      padding: '20px 56px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Logo size={16} />
        <span>© 2026 · Made for SDSU students, by SDSU students</span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {[['help','Help'],['terms','Terms'],['privacy','Privacy'],['about','About']].map(([k,l]) => (
          <button key={k} onClick={() => nav(k)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)' }}>{l}</button>
        ))}
      </div>
    </footer>
  );

  return (
    <footer style={{ padding: '40px 56px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 28 }}>
        <div style={{ maxWidth: 280 }}>
          <Logo size={20} />
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginTop: 12 }}>
            Made for SDSU students, by SDSU students. Aztec for life.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 56 }}>
          {[
            { h: 'Product', l: [['browse','Browse classes'],['tutor-apply','Become a tutor'],['help','How it works']] },
            { h: 'Company', l: [['about','About'],['help','Contact']] },
            { h: 'Legal', l: [['terms','Terms'],['privacy','Privacy'],['help','Trust & safety']] },
          ].map(col => (
            <div key={col.h}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>{col.h}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.l.map(([k,l]) => (
                  <button key={l} onClick={() => nav(k)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--ink-2)', padding: 0 }}>{l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
        <div>© 2026 Study Buddy · Not affiliated with San Diego State University</div>
        <div>San Diego, CA</div>
      </div>
    </footer>
  );
};

// ────────────────────────── Universal Top Nav ──────────────────────────
export const SBUserMenu = ({ onNav }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setConfirmLogout(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const firstName = fullName.split(' ')[0];
  const initials = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = user?.user_metadata?.avatar_url || '';

  const nav = (k) => {
    if (onNav) { onNav(k); return; }
    const routes = { settings: '/settings', dashboard: '/dashboard', help: '/help', tutorDash: '/tutor-dashboard', signin: '/signin' };
    if (routes[k]) navigate(routes[k]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    setConfirmLogout(false);
    navigate('/');
  };

  const isTutor = user?.user_metadata?.role === 'tutor';
  const items = [
    ['settings','Settings'],
    ['dashboard','My sessions'],
    ['help','Help center'],
    ...(isTutor ? [['tutorDash','Switch to tutor view']] : []),
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
        border: '1px solid var(--border)', borderRadius: 100, padding: '4px 10px 4px 4px', cursor: 'pointer',
      }}>
        <Avatar initials={initials} src={avatarUrl || undefined} color="oklch(0.78 0.12 65)" size={28} />
        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{firstName}</span>
        <Icon name="chevDown" size={11} style={{ color: 'var(--ink-3)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 220,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 8, boxShadow: '0 12px 36px rgba(0,0,0,.12)', zIndex: 30,
        }}>
          <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar initials={initials} src={avatarUrl || undefined} color="oklch(0.78 0.12 65)" size={34} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{fullName}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{user?.email || ''}</div>
            </div>
          </div>
          {items.map(([k,l]) => (
            <button key={k} onClick={() => { setOpen(false); nav(k); }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 12px', borderRadius: 8, background: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
            }}>{l}</button>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
          {confirmLogout ? (
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>Are you sure you want to log out?</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmLogout(false)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--surface)', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink)',
                }}>Cancel</button>
                <button onClick={handleLogout} style={{
                  flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
                  background: 'oklch(0.55 0.18 25)', cursor: 'pointer', fontSize: 12.5, color: '#fff', fontWeight: 600,
                }}>Log out</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmLogout(true)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 12px', borderRadius: 8, background: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 13, color: 'oklch(0.55 0.18 25)',
            }}>Log out</button>
          )}
        </div>
      )}
    </div>
  );
};

export const SBNav = ({ active, onNav, signedIn = true, role = 'student' }) => {
  const navigate = useNavigate();
  const nav = (k) => {
    if (onNav) { onNav(k); return; }
    const routes = { landing: '/', browse: '/browse', dashboard: '/dashboard', messages: '/messages', tutorMessages: '/tutor-messages', tutorDash: '/tutor-dashboard', schedule: '/tutor-dashboard/schedule', payouts: '/payouts', signin: '/signin', signup: '/signup', help: '/help' };
    if (routes[k]) navigate(routes[k]);
  };
  const links = role === 'tutor'
    ? [['tutorDash','Dashboard'],['schedule','Schedule'],['payouts','Earnings'],['tutorMessages','Messages']]
    : [['browse','Browse classes'],['dashboard','My sessions'],['messages','Messages']];
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 56px', borderBottom: '1px solid var(--border)', background: 'var(--bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div onClick={() => nav('landing')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        {signedIn && (
          <div style={{ display: 'flex', gap: 4 }}>
            {links.map(([k,l]) => {
              const isActive = active === k;
              return (
                <button key={k} onClick={() => nav(k)} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                  fontFamily: FONTS.sans, fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                }}>{l}</button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav('help')} style={{ background: 'transparent', border: 'none', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', padding: '6px 10px' }}>Help</button>
        {signedIn ? <SBUserMenu onNav={onNav} /> : (
          <>
            <Btn variant="plain" size="sm" onClick={() => nav('signin')}>Log in</Btn>
            <Btn variant="dark" size="sm" onClick={() => nav('signup')}>Sign up</Btn>
          </>
        )}
      </div>
    </nav>
  );
};

// ────────────────────────── Sign Up Flow ──────────────────────────
export const SignUpFlow = () => {
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const [step, setStep] = useState(routeState?.role ? 2 : 1);
  const [role, setRole] = useState(routeState?.role || null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [classes, setClasses] = useState([]);
  const [signupError, setSignupError] = useState('');
  const [loading, setLoading] = useState(false);
  const toggleClass = c => setClasses(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);

  const handleDone = async () => {
    setLoading(true);
    setSignupError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, year, role, classes, transcript_submitted: false } },
    });
    setLoading(false);
    if (error) { setSignupError(error.message); return; }
    // Supabase silently succeeds for duplicate emails — detect via empty identities
    if (data?.user && data.user.identities?.length === 0) {
      setStep(2);
      setSignupError('An account with this email already exists. Try signing in instead.');
      return;
    }
    if (role === 'tutor') {
      navigate('/tutor-verify', { state: { email } });
    } else if (data?.session) {
      // Email confirmation is off — user is already logged in
      navigate('/home');
    } else {
      // Email confirmation is on — send to verify screen
      navigate('/verify-email', { state: { email } });
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Step {step} of 3</div>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}>
          <Icon name="chevLeft" size={12} /> Back to home
        </div>
      </nav>

      <div style={{ height: 3, background: 'var(--border)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(step / 3) * 100}%`, background: 'var(--accent)', transition: 'width .3s' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 56px' }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          {step === 1 && (
            <>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>WELCOME</div>
              <h1 style={{ fontFamily: FONTS.serif, fontSize: 48, fontWeight: 400, margin: '0 0 14px', letterSpacing: -0.9, lineHeight: 1 }}>
                How will you use Study Buddy?
              </h1>
              <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: '0 0 32px' }}>
                You can always switch later from your profile.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { k: 'student', t: 'Find a tutor', b: 'I need help with one of my classes', i: 'book' },
                  { k: 'tutor', t: 'Become a tutor', b: 'I aced a class and want to help others', i: 'graduation' },
                ].map(o => (
                  <div key={o.k} onClick={() => setRole(o.k)} style={{
                    padding: 24, borderRadius: 14, cursor: 'pointer',
                    background: role === o.k ? 'var(--accent-soft)' : 'var(--surface)',
                    border: `2px solid ${role === o.k ? 'var(--accent)' : 'var(--border)'}`,
                    transition: 'all .12s',
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: role === o.k ? 'var(--accent)' : 'var(--surface-2)', color: role === o.k ? 'var(--accent-ink)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <Icon name={o.i} size={20} />
                    </div>
                    <h3 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: '0 0 6px', letterSpacing: -0.3 }}>{o.t}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.4 }}>{o.b}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32 }}>
                <Btn fullWidth size="lg" onClick={() => {
                  if (!role) return;
                  if (role === 'tutor') { navigate('/tutor-apply'); return; }
                  setStep(2);
                }} style={{ opacity: role ? 1 : 0.4 }}>Continue</Btn>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>YOUR INFO</div>
              <h1 style={{ fontFamily: FONTS.serif, fontSize: 48, fontWeight: 400, margin: '0 0 14px', letterSpacing: -0.9, lineHeight: 1 }}>
                Let's set up your account.
              </h1>
              <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: '0 0 32px' }}>
                We'll verify your .sdsu.edu email to keep Study Buddy student-only.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Full name" value={name} onChange={setName} placeholder="Alex Kim" />
                <Field label="SDSU email" value={email} onChange={setEmail} placeholder="akim@sdsu.edu" />
                <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>Year</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad'].map(y => (
                      <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>
                    ))}
                  </div>
                </div>
              </div>
              {signupError && (
                <div style={{ fontSize: 13, color: 'oklch(0.55 0.18 25)', marginTop: 14 }}>{signupError}</div>
              )}
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <Btn variant="ghost" size="lg" onClick={() => setStep(1)}>Back</Btn>
                <Btn fullWidth size="lg" onClick={() => { setSignupError(''); setStep(3); }} style={{ opacity: (name && email && password && year) ? 1 : 0.4 }}>Continue</Btn>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>
                {role === 'tutor' ? "CLASSES YOU'VE ACED" : 'YOUR CURRENT CLASSES'}
              </div>
              <h1 style={{ fontFamily: FONTS.serif, fontSize: 48, fontWeight: 400, margin: '0 0 14px', letterSpacing: -0.9, lineHeight: 1 }}>
                {role === 'tutor' ? 'What can you teach?' : 'What are you taking?'}
              </h1>
              <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: '0 0 24px' }}>
                {role === 'tutor'
                  ? "Pick classes you got a B+ or higher in. We'll ask for a transcript screenshot for verification."
                  : 'Pick your classes so we can match you with tutors.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 32 }}>
                {CLASSES.map(c => {
                  const on = classes.includes(c.code);
                  return (
                    <div key={c.code} onClick={() => toggleClass(c.code)} style={{
                      padding: 14, borderRadius: 10, cursor: 'pointer',
                      background: on ? 'var(--accent-soft)' : 'var(--surface)',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <CourseTag code={c.code} size={11} />
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>{c.title}</div>
                      </div>
                      {on && <Icon name="check" size={16} style={{ color: 'var(--accent)' }} />}
                    </div>
                  );
                })}
              </div>
              {signupError && (
                <div style={{ fontSize: 13, color: 'oklch(0.55 0.18 25)', marginBottom: 8 }}>{signupError}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" size="lg" onClick={() => setStep(2)}>Back</Btn>
                <Btn fullWidth size="lg" onClick={handleDone} style={{ opacity: (classes.length && !loading) ? 1 : 0.4 }}>
                  {loading ? 'Creating account…' : role === 'tutor' ? 'Set up my tutor profile' : 'Find my tutors'}
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────── Sign In ──────────────────────────
export const SignInScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !pw || loading) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setError('Wrong email or password. Try again.'); return; }
    const role = data?.user?.user_metadata?.role;
    navigate(role === 'tutor' ? '/tutor-dashboard' : '/home');
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 56px', borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          New here?{' '}
          <button onClick={() => navigate('/signup')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, padding: 0, fontSize: 13 }}>
            Create an account
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>WELCOME BACK</div>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: '0 0 8px', letterSpacing: -0.8 }}>Sign in</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 28px' }}>Use your SDSU email to continue.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onKeyDown={e => e.key === 'Enter' && handleSignIn()}>
            <SBInput label="SDSU email" value={email} onChange={setEmail} placeholder="akim@sdsu.edu" />
            <SBInput label="Password" value={pw} onChange={setPw} placeholder="••••••••" type="password" suffix={<span onClick={() => navigate('/forgot-password')} style={{ cursor: 'pointer' }}>Forgot?</span>} />
          </div>
          {error && <div style={{ fontSize: 13, color: 'oklch(0.55 0.18 25)', marginTop: 10 }}>{error}</div>}
          <Btn fullWidth size="lg" onClick={handleSignIn} style={{ marginTop: 22, opacity: (email && pw && !loading) ? 1 : 0.4 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────── Password Reset ──────────────────────────
const PwStrength = ({ pw }) => {
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const labels = ['', 'Weak', 'OK', 'Good', 'Strong'];
  const colors = ['transparent', 'oklch(0.65 0.18 25)', 'oklch(0.7 0.15 65)', 'oklch(0.7 0.16 130)', 'oklch(0.55 0.16 150)'];
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? colors[score] : 'var(--border)' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{pw ? labels[score] : '8+ chars · letters and numbers'}</div>
    </div>
  );
};

export const PasswordResetScreen = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('request');
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [sending, setSending] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resendBlocked, setResendBlocked] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // When user clicks the reset link in their email, Supabase redirects back here
  // and fires a PASSWORD_RECOVERY event — automatically advance to the reset form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendLink = async (isResend = false) => {
    if (!email.includes('@')) return;
    // Block the step-1 send button silently during cooldown
    if (!isResend && cooldown > 0) return;
    // For resend, reveal the live timer instead of sending
    if (isResend && cooldown > 0) {
      setResendBlocked(true);
      return;
    }
    setSending(true);
    setResetError('');
    setResendMsg('');
    setResendBlocked(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    setSending(false);
    if (error) {
      // Parse wait time from Supabase rate-limit message, e.g. "...after 30 seconds"
      const secs = parseInt(error.message.match(/after (\d+) second/)?.[1] || '0', 10);
      if (secs > 0) {
        setCooldown(secs);
        if (isResend) setResendBlocked(true);
        else setResetError(''); // clear static text — live countdown shows instead
      } else {
        if (isResend) setResendMsg(error.message);
        else setResetError(error.message);
      }
      return;
    }
    // Start 60s cooldown silently after every successful send
    setCooldown(60);
    if (isResend) {
      setResendMsg('Link sent! Check your inbox.');
      setTimeout(() => setResendMsg(''), 4000);
    } else {
      setStage('sent');
    }
  };

  const handleUpdatePassword = async () => {
    if (!pw1 || pw1 !== pw2 || pw1.length < 8) return;
    setUpdating(true);
    setUpdateError('');
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setUpdating(false);
    if (error) { setUpdateError(error.message); return; }
    navigate('/signin');
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: '1px solid var(--border)', gap: 20 }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <button onClick={() => navigate('/signin')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', marginLeft: 20 }}>
          <Icon name="chevLeft" size={12} /> Back to sign in
        </button>
      </nav>

      <div style={{ maxWidth: 460, margin: '64px auto', padding: '0 24px' }}>
        {stage === 'request' && (
          <>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>STEP 1 OF 2</div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.8, lineHeight: 1 }}>Reset your password.</h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 28px', lineHeight: 1.5 }}>Enter your email — we'll send you a reset link.</p>
            <SBInput label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
            {resetError && <div style={{ marginTop: 10, fontSize: 13, color: 'oklch(0.55 0.18 25)' }}>{resetError}</div>}
            {cooldown > 0 && !resetError && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'oklch(0.55 0.18 25)' }}>
                Please wait — you can resend in{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{cooldown}s</span>.
              </div>
            )}
            <Btn fullWidth size="lg" onClick={() => handleSendLink(false)} style={{ marginTop: 22, opacity: (email.includes('@') && !sending && cooldown === 0) ? 1 : 0.4 }}>
              {sending ? 'Sending…' : cooldown > 0 ? `Wait ${cooldown}s…` : 'Send reset link'}
            </Btn>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
              Remember it? <button onClick={() => navigate('/signin')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', padding: 0 }}>Sign in</button>
            </div>
          </>
        )}
        {stage === 'sent' && (
          <div style={{ textAlign: 'center', paddingTop: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, margin: '0 auto 22px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
            </div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.6 }}>Check your inbox.</h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 28px', lineHeight: 1.5 }}>
              We sent a link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click it to reset your password, then log back in.
            </p>
            {resendBlocked && cooldown > 0 && (
              <div style={{ fontSize: 13, color: 'oklch(0.55 0.18 25)', fontWeight: 500, marginBottom: 6 }}>
                Email already sent — wait for the timer then try again.{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>({cooldown}s)</span>
              </div>
            )}
            {resendMsg && !resendBlocked && (
              <div style={{ fontSize: 13, fontWeight: 500, color: resendMsg.startsWith('Link sent') ? 'var(--accent)' : 'oklch(0.55 0.18 25)', marginBottom: 6 }}>
                {resendMsg}
              </div>
            )}
            <button
              onClick={() => handleSendLink(true)}
              style={{ background: 'transparent', border: 'none', fontSize: 13, color: 'var(--ink-3)', opacity: sending ? 0.5 : 1, cursor: sending ? 'default' : 'pointer' }}>
              {sending ? 'Sending…' : "Didn't get it? Resend"}
            </button>
          </div>
        )}
        {stage === 'reset' && (
          <>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>STEP 2 OF 2</div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.8, lineHeight: 1 }}>Set a new password.</h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 28px', lineHeight: 1.5 }}>Use 8+ characters with a mix of letters and numbers.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SBInput label="New password" value={pw1} onChange={setPw1} placeholder="••••••••" type="password" />
              <SBInput label="Confirm password" value={pw2} onChange={setPw2} placeholder="••••••••" type="password" />
            </div>
            <PwStrength pw={pw1} />
            {updateError && <div style={{ marginTop: 10, fontSize: 13, color: 'oklch(0.55 0.18 25)' }}>{updateError}</div>}
            <Btn fullWidth size="lg" onClick={handleUpdatePassword} style={{ marginTop: 22, opacity: pw1 && pw1 === pw2 && pw1.length >= 8 ? 1 : 0.4 }}>
              {updating ? 'Updating…' : 'Update password & sign in'}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
};

// ────────────────────────── Settings ──────────────────────────
const SettingsHeader = ({ title, sub }) => (
  <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
    <h2 style={{ fontFamily: FONTS.serif, fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: -0.4 }}>{title}</h2>
    {sub && <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>{sub}</p>}
  </div>
);

const SettingsRow = ({ label, sub, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)', gap: 24 }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
    {children}
  </div>
);

const SettingsAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const msgTimer = useRef(null);

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const showMsg = (msg) => {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setSaveMsg(msg);
    msgTimer.current = setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSave = async () => {
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) { console.error('Save error:', error); showMsg('Could not save. Try again.'); }
    else showMsg('Saved!');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMsg('File too large — max 5MB.'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { console.error('Avatar upload error:', upErr); showMsg(`Upload failed: ${upErr.message}`); setUploading(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.auth.updateUser({ data: { avatar_url: url } });
    setAvatarUrl(url);
    showMsg('Photo updated!');
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await supabase.rpc('delete_user');
    await supabase.auth.signOut();
    navigate('/signup');
  };

  return (
    <>
      <SettingsHeader title="Account" sub="Your basic info. Email is verified through SDSU." />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 0 18px', marginBottom: 6, borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <Avatar initials={initials} size={56} color="oklch(0.78 0.14 50)" />
          )}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Profile photo</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>JPG, PNG or WebP · max 5MB</div>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} style={{ opacity: uploading ? 0.5 : 1 }}>
          {uploading ? 'Uploading…' : 'Upload'}
        </Btn>
      </div>
      <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        <SBInput label="Display name" value={name} onChange={setName} />
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>SDSU email</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15 }}>{user?.email || ''}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>✓ VERIFIED</span>
          </div>
        </div>
        <SBInput label="Phone (optional)" value={phone} onChange={setPhone} hint="For SMS reminders before sessions" />
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <Btn onClick={handleSave}>Save changes</Btn>
        <Btn variant="ghost" onClick={() => navigate('/forgot-password')}>Change password</Btn>
        {saveMsg && <span style={{ fontSize: 13, color: 'var(--accent)' }}>{saveMsg}</span>}
      </div>
      <div style={{ marginTop: 36, padding: 16, background: 'oklch(0.96 0.04 25)', border: '1px solid oklch(0.85 0.1 25)', borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.45 0.18 25)', marginBottom: 4 }}>Delete account</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 10 }}>
          {confirmDelete ? 'Are you sure? This cannot be undone.' : 'Permanently delete your account and all session history.'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={handleDelete}
            style={{ color: 'oklch(0.55 0.2 25)', borderColor: 'oklch(0.72 0.16 25)' }}>
            {deleting ? 'Deleting…' : confirmDelete ? 'Yes, delete my account' : 'Delete my account'}
          </Btn>
          {confirmDelete && !deleting && (
            <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Btn>
          )}
        </div>
      </div>
    </>
  );
};

const SettingsNotif = () => {
  const [s, setS] = useState({ bookings: true, messages: true, reminders: true, marketing: false, sms: false });
  const set = (k, v) => setS({ ...s, [k]: v });
  return (
    <>
      <SettingsHeader title="Notifications" sub="Get the right pings, skip the noise." />
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: '4px 0 8px' }}>EMAIL</div>
      <SettingsRow label="Booking confirmations" sub="When your tutor accepts or declines"><SBToggle on={s.bookings} onChange={v => set('bookings', v)} /></SettingsRow>
      <SettingsRow label="New messages" sub="When a tutor replies"><SBToggle on={s.messages} onChange={v => set('messages', v)} /></SettingsRow>
      <SettingsRow label="Session reminders" sub="2 hours before your session"><SBToggle on={s.reminders} onChange={v => set('reminders', v)} /></SettingsRow>
      <SettingsRow label="Tips, news & promos" sub="Once a month, max"><SBToggle on={s.marketing} onChange={v => set('marketing', v)} /></SettingsRow>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: '24px 0 8px' }}>OTHER</div>
      <SettingsRow label="SMS reminders" sub="Texted to your phone"><SBToggle on={s.sms} onChange={v => set('sms', v)} /></SettingsRow>
    </>
  );
};

const SettingsPay = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sessions')
      .select('id, tutor_name, class_code, earnings, scheduled_at, status, payment_captured')
      .eq('student_id', user.id)
      .in('status', ['confirmed', 'completed', 'cancelled'])
      .order('scheduled_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setSessions(data || []); setLoading(false); });
  }, [user]);

  return (
    <>
      <SettingsHeader title="Payment & payouts" sub="Cards, receipts, and payouts (if you tutor)." />
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>PAYMENT METHODS</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Your card is collected securely via Stripe each time you book a session — there's no card stored here. It is held but not charged until your tutor accepts.
      </div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: '28px 0 12px' }}>RECEIPTS</div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.4 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 52, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '20px 0' }}>No sessions yet.</div>
      ) : sessions.map(r => {
        const fee = Number(r.earnings || 0);
        const svc = Math.round(fee * 0.08);
        const total = fee + svc;
        const isCancelled = r.status === 'cancelled';
        return (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6, opacity: isCancelled ? 0.55 : 1 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.tutor_name} · {r.class_code}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {new Date(r.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                {isCancelled && ' · Cancelled'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'var(--ink-3)' : 'var(--ink)' }}>${total.toFixed(2)}</span>
              {r.payment_captured && !isCancelled && (
                <span style={{ fontSize: 11, color: 'var(--positive)', fontWeight: 600 }}>PAID</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

const SettingsPrivacy = () => {
  const [s, setS] = useState({ name: true, major: true, classes: false, recs: true });
  const set = (k, v) => setS({ ...s, [k]: v });
  return (
    <>
      <SettingsHeader title="Privacy & data" sub="Control what other students see about you." />
      <SettingsRow label="Show full name on reviews" sub="Otherwise just your first name + initial"><SBToggle on={s.name} onChange={v => set('name', v)} /></SettingsRow>
      <SettingsRow label="Show major + year on profile" sub="Helps tutors know your context"><SBToggle on={s.major} onChange={v => set('major', v)} /></SettingsRow>
      <SettingsRow label="Let tutors see my class list" sub="So they can suggest related classes they teach"><SBToggle on={s.classes} onChange={v => set('classes', v)} /></SettingsRow>
      <SettingsRow label="Use my data for recommendations" sub="Better tutor matches"><SBToggle on={s.recs} onChange={v => set('recs', v)} /></SettingsRow>
      <div style={{ marginTop: 24 }}>
        <Btn variant="ghost" size="sm">Download my data</Btn>
      </div>
    </>
  );
};

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('account');
  const tabs = [
    { k: 'account', l: 'Account' },
    { k: 'notif', l: 'Notifications' },
    { k: 'pay', l: 'Payment' },
    { k: 'privacy', l: 'Privacy' },
  ];
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <StudentNav active="/settings" />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0, flex: 1 }}>
          <aside style={{ borderRight: '1px solid var(--border)', padding: '36px 20px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tabs.map(t => (
                <button key={t.k} onClick={() => setTab(t.k)} style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tab === t.k ? 'var(--accent-soft)' : 'transparent',
                  color: tab === t.k ? 'var(--accent)' : 'var(--ink-2)',
                  fontFamily: FONTS.sans, fontSize: 14, fontWeight: tab === t.k ? 600 : 500,
                }}>{t.l}</button>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} style={{
              textAlign: 'left', padding: '10px 12px', width: '100%',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'oklch(0.55 0.18 25)', fontFamily: FONTS.sans, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Log out
            </button>
          </aside>
          <main style={{ padding: '36px 48px', maxWidth: 700 }}>
            {tab === 'account' && <SettingsAccount />}
            {tab === 'notif' && <SettingsNotif />}
            {tab === 'pay' && <SettingsPay />}
            {tab === 'privacy' && <SettingsPrivacy />}
          </main>
        </div>
      </div>
      <SBFooter slim />
    </div>
  );
};

// Shared student nav used across all authenticated pages
const StudentNav = ({ active }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const links = [['Home', '/home'], ['Messages', '/messages'], ['Browse', '/browse'], ['Sessions', '/dashboard'], ['Settings', '/settings']];
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 56px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          {links.map(([label, path]) => (
            <span key={path} onClick={() => navigate(path)} style={{
              cursor: 'pointer', fontWeight: path === active ? 600 : 400,
              color: path === active ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: path === active ? '2px solid var(--ink)' : '2px solid transparent',
              paddingBottom: 2,
            }}>{label}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user?.user_metadata?.role === 'tutor' && (
          <Btn variant="ghost" size="sm" onClick={() => navigate('/tutor-dashboard')}>Switch to tutor</Btn>
        )}
        <SBUserMenu />
      </div>
    </nav>
  );
};

// ────────────────────────── Help ──────────────────────────
export const HelpScreen = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(0);
  const faqs = [
    { q: 'How do payments work?', a: 'You add a card when you book. We hold the amount until 24 hours after your session. If something goes wrong, request a refund — first one is no-questions.' },
    { q: "What if my tutor doesn't show?", a: 'Report it from the session in your dashboard. We refund you in full and follow up with the tutor. Repeated no-shows lead to suspension.' },
    { q: 'Can I cancel a session?', a: "Yes — free cancellation up to 12 hours before. After that, you're charged 50%. We refund automatically if your tutor cancels." },
    { q: 'How do I become a tutor?', a: 'Active SDSU email and a B+ or higher in the class you want to tutor. Sign up as a tutor, upload a redacted transcript, and we verify within 24 hours.' },
    { q: 'How is my data used?', a: 'Only to run Study Buddy. We never sell your data. See our Privacy Policy for the full breakdown.' },
    { q: 'Where do sessions happen?', a: 'On-campus (Love Library, Aztec Student Union, etc.) or virtual via Zoom. You and your tutor confirm the spot at booking.' },
    { q: 'Are tips required?', a: "Never. They're a kind way to thank a tutor who went above and beyond. 100% goes to them." },
  ];
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <StudentNav />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>HELP CENTER</div>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 64, fontWeight: 400, margin: '0 0 16px', letterSpacing: -1.3, lineHeight: 0.95 }}>How can<br/>we help?</h1>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: '0 0 32px', maxWidth: 540 }}>
            Most answers are below. Still stuck? <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Email support</span> — we reply within 1 business day.
          </p>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {faqs.map((f, i) => (
              <div key={f.q} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => setOpen(open === i ? -1 : i)} style={{
                  width: '100%', padding: '18px 20px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <span style={{ fontFamily: FONTS.serif, fontSize: 19, color: 'var(--ink)', letterSpacing: -0.2 }}>{f.q}</span>
                  <Icon name="chevDown" size={16} style={{ color: 'var(--ink-3)', transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }} />
                </button>
                {open === i && (
                  <div style={{ padding: '0 20px 20px', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 600 }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, padding: 24, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div style={{ fontFamily: FONTS.serif, fontSize: 22, color: 'var(--accent)', letterSpacing: -0.3 }}>Still need help?</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>Email support@studybuddy.sdsu.edu — we usually reply same day.</div>
            </div>
            <Btn>Contact us</Btn>
          </div>
        </div>
      </div>
      <SBFooter slim />
    </div>
  );
};

// ────────────────────────── Legal ──────────────────────────
export const LegalScreen = ({ kind = 'terms' }) => {
  const navigate = useNavigate();
  const isTerms = kind === 'terms';
  const sections = isTerms ? [
    { h: '1. Who we are', p: 'Study Buddy is a peer-to-peer tutoring marketplace operated by Study Buddy Inc., based in San Diego, CA. Use of the service requires an active SDSU email address. We are not affiliated with San Diego State University.' },
    { h: '2. Eligibility', p: 'You must be 17 or older and a current SDSU student to use Study Buddy. To tutor, you must verify a B+ or higher in the class you teach via a redacted transcript.' },
    { h: '3. Bookings & payments', p: 'When you book a session, we authorize a hold on your card. Payment is captured 24 hours after the session ends, minus our platform fee. Tutors are paid via direct deposit weekly.' },
    { h: '4. Cancellations & refunds', p: "Free cancellation up to 12 hours before. Within 12 hours, you're charged 50%. If your tutor cancels or no-shows, you're refunded in full automatically." },
    { h: '5. Conduct', p: "Be kind. No harassment, discrimination, or sharing of paid course materials in violation of SDSU's academic integrity policy. Violations result in account suspension." },
    { h: '6. Disputes', p: 'Disputes are handled by our trust & safety team within 48 hours. We side with the truth, not the loudest party. Tutors and students both have appeal rights.' },
    { h: '7. Limitation of liability', p: "Study Buddy is a marketplace. We don't provide tutoring directly. Tutors are independent — not employees. We screen for academic eligibility but you choose who you work with." },
    { h: '8. Changes', p: "We'll email you 30 days before any material change to these terms. Continued use after the effective date means you accept the new terms." },
  ] : [
    { h: '1. What we collect', p: "Email, name, classes, session bookings, messages, payment info (handled by Stripe — we never store full card numbers), and basic device info for security." },
    { h: '2. What we don\'t collect', p: "We don't track you off the platform. No third-party advertising trackers. No selling your data. Ever." },
    { h: '3. Why we collect it', p: 'To run the marketplace: match you with tutors, process bookings and payments, send notifications you opted into, and keep the platform safe.' },
    { h: '4. Who sees what', p: 'Tutors see your name, major, year, and the classes you book with them. Other students see your reviews (with the privacy you choose in Settings). Nobody else.' },
    { h: '5. Your rights', p: 'Download your data anytime from Settings → Privacy. Request deletion of your account — we remove identifying info within 30 days. Reviews remain anonymized.' },
    { h: '6. Cookies', p: 'Just the essentials — to keep you logged in and remember your preferences. No tracking pixels.' },
    { h: '7. Security', p: 'TLS for all traffic, encryption at rest, regular security audits. Report a vulnerability: security@studybuddy.sdsu.edu.' },
    { h: '8. Contact', p: 'Questions? privacy@studybuddy.sdsu.edu — we reply within 5 business days.' },
  ];
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <StudentNav />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '48px auto', padding: '0 24px' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>{isTerms ? 'TERMS OF SERVICE' : 'PRIVACY POLICY'}</div>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 56, fontWeight: 400, margin: '0 0 8px', letterSpacing: -1.1, lineHeight: 1 }}>
            {isTerms ? 'The deal.' : 'Your data, your rules.'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 32px' }}>Last updated April 1, 2026 · <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Download PDF</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {sections.map(s => (
              <div key={s.h}>
                <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: '0 0 8px', letterSpacing: -0.2, color: 'var(--ink)' }}>{s.h}</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)', margin: 0 }}>{s.p}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 14 }}>
            <button onClick={() => navigate(isTerms ? '/privacy' : '/terms')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}>
              Read {isTerms ? 'Privacy Policy' : 'Terms of Service'} →
            </button>
            <button onClick={() => navigate('/help')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}>
              Visit Help Center →
            </button>
          </div>
        </div>
      </div>
      <SBFooter slim />
    </div>
  );
};

// ────────────────────────── About ──────────────────────────
export const AboutScreen = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <StudentNav />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 12 }}>OUR STORY</div>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: 64, fontWeight: 400, margin: '0 0 24px', letterSpacing: -1.3, lineHeight: 0.95 }}>
            Built in a dorm,<br/>for the dorm.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 28px', maxWidth: 600 }}>
            Study Buddy started in fall 2025 when two SDSU sophomores realized the campus had a problem: a $50/hr tutor who'd never set foot in your professor's classroom.
          </p>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 600 }}>
            Meanwhile, the upperclassman who aced your exact class with your exact prof? They were broke. We built the bridge.
          </p>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 600 }}>
            Today, Study Buddy is run by 5 SDSU students. We pay tutors fairly, charge a small platform fee, and reinvest into the campus we love.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, padding: '32px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {[
              { n: '2,400+', l: 'Active students' },
              { n: '180+', l: 'Verified tutors' },
              { n: '$118k', l: 'Paid to tutors' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: FONTS.serif, fontSize: 44, fontWeight: 400, lineHeight: 1, color: 'var(--accent)', letterSpacing: -0.8 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
            <Btn size="lg" onClick={() => navigate('/signup')}>Join Study Buddy</Btn>
            <Btn variant="ghost" size="lg" onClick={() => navigate('/tutor-apply')}>Become a tutor</Btn>
          </div>
        </div>
      </div>
      <SBFooter />
    </div>
  );
};
