export const config = { runtime: 'edge' };

/**
 * Minimal Experiment-Analytics (kein Tracking, keine PII)
 * Erwartetes JSON (Whitelist):
 * { ts, duration_min, speed_ms, start_field, focus, steps, cw, ccw, hits, misses, z, p }
 */
const ALLOWED = new Set(['ts','duration_min','speed_ms','start_field','focus','steps','cw','ccw','hits','misses','z','p']);

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let rec;
  try { rec = await req.json(); }
  catch { return new Response('Bad Request', { status: 400 }); }

  // Whitelist + Basic-Types
  if (!rec || Object.keys(rec).some(k => !ALLOWED.has(k))) {
    return new Response('Bad Request', { status: 400 });
  }
  const num = v => (typeof v === 'number' && isFinite(v));
  const ok =
    num(rec.ts) &&
    num(rec.duration_min) &&
    num(rec.speed_ms) &&
    (typeof rec.start_field === 'number') &&
    (rec.focus === 'cw' || rec.focus === 'ccw') &&
    ['steps','cw','ccw','hits','misses','z','p'].every(k => num(rec[k]));

  if (!ok) return new Response('Bad Request', { status: 400 });

  // TODO: Persistenz (später):
  // - Vercel Blob JSONL-Append (empfohlen)
  // - oder KV/DB; IP/Headers werden nicht gespeichert

  return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
}
