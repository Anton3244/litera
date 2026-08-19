// Прикладний рівень над SQLite: XP, вогник, прогрес тем, інтервальні повторення.

import * as db from './db.js';
import { dayKey, addDays, daysBetween, nowIso, clamp } from './util.js';

export const XP_CORRECT = 10;
export const XP_LESSON_DONE = 25;
export const XP_PERFECT = 15;

const DEFAULTS = {
  name: '',
  daily_goal_xp: '50',
  reminders_on: '0',
  reminder_time: '18:30',
  sound_on: '1',
  hearts_on: '1',
};

/* ---------------- налаштування ---------------- */

let settingsCache = null;

function loadSettings() {
  const rows = db.all('SELECT key, value FROM settings');
  settingsCache = { ...DEFAULTS };
  for (const r of rows) settingsCache[r.key] = r.value;
}

export function get(key) {
  if (!settingsCache) loadSettings();
  return settingsCache[key];
}

export function getNum(key) {
  return Number(get(key));
}

export function getBool(key) {
  return get(key) === '1';
}

/** Перечитує налаштування з бази — потрібно після злиття при синхронізації. */
export function reloadSettings() {
  settingsCache = null;
}

export function set(key, value) {
  if (!settingsCache) loadSettings();
  settingsCache[key] = String(value);
  db.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, String(value)]);
}

/* ---------------- рівні та привілеї ---------------- */

export const LEVELS = [
  { xp: 0, title: 'Початківець', icon: '🌱', perk: null },
  { xp: 150, title: 'Читач', icon: '📖', perk: 'Шосте життя в тестах' },
  { xp: 400, title: 'Знавець', icon: '🔎', perk: 'Заморозка вогника: один пропущений день не гасить серію' },
  { xp: 800, title: 'Літератор', icon: '✒️', perk: 'Вибір кольору застосунку' },
  { xp: 1500, title: 'Критик', icon: '🎓', perk: 'Сьоме життя в тестах' },
  { xp: 2500, title: 'Кобзар', icon: '🪕', perk: 'Золота рамка навколо імені' },
  { xp: 4000, title: 'Класик', icon: '👑', perk: 'Найвищий рівень — усе відкрито' },
];

export function levelIndex(xp = totalXp()) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  return i;
}

export function levelInfo(xp = totalXp()) {
  const i = levelIndex(xp);
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const from = cur.xp;
  const to = next?.xp ?? cur.xp;
  return {
    index: i,
    number: i + 1,
    ...cur,
    next,
    xp,
    toNext: next ? next.xp - xp : 0,
    progress: next ? clamp((xp - from) / (to - from), 0, 1) : 1,
  };
}

/** Скільки життів у тесті — росте з рівнем. */
export function heartsPerRun() {
  const i = levelIndex();
  return 5 + (i >= 1 ? 1 : 0) + (i >= 4 ? 1 : 0);
}

export const hasFreeze = () => levelIndex() >= 2;
export const canPickAccent = () => levelIndex() >= 3;
export const hasGoldFrame = () => levelIndex() >= 5;

/** Повертає рівень, якщо він виріс від останнього перегляду. */
export function popLevelUp() {
  const seen = Number(get('level_seen') ?? 0);
  const now = levelIndex();
  if (now <= seen) return null;
  set('level_seen', now);
  return LEVELS[now];
}

/* ---------------- дні, XP, вогник ---------------- */

function touchDay(day) {
  db.run('INSERT OR IGNORE INTO days(day) VALUES(?)', [day]);
}

export function today() {
  return dayKey();
}

export function dayStats(day = today()) {
  return db.one('SELECT * FROM days WHERE day=?', [day])
    ?? { day, xp: 0, answered: 0, correct: 0, seconds: 0 };
}

export function totalXp() {
  return db.value('SELECT COALESCE(SUM(xp),0) FROM days', [], 0);
}

