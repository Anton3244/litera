// Звіряння цитат із першоджерелами.
//
// Найчастіша підтверджена помилка в матеріалі — рядок, наведений як цитата,
// але переказаний по пам'яті: переставлені слова, змінена форма, вигаданий
// зворот. Читач такого не бачить, бо звучить правдоподібно. Машина бачить
// одразу — якщо має поруч текст твору.
//
// Тексти бере з теки, яку наповнює tools/corpus.mjs.
//
//   node tools/quotes.mjs <тека з текстами>

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = process.argv[2];
if (!corpusDir || !existsSync(join(corpusDir, '_index.json'))) {
  console.error('спершу наповни теку тестами: node tools/corpus.mjs <тека>');
  process.exit(1);
}

const { SECTIONS } = await import(pathToFileURL(join(ROOT, 'content/index.js')).href);
const index = JSON.parse(readFileSync(join(corpusDir, '_index.json'), 'utf8'));

const byTopic = {};
for (const it of index) (byTopic[it.topicId] ??= []).push(it);

/**
 * Порівнюємо не буквально, а по суті: різні видання розходяться в апострофах,
 * тире й великих літерах, і чіплятись до цього — марно. А от порядок слів
 * і самі слова мають збігатися.
 */
const key = s => s.toLowerCase()
  .replace(/[’'`ʼ]/g, '')
  .replace(/[—–-]/g, ' ')
  .replace(/…/g, ' ')          // одним знаком «…» проти трьох крапок у джерелі
  .replace(/[.,;:!?«»"()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const topics = SECTIONS.flatMap(s => s.topics);
let checked = 0; let missing = 0; let noText = 0;
const bad = [];
const suspectCorpus = [];

// Звіт для людини, яка не мусить вірити мені на слово: поруч із нашим
// рядком — той самий рядок із тексту твору й посилання, звідки він узятий.
// Досить відкрити будь-який рядок і клацнути, щоб перевірити самому.
const report = [];
const reportPath = process.argv[3];

/** Знаходить у тексті твору той рядок, який збігся з нашим. */
function sourceLine(rawText, ourLine) {
  const want = key(ourLine);
  for (const l of rawText.split(String.fromCharCode(10))) {
    if (key(l).includes(want) && l.trim()) return l.trim();
  }
  return null;
}

for (const meta of topics) {
  const mod = await import(pathToFileURL(join(ROOT, `content/topics/${meta.id}.js`)).href);
  const html = mod.default.slides.map(s => s.html).join('\n');

  const quotes = [...html.matchAll(/<div class="quote">([\s\S]*?)<\/div>/g)]
    .map(m => m[1]
      .replace(/<span class="quote__note">[\s\S]*/, '')   // примітка — наша, не з тексту
      .replace(/<[^>]+>/g, '')
      .trim())
    .filter(Boolean);
  if (!quotes.length) continue;

  const texts = byTopic[meta.id];
  if (!texts) { noText += quotes.length; continue; }
  const raw = texts.map(t => readFileSync(join(corpusDir, t.name), 'utf8')).join('\n');
  const corpus = key(raw);
  const srcUrl = (raw.match(/^# (https?:\/\/\S+)/m) || [])[1] || '';

  for (const q of quotes) {
    checked++;
    // Перевіряємо рядок за рядком: цитата з кількох рядків може бути зібрана
    // з різних місць твору, і тоді збіг цілим шматком нічого не скаже.
    const lines = q.split('\n').map(l => l.trim()).filter(l => key(l).length >= 12);
    const lost = lines.filter(l => !corpus.includes(key(l)));

    for (const l of lines.filter(x => !lost.includes(x))) {
      report.push({ topic: meta.id, title: meta.title, ours: l, src: sourceLine(raw, l), url: srcUrl });
    }

    if (!lost.length) continue;
    // Коли не знайшовся жоден рядок — найімовірніше, у теці лежить не той
    // твір (перенаправлення, перелік видань, чужа редакція). Коли частина —
    // текст той, а розходиться саме наш переказ. Це різні висновки, і
    // плутати їх не можна: перший веде до тек, другий до змісту.
    (lost.length === lines.length ? suspectCorpus : bad)
      .push({ topic: meta.id, lost, total: lines.length, files: texts.map(t => t.name) });
    missing++;
  }
}

if (suspectCorpus.length) {
  console.log('=== схоже, у теці не той текст (не знайшовся ЖОДЕН рядок) ===');
  for (const b of suspectCorpus) console.log(`  ${b.topic}  ->  ${b.files.join(', ')}`);
  console.log('');
}

if (bad.length) {
  console.log('=== рядки, яких немає в тексті твору ===');
  for (const b of bad) {
    console.log('');
    console.log(`${b.topic}  (${b.lost.length} з ${b.total} рядків)`);
    for (const l of b.lost) console.log(`   ${l}`);
  }
  console.log('');
}
console.log(`звірено цитат: ${checked}`);
console.log(`  з розбіжністю: ${missing}`);
console.log(`  з них підозра на неправильний файл: ${suspectCorpus.length}`);
console.log(`  без тексту в теці (не звірено): ${noText}`);
if (!checked) console.log('!! жодної цитати не звірено — перевірка нічого не робить');

if (reportPath) {
  const NL = String.fromCharCode(10);
  const out = [
    '# Звіт звіряння цитат',
    '',
    'Кожен рядок: що написано в застосунку, той самий рядок у тексті твору',
    'і посилання на джерело. Відкрий будь-який і перевір сам — знання',
    'предмета для цього не потрібне, досить порівняти два рядки.',
    '',
    `Звірено рядків: ${report.length}. Розбіжностей: ${missing}.`,
    '',
  ];
  let last = '';
  for (const r of report) {
    if (r.title !== last) { out.push('', `## ${r.title}`, '', r.url ? `Джерело: ${r.url}` : '_джерела немає_', ''); last = r.title; }
    const same = key(r.ours) === key(r.src || '');
    out.push(`- **у нас:** ${r.ours}`);
    out.push(`  **у тексті:** ${r.src || '—'}${same ? '' : '  ← слово в слово не збігається, лише по суті'}`);
  }
  writeFileSync(reportPath, out.join(NL), 'utf8');
  console.log(`${NL}звіт для перевірки: ${reportPath}`);
}
