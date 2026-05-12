import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Icon, Logo, Btn, Avatar, Stars, CourseTag } from '../../components/primitives/index.jsx';
import VideoIntro from '../../components/VideoIntro.jsx';
import { MobileStatusBar } from '../landing/LandingMobile.jsx';
import { TUTORS } from '../../data.js';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';
import { tutorProfileRowToCard } from '../../tutorProfileSync.js';
import { tutorUuidFromProfileRouteParam } from '../../demoTutor.js';

// Generate the next 7 days as { label: 'Mon 5', dayName: 'Mon', dateStr: '2026-05-05' }
const getNextDays = () => {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: `${dayNames[d.getDay()]} ${d.getDate()}`,
      dayName: dayNames[d.getDay()],
      dateStr: d.toISOString().split('T')[0],
    });
  }
  return days;
};

// Used only for catalog/demo tutors that have no real availability rows
const DEFAULT_TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

// Handles both "8:00 AM" and legacy "8 AM" formats
const hourTo24 = (label) => {
  const parts = label.trim().split(' ');
  const period = parts[parts.length - 1]; // "AM" or "PM"
  const timePart = parts[0]; // "8:00" or "8"
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ? parseInt(mStr, 10) : 0;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const UUID_ROUTE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads reviews for `/tutor/:id` whether `id` is an auth UUID or catalogue id (`t3`). */
function useSessionReviewsForProfileRoute(routeId) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!routeId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const tutorUuid = await tutorUuidFromProfileRouteParam(routeId);
      if (cancelled) return;
      if (!tutorUuid) {
        setRows([]);
        return;
      }
      const { data } = await supabase.from('session_reviews')
        .select('id, rating, tags, body, class_code, created_at')
        .eq('tutor_id', tutorUuid)
        .order('created_at', { ascending: false })
        .limit(25);
      if (!cancelled) setRows(data || []);
    })();
    return () => { cancelled = true; };
  }, [routeId]);
  return rows;
}

/** Demo catalog ids (e.g. t3) or real tutor UUID — loads `tutor_profiles` for UUID routes. */
function useRouteTutor(routeId) {
  const staticHit = useMemo(
    () => (routeId ? TUTORS.find(t => t.id === routeId) ?? null : null),
    [routeId],
  );
  const isUuid = !!(routeId && UUID_ROUTE.test(routeId));

  const [profileRow, setProfileRow] = useState(null);
  const [resolved, setResolved] = useState(!isUuid || !!staticHit);

  useEffect(() => {
    if (!routeId || staticHit || !isUuid) {
      setProfileRow(null);
      setResolved(true);
      return;
    }
    setResolved(false);
    let cancelled = false;
    supabase.from('tutor_profiles').select('*').eq('user_id', routeId).maybeSingle().then(({ data }) => {
      if (!cancelled) {
        setProfileRow(data ?? null);
        setResolved(true);
      }
    });
    return () => { cancelled = true; };
  }, [routeId, staticHit, isUuid]);

  const tutor = useMemo(() => {
    if (staticHit) return staticHit;
    if (!routeId) return null;
    if (!isUuid) return null; // non-UUID, non-catalog slug — not a valid tutor id
    if (!resolved) return null;
    if (profileRow) return tutorProfileRowToCard(profileRow);
    return null;
  }, [routeId, staticHit, isUuid, resolved, profileRow]);

  const loadingProfile = isUuid && !staticHit && !resolved;
  // Not listed: we have a route id, we're done loading, but no tutor was found
  const notListed = !!routeId && !loadingProfile && !tutor;
  return { tutor, loadingProfile, notListed };
}

