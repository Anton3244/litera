// Точка входу: ініціалізація бази, маршрутизація, верхня панель.

import { initDb } from './db.js';
import * as store from './store.js';
import { $, $$, toast } from './util.js';
import { renderHome } from './ui/home.js';
import { renderLesson } from './ui/lesson.js';
import { renderQuiz } from './ui/quiz.js';
import { renderPractice, renderPracticeRun } from './ui/practice.js';
import { renderStats } from './ui/stats.js';
import { renderSettings } from './ui/settings.js';
import { initReminders } from './notify.js';
import { needsOnboarding, renderOnboarding } from './ui/onboarding.js';
import { autoSync } from './sync.js';

let viewEl = $('#view');
const topbar = $('#topbar');
const tabbar = $('#tabbar');

/* ---------------- навігація ---------------- */

export function go(path) {
  location.hash = '#/' + path.replace(/^\/+/, '');
}

export function back() {
  if (history.length > 1) history.back();
  else go('home');
}

const ROUTES = {
  home: { render: renderHome, tab: 'home', chrome: { back: false, tabs: true } },
  topic: { render: renderLesson, chrome: { back: true, tabs: false } },
  quiz: { render: renderQuiz, chrome: { back: true, tabs: false } },
  practice: { render: renderPractice, tab: 'practice', chrome: { back: false, tabs: true } },
  run: { render: renderPracticeRun, chrome: { back: true, tabs: false } },
  stats: { render: renderStats, tab: 'stats', chrome: { back: false, tabs: true } },
  settings: { render: renderSettings, chrome: { back: true, tabs: false } },
};

let currentRouteName = 'home';

async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  const name = parts[0] || 'home';
  const entry = ROUTES[name] ?? ROUTES.home;
  currentRouteName = name;

  applyChrome(entry);
  window.scrollTo(0, 0);

  // Свіжий вузол замість старого — так зникають слухачі попереднього екрана.
  const fresh = viewEl.cloneNode(false);
  viewEl.replaceWith(fresh);
  viewEl = fresh;

  try {
    await entry.render(viewEl, parts.slice(1));
  } catch (err) {
    console.error(err);
    viewEl.innerHTML = `<div class="empty">
      <img class="empty__art" src="assets/art/empty-error.webp" alt="">
      Не вдалося відкрити цей екран.<br><small>${err.message}</small></div>`;
  }
  refreshStats();
}

function applyChrome(entry) {
  const { back: showBack, tabs } = entry.chrome;
  setHearts(null); // екрани з життями вмикають лічильник самі
  $('.topbar__back').hidden = !showBack;
  tabbar.hidden = !tabs;
  viewEl.classList.toggle('view--full', !tabs);
  for (const tab of $$('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.nav === entry.tab);
  }
}

/* ---------------- верхня панель ---------------- */

export function refreshStats() {
  $('#stat-streak').textContent = store.streak();
  $('#stat-xp').textContent = store.totalXp();
}

export function bumpStat(which) {
  const el = $(`.stat--${which}`);
  if (!el) return;
  el.classList.remove('is-bump');
  void el.offsetWidth; // перезапуск анімації
  el.classList.add('is-bump');
}

/** Показує/ховає лічильник життів (потрібен лише всередині уроку). */
export function setHearts(count) {
  const el = $('.stat--hearts');
  if (count === null) { el.hidden = true; return; }
  el.hidden = false;
  $('#stat-hearts').textContent = count;
}

/* ---------------- облік часу ---------------- */

const TRACKED = new Set(['topic', 'quiz', 'run']);
setInterval(() => {
  if (document.hidden || !TRACKED.has(currentRouteName)) return;
  store.addSeconds(20);
}, 20000);

/* ---------------- запуск ---------------- */

async function boot() {
  const bootEl = $('#boot');
  try {
    await initDb();

    applyAccent();

    if (!store.get('first_seen_at')) {
      store.set('first_seen_at', new Date().toISOString());
    }

    document.addEventListener('click', onGlobalClick);
    window.addEventListener('hashchange', route);

    if (needsOnboarding()) {
      bootEl.remove();
      viewEl.hidden = false;
      viewEl.classList.add('view--full');
      await new Promise(resolve => renderOnboarding(viewEl, resolve));
      viewEl.classList.remove('view--full');
      topbar.hidden = false;
      location.hash = '#/home';
    }

    await route();
    initReminders();
    registerServiceWorker();

    // Догнати інший пристрій — тихо, у фоні. Якщо щось приїхало, оновлюємо екран.
    autoSync().then(res => { if (res?.added) route(); });

    bootEl.remove();
    topbar.hidden = false;
    viewEl.hidden = false;
  } catch (err) {
    console.error(err);
    bootEl.classList.add('boot--error');
    $('.boot__text', bootEl).textContent = err.message || 'Щось пішло не так.';
  }
}

/** Колір застосунку — привілей рівня «Літератор». */
export function applyAccent() {
  const accent = store.get('accent');
  if (accent && store.canPickAccent()) {
    document.documentElement.style.setProperty('--accent', accent);
  } else {
    document.documentElement.style.removeProperty('--accent');
  }
}

function onGlobalClick(e) {
  const nav = e.target.closest('[data-nav]');
  if (nav) { go(nav.dataset.nav); return; }
  if (e.target.closest('[data-nav-back]')) back();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return; // локально з файлу SW не працює
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
}

export { toast };
boot();
