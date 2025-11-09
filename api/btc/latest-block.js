export const runtime = 'edge';

const BLOCKCHAIN_URL = 'https://blockchain.info/latestblock?cors=true';
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const jsonResponse = (status, body, extraHeaders = {}) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
};

const getClientKey = req => {
  if (!req || !req.headers) {
    return 'global';
  }

  const headers = req.headers;
  let forwarded = null;

  if (typeof headers.get === 'function') {
    try {
      forwarded = headers.get('x-forwarded-for');
    } catch (error) {
      forwarded = null;
    }
  }

  if (!forwarded) {
    const candidates = [
      'x-forwarded-for',
      'X-Forwarded-For',
      'X_FORWARDED_FOR',
      'X-FORWARDED-FOR',
      'forwarded',
      'Forwarded',
    ];

    for (const key of candidates) {
      if (key in headers) {
        const value = headers[key];
        if (Array.isArray(value)) {
          forwarded = value[0];
        } else if (value && typeof value === 'object' && 'value' in value) {
          forwarded = value.value;
        } else {
          forwarded = value;
        }
        if (forwarded) break;
      } else if (typeof headers.get === 'function') {
        const value = headers.get(key);
        if (value) {
          forwarded = value;
          break;
        }
      }
    }
  }

  if (typeof forwarded !== 'string') {
    forwarded = String(forwarded || '');
  }

  if (!forwarded) {
    return 'global';
  }

  return forwarded.split(',')[0].trim() || 'global';
};

const rateLimitStore = globalThis.__btcLatestBlockRateLimit ?? new Map();
if (!globalThis.__btcLatestBlockRateLimit) {
  globalThis.__btcLatestBlockRateLimit = rateLimitStore;
}

const checkRateLimit = key => {
  if (!RATE_LIMIT_MAX_REQUESTS || RATE_LIMIT_MAX_REQUESTS < 0) {
    return null;
  }
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing || now >= existing.expiresAt) {
    rateLimitStore.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return existing.expiresAt - now;
  }
  existing.count += 1;
  return null;
};

const extractBlockData = data => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const hash = typeof data.hash === 'string' ? data.hash : '';
  const heightRaw = data.height ?? data.block_height;
  const blockIndexRaw = data.block_index ?? data.blockIndex;
  const height = Number(heightRaw);
  const time = Number(data.time);
  const blockIndex = Number(blockIndexRaw);
  if (!hash || !Number.isFinite(height) || !Number.isFinite(time) || !Number.isFinite(blockIndex)) {
    return null;
  }
  return {
    hash,
    height,
    time,
    block_index: blockIndex,
  };
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed', code: 'method_not_allowed' }, { Allow: 'GET' });
  }

  const clientKey = getClientKey(req);
  const retryInMs = checkRateLimit(clientKey);
  if (retryInMs) {
    const retryAfter = Math.max(1, Math.ceil(retryInMs / 1000));
    return jsonResponse(429, { error: 'Rate limit exceeded', code: 'proxy_rate_limit', retryAfter }, { 'Retry-After': String(retryAfter) });
  }

  try {
    const upstreamResponse = await fetch(BLOCKCHAIN_URL, {
      cache: 'no-store',
      headers: {
        'user-agent': 'psi-experiment/latest-block-proxy',
      },
    });

    const upstreamBodyText = await upstreamResponse.text();
    let upstreamJson = null;
    if (upstreamBodyText) {
      try {
        upstreamJson = JSON.parse(upstreamBodyText);
      } catch (error) {
        upstreamJson = null;
      }
    }

    if (!upstreamResponse.ok) {
      return jsonResponse(502, {
        error: 'Blockchain API HTTP-Fehler',
        code: 'upstream_http_error',
        upstreamStatus: upstreamResponse.status,
        upstreamBody: upstreamJson ?? upstreamBodyText.slice(0, 256),
      });
    }

    if (!upstreamJson) {
      return jsonResponse(502, {
        error: 'Blockchain-Antwort konnte nicht geparst werden',
        code: 'upstream_invalid_json',
        upstreamBody: upstreamBodyText.slice(0, 256),
      });
    }

    const blockData = extractBlockData(upstreamJson);
    if (!blockData) {
      return jsonResponse(502, {
        error: 'Blockchain-Daten unvollständig',
        code: 'upstream_invalid_payload',
        upstreamData: upstreamJson,
      });
    }

    console.info('[btc/latest-block] Served block', {
      clientKey,
      height: blockData.height,
      hash: blockData.hash,
    });

    return jsonResponse(200, blockData);
  } catch (error) {
    console.error('[btc/latest-block] Upstream fetch failed', {
      clientKey,
      message: error?.message,
    });
    return jsonResponse(502, {
      error: 'Blockchain-Anfrage fehlgeschlagen',
      code: 'upstream_fetch_error',
      message: error?.message || String(error),
    });
  }
}
