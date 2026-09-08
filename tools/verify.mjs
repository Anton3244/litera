// Звіряння тверджень із текстом твору.
//
// quotes.mjs перевіряє те, що взято в лапки. Але майже всі підтверджені
// помилки були не в лапках, а в переказі: «краде ключі» замість «пан сам
// віддає», «тіло поставили» замість «поставили його», «прихождає» замість
// того, що є в тексті. Такі місця не спіймати збігом рядка — але їх видно
// інакше: у переказі з'являються слова, яких у творі немає.
//
// Тому перевіряємо два види слів, де вигадка помітна одразу:
//
//   імена — кожне ім'я, назване у слайдах, має бути в тексті;
//   числа — кожна кількість, яку ми стверджуємо, теж.
//
// Це не доказ правильності переказу. Це сигнал: якщо ми називаємо когось,
// кого в тексті немає, далі можна не читати.
//
//   node tools/verify.mjs <тека з текстами> [звіт.md]

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = process.argv[2];
const reportPath = process.argv[3];
if (!corpusDir || !existsSync(join(corpusDir, '_index.json'))) {
  console.error('спершу наповни теку текстами: node tools/corpus.mjs <тека>');
  process.exit(1);
}

const { SECTIONS } = await import(pathToFileURL(join(ROOT, 'content/index.js')).href);
const index = JSON.parse(readFileSync(join(corpusDir, '_index.json'), 'utf8'));
const byTopic = {};
for (const it of index) (byTopic[it.topicId] ??= []).push(it);

const NL = String.fromCharCode(10);

/**
 * Слова, які пишуться з великої, але іменами не є: наші власні рубрики,
 * терміни, місця й поняття, яких у тексті твору бути й не мусить.
 */
const NOT_A_NAME = new Set([
  'Тема', 'Ідея', 'Жанр', 'Автор', 'Композиція', 'Символи', 'Метафора', 'Епітет',
  'Порівняння', 'Алегорія', 'Антитеза', 'Рефрен', 'Інверсія', 'Оксиморон',
  'Персоніфікація', 'Гіпербола', 'Анафора', 'Епіфора', 'Градація', 'Метонімія',
  'Синекдоха', 'Алітерація', 'Асонанс', 'Паралелізм', 'Символ',
  'Україна', 'Україні', 'України', 'Українська', 'Український', 'Русь', 'Русі',
  'Бог', 'Бога', 'Богу', 'Боже', 'Господь', 'Господи',
  'НМТ', 'Програма', 'Твір', 'Твору', 'Збірка', 'Вірш', 'Поема', 'Новела',
  'Повість', 'Роман', 'Балада', 'Дума', 'Пісня', 'Драма', 'Комедія',
  'Що', 'Це', 'Але', 'Тому', 'Саме', 'Коли', 'Якщо', 'Через', 'Після', 'Перед',
  'Він', 'Вона', 'Вони', 'Його', 'Її', 'Їх', 'Так', 'Ось', 'Тут', 'Там',
  'Перша', 'Друга', 'Третя', 'Четверта', 'Один', 'Два', 'Три', 'Чотири',
  'Заспів', 'Зачин', 'Кінцівка', 'Фінал', 'Сюжет', 'Конфлікт', 'Образ',
]);

/**
 * Прибирає розмітку, лишає слова.
 *
 * На місці блоків ставимо крапку: без неї пункти списку злипаються в одне
 * речення, і перше слово кожного пункту виглядає як ім'я посеред фрази.
 * Саме через це у звіт лізли «Напис», «Роздум», «Присвята».
 */
