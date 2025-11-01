import { put } from '@vercel/blob';

export const runtime = 'nodejs';

/**
 * Minimal Experiment-Analytics (kein Tracking, keine PII)
 * Erwartetes JSON (Whitelist):
 * { uid?, ts, duration_min, speed_ms, start_field, focus, steps, cw, ccw, hits, misses, z, p }
 */
const ALLOWED = new Set([
  'uid','ts','duration_min','speed_ms','start_field','focus','steps','cw','ccw','hits','misses','z','p',
  'experiment_key','experiment_version','bias_pct','target_z','target_p','hit_rate'
]);
const NUMERIC_FIELDS = ['ts','duration_min','speed_ms','start_field','steps','cw','ccw','hits','misses','z','p'];
const OPTIONAL_NUMERIC_FIELDS = ['bias_pct','target_z','target_p','hit_rate'];
const EXPERIMENT_KEY_RE = /^[a-z0-9-]{1,64}$/i;
const UID_RE = /^[a-z0-9]{12,64}$/;

const isNumber = value => typeof value === 'number' && Number.isFinite(value);

const randomSuffix = () => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    if (typeof crypto.getRandomValues === 'function') {
      const arr = new Uint32Array(3);
      crypto.getRandomValues(arr);
      return Array.from(arr, n => n.toString(16).padStart(8, '0')).join('').slice(0, 12);
    }
  }
  return Math.random().toString(36).slice(2, 14);
};

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let rec;
  try { rec = await req.json(); }
  catch { return new Response('Bad Request', { status: 400 }); }

  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
    return new Response('Bad Request', { status: 400 });
  }

  if (Object.keys(rec).some(key => !ALLOWED.has(key))) {
    return new Response('Bad Request', { status: 400 });
  }

  if (!NUMERIC_FIELDS.every(field => isNumber(rec[field]))) {
    return new Response('Bad Request', { status: 400 });
  }

  if (rec.duration_min < 0 || rec.speed_ms <= 0 || rec.steps < 0 || rec.cw < 0 || rec.ccw < 0 || rec.hits < 0 || rec.misses < 0) {
    return new Response('Bad Request', { status: 400 });
  }

  if (rec.focus !== 'cw' && rec.focus !== 'ccw' && rec.focus !== 'none') {
    return new Response('Bad Request', { status: 400 });
  }

  if (!Number.isInteger(rec.start_field) || rec.start_field < 1) {
    return new Response('Bad Request', { status: 400 });
  }

  for (const field of OPTIONAL_NUMERIC_FIELDS) {
    if (rec[field] === undefined || rec[field] === null) continue;
    if (!isNumber(rec[field])) {
      return new Response('Bad Request', { status: 400 });
    }
  }

  let uid = rec.uid;
  if (uid === undefined || uid === null || uid === '') {
    uid = 'anon';
  } else {
    if (typeof uid !== 'string') return new Response('Bad Request', { status: 400 });
    uid = uid.toLowerCase();
    if (!UID_RE.test(uid)) return new Response('Bad Request', { status: 400 });
  }

  const ts = Math.round(rec.ts);
  const tsDate = new Date(ts);
  if (Number.isNaN(tsDate.getTime())) {
    return new Response('Bad Request', { status: 400 });
  }
  const day = tsDate.toISOString().slice(0, 10);

  const storedRecord = {
    ...(uid !== 'anon' ? { uid } : {}),
    ...(typeof rec.experiment_key === 'string' && EXPERIMENT_KEY_RE.test(rec.experiment_key) ? { experiment_key: rec.experiment_key } : {}),
    ...(typeof rec.experiment_version === 'string' && rec.experiment_version.trim() ? { experiment_version: rec.experiment_version.trim() } : {}),
    ts,
    duration_min: Number(rec.duration_min),
    speed_ms: Number(rec.speed_ms),
    start_field: Math.round(Number(rec.start_field)),
    focus: rec.focus,
    steps: Number(rec.steps),
    cw: Number(rec.cw),
    ccw: Number(rec.ccw),
    hits: Number(rec.hits),
    misses: Number(rec.misses),
    z: Number(rec.z),
    p: Number(rec.p),
    ...(rec.bias_pct !== undefined && rec.bias_pct !== null ? { bias_pct: Number(rec.bias_pct) } : {}),
    ...(rec.target_z !== undefined && rec.target_z !== null ? { target_z: Number(rec.target_z) } : {}),
    ...(rec.target_p !== undefined && rec.target_p !== null ? { target_p: Number(rec.target_p) } : {}),
    ...(rec.hit_rate !== undefined && rec.hit_rate !== null ? { hit_rate: Number(rec.hit_rate) } : {}),
  };

  const keyUid = uid === 'anon' ? 'anon' : uid;
  const blobPath = `exp/${day}/${keyUid}-${ts}-${randomSuffix()}.json`;

  try {
    await put(blobPath, JSON.stringify(storedRecord), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
    });
  } catch {
    return new Response('Blob Error', { status: 502 });
  }

  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
