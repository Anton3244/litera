// Вивантаження тем у вигляд, придатний для сторонньої перевірки.
//
// Навіщо окремий формат, а не самі вихідники:
//
// 1. Ключ. У файлі правильна відповідь записана як answer: 1 — це індекс
//    з нуля. Будь-хто, хто читає очима, помиляється на одиницю й потім
//    рапортує про неіснуючі помилки. Тут літера стоїть прямо: «ПРАВИЛЬНА: Б».
//
// 2. Порядок. У вихідниках правильна відповідь майже завжди стоїть другою
//    (343 питання з 361) — у застосунку це нічого не значить, бо варіанти
//    перемішуються перед кожним показом. Але перевіряльник, побачивши
//    поспіль двадцять «Б», перестає думати й починає вгадувати. Тому тут
//    теж мішаємо — детерміновано, від id питання, щоб дві вигрузки
//    однієї теми збігалися.
//
// 3. Теорія в слайдах — це HTML. Перевіряти зміст крізь теги неможливо.
//
//   node tools/export-review.mjs <тека для файлів>

import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NL = String.fromCharCode(10);   // heredoc з'їдає екранування
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

const [outDir] = process.argv.slice(2);

// У вихідниках правильна відповідь майже завжди стоїть другою: у застосунку
// це нічого не значить, бо варіанти перемішуються перед кожним показом.
// Але перевіряльник, побачивши поспіль двадцять «Б», перестане думати
// й почне вгадувати. Тому тут теж мішаємо — детерміновано, від id питання,
// щоб дві вигрузки однієї теми збігалися.
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; };
}