const plain = html => String(html)
  .replace(/<\/(li|p|div|span|h[1-6])>/gi, ' . ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Порівнюємо без апострофів, тире й регістру: видання розходяться в дрібницях. */
const fold = s => s.toLowerCase().replace(/[’'`ʼ]/g, '').replace(/[—–-]/g, ' ');

/**
 * Корінь слова — щоб «Марусі» знайшлося в тексті, де стоїть «Маруся».
 * Відкидаємо два останні символи: для української цього досить, щоб
 * пережити відмінок, і замало, щоб склеїти різні імена.
 */
const stem = w => (w.length > 5 ? w.slice(0, w.length - 2) : w);

// Без \b: у JS межа слова рахується за латиницею, і з кирилицею
// така регулярка не знаходить нічого. Перша версія цієї перевірки
// саме через це «перевірила» нуль імен і відрапортувала успіх.
const NAME = /(^|[^А-Яа-яІЇЄҐіїєґ’'])([А-ЯІЇЄҐ][а-яіїєґ’']{2,})/gu;
const NUM = /(^|\D)(\d{1,4})(?!\d)/g;

const rows = [];
let topicsChecked = 0; let namesChecked = 0; let numsChecked = 0;

for (const meta of SECTIONS.flatMap(s => s.topics)) {
  const texts = byTopic[meta.id];
  if (!texts) continue;

  const mod = await import(pathToFileURL(join(ROOT, `content/topics/${meta.id}.js`)).href);
  const topic = mod.default;
  const ours = plain(topic.slides.map(s => s.html).join(' '));
  const raw = texts.map(t => readFileSync(join(corpusDir, t.name), 'utf8')).join(NL);
  const src = fold(raw);
  const srcUrl = (raw.match(/^# (https?:\/\/\S+)/m) || [])[1] || '';
  topicsChecked++;

  const missNames = new Set();
  for (const m of ours.matchAll(NAME)) {
    const w = m[2];
    if (NOT_A_NAME.has(w)) continue;
    // Велика літера на початку речення — це орфографія, а не ім'я.
    // Без цього у звіт лізли «Присвята», «Епіграф», «Роздум» і решта
    // перших слів, і справжні знахідки в них тонули.
    const before = ours.slice(Math.max(0, m.index - 3), m.index + m[1].length);
    if (/^\s*$/.test(before) || /[.!?:;…]\s*$/.test(before) || m.index === 0) continue;
    namesChecked++;
    if (!src.includes(fold(stem(w)))) missNames.add(w);
  }

  const missNums = new Set();
  for (const m of ours.matchAll(NUM)) {
    const n = m[2];
    if (n.length === 4 && +n > 1000 && +n < 2100) continue;   // роки — не про сюжет
    numsChecked++;
    if (!src.includes(n)) missNums.add(n);
  }

  if (missNames.size || missNums.size) {
    rows.push({
      topic: meta.id, title: meta.title, url: srcUrl,
      names: [...missNames], nums: [...missNums],
    });
  }
}

console.log(`перевірено тем: ${topicsChecked}`);
console.log(`  імен:  ${namesChecked}`);
console.log(`  чисел: ${numsChecked}`);
console.log('');

if (!rows.length) {
  console.log('усе, що ми називаємо, є в текстах творів');
} else {
  for (const r of rows) {
    console.log(`${r.title}`);
    if (r.names.length) console.log(`   імен немає в тексті: ${r.names.join(', ')}`);
    if (r.nums.length) console.log(`   чисел немає в тексті: ${r.nums.join(', ')}`);
  }
  console.log(`${NL}тем із розбіжностями: ${rows.length} із ${topicsChecked}`);
}

if (reportPath) {
  const out = ['# Що ми називаємо, а в тексті твору цього немає', '',
    'Список не доводить помилку: ім\'я може бути з передмови, з іншого',
    'перекладу або з історії, а не з самого твору. Але кожен рядок варто',
    'відкрити й подивитись — саме так знаходились справжні помилки.', '',
    `Перевірено тем: ${topicsChecked}, імен: ${namesChecked}, чисел: ${numsChecked}.`, ''];
  for (const r of rows) {
    out.push('', `## ${r.title}`, '', r.url ? `Джерело: ${r.url}` : '_джерела немає_', '');
    if (r.names.length) out.push(`- імена: ${r.names.join(', ')}`);
    if (r.nums.length) out.push(`- числа: ${r.nums.join(', ')}`);
  }
  writeFileSync(reportPath, out.join(NL), 'utf8');
  console.log(`${NL}звіт: ${reportPath}`);
}
