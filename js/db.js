// SQLite у браузері: sql.js (WebAssembly) + збереження файлу БД в IndexedDB.
// Уся база живе на пристрої користувача, сервер не потрібен.

const SQLJS_VERSION = '1.10.3';
const SQLJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQLJS_VERSION}/`;
const IDB_NAME = 'litera';
const IDB_STORE = 'kv';
const IDB_KEY = 'db.sqlite';

let SQL = null;
let db = null;
let saveTimer = null;
let savePromise = Promise.resolve();

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Прогрес по темі: скільки слайдів прочитано, найкращий результат тесту.
CREATE TABLE IF NOT EXISTS topic_progress (
  topic_id     TEXT PRIMARY KEY,
  slides_seen  INTEGER NOT NULL DEFAULT 0,
  theory_done  INTEGER NOT NULL DEFAULT 0,
  best_score   REAL    NOT NULL DEFAULT 0,
  attempts     INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at   TEXT
);

-- Кожна відповідь, назавжди. З цього рахуємо статистику й слабкі місця.
CREATE TABLE IF NOT EXISTS answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT UNIQUE,
  device_id   TEXT,
  topic_id    TEXT NOT NULL,
  question_id TEXT NOT NULL,
  correct     INTEGER NOT NULL,
  ms          INTEGER NOT NULL DEFAULT 0,
  mode        TEXT NOT NULL DEFAULT 'lesson',
  day         TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_day ON answers(day);
CREATE INDEX IF NOT EXISTS idx_answers_q   ON answers(question_id);

-- Інтервальні повторення (SM-2 lite): коли знову показати питання.
CREATE TABLE IF NOT EXISTS srs (
  question_id   TEXT PRIMARY KEY,
  topic_id      TEXT NOT NULL,
  ease          REAL    NOT NULL DEFAULT 2.5,
  interval_days REAL    NOT NULL DEFAULT 0,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  due_day       TEXT NOT NULL,
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs(due_day);

-- Один рядок на день навчання: звідси вогник (streak) і графіки.
CREATE TABLE IF NOT EXISTS days (
  day      TEXT PRIMARY KEY,
  xp       INTEGER NOT NULL DEFAULT 0,
  answered INTEGER NOT NULL DEFAULT 0,
  correct  INTEGER NOT NULL DEFAULT 0,
  seconds  INTEGER NOT NULL DEFAULT 0
);

-- Отримані досягнення.
CREATE TABLE IF NOT EXISTS awards (
  code       TEXT PRIMARY KEY,
  earned_at  TEXT NOT NULL
);
`;

/* ---------------- IndexedDB (зберігаємо файл БД як байти) ---------------- */

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const conn = await idb();
  return new Promise((resolve, reject) => {
    const req = conn.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const conn = await idb();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Той самий сховок доступний і service worker'у — через нього передаємо
// дані для нагадувань (див. js/notify.js та sw.js).
export const kvGet = idbGet;
export const kvPut = idbPut;

/* ---------------- ініціалізація ---------------- */

export async function initDb() {
  if (typeof initSqlJs !== 'function') {
    throw new Error('Не завантажилась бібліотека sql.js — перевір інтернет і онови сторінку.');
  }
  SQL = await initSqlJs({ locateFile: file => SQLJS_BASE + file });

  const bytes = await idbGet(IDB_KEY);
  db = bytes ? new SQL.Database(new Uint8Array(bytes)) : new SQL.Database();
  db.run(SCHEMA);
  migrate();
  await flush();
  return db;
}

/** Доганяє старі бази, створені до появи синхронізації. */
function migrate() {
  const cols = all('PRAGMA table_info(answers)').map(c => c.name);
  if (!cols.includes('uid')) db.run('ALTER TABLE answers ADD COLUMN uid TEXT');
  if (!cols.includes('device_id')) db.run('ALTER TABLE answers ADD COLUMN device_id TEXT');
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_uid ON answers(uid)');
  // старим рядкам роздаємо ідентифікатори, інакше вони не поїдуть на інший пристрій
  db.run(`UPDATE answers SET uid = 'old-' || id WHERE uid IS NULL`);
}

/* ---------------- запити ---------------- */

export function run(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
}

/** Кілька запитів в одній транзакції — один запис у сховище. */
export function tx(fn) {
  db.run('BEGIN');
  try {
    const out = fn();
    db.run('COMMIT');
    scheduleSave();
    return out;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function one(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

/** Скалярне значення першої колонки першого рядка. */
export function value(sql, params = [], fallback = null) {
  const row = one(sql, params);
  if (!row) return fallback;
  const v = Object.values(row)[0];
  return v === null || v === undefined ? fallback : v;
}

/* ---------------- збереження ---------------- */

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 400);
}

/** Записує поточний стан БД в IndexedDB. Викликається автоматично. */
export function flush() {
  clearTimeout(saveTimer);
  savePromise = savePromise
    .then(() => idbPut(IDB_KEY, db.export()))
    .catch(err => console.error('Не вдалося зберегти базу:', err));
  return savePromise;
}

// Підстраховка: зберігаємо, коли вкладку згортають або закривають.
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
window.addEventListener('pagehide', () => flush());

/* ---------------- резервна копія ---------------- */

export function exportBytes() {
  return db.export();
}

export async function importBytes(bytes) {
  const fresh = new SQL.Database(new Uint8Array(bytes));
  fresh.run(SCHEMA); // на випадок старішого файлу
  db.close();
  db = fresh;
  await flush();
}

export async function wipe() {
  db.close();
  db = new SQL.Database();
  db.run(SCHEMA);
  await flush();
}
