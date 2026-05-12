import { TUTORS } from './data.js';
import { linkedDemoTutorUuid } from './demoTutor.js';
import { supabase } from './supabase.js';

/** Normalize signup metadata `classes` to string[]. */
export function normalizedClassCodes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

/**
 * Upsert `tutor_profiles` from auth.user — call after onboarding & on tutor login.
 * `listed=true` on every sync so RLS allows students to read rows for booking (`tutor_id` resolution).
 * Class browse only shows tutors where `transcript_submitted` is true (see ClassDetail query).
 */
export async function syncTutorProfileFromUser(user) {
  if (!user?.id || user.user_metadata?.role !== 'tutor') return { error: null };

  const m = user.user_metadata || {};
  const classCodes = normalizedClassCodes(m.classes);
  const transcriptDone = !!m.transcript_submitted;

  const row = {
    user_id: user.id,
    full_name: m.full_name || user.email?.split('@')[0] || 'Tutor',
    year: m.year || null,
    major: typeof m.major === 'string' && m.major.trim() ? m.major.trim() : 'Student',
    class_codes: classCodes,
    transcript_submitted: transcriptDone,
    listed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('tutor_profiles').upsert(row, { onConflict: 'user_id' });
  return { error };
}

/** Map DB row → shape TutorCard + TutorProfile expect (merge with defaults in UI). */
export function tutorProfileRowToCard(row) {
  const name = row.full_name || 'Tutor';
  const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const codes = normalizedClassCodes(row.class_codes);
  const grades = {};
  codes.forEach((c) => { grades[c] = 'A'; });

  return {
    id: row.user_id,
    name,
    initials,
    major: row.major || 'Student',
    year: row.year || '',
    classes: codes.length ? codes : ['CHEM 200'],
    grades,
    bio: row.bio || 'Verified Study Buddy tutor.',
    rate: Number(row.rate) || 38,
    rating: 5,
    reviews: 0,
    sessions: 0,
    responseTime: '< 30m',
    availability: 'This week',
    nextSlot: 'See profile',
    verified: !!row.transcript_submitted,
    topRated: false,
    tags: [],
    color: 'oklch(0.72 0.1 100)',
  };
}

/** Live listed profiles + catalogue demo tutors; hide demo Priya when `VITE_DEMO_TUTOR_USER_ID` matches a live row (dedupe). */
export function mergedTutorCardsForClass(liveProfileRows) {
  const linked = linkedDemoTutorUuid();
  const hideDemo = !!(linked && (liveProfileRows || []).some((r) => r.user_id === linked));
  const demos = hideDemo ? [] : [...TUTORS];
  const liveCards = (liveProfileRows || []).map(tutorProfileRowToCard);
  return [...liveCards, ...demos];
}

