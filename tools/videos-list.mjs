// Друкує всі відео курсу списком з посиланнями — зручно перевіряти очима.
//
//   node tools/videos-list.mjs              у консоль
//   node tools/videos-list.mjs > list.md    у файл

import { SECTIONS, topicMeta } from '../content/index.js';
import { VIDEOS } from '../content/videos.js';

console.log('# Усі відеорозбори курсу\n');

let total = 0;
for (const section of SECTIONS) {
  const withVideo = section.topics.filter(t => VIDEOS[t.id]?.length);
  if (!withVideo.length) continue;

  console.log(`## ${section.title}\n`);
  for (const topic of withVideo) {
    console.log(`**${topic.title}** — ${topic.author}\n`);
    for (const v of VIDEOS[topic.id]) {
      total++;
      console.log(`- [${v.title}](https://www.youtube.com/watch?v=${v.id}) — ${v.author}, ${v.minutes} хв`);
    }
    console.log();
  }
}

const noVideo = SECTIONS.flatMap(s => s.topics).filter(t => !VIDEOS[t.id]?.length);
console.log(`---\n\nУсього роликів: ${total}.`);
if (noVideo.length) {
  console.log(`\nТеми без відео: ${noVideo.map(t => t.title).join(', ')}.`);
} else {
  console.log('\nВідео є в усіх темах.');
}
