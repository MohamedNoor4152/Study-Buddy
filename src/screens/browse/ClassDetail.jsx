import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { FONTS } from '../../tokens.js';
import { Icon, Logo, CourseTag, Chip } from '../../components/primitives/index.jsx';
import TutorCard from '../../components/TutorCard.jsx';
import { MobileStatusBar, MobileTabBar } from '../landing/LandingMobile.jsx';
import { CLASSES } from '../../data.js';
import { mergedTutorCardsForClass } from '../../tutorProfileSync.js';
import { profileIdForCatalogTutor } from '../../demoTutor.js';
import { supabase } from '../../supabase.js';
import { SBUserMenu } from '../basics/BasicScreens.jsx';

function useListedTutorsMergedForClass(clsCode) {
  const [liveProfiles, setLiveProfiles] = useState([]);
  useEffect(() => {
    let cancelled = false;
    supabase.from('tutor_profiles')
      .select('*')
      .eq('transcript_submitted', true)
      .contains('class_codes', [clsCode])
      .then(({ data }) => {
        if (!cancelled) setLiveProfiles(data || []);
      });
    return () => { cancelled = true; };
  }, [clsCode]);
  return useMemo(() => mergedTutorCardsForClass(liveProfiles), [liveProfiles]);
}

export const ClassDetailDesktop = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const decodedCode = decodeURIComponent(code || '');
  const catalogEntry = CLASSES.find(c => c.code === decodedCode);
  // For classes not in the catalog, derive minimal metadata from the code
  const cls = catalogEntry || {
    code: decodedCode,
    title: decodedCode,
    dept: decodedCode.replace(/[\s\d].*/, '').trim() || 'Course',
    avgRate: 0,
    difficulty: 'Medium',
    tutors: 0,
  };
  const displayTutors = useListedTutorsMergedForClass(cls.code);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', padding: '18px 56px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 5, gap: 20,
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
        <div onClick={() => navigate('/browse')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', marginLeft: 20 }}>
          <Icon name="chevLeft" size={12} /> Browse
        </div>
        <div style={{ flex: 1 }} />
        <SBUserMenu />
      </nav>

      <section style={{ padding: '40px 56px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <CourseTag code={cls.code} size={13} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{cls.dept} · SDSU</span>
        </div>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 48, fontWeight: 400, margin: '0 0 8px', letterSpacing: -1, lineHeight: 1 }}>
          {cls.title}
        </h1>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--ink-2)', marginTop: 14 }}>
          <span><strong style={{ color: 'var(--ink)' }}>{displayTutors.length}</strong> tutor available</span>
          <span>·</span>
          <span>${cls.avgRate}/hr</span>
        </div>
      </section>

      <section style={{ padding: '32px 56px 64px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
          Tutors for {cls.code}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {displayTutors.map(t => (
            <TutorCard key={t.id} tutor={t} showClass={cls.code} topRated={t.topRated} onClick={() => navigate(`/tutor/${profileIdForCatalogTutor(t.id)}`)} />
          ))}
        </div>
      </section>
    </div>
  );
};

export const ClassDetailMobile = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const decodedCode = decodeURIComponent(code || '');
  const catalogEntry = CLASSES.find(c => c.code === decodedCode);
  const cls = catalogEntry || {
    code: decodedCode,
    title: decodedCode,
    dept: decodedCode.replace(/[\s\d].*/, '').trim() || 'Course',
    avgRate: 0,
    difficulty: 'Medium',
    tutors: 0,
  };
  const displayTutors = useListedTutorsMergedForClass(cls.code);

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <MobileStatusBar />
      <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={() => navigate('/browse')} style={{ cursor: 'pointer' }}>
          <Icon name="chevLeft" size={18} style={{ color: 'var(--ink)' }} />
        </div>
        <CourseTag code={cls.code} size={11} />
      </div>
      <div style={{ padding: '12px 22px 16px' }}>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 28, fontWeight: 400, margin: '0 0 6px', letterSpacing: -0.5, lineHeight: 1.05 }}>
          {cls.title}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {displayTutors.length} tutors · ~${cls.avgRate}/hr avg
        </div>
      </div>

      <div style={{ padding: '0 22px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        <Chip active icon="filter">Filters</Chip>
        <Chip>Under $30</Chip>
        <Chip>This week</Chip>
        <Chip>4.8★+</Chip>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayTutors.slice(0, 4).map((t) => (
          <TutorCard key={t.id} tutor={t} showClass={cls.code} topRated={t.topRated} onClick={() => navigate(`/tutor/${profileIdForCatalogTutor(t.id)}`)} />
        ))}
      </div>

      <MobileTabBar active="browse" />
    </div>
  );
};
