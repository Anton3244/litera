// Чи є в теорії те, що потім питають у тесті.
//
//   node tools/coverage.mjs          показує лише проблемні питання
//   node tools/coverage.mjs --all    показує всі
//
// Перевірка груба: беремо значущі слова з правильної відповіді й дивимось,
// чи трапляються вони в тексті слайдів. Це не доказ, а сито — знайдене
// треба переглянути очима.

import { allTopicMeta, loadTopic } from '../content/index.js';

const showAll = process.argv.includes('--all');

const STOP = new Set([
  'через', 'після', 'перед', 'проти', 'разом', 'також', 'якщо', 'коли', 'тому',
  'цього', 'цьому', 'своїх', 'своєї', 'свого', 'який', 'яка', 'яке', 'які',
  'вона', 'воно', 'вони', 'його', 'їхнє', 'себе', 'було', 'бути', 'стає',
  'лише', 'дуже', 'може', 'треба', 'варто', 'інших', 'інший', 'інше',
]);

const plain = html => String(html)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .toLowerCase()
  .replace(/[’'`]/g, '’');

const stem = w => w.slice(0, 5);

/** Значущі слова, обрізані до кореня — щоб пережити відмінювання. */
function keywords(text) {
  return [...new Set(
    plain(text)
      .split(/[^a-zа-яіїєґ0-9]+/i)
      .filter(w => w.length >= 5 && !STOP.has(w))
      .map(stem)                 // корінь у п’ять літер переживає відмінювання
  )];
}

let flagged = 0;
let checked = 0;

// Теорія накопичується в порядку курсу: питання може спиратися на попередні
// теми, але не на ті, які учениця ще не читала.
let seenTheory = '';

for (const meta of allTopicMeta()) {
  const topic = await loadTopic(meta.id);
  seenTheory += ' ' + plain(topic.slides.map(s => `${s.title} ${s.html}`).join(' '));
  const theory = seenTheory;

  const problems = [];
  for (const q of topic.questions) {
    checked++;
    const answerText = q.type === 'match'
      ? q.answer.map(i => q.right[i]).join(' ')
      : q.options[q.answer];

    // Формулювання питання не перевіряємо — там канцелярит на кшталт
    // «Установіть відповідність», якого в теорії бути й не повинно.
    const words = keywords(answerText);
    if (!words.length) continue;
    const theoryStems = new Set(theory.split(/[^a-zа-яіїєґ0-9]+/i).map(stem));
    const found = words.filter(w => theoryStems.has(w) || theory.includes(w));
    const ratio = found.length / words.length;

    if (ratio < 0.8 || showAll) {
      problems.push({ q, ratio, missing: words.filter(w => !theoryStems.has(w) && !theory.includes(w)) });
    }
  }

  if (!problems.length) continue;
  console.log(`\n${'='.repeat(60)}\n${meta.title} — ${meta.author}`);
  for (const p of problems) {
    flagged++;
    console.log(`\n  [${Math.round(p.ratio * 100)}%] ${p.q.id}: ${p.q.prompt}`);
    if (p.q.type !== 'match') console.log(`        відповідь: ${p.q.options[p.q.answer]}`);
    console.log(`        немає в теорії: ${p.missing.join(', ')}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`перевірено питань: ${checked}, під підозрою: ${flagged}`);
