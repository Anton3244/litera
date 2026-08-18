// Синхронізація прогресу між пристроями.
//
// Головна ідея: журнал відповідей (таблиця answers) — першоджерело.
// Вогник, інтервали повторення і стан тем із нього перераховуються.
// Тому злиття двох пристроїв — це об’єднання двох журналів, без конфліктів:
// нічого не затирається, навіть якщо обома пристроями користувались того ж дня.

import * as db from './db.js';
import * as store from './store.js';
import { nowIso } from './util.js';
import { SYNC_URL } from './config.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без схожих 0/O, 1/I

export function serverUrl() {
  return (store.get('sync_url') || SYNC_URL || '').replace(/\/+$/, '');
}

export const syncCode = () => store.get('sync_code') || '';
export const isConfigured = () => Boolean(serverUrl() && syncCode());

export function makeCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Постійний ідентифікатор пристрою — щоб рядки з різних пристроїв не злипались. */
export function deviceId() {
  let id = store.get('device_id');
  if (!id) {
    id = makeCode(6);
    store.set('device_id', id);
  }
  return id;
}

/* ---------------- що вивантажуємо ---------------- */

function snapshot() {
  return {
    version: 1,
    updated_at: nowIso(),
    answers: db.all(`SELECT device_id, uid, topic_id, question_id, correct, ms, mode, day, created_at
                     FROM answers WHERE uid IS NOT NULL`),
    days: db.all('SELECT day, xp, seconds FROM days'),
    topic_progress: db.all('SELECT * FROM topic_progress'),
    awards: db.all('SELECT * FROM awards'),
    settings: db.all(`SELECT key, value FROM settings
                      WHERE key IN ('name','daily_goal_xp','reminder_time','hearts_on','accent','onboarded')`),
  };
}

/* ---------------- злиття ---------------- */

/**
 * Вливає чужий стан у наш. Повертає, скільки нового додалося.
 * Ніщо не видаляється — тільки додається й береться краще з двох.
 */
export function merge(remote) {
  if (!remote || remote.version !== 1) throw new Error('Незрозумілий формат даних');

  const known = new Set(db.all('SELECT uid FROM answers WHERE uid IS NOT NULL').map(r => r.uid));
  const fresh = (remote.answers ?? []).filter(a => a.uid && !known.has(a.uid));

  db.tx(() => {
    for (const a of fresh) {
      db.run(`INSERT INTO answers(device_id, uid, topic_id, question_id, correct, ms, mode, day, created_at)
              VALUES(?,?,?,?,?,?,?,?,?)`,
        [a.device_id ?? null, a.uid, a.topic_id, a.question_id, a.correct, a.ms ?? 0,
          a.mode ?? 'lesson', a.day, a.created_at]);
    }

    for (const p of remote.topic_progress ?? []) {
      db.run(`INSERT INTO topic_progress(topic_id, slides_seen, theory_done, best_score, attempts, completed_at, updated_at)
              VALUES(?,?,?,?,?,?,?)
              ON CONFLICT(topic_id) DO UPDATE SET
                slides_seen  = MAX(topic_progress.slides_seen, excluded.slides_seen),
                theory_done  = MAX(topic_progress.theory_done, excluded.theory_done),
                best_score   = MAX(topic_progress.best_score, excluded.best_score),
                attempts     = MAX(topic_progress.attempts, excluded.attempts),
                completed_at = COALESCE(topic_progress.completed_at, excluded.completed_at),
                updated_at   = excluded.updated_at`,
        [p.topic_id, p.slides_seen ?? 0, p.theory_done ?? 0, p.best_score ?? 0,
          p.attempts ?? 0, p.completed_at ?? null, p.updated_at ?? nowIso()]);
    }

    for (const a of remote.awards ?? []) {
      db.run('INSERT OR IGNORE INTO awards(code, earned_at) VALUES(?,?)', [a.code, a.earned_at]);
    }

    // Налаштування переносимо лише туди, де в нас порожньо, щоб не збивати
    // те, що людина щойно змінила на цьому пристрої.
    for (const s of remote.settings ?? []) {
      db.run('INSERT OR IGNORE INTO settings(key, value) VALUES(?,?)', [s.key, s.value]);
    }

    // Дні: беремо краще з двох. XP і час містять бонуси, яких у журналі немає,
    // тому їх не перераховуємо, а зберігаємо більше значення.
    for (const d of remote.days ?? []) {
      db.run(`INSERT INTO days(day, xp, seconds) VALUES(?,?,?)
              ON CONFLICT(day) DO UPDATE SET
                xp      = MAX(days.xp, excluded.xp),
                seconds = MAX(days.seconds, excluded.seconds)`,
        [d.day, d.xp ?? 0, d.seconds ?? 0]);
    }

    if (fresh.length) rebuildDerived();
  });

  store.reloadSettings();
  return fresh.length;
}

/**
 * Перераховує з повного журналу те, що з нього виводиться:
 * кількість відповідей за день і графік повторень. XP і час не чіпаємо —
 * там є бонуси за пройдені теми, яких у журналі немає.
 */
function rebuildDerived() {
  const perDay = db.all(`SELECT day, COUNT(*) AS answered, SUM(correct) AS correct
                         FROM answers GROUP BY day`);
  for (const d of perDay) {
    db.run(`INSERT INTO days(day, answered, correct, xp) VALUES(?,?,?,?)
            ON CONFLICT(day) DO UPDATE SET
              answered = excluded.answered,
              correct  = excluded.correct,
              xp       = MAX(days.xp, excluded.xp)`,
      [d.day, d.answered, d.correct, d.correct * store.XP_CORRECT]);
  }

  db.run('DELETE FROM srs');
  const log = db.all('SELECT topic_id, question_id, correct, day FROM answers ORDER BY created_at');
  for (const row of log) {
    store.scheduleReview(row.topic_id, row.question_id, !!row.correct, row.day);
  }
}

/* ---------------- мережа ---------------- */

async function request(method, body) {
  const url = `${serverUrl()}/s/${syncCode()}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'GET' && res.status === 404) return null;   // на сервері ще порожньо
  if (!res.ok) throw new Error(`Сервер відповів ${res.status}`);
  return method === 'GET' ? res.json() : res.json();
}

/**
 * Тиха синхронізація при запуску: якщо налаштовано — підтягуємо зміни
 * з іншого пристрою, не турбуючи нічим на екрані.
 */
export async function autoSync() {
  if (!isConfigured()) return null;
  try {
    return await syncNow();
  } catch (err) {
    console.warn('Синхронізація не вдалася:', err.message);
    return null;
  }
}

/** Забирає чуже, зливає зі своїм і відправляє об’єднане назад. */
export async function syncNow() {
  if (!isConfigured()) throw new Error('Синхронізацію не налаштовано');

  const remote = await request('GET');
  if (remote) await db.makeBackup('перед синхронізацією');
  const added = remote ? merge(remote) : 0;

  await db.flush();
  await request('PUT', snapshot());

  store.set('sync_last', nowIso());
  return { added, hadRemote: Boolean(remote) };
}