function mix(n, seed) {
  const rnd = seeded(seed);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
const { SECTIONS } = await import(pathToFileURL(join(ROOT, 'content/index.js')).href);
const meta = Object.fromEntries(
  SECTIONS.flatMap(s => s.topics.map(t => [t.id, { ...t, section: s.title }])),
);

/** HTML слайда → текст. Розмітку прибираємо, зміст лишаємо цілим. */
function plain(html) {
  return html
    .replace(/<span class="quote__note">/g, '\n    [примітка] ')
    .replace(/<li>/g, '\n  • ')
    .replace(/<\/(p|div|li|ul)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** Пачки: близько семи тем, межі — по розділах, щоб перевіряти зв'язний блок. */
const BATCHES = [
  ['01-фольклор', ['obryadovi-pisni', 'pisni-marusi-churay', 'istorychni-pisni',
    'duma-marusya-bohuslavka', 'balada-oy-letila-strila']],
  ['02-давня', ['povist-mynulykh-lit', 'slovo-o-polku', 'skovoroda']],
  ['03-котляревський-шевченко', ['kotlyarevsky-eneida', 'kotlyarevsky-natalka',
    'shevchenko-kateryna', 'shevchenko-zapovit', 'shevchenko-kavkaz',
    'shevchenko-son', 'shevchenko-i-mertvym']],
  ['04-куліш-франко', ['kulish-chorna-rada', 'nechuy-kaydasheva-simya',
    'myrnyy-khiba-revut-voly', 'karpenko-karyy-martyn-borulya',
    'franko-zakhar-berkut', 'franko-poeziya']],
  ['05-модернізм', ['kotsyubynsky-tini', 'kotsyubynsky-intermezzo',
    'stefanyk-kaminnyy-khrest', 'kobylyanska-valse', 'lesya-contra-spem-spero',
    'lesya-lisova-pisnya', 'voronyy-blakytna-panna']],
  ['06-20-30ті', ['oles-poeziya', 'tychyna-poeziya', 'rylsky-u-tepli-dni',
    'khvylovyy-ya-romantyka', 'yanovsky-mayster-korablya', 'pidmohylnyy-misto',
    'vyshnya-usmishky']],
  ['07-куліш-довженко', ['kulish-myna-mazaylo', 'antonych-rizdvo',
    'sosyura-lyubit-ukrainu', 'dovzhenko-zacharovana-desna',
    'malyshko-pisnya-pro-rushnyk', 'honchar-modry-kamen', 'symonenko-poeziya']],
  ['08-шістдесятники', ['holoborodko-nasha-mova', 'tyutyunnyk-try-zozuli',
    'stus-hospody', 'drach-balada-pro-sonyashnyk', 'pavlychko-dva-kolory',
    'kostenko-strashni-slova', 'kostenko-marusya-churay']],
  ['09-емігранти-сучасність', ['bahryanyy-tyhrolovy', 'malanyuk-uryvok-z-poemy',
    'suchasnyy-protses']],
  ['10-теорія', ['rody-i-zhanry', 'teoriya-virshuvannya', 'teoriya-tropy',
    'teoriya-napryamy']],
  ['11-незнайомий-текст', ['cluster-yak-rozbyraty', 'cluster-lesya-vesna',
    'cluster-franko-zernya', 'cluster-stefanyk-novyna',
    'cluster-kotsyubynsky-tsvit']],
];

if (!outDir) {
  console.error('вкажи теку: node tools/export-review.mjs <тека>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const known = new Set(Object.keys(meta));
const listed = new Set(BATCHES.flatMap(([, ids]) => ids));
const missed = [...known].filter(id => !listed.has(id));
if (missed.length) {
  console.error('!! ці теми не потрапили в жодну пачку:', missed.join(', '));
  process.exit(1);
}

let grandQ = 0;
for (const [name, ids] of BATCHES) {
const parts = [];
let nq = 0;

for (const id of ids) {
  const mod = await import(pathToFileURL(join(ROOT, `content/topics/${id}.js`)).href);
  const t = mod.default;
  const m = meta[id] ?? {};

  parts.push(`\n\n${'='.repeat(78)}\nФАЙЛ: content/topics/${id}.js`);
  parts.push(`РОЗДІЛ: ${m.section ?? '—'}`);
  parts.push(`ТЕМА: ${m.title ?? id}${m.author ? ` — ${m.author}` : ''}`);
  parts.push(`КОРОТКО: ${t.summary ?? '—'}`);
  parts.push(`${'='.repeat(78)}\n\n### ТЕОРІЯ (${t.slides.length} слайдів)`);

  t.slides.forEach((s, i) => {
    parts.push(`\n--- слайд ${i + 1} · kicker: «${s.kicker}» ---`);
    parts.push(`ЗАГОЛОВОК: ${s.title}`);
    parts.push(plain(s.html));
    for (const v of s.videos ?? (s.video ? [s.video] : [])) {
      parts.push(`[відео] ${v.title}${v.author ? ' — ' + v.author : ''}`);
    }
  });

  parts.push(`\n\n### ПИТАННЯ (${t.questions.length})`);

  for (const q of t.questions) {
    nq++;
    parts.push(`\n--- id: ${q.id} · тип: ${q.type} ---`);
    if (q.passage) {
      parts.push(`ТЕКСТ ДЛЯ АНАЛІЗУ (${q.passage.source ?? 'без підпису'}):`);
      parts.push(q.passage.text);
    }
    parts.push(`ПИТАННЯ: ${q.prompt}`);

    if (q.type === 'match') {
      q.left.forEach((l, i) => parts.push(`  ${i + 1}. ${l}`));
      parts.push('');
      q.right.forEach((r, i) => parts.push(`  ${LETTERS[i]} ${r}`));
      const key = q.answer.map((a, i) => `${i + 1}—${LETTERS[a]}`).join(', ');
      parts.push(`ПРАВИЛЬНА ВІДПОВІДНІСТЬ: ${key}`);
    } else {
      const order = mix(q.options.length, q.id);
      order.forEach((src, i) => parts.push(`  ${LETTERS[i]} ${q.options[src]}`));
      parts.push(`ПРАВИЛЬНА: ${LETTERS[order.indexOf(q.answer)]} — «${q.options[q.answer]}»`);
    }
    if (q.explain) parts.push(`ПОЯСНЕННЯ ПІСЛЯ ВІДПОВІДІ: ${q.explain}`);
  }
}


const head = `ПАЧКА НА ПЕРЕВІРКУ — ${name}
Тем: ${ids.length}. Питань: ${nq}.

Літери варіантів (А, Б, В, Г, Д) проставлені автоматично, рядок «ПРАВИЛЬНА» —
це той варіант, який застосунок зараховує як вірний.
Порядок варіантів тут перемішано (у застосунку він теж міняється щопоказу),
тож літера нічого не підказує: правильна відповідь однаково часто стоїть
під будь-якою з п'яти.
`;

writeFileSync(join(outDir, `${name}.md`), head + parts.join(NL), 'utf8');
console.log(`${name}.md — тем ${ids.length}, питань ${nq}`);
grandQ += nq;
}

console.log(`${NL}усього: ${BATCHES.length} пачок, ${grandQ} питань`);
