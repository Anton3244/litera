// Звіряння паспортних даних твору з еталонною таблицею.
//
// Рік, жанр, вид лірики, збірка, напрям — це те, що на НМТ питають найчастіше
// і що можна перевірити механічно: значення або збігається з довідником,
// або ні. Тема та ідея сюди не входять — це трактування, звіряти нема з чим.
//
// Еталон лежить у tools/reference.json і зібраний вручну з незалежних джерел.
// Кожен запис несе посилання, звідки взято, — щоб можна було перевірити
// не мене, а джерело.
//
//   node tools/passport.mjs            — звірити з еталоном
//   node tools/passport.mjs --dump     — показати, що стверджуємо ми

import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF_PATH = join(ROOT, 'tools/reference.json');
const dump = process.argv.includes('--dump');

const { SECTIONS } = await import(pathToFileURL(join(ROOT, 'content/index.js')).href);

/** Поля паспорта, які взагалі можна звірити з довідником. */
const FIELDS = ['Рік', 'Рік написання', 'Час створення', 'Дата', 'Перше видання',
  'Повне видання', 'Жанр', 'Вид лірики', 'Збірка', 'Напрям', 'Присвята'];

const strip = s => String(s)
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Витягує «<b>Поле:</b> значення» з розмітки слайда. */
function passportOf(html) {
  const out = {};
  for (const m of html.matchAll(/<b>([^<:]{2,28}):<\/b>([^<]*(?:<(?!\/li|\/p|br)[^>]*>[^<]*)*)/g)) {
    const field = m[1].trim();
    if (!FIELDS.includes(field)) continue;
    const value = strip(m[2]);
    if (value) out[field] ??= value;
  }
  return out;
}

const ours = {};
for (const meta of SECTIONS.flatMap(s => s.topics)) {
  const mod = await import(pathToFileURL(join(ROOT, `content/topics/${meta.id}.js`)).href);
  const p = passportOf(mod.default.slides.map(s => s.html).join(' '));
  if (Object.keys(p).length) ours[meta.id] = { title: meta.title, ...p };
}

if (dump) {
  console.log(JSON.stringify(ours, null, 1));
  process.exit(0);
}

if (!existsSync(REF_PATH)) {
  console.error(`немає еталона: ${REF_PATH}`);
  console.error('спершу збери його, а поки подивись наші дані: node tools/passport.mjs --dump');
  process.exit(1);
}
const ref = JSON.parse(readFileSync(REF_PATH, 'utf8'));

/** Порівнюємо м'яко: «поема» і «соціально-побутова поема» — не суперечність. */
const soft = s => String(s).toLowerCase()
  .replace(/-\s+/g, '-')          // «бурлескно- травестійна» з PDF
  .replace(/[«»"'’(),.;:]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const agrees = (a, b) => {
  const x = soft(a);
  // Еталон може нести кілька дозволених формулювань: у підручниках
  // «послання» і «поема-послання» ходять нарівні, і хибним не є жодне.
  const list = Array.isArray(b) ? b : [b];
  return list.some(v => { const y = soft(v); return x.includes(y) || y.includes(x); });
};

const NL = String.fromCharCode(10);
let compared = 0; const diffs = []; const noRef = [];

for (const [id, p] of Object.entries(ours)) {
  const r = ref[id];
  if (!r) { noRef.push(p.title); continue; }
  for (const [field, value] of Object.entries(p)) {
    if (field === 'title') continue;
    const want = r[field];
    if (want === undefined) continue;
    compared++;
    if (!agrees(value, want)) {
      diffs.push({ title: p.title, field, ours: value, ref: want, src: r._джерело || '' });
    }
  }
}

console.log(`звірено значень: ${compared}`);
console.log(`  розбіжностей: ${diffs.length}`);
console.log(`  тем без еталона: ${noRef.length}`);
if (!compared) console.log('!! нічого не звірено — еталон порожній або поля не збігаються за назвою');
console.log('');

for (const d of diffs) {
  console.log(`${d.title} — ${d.field}`);
  console.log(`   у нас:    ${d.ours}`);
  console.log(`   довідник: ${d.ref}`);
  if (d.src) console.log(`   джерело:  ${d.src}`);
  console.log('');
}
if (noRef.length) console.log(`без еталона: ${noRef.join(', ')}`);
