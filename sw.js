// Service worker: офлайн-режим і щоденне нагадування.
// Піднімай CACHE_VERSION після зміни файлів — інакше браузер віддасть старі.

const CACHE_VERSION = 'litera-v37';

const ART = [
  // обкладинки тем
  'cover-folklore', 'cover-xx', 'cover-suchasna',
  'cover-pisni-marusi-churay', 'cover-istorychni-pisni',
  'cover-duma-marusya-bohuslavka', 'cover-balada-oy-letila-strila',
  'cover-povist-mynulykh-lit', 'cover-slovo-o-polku', 'cover-skovoroda',
  'cover-kotlyarevsky-eneida', 'cover-kotlyarevsky-natalka',
  'cover-shevchenko-kateryna', 'cover-shevchenko-zapovit', 'cover-shevchenko-kavkaz',
  'cover-shevchenko-son', 'cover-shevchenko-i-mertvym',
  'cover-kulish-chorna-rada', 'cover-nechuy-kaydasheva-simya',
  'cover-myrnyy-khiba-revut-voly', 'cover-karpenko-karyy-martyn-borulya',
  'cover-franko-zakhar-berkut', 'cover-franko-poeziya', 'cover-rody-i-zhanry',
  // значки досягнень
  'award-first-lesson', 'award-perfect', 'award-streak-3', 'award-streak-7',
  'award-streak-30', 'award-xp-500', 'award-xp-2000', 'award-reviewer',
  // екрани результату й порожніх станів
  'result-perfect', 'result-good', 'result-mid', 'result-low', 'result-hearts-out',
  'empty-practice', 'empty-error',
].map(n => `assets/art/${n}.webp`);

const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'manifest.webmanifest',
  'assets/icon.svg',
  'assets/icon-192.png',
  ...ART,
  'js/app.js',
  'js/db.js',
  'js/store.js',
  'js/util.js',
  'js/notify.js', 'js/push.js',
  'js/config.js',
  'js/updates.js',
  'js/ui/whatsnew.js',
  'content/changelog.js',
  'js/sync.js',
  'js/ui/home.js',
  'js/ui/lesson.js',
  'js/ui/quiz.js',
  'js/ui/quiz-engine.js',
  'js/ui/practice.js',
  'js/ui/stats.js',
  'js/ui/settings.js',
  'js/ui/onboarding.js',
  'js/ui/dev.js',
  'content/index.js',
  'content/videos.js',
  'content/texts.js',
  ...[
    'obryadovi-pisni', 'pisni-marusi-churay', 'istorychni-pisni', 'duma-marusya-bohuslavka',
    'balada-oy-letila-strila', 'povist-mynulykh-lit', 'slovo-o-polku', 'skovoroda',
    'kotlyarevsky-eneida', 'kotlyarevsky-natalka', 'shevchenko-kateryna',
    'shevchenko-zapovit', 'shevchenko-kavkaz', 'shevchenko-son', 'shevchenko-i-mertvym',
    'kulish-chorna-rada', 'nechuy-kaydasheva-simya', 'myrnyy-khiba-revut-voly',
    'karpenko-karyy-martyn-borulya', 'franko-zakhar-berkut', 'franko-poeziya',
    'kotsyubynsky-tini', 'kotsyubynsky-intermezzo', 'stefanyk-kaminnyy-khrest',
    'kobylyanska-valse', 'lesya-contra-spem-spero', 'lesya-lisova-pisnya',
    'voronyy-blakytna-panna', 'oles-poeziya', 'tychyna-poeziya', 'rylsky-u-tepli-dni',
    'khvylovyy-ya-romantyka', 'yanovsky-mayster-korablya', 'pidmohylnyy-misto',
    'vyshnya-usmishky', 'kulish-myna-mazaylo', 'antonych-rizdvo', 'sosyura-lyubit-ukrainu',
    'dovzhenko-zacharovana-desna', 'malyshko-pisnya-pro-rushnyk', 'honchar-modry-kamen',
    'symonenko-poeziya', 'holoborodko-nasha-mova', 'tyutyunnyk-try-zozuli', 'stus-hospody',
    'drach-balada-pro-sonyashnyk', 'pavlychko-dva-kolory', 'kostenko-strashni-slova',
    'kostenko-marusya-churay', 'bahryanyy-tyhrolovy', 'malanyuk-uryvok-z-poemy',
    'suchasnyy-protses', 'teoriya-virshuvannya', 'teoriya-tropy', 'teoriya-napryamy',
    'rody-i-zhanry',
    'cluster-yak-rozbyraty', 'cluster-lesya-vesna', 'cluster-franko-zernya',
    'cluster-stefanyk-novyna', 'cluster-kotsyubynsky-tsvit',
  ].map(n => `content/topics/${n}.js`),
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSqlJs = url.hostname === 'cdnjs.cloudflare.com';
  if (!sameOrigin && !isSqlJs) return;

  // sql.js майже не змінюється — беремо з кешу одразу.
  if (isSqlJs) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, copy));
        return res;
      }))
    );
    return;
  }

  // Свої файли: віддаємо з кешу, паралельно оновлюємо.
  event.respondWith(
    caches.match(request).then(hit => {
      const network = fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});

/* ---------------- нагадування ---------------- */

const IDB_NAME = 'litera';
const IDB_STORE = 'kv';
const MIRROR_KEY = 'reminder';

function readMirror() {
  return new Promise(resolve => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      try {
        const get = req.result.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(MIRROR_KEY);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    };
  });
}

function localDayKey() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

self.addEventListener('periodicsync', event => {
  if (event.tag !== 'study-reminder') return;
  event.waitUntil((async () => {
    const state = await readMirror();
    if (!state?.enabled) return;
    if (state.lastStudyDay === localDayKey()) return;

    const [h, m] = String(state.time || '18:30').split(':').map(Number);
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < (h || 0) * 60 + (m || 0)) return;

    await self.registration.showNotification('Час української літератури', {
      body: state.name ? `${state.name}, сьогодні ще не було заняття 🔥` : 'Сьогодні ще не було заняття 🔥',
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
      tag: 'daily-study',
    });
  })());
});

/**
 * Push із сервера. Тіло навмисно порожнє — воно лише будить нас,
 * а сам текст ми забираємо з черги на воркері. Так повідомлення
 * не проходить через чужий push-сервіс.
 *
 * Показати сповіщення обов'язково: якщо промовчати, браузер сам
 * покаже казенне «сайт оновлено у фоні».
 */
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let items = [];
    try {
      const state = await readMirror();
      if (state?.syncUrl && state?.syncCode) {
        const res = await fetch(`${state.syncUrl}/push/inbox/${state.syncCode}`, { cache: 'no-store' });
        if (res.ok) items = (await res.json()).items || [];
      }
    } catch {
      /* мережі може не бути — нижче покажемо загальне */
    }

    if (!items.length) {
      await self.registration.showNotification('Літера', {
        body: 'Загляни в застосунок 🔥',
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: 'litera-push',
      });
      return;
    }

    for (const [i, item] of items.entries()) {
      await self.registration.showNotification(item.title || 'Літера', {
        body: item.body || '',
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: 'litera-msg-' + i,
        timestamp: item.at ? Date.parse(item.at) : Date.now(),
      });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find(c => c.url.startsWith(self.registration.scope));
    if (existing) return existing.focus();
    return self.clients.openWindow(self.registration.scope);
  })());
});