export const TutorProfileDesktop = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionReviews = useSessionReviewsForProfileRoute(id);
  const { tutor, loadingProfile, notListed } = useRouteTutor(id);

  const days = getNextDays();
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availability, setAvailability] = useState({});   // weekday → hour[]
  const [availLoaded, setAvailLoaded] = useState(null);   // null=loading, false=real done, true=demo
  // Map<dateStr, { mode: 'off'|'custom', hours: string[] }>
  const [dateOverrides, setDateOverrides] = useState(new Map());

  const isRealTutor = tutor && UUID_ROUTE.test(String(tutor.id));

  useEffect(() => {
    if (!tutor) return;
    if (!isRealTutor) { setAvailLoaded(true); return; }
    setAvailLoaded(null);
    setDateOverrides(new Map());
    supabase.from('tutor_availability').select('*').eq('tutor_id', tutor.id).then(({ data }) => {
      const map = {};
      (data || []).forEach(row => {
        if (!map[row.day]) map[row.day] = [];
        const h = /^\d+:\d+/.test(row.hour) ? row.hour : row.hour.replace(/^(\d+) /, '$1:00 ');
        map[row.day].push(h);
      });
      setAvailability(map);
      setAvailLoaded(false);
    });
    supabase.from('tutor_date_overrides').select('*').eq('tutor_id', tutor.id).then(({ data }) => {
      if (data?.length) {
        const m = new Map();
        data.forEach(r => m.set(r.date, { mode: r.mode, hours: r.hours || [] }));
        setDateOverrides(m);
      }
    });
  }, [tutor?.id]);

  const selectedDayData = days[selectedDay];
  const dayName = selectedDayData?.dayName;
  const dateOverride = selectedDayData ? dateOverrides.get(selectedDayData.dateStr) : null;
  const isDayBlocked = dateOverride?.mode === 'off';
  const isDayCustom  = dateOverride?.mode === 'custom';

  // Resolution order: date override → weekly schedule → empty (real) / demo times (catalog)
  const timesForDay = (() => {
    if (isDayBlocked) return [];
    if (isDayCustom)  return dateOverride.hours || [];
    if (isRealTutor)  return availability[dayName] || [];
    return availability[dayName]?.length > 0 ? availability[dayName] : DEFAULT_TIMES;
  })();

  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [msgError, setMsgError] = useState('');

  useEffect(() => {
    if (!user || !tutor) return;
    supabase.from('saved_tutors').select('id').eq('student_id', user.id).eq('tutor_demo_id', tutor.id).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, tutor?.id]);

  const handleSave = async () => {
    if (!user) { navigate('/signin'); return; }
    if (saved) {
      await supabase.from('saved_tutors').delete().eq('student_id', user.id).eq('tutor_demo_id', tutor.id);
      setSaved(false);
    } else {
      await supabase.from('saved_tutors').insert({
        student_id: user.id,
        tutor_demo_id: tutor.id,
        tutor_name: tutor.name,
        tutor_initials: tutor.initials,
        tutor_color: tutor.color,
        tutor_rate: tutor.rate,
        tutor_class: tutor.classes?.[0] || 'CHEM 200',
      });
      setSaved(true);
    }
  };

  const handleMessage = async () => {
    if (!user) { navigate('/signin'); return; }
    setMsgError('');
    const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', user.id)
      .eq('tutor_demo_id', tutor.id)
      .maybeSingle();
    if (existing) {
      navigate('/messages', { state: { convId: existing.id } });
      return;
    }
    const { data: conv, error: insertErr } = await supabase
      .from('conversations')
      .insert({ student_id: user.id, tutor_demo_id: tutor.id, student_name: studentName, tutor_name: tutor.name })
      .select('id')
      .single();
    if (insertErr || !conv) {
      setMsgError('Could not open messages. Please try again.');
      return;
    }
    navigate('/messages', { state: { convId: conv.id } });
  };

  if (loadingProfile) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', padding: '18px 56px',
          borderBottom: '1px solid var(--border)', background: 'var(--bg)',
          position: 'sticky', top: 0, zIndex: 5, gap: 20,
        }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
            <Icon name="chevLeft" size={12} /> Back
          </div>
        </nav>
        <div style={{ padding: 80, textAlign: 'center', fontSize: 15, color: 'var(--ink-3)' }}>Loading profile…</div>
      </div>
    );
  }

  if (notListed || !tutor) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', padding: '18px 56px',
          borderBottom: '1px solid var(--border)', background: 'var(--bg)',
          position: 'sticky', top: 0, zIndex: 5, gap: 20,
        }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
            <Icon name="chevLeft" size={12} /> Back
          </div>
        </nav>
        <div style={{ padding: 80, textAlign: 'center', maxWidth: 420, margin: '0 auto', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          This tutor profile is not available. They may not be listed yet, or the link may be incorrect.
        </div>
      </div>
    );
  }

  const showDbReviews = sessionReviews.length > 0;
  const profileRatingAvg = showDbReviews
    ? Math.round((sessionReviews.reduce((a, r) => a + r.rating, 0) / sessionReviews.length) * 10) / 10
    : tutor.rating;
  const profileReviewCount = showDbReviews ? sessionReviews.length : tutor.reviews;
  const reviews = showDbReviews
    ? sessionReviews.map((r) => ({
      id: r.id,
      author: 'Student',
      when: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      class: r.class_code || '—',
      rating: r.rating,
      text: [r.body, ...(r.tags || [])].filter(Boolean).join('. ') || '—',
    }))
    : [];

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', padding: '18px 56px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 5, gap: 20,
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <div onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
          <Icon name="chevLeft" size={12} /> Back
        </div>
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" size="sm" icon="heart" onClick={handleSave}
          style={{ color: saved ? 'var(--accent)' : undefined, borderColor: saved ? 'var(--accent)' : undefined }}>
          {saved ? 'Saved' : 'Save'}
        </Btn>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Btn variant="ghost" size="sm" icon="chat" onClick={handleMessage}>Message</Btn>
          {msgError && <div style={{ fontSize: 11, color: 'oklch(0.55 0.18 25)' }}>{msgError}</div>}
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40, padding: '48px 56px 56px' }}>
        <div>
          <div style={{ marginBottom: 28 }}>
            <VideoIntro tutor={tutor} size="lg" />
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28 }}>
            <Avatar initials={tutor.initials} color={tutor.color} size={100} style={{ fontSize: 36 }} />
            <div style={{ flex: 1, paddingTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontFamily: FONTS.serif, fontSize: 40, fontWeight: 400, margin: 0, letterSpacing: -0.8, lineHeight: 1 }}>
                  {tutor.name}
                </h1>
                {tutor.verified && <Icon name="verified" size={20} stroke={0} style={{ color: 'var(--accent)' }} />}
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 8 }}>
                {tutor.major} · {tutor.year} · SDSU
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13, color: 'var(--ink-2)' }}>
                <Stars rating={profileRatingAvg} size={13} showNumber reviews={profileReviewCount} />
                <span>·</span>
                <span>{tutor.sessions} sessions</span>
                <span>·</span>
                <span>Responds {tutor.responseTime}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {tutor.tags.map(t => (
              <span key={t} style={{
                padding: '5px 12px', borderRadius: 100,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--ink-2)',
              }}>{t}</span>
            ))}
          </div>

          <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.3 }}>About {tutor.name.split(' ')[0]}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 40px' }}>
            {tutor.bio}
          </p>

          <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: '0 0 16px', letterSpacing: -0.3 }}>Classes I've taken</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 40 }}>
            {tutor.classes.map(c => (
              <div key={c} style={{
                padding: 14, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 10,
              }}>
                <CourseTag code={c} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Grade</span>
                  <span style={{
                    fontFamily: FONTS.mono, fontWeight: 600, fontSize: 13,
                    color: 'var(--ink)', background: 'var(--accent-soft)',
                    padding: '1px 7px', borderRadius: 3,
                  }}>{tutor.grades[c] || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: -0.3 }}>Reviews</h2>
            <Stars rating={profileRatingAvg} size={14} showNumber reviews={profileReviewCount} />
          </div>
          {reviews.length === 0 ? (
            <div style={{ padding: '24px 0', color: 'var(--ink-3)', fontSize: 14 }}>No reviews yet.</div>
          ) : reviews.map(r => (
            <div key={r.id} style={{ padding: '20px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={r.author.split(' ').map(x => x[0]).join('')} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.when} · {r.class}</div>
                  </div>
                </div>
                <Stars rating={r.rating} size={12} />
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: '8px 0 0' }}>"{r.text}"</p>
            </div>
          ))}
        </div>

        <div>
          <div style={{
            position: 'sticky', top: 90,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24,
            boxShadow: '0 1px 0 rgba(0,0,0,.02), 0 12px 32px rgba(0,0,0,.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: FONTS.serif, fontSize: 40, color: 'var(--accent)', lineHeight: 1 }}>
                ${tutor.rate}
              </span>
              <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>/hour</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>
              Typical session: 60–90 minutes
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600 }}>
                Pick a day
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {days.map((d, i) => {
                  const ov = dateOverrides.get(d.dateStr);
                  const isDayOff = ov?.mode === 'off';
                  const isSelected = i === selectedDay;
                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => { if (!isDayOff) { setSelectedDay(i); setSelectedTime(null); } }}
                      title={isDayOff ? 'Tutor is off this day' : undefined}
                      style={{
                        flex: 1, padding: '10px 0', textAlign: 'center',
                        border: `1px solid ${isDayOff ? '#fca5a5' : isSelected ? 'var(--ink)' : 'var(--border)'}`,
                        background: isDayOff ? '#fff5f5' : isSelected ? 'var(--ink)' : 'var(--surface)',
                        color: isDayOff ? '#fca5a5' : isSelected ? 'var(--surface)' : 'var(--ink-2)',
                        borderRadius: 8,
                        cursor: isDayOff ? 'default' : 'pointer',
                        transition: 'all .1s',
                        opacity: isDayOff ? 0.7 : 1,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: 0.8 }}>{d.label.split(' ')[0]}</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2, textDecoration: isDayOff ? 'line-through' : 'none' }}>
                        {d.label.split(' ')[1]}
                      </div>
                      {isDayOff && <div style={{ fontSize: 8, marginTop: 1, color: '#f87171' }}>off</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600 }}>
                Available times · {days[selectedDay]?.label}
              </div>
              {availLoaded === null && isRealTutor ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '10px 0' }}>Loading…</div>
              ) : isDayBlocked ? (
                <div style={{ fontSize: 13, color: '#b91c1c', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, lineHeight: 1.5 }}>
                  {tutor?.name?.split(' ')[0] || 'This tutor'} is off on this day. Try another date.
                </div>
              ) : isDayCustom && timesForDay.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '10px 0', lineHeight: 1.5 }}>
                  No openings set for this specific date. Try another day.
                </div>
              ) : timesForDay.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '10px 0', lineHeight: 1.5 }}>
                  No openings on {days[selectedDay]?.label.split(' ')[0]}. Try another day.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {timesForDay.map(t => (
                    <div key={t} onClick={() => setSelectedTime(t)} style={{
                      padding: '8px 0', textAlign: 'center', borderRadius: 7,
                      fontSize: 12.5, fontFamily: FONTS.mono,
                      border: `1px solid ${selectedTime === t ? 'var(--accent)' : 'var(--border)'}`,
                      background: selectedTime === t ? 'var(--accent-soft)' : 'var(--surface)',
                      color: selectedTime === t ? 'var(--accent)' : 'var(--ink-2)',
                      fontWeight: selectedTime === t ? 600 : 400,
                      cursor: 'pointer', transition: 'all .1s',
                    }}>{t}</div>
                  ))}
                </div>
              )}
            </div>

            <Btn fullWidth size="lg"
              style={{ opacity: selectedTime ? 1 : 0.5 }}
              onClick={() => {
                if (!selectedTime || timesForDay.length === 0 || isDayBlocked) return;
                navigate('/book', {
                  state: {
                    tutorId: tutor.id,
                    tutorName: tutor.name,
                    tutorInitials: tutor.initials,
                    tutorColor: tutor.color,
                    classCode: tutor.classes?.[0] || 'CHEM 200',
                    rate: tutor.rate,
                    date: days[selectedDay].dateStr,
                    time: hourTo24(selectedTime),
                  }
                });
              }}>
              {selectedTime ? `Request · ${days[selectedDay].label} at ${selectedTime}` : 'Pick a time to continue'}
            </Btn>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 10 }}>
              You won't be charged until {tutor.name.split(' ')[0]} accepts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TutorProfileMobile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionReviews = useSessionReviewsForProfileRoute(id);
  const { tutor, loadingProfile, notListed } = useRouteTutor(id);
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !tutor) return;
    supabase.from('saved_tutors').select('id').eq('student_id', user.id).eq('tutor_demo_id', tutor.id).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, tutor?.id]);

  const handleSave = async () => {
    if (!user) { navigate('/signin'); return; }
    if (!tutor) return;
    if (saved) {
      await supabase.from('saved_tutors').delete().eq('student_id', user.id).eq('tutor_demo_id', tutor.id);
      setSaved(false);
    } else {
      await supabase.from('saved_tutors').insert({
        student_id: user.id,
        tutor_demo_id: tutor.id,
        tutor_name: tutor.name,
        tutor_initials: tutor.initials,
        tutor_color: tutor.color,
        tutor_rate: tutor.rate,
        tutor_class: tutor.classes?.[0] || 'CHEM 200',
      });
      setSaved(true);
    }
  };

  if (loadingProfile) {
    return (
      <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <MobileStatusBar />
        <div style={{ padding: 24, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-3)' }}>Loading profile…</div>
      </div>
    );
  }

  if (notListed || !tutor) {
    return (
      <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <MobileStatusBar />
        <div style={{ padding: 16 }}>
          <div onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
            <Icon name="chevLeft" size={18} style={{ color: 'var(--ink)' }} />
          </div>
          <div style={{ padding: '40px 8px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            This tutor profile is not available right now.
          </div>
        </div>
      </div>
    );
  }

  const showDbReviews = sessionReviews.length > 0;
  const profileRatingAvg = showDbReviews
    ? Math.round((sessionReviews.reduce((a, r) => a + r.rating, 0) / sessionReviews.length) * 10) / 10
    : tutor.rating;
  const profileReviewCount = showDbReviews ? sessionReviews.length : tutor.reviews;
  const reviewsMobile = showDbReviews
    ? sessionReviews.map((r) => ({
      id: r.id,
      author: 'Student',
      when: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      class: r.class_code || '—',
      rating: r.rating,
      text: [r.body, ...(r.tags || [])].filter(Boolean).join('. ') || '—',
    }))
    : [];

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
            <Icon name="chevLeft" size={18} style={{ color: 'var(--ink)' }} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div onClick={handleSave} style={{ cursor: 'pointer' }}>
              <Icon name="heart" size={18} style={{ color: saved ? 'oklch(0.58 0.22 25)' : 'var(--ink-2)' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 22px 0' }}>
          <VideoIntro tutor={tutor} size="sm" />
        </div>

        <div style={{ padding: '20px 22px 0', textAlign: 'center' }}>
          <Avatar initials={tutor.initials} color={tutor.color} size={96} style={{ margin: '0 auto', fontSize: 34 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            <h1 style={{ fontFamily: FONTS.serif, fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: -0.5 }}>{tutor.name}</h1>
            {tutor.verified && <Icon name="verified" size={15} stroke={0} style={{ color: 'var(--accent)' }} />}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{tutor.major} · {tutor.year}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--ink-2)' }}>
            <Stars rating={profileRatingAvg} size={12} showNumber reviews={profileReviewCount} />
          </div>
        </div>

        <div style={{ padding: '24px 22px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { n: tutor.sessions, l: 'Sessions' },
            { n: tutor.responseTime, l: 'Responds' },
            { n: `$${tutor.rate}`, l: 'Per hour' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontFamily: FONTS.serif, fontSize: 18, color: 'var(--ink)' }}>{s.n}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 22px 0' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>About</div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)', margin: 0 }}>{tutor.bio}</p>
        </div>

        <div style={{ padding: '20px 22px 0' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>Classes taken</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tutor.classes.map(c => (
              <div key={c} style={{
                padding: '10px 14px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div><CourseTag code={c} size={11} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Grade</span>
                  <span style={{ fontFamily: FONTS.mono, fontWeight: 600, fontSize: 12, background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 3 }}>
                    {tutor.grades[c] || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 22px 90px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>Reviews</div>
          {reviewsMobile.length === 0 ? (
            <div style={{ padding: '14px 0', color: 'var(--ink-3)', fontSize: 13 }}>No reviews yet.</div>
          ) : reviewsMobile.map((r) => (
            <div key={r.id} style={{ padding: '14px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{r.author}</div>
                <Stars rating={r.rating} size={11} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
                {r.when}
                {r.class && r.class !== '—' ? <> · <CourseTag code={r.class} size={10} /></> : null}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.45 }}>&ldquo;{r.text}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        borderTop: '1px solid var(--border)', background: 'var(--surface)',
        padding: '14px 22px 26px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 22, color: 'var(--accent)', lineHeight: 1 }}>
            ${tutor.rate}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: FONTS.sans }}>/hr</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>Next: {tutor.nextSlot}</div>
        </div>
        <Btn size="lg" onClick={() => navigate('/book', { state: { tutorId: tutor.id, tutorName: tutor.name, tutorInitials: tutor.initials, tutorColor: tutor.color, classCode: tutor.classes?.[0] || 'CHEM 200', rate: tutor.rate } })}>Book session</Btn>
      </div>
    </div>
  );
};
