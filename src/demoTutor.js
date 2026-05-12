/**
 * Demo catalog tutors use ids like `t3`, not Supabase user UUIDs.
 * Set `VITE_DEMO_TUTOR_USER_ID` in `.env.local` to map Priya’s demo id to your real auth UUID,
 * or ensure the tutor has a listed `tutor_profiles` row — see `resolveTutorIdForSession`.
 */

import { TUTORS } from './data.js';
import { supabase } from './supabase.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const linkedDemoTutorUuid = () => {
  const v = import.meta.env.VITE_DEMO_TUTOR_USER_ID;
  const s = typeof v === 'string' ? v.trim() : '';
  return UUID_RE.test(s) ? s : '';
};

/** Use in `/tutor/:id` links from the catalog — real UUID when env set, else demo id (`t3`). */
export function profileIdForCatalogTutor(catalogTutorId) {
  const u = linkedDemoTutorUuid();
  return u || catalogTutorId;
}

/** Use when inserting sessions: real UUID from booking state or from env fallback for demo id. */
export function tutorUuidForSessionRow(routeOrStateTutorId) {
  const raw = routeOrStateTutorId ? String(routeOrStateTutorId).trim() : '';
  if (UUID_RE.test(raw)) return raw;
  const u = linkedDemoTutorUuid();
  return u || null;
}

/**
 * Escape `%`/`_` for PostgREST `ILIKE`; keeps normal names verbatim.
 */
function escapeIlikeChars(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * UUID for `sessions.tutor_id`: path/env → listed `tutor_profiles` by exact / case‑insensitive name
 * → for demo catalog ids (`t3`), sole listed tutor for `class_codes` ∩ classCode.
 */
export async function resolveTutorIdForSession(passedTutorId, tutorDisplayName, classCode) {
  const fromRoute = tutorUuidForSessionRow(passedTutorId);
  if (fromRoute) return fromRoute;

  const names = [
    typeof tutorDisplayName === 'string' ? tutorDisplayName.trim() : '',
    TUTORS.find((t) => t.id === passedTutorId)?.name?.trim?.(),
  ].filter(Boolean);
  const uniqueNames = [...new Set(names)];

  for (const fullName of uniqueNames) {
    if (!fullName) continue;

    let { data } = await supabase
      .from('tutor_profiles')
      .select('user_id')
      .eq('listed', true)
      .eq('full_name', fullName)
      .limit(1);

    if (!data?.[0]) {
      ({ data } = await supabase
        .from('tutor_profiles')
        .select('user_id')
        .eq('listed', true)
        .ilike('full_name', escapeIlikeChars(fullName))
        .limit(1));
    }

    const id = data?.[0]?.user_id;
    if (id) return id;
  }

  const isCatalogDemo =
    passedTutorId != null &&
    typeof passedTutorId === 'string' &&
    TUTORS.some((t) => t.id === passedTutorId);

  const code = typeof classCode === 'string' ? classCode.trim() : '';

  if (isCatalogDemo && code) {
    const { data: rows } = await supabase
      .from('tutor_profiles')
      .select('user_id')
      .eq('listed', true)
      .contains('class_codes', [code])
      .limit(8);
    if (rows?.length === 1) return rows[0].user_id;
  }

  return null;
}

/**
 * Real `tutor_id` for loading `session_reviews` from a profile URL param.
 * Students often open `/tutor/t3` while reviews are stored under the tutor's auth UUID — this aligns both.
 */
export async function tutorUuidFromProfileRouteParam(routeId) {
  const raw = routeId ? String(routeId).trim() : '';
  if (!raw) return '';
  if (UUID_RE.test(raw)) return raw;

  const linked = linkedDemoTutorUuid();
  if (linked && TUTORS.some((t) => t.id === raw)) return linked;

  const catalog = TUTORS.find((t) => t.id === raw);
  if (!catalog) return '';

  const name = catalog.name?.trim();
  if (name) {
    let { data: rows } = await supabase.from('tutor_profiles').select('user_id').eq('listed', true).eq('full_name', name).limit(2);
    if (rows?.length === 1) return rows[0].user_id;
    ({ data: rows } = await supabase
      .from('tutor_profiles')
      .select('user_id')
      .eq('listed', true)
      .ilike('full_name', escapeIlikeChars(name))
      .limit(2));
    if (rows?.length === 1) return rows[0].user_id;
  }

  const { data: chem } = await supabase
    .from('tutor_profiles')
    .select('user_id')
    .eq('listed', true)
    .contains('class_codes', ['CHEM 200'])
    .limit(9);
  if (chem?.length === 1) return chem[0].user_id;

  return '';
}
