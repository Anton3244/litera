/**
 * Cloudflare Worker для синхронізації прогресу між пристроями.
 *
 * Зберігає журнал занять під випадковим кодом. Жодних акаунтів і паролів:
 * код — це і є ключ. Хто знає код, той бачить прогрес, тому код показуємо
 * лише власниці й ніде не публікуємо.
 *
 * Розгортання — див. sync/README.md
 *
 *   GET  /s/<код>   → віддає збережений стан (або 404)
 *   PUT  /s/<код>   → зберігає стан (тіло — JSON, до 1 МБ)
 */

const MAX_BODY = 1024 * 1024;          // 1 МБ вистачає на роки занять
const TTL_SECONDS = 60 * 60 * 24 * 400; // рік з гаком без заходу — і код згасає

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/s\/([A-Za-z0-9]{6,32})$/);
    if (!match) return json({ error: 'not found' }, 404);

    const key = 'sync:' + match[1].toUpperCase();

    if (request.method === 'GET') {
      const stored = await env.LITERA.get(key);
      if (!stored) return json({ error: 'empty' }, 404);
      return new Response(stored, {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
      });
    }

    if (request.method === 'PUT') {
      const body = await request.text();
      if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);
      try {
        JSON.parse(body);
      } catch {
        return json({ error: 'bad json' }, 400);
      }
      await env.LITERA.put(key, body, { expirationTtl: TTL_SECONDS });
      return json({ ok: true, size: body.length });
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
