// Нагадування.
//
// Що реально працює в браузері без свого сервера:
//  1. поки вкладка (або встановлений застосунок) відкрита — таймер усередині сторінки;
//  2. якщо сайт додано на головний екран і браузер підтримує Periodic Background Sync —
//     service worker сам перевіряє раз на добу, чи було заняття.
// Якщо ні перше, ні друге не спрацювало, нагадування просто не прийде —
// тому в налаштуваннях чесно про це написано.

import * as store from './store.js';
import { kvPut } from './db.js';
import { dayKey } from './util.js';
import { serverUrl, syncCode } from './sync.js';
import * as push from './push.js';

const MIRROR_KEY = 'reminder';
const SYNC_TAG = 'study-reminder';

let timer = null;

export function initReminders() {
  syncMirror();
  schedule();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
}

/** Дублює потрібний мінімум у IndexedDB, щоб service worker міг це прочитати. */
export function syncMirror() {
  return kvPut(MIRROR_KEY, {
    enabled: store.getBool('reminders_on'),
    time: store.get('reminder_time'),
    lastStudyDay: lastStudyDay(),
    name: store.get('name'),
    // щоб service worker міг сам забрати текст надісланого повідомлення
    syncUrl: serverUrl(),
    syncCode: syncCode(),
  }).catch(() => { /* не критично */ });
}

function lastStudyDay() {
  const today = dayKey();
  return store.dayStats(today).answered > 0 ? today : null;
}

export async function enableReminders(timeHHMM) {
  if (!('Notification' in window)) {
    return { ok: false, reason: 'Цей браузер не вміє показувати сповіщення.' };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'Дозвіл на сповіщення не надано.' };
  }

  store.set('reminders_on', '1');
  if (timeHHMM) store.set('reminder_time', timeHHMM);
  await syncMirror();
  await registerPeriodicSync();
  // Другий канал: приходить, навіть коли застосунок закрито.
  // Якщо не вийде (немає коду або браузер не вміє) — локальні нагадування
  // все одно лишаються, тому помилку сюди не піднімаємо.
  const p = await push.subscribe();
  schedule();
  return { ok: true, push: p.ok, pushReason: p.ok ? null : p.reason };
}

export function disableReminders() {
  store.set('reminders_on', '0');
  clearTimeout(timer);
  syncMirror();
  push.unsubscribe();
}

async function registerPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg?.periodicSync) return;
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return;
    await reg.periodicSync.register(SYNC_TAG, { minInterval: 12 * 60 * 60 * 1000 });
  } catch {
    // Браузер не підтримує — залишається таймер у сторінці.
  }
}

/** Ставить таймер на найближчий час нагадування. */
function schedule() {
  clearTimeout(timer);
  if (!store.getBool('reminders_on')) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const delay = msUntil(store.get('reminder_time'));
  timer = setTimeout(async () => {
    if (store.dayStats().answered === 0) await fire();
    schedule(); // наступна доба
  }, delay);
}

function msUntil(hhmm) {
  const [h, m] = String(hhmm || '18:30').split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h || 0, m || 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

async function fire() {
  const streak = store.streak();
  const body = streak > 0
    ? `Вогник горить ${streak} ${streak === 1 ? 'день' : 'дн.'} — не гаси його сьогодні 🔥`
    : 'Один невеликий урок — і серія почнеться 🌱';

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification('Час української літератури', {
        body,
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: 'daily-study',
        data: { url: location.origin + location.pathname },
      });
      return;
    }
  } catch { /* впадемо на звичайне сповіщення */ }

  new Notification('Час української літератури', { body });
}
