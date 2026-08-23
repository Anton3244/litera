// Дрібні хелпери, якими користується вся програма.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Локальна дата у форматі YYYY-MM-DD (без UTC-зсуву). */
export function dayKey(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function addDays(dayStr, n) {
  const d = new Date(dayStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(a, b) {
  const ms = new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00');
  return Math.round(ms / 86400000);
}

export const nowIso = () => new Date().toISOString();

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Перемішує копію масиву (Fisher–Yates). */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Правильна форма слова: plural(3, 'день','дні','днів') */
export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

let toastTimer;
export function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

export function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* ignore */ } }
}

export const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];