export function addXp(amount, day = today()) {
  if (!amount) return;
  touchDay(day);
  db.run('UPDATE days SET xp = xp + ? WHERE day = ?', [amount, day]);
}

export function addSeconds(seconds, day = today()) {
  if (seconds <= 0) return;
  touchDay(day);
  db.run('UPDATE days SET seconds = seconds + ? WHERE day = ?', [Math.round(seconds), day]);
}

/**
 * Вогник — скільки днів поспіль було заняття.
 * Сьогоднішній день без відповідей вогник ще не гасить (є час до півночі).
 * З рівня «Знавець» діє заморозка: один пропущений день серію не обриває.
 */
export function streak() {
  const days = db.all('SELECT day FROM days WHERE answered > 0 ORDER BY day DESC LIMIT 400')
    .map(r => r.day);
  if (!days.length) return 0;

  const freeze = hasFreeze();
  let frozen = false;

  const gap = daysBetween(days[0], today());
  if (gap > 2) return 0;
  if (gap === 2) {
    if (!freeze) return 0;
    frozen = true;
  }

  let count = 1;
  for (let i = 1; i < days.length; i++) {
    const step = daysBetween(days[i], days[i - 1]);
    if (step === 1) count++;
    else if (step === 2 && freeze && !frozen) { frozen = true; count++; }
    else break;
  }
  return count;
}

/** Чи витрачено заморозку на поточну серію — щоб показати це користувачці. */
export function freezeUsed() {
  if (!hasFreeze()) return false;
  const days = db.all('SELECT day FROM days WHERE answered > 0 ORDER BY day DESC LIMIT 60')
    .map(r => r.day);
  if (days.length < 2) return false;
  if (daysBetween(days[0], today()) === 2) return true;
  for (let i = 1; i < days.length; i++) {
    const step = daysBetween(days[i], days[i - 1]);
    if (step === 2) return true;
    if (step !== 1) break;
  }
  return false;
}

/** Останні 7 днів (від понеділка) для смужки вогників. */
export function weekFlames() {
  const t = new Date();
  const mondayOffset = (t.getDay() + 6) % 7;
  const start = addDays(dayKey(t), -mondayOffset);
  const rows = db.all('SELECT day, answered, xp FROM days WHERE day >= ?', [start]);
  const byDay = Object.fromEntries(rows.map(r => [r.day, r]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { day: d, lit: (byDay[d]?.answered ?? 0) > 0, xp: byDay[d]?.xp ?? 0, isToday: d === dayKey(t) };
  });
}

export function lastDays(n = 14) {
  const start = addDays(today(), -(n - 1));
  const rows = db.all('SELECT day, xp, answered, correct FROM days WHERE day >= ? ORDER BY day', [start]);
  const byDay = Object.fromEntries(rows.map(r => [r.day, r]));
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(start, i);
    return { day: d, xp: byDay[d]?.xp ?? 0, answered: byDay[d]?.answered ?? 0, correct: byDay[d]?.correct ?? 0 };
  });
}

/* ---------------- відповіді + інтервальні повторення ---------------- */

/**
 * Записує одну відповідь: у журнал, у денну статистику, у графік повторень.
 * @returns {number} скільки XP нараховано
 */
