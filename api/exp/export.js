import { list } from '@vercel/blob';

export const runtime = 'nodejs';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UID_RE = /^[a-z0-9]{12,64}$/;
const CSV_FIELDS = [
  'experiment_key','experiment_version','uid','ts','duration_min','speed_ms','start_field','focus','steps','cw','ccw','hits','misses','z','p','bias_pct','target_z','target_p','hit_rate'
];
const NUMERIC_FIELDS = ['ts','duration_min','speed_ms','start_field','steps','cw','ccw','hits','misses','z','p'];
const OPTIONAL_NUMERIC_FIELDS = ['bias_pct','target_z','target_p','hit_rate'];
const EXPERIMENT_KEY_RE = /^[a-z0-9-]{1,64}$/i;

const isNumber = value => typeof value === 'number' && Number.isFinite(value);

const csvEscape = value => {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return /["\n,]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const deriveUidFromPath = pathname => {
  if (typeof pathname !== 'string') return 'anon';
  const segments = pathname.split('/');
  const filename = segments[segments.length - 1] || '';
  const uidCandidate = filename.split('-')[0] || '';
  return uidCandidate || 'anon';
};

const sanitizeRecord = (raw, fallbackUid) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid record');
  }

  const focus = raw.focus;
  if (focus !== 'cw' && focus !== 'ccw' && focus !== 'none') {
    throw new Error('Invalid record');
  }

  const numbers = Object.fromEntries(NUMERIC_FIELDS.map(field => [field, raw[field]]));
  if (!Object.values(numbers).every(isNumber)) {
    throw new Error('Invalid record');
  }

  if (numbers.duration_min < 0 || numbers.speed_ms <= 0 || numbers.steps < 0 || numbers.cw < 0 || numbers.ccw < 0 || numbers.hits < 0 || numbers.misses < 0) {
    throw new Error('Invalid record');
  }

  for (const field of OPTIONAL_NUMERIC_FIELDS) {
    const value = raw[field];
    if (value === undefined || value === null) continue;
    if (!isNumber(value)) {
      throw new Error('Invalid record');
    }
  }

  if (!Number.isInteger(numbers.start_field) || numbers.start_field < 1) {
    throw new Error('Invalid record');
  }

  const record = {
    ...(typeof raw.experiment_key === 'string' && EXPERIMENT_KEY_RE.test(raw.experiment_key) ? { experiment_key: raw.experiment_key } : {}),
    ...(typeof raw.experiment_version === 'string' && raw.experiment_version.trim() ? { experiment_version: raw.experiment_version.trim() } : {}),
    ts: Math.round(numbers.ts),
    duration_min: numbers.duration_min,
    speed_ms: numbers.speed_ms,
    start_field: Math.round(numbers.start_field),
    focus,
    steps: numbers.steps,
    cw: numbers.cw,
    ccw: numbers.ccw,
    hits: numbers.hits,
    misses: numbers.misses,
    z: numbers.z,
    p: numbers.p,
    ...(raw.bias_pct !== undefined && raw.bias_pct !== null ? { bias_pct: Number(raw.bias_pct) } : {}),
    ...(raw.target_z !== undefined && raw.target_z !== null ? { target_z: Number(raw.target_z) } : {}),
    ...(raw.target_p !== undefined && raw.target_p !== null ? { target_p: Number(raw.target_p) } : {}),
    ...(raw.hit_rate !== undefined && raw.hit_rate !== null ? { hit_rate: Number(raw.hit_rate) } : {}),
  };

  const explicitUid = typeof raw.uid === 'string' ? raw.uid.toLowerCase() : undefined;
  if (explicitUid && UID_RE.test(explicitUid)) {
    record.uid = explicitUid;
  } else if (fallbackUid && fallbackUid !== 'anon') {
    record.uid = fallbackUid.toLowerCase();
  }

  return record;
};

const toJsonObject = record => {
  const base = {
    ...(record.experiment_key ? { experiment_key: record.experiment_key } : {}),
    ...(record.experiment_version ? { experiment_version: record.experiment_version } : {}),
    ts: record.ts,
    duration_min: record.duration_min,
    speed_ms: record.speed_ms,
    start_field: record.start_field,
    focus: record.focus,
    steps: record.steps,
    cw: record.cw,
    ccw: record.ccw,
    hits: record.hits,
    misses: record.misses,
    z: record.z,
    p: record.p,
    ...(record.bias_pct !== undefined ? { bias_pct: record.bias_pct } : {}),
    ...(record.target_z !== undefined ? { target_z: record.target_z } : {}),
    ...(record.target_p !== undefined ? { target_p: record.target_p } : {}),
    ...(record.hit_rate !== undefined ? { hit_rate: record.hit_rate } : {}),
  };
  return record.uid ? { uid: record.uid, ...base } : base;
};

const formatCsv = records => {
  const header = CSV_FIELDS.join(',');
  const lines = records.map(record => {
    return CSV_FIELDS.map(field => {
      if (field === 'experiment_key') {
        return csvEscape(record.experiment_key ?? '');
      }
      if (field === 'experiment_version') {
        return csvEscape(record.experiment_version ?? '');
      }
      if (field === 'uid') {
        return csvEscape(record.uid ?? '');
      }
      return csvEscape(record[field]);
    }).join(',');
  });
  return [header, ...lines].join('\n');
};

const formatJsonl = records => {
  return records.map(record => JSON.stringify(toJsonObject(record))).join('\n') + (records.length ? '\n' : '');
};

const listRecords = async prefix => {
  const records = [];
  let cursor;

  while (true) {
    const page = await list(cursor ? { prefix, cursor } : { prefix });
    for (const blob of page.blobs) {
      const fallbackUid = deriveUidFromPath(blob.pathname);
      const res = await fetch(blob.url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Blob download failed');
      const raw = await res.json();
      records.push(sanitizeRecord(raw, fallbackUid));
    }
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }

  records.sort((a, b) => a.ts - b.ts);
  return records;
};

export default async function handler(req) {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const url = new URL(req.url);
  const day = url.searchParams.get('day') || '';
  const formatParam = (url.searchParams.get('format') || 'jsonl').toLowerCase();

  if (!DAY_RE.test(day)) {
    return new Response('Bad Request', { status: 400 });
  }

  if (formatParam !== 'csv' && formatParam !== 'jsonl') {
    return new Response('Bad Request', { status: 400 });
  }

  try {
    const prefix = `exp/${day}/`;
    const records = await listRecords(prefix);
    const body = formatParam === 'csv' ? formatCsv(records) : formatJsonl(records);
    const headers = new Headers({
      'cache-control': 'no-store',
      'content-type': formatParam === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson; charset=utf-8',
    });
    return new Response(body, { status: 200, headers });
  } catch (error) {
    return new Response('Export Error', { status: 502 });
  }
}
