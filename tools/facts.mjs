// Пошук суперечностей у змісті.
//
// check.mjs стежить за будовою: дублі, кількість варіантів, індекси, посилання.
// Тут — інше: чи не сперечається зміст сам із собою і чи не підказує питання
// власну відповідь. Це те, що машина бачить надійніше за будь-якого читача,
// бо їй байдуже, скільки разів поспіль дивитись на однакові рядки.
//
// Нічого не виправляє — тільки показує місця, які треба подивитись очима.
//
//   node tools/facts.mjs

import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SECTIONS } = await import(pathToFileURL(join(ROOT, 'content/index.js')).href);

const found = [];
const note = (topic, kind, text) => found.push({ topic, kind, text });

/** Текст без розмітки — щоб шукати по словах, а не по тегах. */
const plain = html => String(html)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Для порівняння варіантів між собою: без регістру, лапок і хвостової крапки. */
const norm = s => String(s).toLowerCase()
  .replace(/[«»"'’,.;:!?()]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const topics = SECTIONS.flatMap(s => s.topics.map(t => ({ ...t, section: s.title })));

/* ---------- рік поруч із назвою твору, по всьому змісту ---------- */
// «Кобзар» (1840) в одному файлі й «Кобзар» (1842) в іншому — хтось помилився.
// Беремо лише назви в лапках із роком одразу за ними: це той запис, яким
// у нас скрізь подають паспорт твору.
const workYears = new Map();   // назва → Map(рік → [теми])
const WORK_YEAR = /«([^»]{3,60})»\s*\(?\s*(1[5-9]\d\d|20\d\d)/g;

// Скільки разів спрацювало кожне правило. Правило, яке не знайшло жодного
// приводу подивитись, мовчати не має права: «нічого не знайдено» і
// «нічого не перевірено» — різні речі.
const seenBy = { works: 0, prompts: 0, options: 0, explains: 0 };

for (const meta of topics) {
  const mod = await import(pathToFileURL(join(ROOT, `content/topics/${meta.id}.js`)).href);
  const topic = mod.default;
  const slidesText = topic.slides.map(s => `${s.title} ${plain(s.html)}`).join('\n');
  const qText = topic.questions
    .map(q => `${q.prompt} ${(q.options ?? []).join(' ')} ${q.explain ?? ''}`).join('\n');
  const all = `${slidesText}\n${qText}`;

  // рік поруч із назвою твору
  for (const m of all.matchAll(WORK_YEAR)) {
    const title = m[1].trim();
    const year = m[2];
    seenBy.works++;
    if (!workYears.has(title)) workYears.set(title, new Map());
    const per = workYears.get(title);
    if (!per.has(year)) per.set(year, []);
    if (!per.get(year).includes(meta.id)) per.get(year).push(meta.id);
  }

  for (const q of topic.questions) {
    if (q.type === 'match') continue;
    const opts = q.options ?? [];
    const right = opts[q.answer];
    if (!right) continue;
    seenBy.prompts++;
    seenBy.options += opts.length;

    // 1. Відповідь дослівно лежить у самому питанні
    const rn = norm(right);
    if (rn.length >= 7 && norm(q.prompt).includes(rn)) {
      note(meta.id, 'ПІДКАЗКА', `${q.id}: відповідь «${right}» дослівно є у формулюванні`);
    }

    // 2. Два варіанти збігаються
    const seen = new Map();
    opts.forEach((o, i) => {
      const k = norm(o);
      if (seen.has(k)) {
        note(meta.id, 'ДУБЛЬ', `${q.id}: варіанти ${seen.get(k) + 1} і ${i + 1} однакові — «${o}»`);
      } else seen.set(k, i);
    });

    // 3. Пояснення називає хибний варіант і мовчить про правильний
    if (q.explain) {
      seenBy.explains++;
      const ex = norm(q.explain);
      const hitsRight = rn.length >= 6 && ex.includes(rn);
      const wrongHits = opts
        .map((o, i) => ({ o, i }))
        .filter(({ o, i }) => i !== q.answer && norm(o).length >= 8 && ex.includes(norm(o)));
      if (!hitsRight && wrongHits.length) {
        note(meta.id, 'ПОЯСНЕННЯ',
          `${q.id}: пояснення цитує хибний варіант «${wrongHits[0].o}», а правильний «${right}» — ні`);
      }
    }
  }
}

/* ---------- звіт ---------- */
for (const [title, years] of workYears) {
  if (years.size > 1) {
    note('—', 'РІК ТВОРУ',
      `«${title}»: ${[...years].map(([y, t]) => `${y} — у ${t.join(', ')}`).join('  ·  ')}`);
  }
}

console.log('перевірено:');
console.log(`  назв твору з роком   ${seenBy.works}  (унікальних назв ${workYears.size})`);
console.log(`  формулювань питань   ${seenBy.prompts}`);
console.log(`  варіантів відповіді  ${seenBy.options}`);
console.log(`  пояснень             ${seenBy.explains}`);
for (const [k, v] of Object.entries(seenBy)) {
  if (!v) console.log(`  !! правило «${k}» не знайшло жодного матеріалу — воно нічого не перевіряє`);
}
console.log('');

if (!found.length) {
  console.log('суперечностей не знайдено');
} else {
  const byKind = {};
  for (const f of found) (byKind[f.kind] ??= []).push(f);
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`\n=== ${kind} (${list.length}) ===`);
    for (const f of list) console.log(`  ${f.topic}: ${f.text}`);
  }
  console.log(`\nусього місць подивитись: ${found.length}`);
}