export function recordAnswer({ topicId, questionId, correct, ms = 0, mode = 'lesson' }) {
  const day = today();
  const xp = correct ? XP_CORRECT : 0;

  db.tx(() => {
    db.run(
      `INSERT INTO answers(uid, device_id, topic_id, question_id, correct, ms, mode, day, created_at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), get('device_id') || null,
        topicId, questionId, correct ? 1 : 0, Math.round(ms), mode, day, nowIso()]
    );
    db.run('INSERT OR IGNORE INTO days(day) VALUES(?)', [day]);
    db.run('UPDATE days SET answered = answered + 1, correct = correct + ?, xp = xp + ? WHERE day = ?',
      [correct ? 1 : 0, xp, day]);
    scheduleReview(topicId, questionId, correct, day);
  });

  return xp;
}

/** SM-2 у спрощеному вигляді. Експортовано — потрібно для перерахунку при злитті. */
export function scheduleReview(topicId, questionId, correct, day) {
  const cur = db.one('SELECT * FROM srs WHERE question_id=?', [questionId])
    ?? { ease: 2.5, interval_days: 0, reps: 0, lapses: 0 };

  let { ease, interval_days: interval, reps, lapses } = cur;

  if (correct) {
    reps += 1;
    ease = clamp(ease + 0.1, 1.3, 3.0);
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
  } else {
    reps = 0;
    lapses += 1;
    ease = clamp(ease - 0.25, 1.3, 3.0);
    interval = 0; // повернеться сьогодні ж, у тренуванні
  }

  db.run(
    `INSERT INTO srs(question_id,topic_id,ease,interval_days,reps,lapses,due_day,updated_at)
     VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(question_id) DO UPDATE SET
       ease=excluded.ease, interval_days=excluded.interval_days, reps=excluded.reps,
       lapses=excluded.lapses, due_day=excluded.due_day, updated_at=excluded.updated_at`,
    [questionId, topicId, ease, interval, reps, lapses, addDays(day, interval), nowIso()]
  );
}

/** Питання, які час повторити (прострочені — першими). */
export function dueQuestionIds(limit = 20) {
  return db.all(
    `SELECT question_id, topic_id FROM srs
     WHERE due_day <= ?
     ORDER BY due_day ASC, lapses DESC
     LIMIT ?`,
    [today(), limit]
  );
}

export function dueCount() {
  return db.value('SELECT COUNT(*) FROM srs WHERE due_day <= ?', [today()], 0);
}

/** Питання, у яких найбільше помилок — «слабкі місця». */
export function weakQuestionIds(limit = 20) {
  return db.all(
    `SELECT question_id, topic_id,
            SUM(CASE WHEN correct=0 THEN 1 ELSE 0 END) AS misses,
            COUNT(*) AS total
     FROM answers
     GROUP BY question_id
     HAVING misses > 0
     ORDER BY misses DESC, total ASC
     LIMIT ?`,
    [limit]
  );
}

export function seenQuestionIds() {
  return db.all('SELECT DISTINCT question_id FROM answers').map(r => r.question_id);
}

/* ---------------- прогрес тем ---------------- */

export function topicProgress(topicId) {
  return db.one('SELECT * FROM topic_progress WHERE topic_id=?', [topicId])
    ?? { topic_id: topicId, slides_seen: 0, theory_done: 0, best_score: 0, attempts: 0, completed_at: null };
}

export function allTopicProgress() {
  const rows = db.all('SELECT * FROM topic_progress');
  return Object.fromEntries(rows.map(r => [r.topic_id, r]));
}

export function saveTheoryProgress(topicId, slidesSeen, done) {
  db.run(
    `INSERT INTO topic_progress(topic_id,slides_seen,theory_done,updated_at)
     VALUES(?,?,?,?)
     ON CONFLICT(topic_id) DO UPDATE SET
       slides_seen = MAX(topic_progress.slides_seen, excluded.slides_seen),
       theory_done = MAX(topic_progress.theory_done, excluded.theory_done),
       updated_at  = excluded.updated_at`,
    [topicId, slidesSeen, done ? 1 : 0, nowIso()]
  );
}

/** @param {number} score частка правильних, 0..1 */
export function saveQuizResult(topicId, score) {
  const completed = score >= 0.8 ? nowIso() : null;
  db.run(
    `INSERT INTO topic_progress(topic_id,best_score,attempts,completed_at,updated_at)
     VALUES(?,?,1,?,?)
     ON CONFLICT(topic_id) DO UPDATE SET
       best_score   = MAX(topic_progress.best_score, excluded.best_score),
       attempts     = topic_progress.attempts + 1,
       completed_at = COALESCE(topic_progress.completed_at, excluded.completed_at),
       updated_at   = excluded.updated_at`,
    [topicId, score, completed, nowIso()]
  );
}

/* ---------------- що вже вивчено ---------------- */

/** Скільки днів інтервалу вважаємо «вивчено назубок». */
const SOLID_INTERVAL = 14;

/**
 * Стан теми за пам’яттю, а не за фактом «пройшла тест».
 * Рахується з графіка повторень: чим довший інтервал, тим міцніше сидить у голові.
 */
/**
 * Чи бралася вона за тему по-справжньому: читала теорію або складала її тест.
 * Випадкове питання, що трапилось у змішаному тренуванні, темою не рахується.
 */
export function topicStarted(topicId) {
  const read = db.value('SELECT slides_seen FROM topic_progress WHERE topic_id=?', [topicId], 0);
  if (read > 0) return true;
  return db.value("SELECT COUNT(*) FROM answers WHERE topic_id=? AND mode='lesson'", [topicId], 0) > 0;
}

/** Список тем, за які вона вже бралася — з них і збираємо тренування. */
export function startedTopicIds() {
  const rows = db.all(`SELECT topic_id FROM topic_progress WHERE slides_seen > 0
                       UNION
                       SELECT DISTINCT topic_id FROM answers WHERE mode = 'lesson'`);
  return new Set(rows.map(r => r.topic_id));
}

export function topicState(topicId, questionIds) {
  const total = questionIds.length;
  if (!total) return { state: 'new', mastery: 0, due: 0, seen: 0, total: 0 };

  // Тему, яку ще не відкривали, показуємо як непочату, навіть якщо одне
  // її питання випадково трапилось у змішаному тесті.
  if (!topicStarted(topicId)) return { state: 'new', mastery: 0, due: 0, seen: 0, total };

  const marks = '?'.repeat(total).split('').join(',');
  const rows = db.all(
    `SELECT question_id, interval_days, reps, due_day FROM srs WHERE question_id IN (${marks})`,
    questionIds
  );

  const t = today();
  const due = rows.filter(r => r.due_day <= t).length;
  const strength = rows.reduce((sum, r) => {
    if (r.reps === 0) return sum;                       // остання відповідь була хибна
    return sum + Math.min(r.interval_days / SOLID_INTERVAL, 1);
  }, 0);
  const mastery = strength / total;

  let state;
  if (!rows.length) state = 'new';
  else if (due > 0 && mastery >= 0.5) state = 'review';  // знала, але час освіжити
  else if (mastery >= 0.75) state = 'solid';
  else if (mastery >= 0.3) state = 'learning';
  else state = 'weak';

  return { state, mastery, due, seen: rows.length, total };
}

export const STATE_LABELS = {
  new: { text: 'не почато', color: 'var(--text-faint)' },
  weak: { text: 'щойно почала', color: 'var(--err)' },
  learning: { text: 'вивчається', color: 'var(--accent)' },
  review: { text: 'час повторити', color: 'var(--accent-2)' },
  solid: { text: 'вивчено', color: 'var(--ok)' },
};

/** Чи завершила якусь тему саме сьогодні. */
export function topicsCompletedToday() {
  return db.value(
    'SELECT COUNT(*) FROM topic_progress WHERE completed_at IS NOT NULL AND substr(completed_at,1,10) = ?',
    [new Date().toISOString().slice(0, 10)],
    0
  );
}

/**
 * План на сьогодні: повторити вчорашнє → вивчити нове → добити денну ціль.
 * @param {Array} topics усі теми з питаннями
 */
export function dailyPlan(topics) {
  const goal = getNum('daily_goal_xp');
  const xp = dayStats().xp;
  const due = dueCount();

  const states = topics.map(t => ({ topic: t, ...topicState(t.id, t.questions.map(q => q.id)) }));
  const nextNew = states.find(s => s.state === 'new')?.topic
    ?? states.find(s => s.state === 'weak')?.topic
    ?? null;

  const tasks = [
    {
      key: 'review',
      title: 'Повторити вивчене',
      hint: due ? `${due} питань чекає — щоб учора не забулося` : 'усе повторено',
      done: due === 0,
      skip: due === 0 && !states.some(s => s.seen > 0),
      go: 'run/due',
    },
    {
      key: 'new',
      title: nextNew ? `Нова тема: ${nextNew.title}` : 'Усі теми пройдено',
      hint: nextNew ? `${nextNew.author} · ${nextNew.minutes} хв` : 'лишилось тільки тримати в пам’яті',
      done: !nextNew || topicsCompletedToday() > 0,
      skip: !nextNew,
      go: nextNew ? `topic/${nextNew.id}` : 'practice',
    },
    {
      key: 'goal',
      title: `Денна ціль — ${goal} XP`,
      hint: xp >= goal ? 'виконано' : `${xp} з ${goal}`,
      done: xp >= goal,
      skip: false,
      go: 'run/mix',
    },
  ].filter(t => !t.skip);

  return {
    tasks,
    states,
    allDone: tasks.every(t => t.done),
    next: tasks.find(t => !t.done) ?? null,
  };
}

/* ---------------- досягнення ---------------- */

const AWARD_ART = 'assets/art/award-';

export const AWARDS = [
  { code: 'first-lesson', icon: '🌱', title: 'Перший урок', hint: 'Пройти будь-яку тему' },
  { code: 'perfect', icon: '🎯', title: 'Без жодної помилки', hint: '100% у тесті теми' },
  { code: 'streak-3', icon: '🔥', title: 'Три дні поспіль', hint: 'Вогник 3 дні' },
  { code: 'streak-7', icon: '⚡', title: 'Тиждень поспіль', hint: 'Вогник 7 днів' },
  { code: 'streak-30', icon: '👑', title: 'Місяць поспіль', hint: 'Вогник 30 днів' },
  { code: 'xp-500', icon: '⭐', title: '500 XP', hint: 'Назбирати 500 XP' },
  { code: 'xp-2000', icon: '💎', title: '2000 XP', hint: 'Назбирати 2000 XP' },
  { code: 'reviewer', icon: '🧠', title: 'Повторення — мати', hint: '100 повторень у тренуванні' },
  {
    code: 'bughunter', icon: '🔍', title: 'Мисливиця на баги',
    hint: 'Знайшла те, чого не побачив жоден скрипт',
    special: true,
  },
].map(a => ({ ...a, img: a.special ? null : `${AWARD_ART}${a.code}.webp` }));

export function earnedAwards() {
  return Object.fromEntries(db.all('SELECT code, earned_at FROM awards').map(r => [r.code, r.earned_at]));
}

/** Перевіряє умови й повертає щойно здобуті нагороди. */
export function checkAwards(ctx = {}) {
  const have = earnedAwards();
  const st = streak();
  const xp = totalXp();
  const reviews = db.value('SELECT COUNT(*) FROM answers WHERE mode = ?', ['practice'], 0);
  const doneTopics = db.value('SELECT COUNT(*) FROM topic_progress WHERE completed_at IS NOT NULL', [], 0);

  const conditions = {
    'first-lesson': doneTopics >= 1,
    'perfect': ctx.perfect === true,
    'streak-3': st >= 3,
    'streak-7': st >= 7,
    'streak-30': st >= 30,
    'xp-500': xp >= 500,
    'xp-2000': xp >= 2000,
    'reviewer': reviews >= 100,
    // Вручається вручну — за знайдені помилки, а не за кількість відповідей.
    'bughunter': get('award_bughunter') === '1',
  };

  const fresh = [];
  for (const award of AWARDS) {
    if (have[award.code] || !conditions[award.code]) continue;
    db.run('INSERT OR IGNORE INTO awards(code, earned_at) VALUES(?,?)', [award.code, nowIso()]);
    fresh.push(award);
  }
  return fresh;
}
