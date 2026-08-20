// Підписка пристрою на сповіщення з сервера.
//
// Локальні нагадування (notify.js) працюють лише поки застосунок відкритий
// або поки браузер погодився будити service worker. Push — інший канал:
// повідомлення приходить, навіть коли застосунок закритий.
//
// Текст через push НЕ передається: сервер шле порожній «будильник»,
// а service worker сам забирає текст із черги. Так повідомлення не
// проходить через чужий push-сервіс.

import { serverUrl, syncCode } from './sync.js';

const b64urlToBytes = s => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - pad.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

export const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * navigator.serviceWorker.ready ніколи не завершується, якщо worker не
 * зареєстровано (буває на локальному сервері або коли реєстрація впала).
 * Без обмеження часу інтерфейс просто зависав би на «Перевіряю…».
 */
function readyOrNull(ms = 4000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Коротка позначка пристрою, щоб у списку було видно, звідки підписка. */
function deviceLabel() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'Mac';
  return 'браузер';
}

/**
 * Підписує цей пристрій. Викликати після того, як дозвіл на сповіщення
 * вже отримано — сам дозволу не просить.
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function subscribe() {
  if (!supported()) return { ok: false, reason: 'Цей браузер не вміє push-сповіщення.' };

  const url = serverUrl();
  const code = syncCode();
  if (!url || !code) return { ok: false, reason: 'Спершу увімкни синхронізацію — потрібен код.' };
  if (Notification.permission !== 'granted') return { ok: false, reason: 'Дозвіл на сповіщення не надано.' };

  let key;
  try {
    const res = await fetch(`${url}/push/key`, { cache: 'no-store' });
    if (!res.ok) return { ok: false, reason: 'Сервер не налаштований на push.' };
    key = (await res.json()).key;
  } catch {
    return { ok: false, reason: 'Не вдалося зв’язатися з сервером.' };
  }

  try {
    const reg = await readyOrNull();
    if (!reg) return { ok: false, reason: 'Service worker не готовий — онови сторінку.' };
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64urlToBytes(key),
    });
    const res = await fetch(`${url}/push/sub/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, label: deviceLabel() }),
    });
    if (!res.ok) return { ok: false, reason: 'Сервер не прийняв підписку.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || 'Не вдалося підписатися.' };
  }
}

/** Знімає підписку цього пристрою. */
export async function unsubscribe() {
  if (!supported()) return { ok: true };
  try {
    const reg = await readyOrNull();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return { ok: true };
    const url = serverUrl();
    const code = syncCode();
    if (url && code) {
      await fetch(`${url}/push/sub/${code}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }
    await sub.unsubscribe();
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

/** Чи підписаний саме цей пристрій. */
export async function isSubscribed() {
  if (!supported()) return false;
  try {
    const reg = await readyOrNull();
    if (!reg) return false;
    return Boolean(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Забирає те, що надійшло, поки застосунок був закритий, а push не дійшов
 * (наприклад, дозволу на push немає, а синхронізація є). Викликається при старті.
 */
export async function drainInbox() {
  const url = serverUrl();
  const code = syncCode();
  if (!url || !code) return [];
  try {
    const res = await fetch(`${url}/push/inbox/${code}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).items || [];
  } catch {
    return [];
  }
}
