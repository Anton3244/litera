/**
 * Cloudflare Worker для «Літери».
 *
 * Робить три речі:
 *   1. зберігає журнал занять під випадковим кодом (синхронізація пристроїв);
 *   2. приймає підписки на push і доставляє сповіщення на конкретний код;
 *   3. дає адмінові список кодів і кнопку «надіслати повідомлення».
 *
 * Жодних акаунтів і паролів: код — це і є ключ. Хто знає код, той бачить
 * прогрес, тому код показуємо лише власниці й ніде не публікуємо.
 *
 * Розгортання й секрети — див. sync/README.md
 *
 *   GET    /s/<код>            → стан (або 404)
 *   PUT    /s/<код>            → зберегти стан (JSON, до 1 МБ)
 *
 *   GET    /push/key           → публічний ключ VAPID
 *   POST   /push/sub/<код>     → зареєструвати підписку пристрою
 *   DELETE /push/sub/<код>     → зняти підписку (тіло: {endpoint})
 *   GET    /push/inbox/<код>   → забрати й очистити чергу повідомлень
 *
 *   GET    /admin/codes        → список кодів зі зведенням     (X-Admin-Token)
 *   POST   /admin/send         → надіслати повідомлення на код (X-Admin-Token)
 *
 * Адмінський токен НЕ лежить у репозиторії й не потрапляє в застосунок:
 * він зберігається як секрет воркера, а на пристрої адміна його вводять
 * руками один раз.
 */

const MAX_BODY = 1024 * 1024;           // 1 МБ вистачає на роки занять
const TTL_SECONDS = 60 * 60 * 24 * 400; // рік з гаком без заходу — і код згасає
const INBOX_TTL = 60 * 60 * 24 * 7;     // непрочитане живе тиждень
const MAX_INBOX = 20;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

const b64url = buf =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlToBytes = s => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - pad.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

/* ---------------- VAPID ---------------- */

/** Підписує JWT для одного push-сервісу. Формат — ES256, як вимагає RFC 8292. */
async function vapidJwt(audience, env) {
  const pub = b64urlToBytes(env.VAPID_PUBLIC);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
    d: env.VAPID_PRIVATE,
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || 'mailto:litera@example.com',
  })));
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

/**
 * Будить пристрій порожнім push-повідомленням.
 *
 * Свідомо без корисного навантаження: шифрування тіла (aes128gcm) —
 * окрема морока, а нам вистачає розбудити service worker, який сам
 * забере текст із /push/inbox. Заразом текст не проходить через
 * чужий push-сервіс.
 */
async function wake(subscription, env) {
  const endpoint = new URL(subscription.endpoint);
  const jwt = await vapidJwt(endpoint.origin, env);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      'Content-Length': '0',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
    },
  });
  return res.status;
}

/* ---------------- допоміжне ---------------- */

const codeFrom = path => {
  const m = path.match(/([A-Za-z0-9]{6,32})$/);
  return m ? m[1].toUpperCase() : null;
};

function summarise(raw) {
  try {
    const d = JSON.parse(raw);
    const answers = Array.isArray(d.answers) ? d.answers : [];
    const last = answers.length ? answers[answers.length - 1] : null;
    return {
      name: d.settings?.name ?? d.name ?? null,
      xp: d.xp ?? null,
      answers: answers.length,
      lastAnswerAt: last ? (last.at || last.ts || null) : null,
      savedAt: d.savedAt || null,
      bytes: raw.length,
    };
  } catch {
    return { error: 'не вдалося прочитати', bytes: raw.length };
  }
}

const adminOk = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get('X-Admin-Token') === env.ADMIN_TOKEN;

