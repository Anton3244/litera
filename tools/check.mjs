// Перевірка вмісту курсу перед деплоєм.
//
//   node tools/check.mjs            структура тем і питань
//   node tools/check.mjs --videos   плюс перевірка, чи живі відео на ютубі
//
// Відео перевіряються через oembed: для видаленого, приватного або
// неправильного ідентифікатора ютуб віддає помилку. Ключ API не потрібен.

import { readFileSync } from 'node:fs';
import { SECTIONS, allTopicMeta, loadTopic } from '../content/index.js';

const checkVideos = process.argv.includes('--videos');
const problems = [];
const seenTopics = new Set();
const seenQuestions = new Set();
const videos = [];

let questionCount = 0;

for (const meta of allTopicMeta()) {
  if (seenTopics.has(meta.id)) problems.push(`дубль теми: ${meta.id}`);
  seenTopics.add(meta.id);

  const topic = await loadTopic(meta.id);

  if (!topic.slides?.length) problems.push(`${meta.id}: немає слайдів`);
  for (const [i, slide] of (topic.slides ?? []).entries()) {
    if (!slide.title) problems.push(`${meta.id}: слайд ${i + 1} без заголовка`);
    for (const v of slide.videos ?? (slide.video ? [slide.video] : [])) {
      if (!/^[\w-]{11}$/.test(v.id ?? '')) {
        problems.push(`${meta.id}: слайд ${i + 1} — дивний ідентифікатор відео «${v.id}»`);
      } else {
        videos.push({ topic: meta.id, ...v });
      }
    }
  }

  for (const q of topic.questions ?? []) {
    questionCount++;
    if (seenQuestions.has(q.id)) problems.push(`дубль питання: ${q.id}`);
    seenQuestions.add(q.id);
    if (!q.prompt) problems.push(`${q.id}: немає формулювання`);
    if (!q.explain) problems.push(`${q.id}: немає пояснення`);

    if (q.type === 'match') {
      if (q.left?.length !== 4) problems.push(`${q.id}: ліворуч ${q.left?.length}, у форматі НМТ має бути 4`);
      if (q.right?.length !== 5) problems.push(`${q.id}: праворуч ${q.right?.length}, має бути 5`);
      if (q.answer?.length !== q.left?.length) problems.push(`${q.id}: довжина відповіді не збігається`);
      if (new Set(q.answer).size !== q.answer?.length) problems.push(`${q.id}: один варіант використано двічі`);
      for (const a of q.answer ?? []) {
        if (a < 0 || a >= (q.right?.length ?? 0)) problems.push(`${q.id}: індекс ${a} поза межами`);
      }
    } else {
      if (q.options?.length !== 5) problems.push(`${q.id}: варіантів ${q.options?.length}, у форматі НМТ має бути 5`);
      if (q.answer < 0 || q.answer >= (q.options?.length ?? 0)) {
        problems.push(`${q.id}: індекс правильної відповіді ${q.answer} поза межами`);
      }
    }
  }
}

console.log(`розділів: ${SECTIONS.length}, тем: ${seenTopics.size}, питань: ${questionCount}, відео: ${videos.length}`);

/* ---------------- сталість ідентифікаторів ---------------- */
//
// Прогрес учениці прив’язаний до id тем і питань. Якщо перейменувати їх
// мовчки, її історія відповідей і графік повторень осиротіють — зовні це
// виглядатиме як «прогрес пропав». Тому будь-яке зникнення id має бути
// свідомим і записаним у tools/ids.json → renames.

const snapshot = JSON.parse(readFileSync(new URL('./ids.json', import.meta.url), 'utf8'));
const renames = snapshot.renames ?? {};
const current = {};
for (const meta of allTopicMeta()) {
  current[meta.id] = (await loadTopic(meta.id)).questions.map(q => q.id).sort();
}

const resolved = id => renames[id] ?? id;

for (const [topicId, questionIds] of Object.entries(snapshot.topics ?? {})) {
  const nowTopic = resolved(topicId);
  if (!current[nowTopic]) {
    problems.push(`тема «${topicId}» зникла — прогрес по ній осиротіє. Якщо перейменована, додай у ids.json → renames`);
    continue;
  }
  for (const qId of questionIds) {
    const nowQ = resolved(qId);
    if (!current[nowTopic].includes(nowQ)) {
      problems.push(`питання «${qId}» зникло з теми «${nowTopic}» — відповіді на нього осиротіють`);
    }
  }
}

const knownIds = new Set(Object.values(snapshot.topics ?? {}).flat());
const addedQuestions = Object.values(current).flat().filter(id => !knownIds.has(id)).length;
if (addedQuestions) console.log(`нових питань від останнього знімка: ${addedQuestions} — онови tools/ids.json`);

if (checkVideos && videos.length) {
  console.log('\nперевіряю відео…');
  for (const v of videos) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.id}&format=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        problems.push(`${v.topic}: відео ${v.id} недоступне (${res.status}) — «${v.title}»`);
        continue;
      }
      const data = await res.json();
      console.log(`  ✓ ${v.id} — ${data.title} (${data.author_name})`);
    } catch (err) {
      problems.push(`${v.topic}: відео ${v.id} не вдалося перевірити — ${err.message}`);
    }
  }
} else if (videos.length) {
  console.log('(відео не перевірялись: запусти з --videos)');
}

console.log();
if (problems.length) {
  console.log('ПРОБЛЕМИ:');
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log('помилок немає');
