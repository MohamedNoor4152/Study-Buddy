import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo, Btn, Avatar, Icon } from '../../components/primitives/index.jsx';
import { SBUserMenu, SBFooter } from '../basics/BasicScreens.jsx';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';

const NavLink = ({ label, active, onClick }) => (
  <span onClick={onClick} style={{
    fontSize: 13, cursor: 'pointer', fontWeight: active ? 600 : 400,
    color: active ? 'var(--ink)' : 'var(--ink-3)',
    borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
    paddingBottom: 2,
  }}>{label}</span>
);

const StudentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(' ')[0] || 'there';

  const [upcoming, setUpcoming] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    Promise.all([
      supabase.from('sessions').select('*').eq('student_id', user.id).in('status', ['confirmed', 'pending']).gte('scheduled_at', now).order('scheduled_at').limit(5),
      supabase.from('saved_tutors').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    ]).then(([{ data: up }, { data: sv }]) => {
      setUpcoming(up || []);
      setSaved(sv || []);
      setLoading(false);
    });
  }, [user]);

  const initials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 56px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div style={{ display: 'flex', gap: 24 }}>
            <NavLink label="Home" active onClick={() => navigate('/home')} />
            <NavLink label="Messages" onClick={() => navigate('/messages')} />
            <NavLink label="Browse" onClick={() => navigate('/browse')} />
            <NavLink label="Sessions" onClick={() => navigate('/dashboard')} />
            <NavLink label="Settings" onClick={() => navigate('/settings')} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.user_metadata?.role === 'tutor' && (
            <Btn variant="ghost" size="sm" onClick={() => navigate('/tutor-dashboard')}>Switch to tutor</Btn>
          )}
          <SBUserMenu />
        </div>
      </nav>

      <div style={{ flex: 1 }}>
        <div style={{ padding: '44px 56px 64px' }}>

          {/* Greeting */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>{greeting}, {firstName}</div>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 46, fontWeight: 400, margin: 0, letterSpacing: -1 }}>
              Welcome back.
            </h1>
          </div>

          {/* Upcoming sessions */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: -0.3 }}>Upcoming sessions</h2>
              <span onClick={() => navigate('/dashboard')} style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>View all →</span>
            </div>
            {loading ? (
              <div style={{ opacity: 0.5, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2].map(i => <div key={i} style={{ height: 72, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '36px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>No upcoming sessions</div>
                <Btn size="sm" onClick={() => navigate('/browse')}>Find a tutor</Btn>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(s => {
                  const dt = new Date(s.scheduled_at);
                  return (
                    <div key={s.id} onClick={() => navigate('/dashboard')} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
                      transition: 'border-color .12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink-3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <Avatar initials={initials(s.tutor_name)} size={44} color="oklch(0.78 0.12 100)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{s.tutor_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s.class_code}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                          {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.duration_min}min
                        </div>
                      </div>
                      <Icon name="chevRight" size={13} style={{ color: 'var(--ink-3)' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Saved tutors */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: -0.3 }}>Saved tutors</h2>
              <span onClick={() => navigate('/browse')} style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>Browse more →</span>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, opacity: 0.5 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 110, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} />)}
              </div>
            ) : saved.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '36px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>No saved tutors yet</div>
                <Btn size="sm" onClick={() => navigate('/browse')}>Browse tutors</Btn>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {saved.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <Avatar initials={t.tutor_initials || initials(t.tutor_name)} color={t.tutor_color || 'oklch(0.72 0.1 100)'} size={38} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.tutor_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.tutor_class} · ${t.tutor_rate}/hr</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => navigate(`/tutor/${t.tutor_demo_id}`)}>Profile</Btn>
                      <Btn size="sm" style={{ flex: 1 }} onClick={() => navigate('/book', { state: { tutorId: t.tutor_id || t.tutor_demo_id, tutorName: t.tutor_name, tutorInitials: t.tutor_initials || initials(t.tutor_name), tutorColor: t.tutor_color || 'oklch(0.72 0.1 100)', classCode: t.tutor_class || '', rate: t.tutor_rate } })}>Book</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
      <SBFooter slim />
    </div>
  );
};

export default StudentHome;