/* ---------------- маршрути ---------------- */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    /* --- синхронізація прогресу --- */
    const sync = path.match(/^\/s\/([A-Za-z0-9]{6,32})$/);
    if (sync) {
      const key = 'sync:' + sync[1].toUpperCase();

      if (method === 'GET') {
        const stored = await env.LITERA.get(key);
        if (!stored) return json({ error: 'empty' }, 404);
        return new Response(stored, {
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
        });
      }

      if (method === 'PUT') {
        const body = await request.text();
        if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);
        try { JSON.parse(body); } catch { return json({ error: 'bad json' }, 400); }
        await env.LITERA.put(key, body, { expirationTtl: TTL_SECONDS });
        return json({ ok: true, size: body.length });
      }

      return json({ error: 'method not allowed' }, 405);
    }

    /* --- публічний ключ для підписки --- */
    if (path === '/push/key' && method === 'GET') {
      if (!env.VAPID_PUBLIC) return json({ error: 'push не налаштовано' }, 503);
      return json({ key: env.VAPID_PUBLIC });
    }

    /* --- підписки --- */
    if (path.startsWith('/push/sub/')) {
      const code = codeFrom(path);
      if (!code) return json({ error: 'not found' }, 404);
      const key = 'subs:' + code;
      const list = JSON.parse((await env.LITERA.get(key)) || '[]');

      if (method === 'POST') {
        const sub = await request.json().catch(() => null);
        if (!sub?.endpoint) return json({ error: 'bad subscription' }, 400);
        const next = list.filter(s => s.endpoint !== sub.endpoint);
        next.push({
          endpoint: sub.endpoint,
          addedAt: new Date().toISOString(),
          label: (sub.label || '').slice(0, 40) || null,
        });
        await env.LITERA.put(key, JSON.stringify(next.slice(-5)), { expirationTtl: TTL_SECONDS });
        return json({ ok: true, devices: Math.min(next.length, 5) });
      }

      if (method === 'DELETE') {
        const body = await request.json().catch(() => ({}));
        const next = list.filter(s => s.endpoint !== body.endpoint);
        await env.LITERA.put(key, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
        return json({ ok: true, devices: next.length });
      }

      return json({ error: 'method not allowed' }, 405);
    }

    /* --- черга повідомлень: service worker забирає й очищає --- */
    if (path.startsWith('/push/inbox/') && method === 'GET') {
      const code = codeFrom(path);
      if (!code) return json({ error: 'not found' }, 404);
      const key = 'inbox:' + code;
      const items = JSON.parse((await env.LITERA.get(key)) || '[]');
      if (items.length) await env.LITERA.delete(key);
      return json({ items });
    }

    /* --- адмінське --- */
    if (path === '/admin/codes' && method === 'GET') {
      if (!adminOk(request, env)) return json({ error: 'forbidden' }, 403);
      const listed = await env.LITERA.list({ prefix: 'sync:', limit: 200 });
      const out = [];
      for (const k of listed.keys) {
        const code = k.name.slice(5);
        const raw = await env.LITERA.get(k.name);
        const subs = JSON.parse((await env.LITERA.get('subs:' + code)) || '[]');
        const inbox = JSON.parse((await env.LITERA.get('inbox:' + code)) || '[]');
        out.push({
          code,
          ...(raw ? summarise(raw) : { error: 'порожньо' }),
          devices: subs.length,
          pending: inbox.length,
        });
      }
      out.sort((a, b) => String(b.lastAnswerAt || '').localeCompare(String(a.lastAnswerAt || '')));
      return json({ codes: out });
    }

    if (path === '/admin/send' && method === 'POST') {
      if (!adminOk(request, env)) return json({ error: 'forbidden' }, 403);
      const body = await request.json().catch(() => ({}));
      const code = String(body.code || '').toUpperCase();
      const title = String(body.title || 'Літера').slice(0, 80);
      const text = String(body.body || '').slice(0, 300);
      if (!/^[A-Z0-9]{6,32}$/.test(code)) return json({ error: 'bad code' }, 400);
      if (!text) return json({ error: 'порожнє повідомлення' }, 400);

      const inboxKey = 'inbox:' + code;
      const items = JSON.parse((await env.LITERA.get(inboxKey)) || '[]');
      items.push({ title, body: text, at: new Date().toISOString() });
      await env.LITERA.put(inboxKey, JSON.stringify(items.slice(-MAX_INBOX)),
        { expirationTtl: INBOX_TTL });

      const subs = JSON.parse((await env.LITERA.get('subs:' + code)) || '[]');
      if (!subs.length) {
        return json({
          ok: true, delivered: 0, queued: true,
          note: 'Пристрій ще не підписаний на сповіщення — текст полежить у черзі й прийде, коли вона відкриє застосунок.',
        });
      }

      const results = [];
      const alive = [];
      for (const s of subs) {
        let status = 0;
        try { status = await wake(s, env); } catch { status = -1; }
        results.push({ endpoint: s.endpoint.slice(0, 48) + '…', status });
        // 404 і 410 означають, що підписка мертва — більше її не тримаємо
        if (status !== 404 && status !== 410) alive.push(s);
      }
      if (alive.length !== subs.length) {
        await env.LITERA.put('subs:' + code, JSON.stringify(alive), { expirationTtl: TTL_SECONDS });
      }
      const delivered = results.filter(r => r.status >= 200 && r.status < 300).length;
      return json({ ok: true, delivered, results });
    }

    return json({ error: 'not found' }, 404);
  },
};
