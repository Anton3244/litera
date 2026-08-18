// Каталог курсу. Тут лише «обкладинки» тем — сам матеріал підвантажується
// окремим файлом з content/topics/<id>.js, коли тему відкривають.
//
// Щоб додати тему: створи файл у content/topics/ і додай рядок у потрібний розділ.

export const SECTIONS = [
  {
    id: 'folklore',
    title: 'Усна народна творчість',
    topics: [],
  },
  {
    id: 'davnya',
    title: 'Давня українська література',
    topics: [
      { id: 'slovo-o-polku', title: '«Слово о полку Ігоревім»', author: 'Пам’ятка XII ст.', icon: '🛡️', minutes: 12 },
    ],
  },
  {
    id: 'nova',
    title: 'Нова українська література',
    topics: [
      { id: 'shevchenko-kateryna', title: '«Катерина»', author: 'Тарас Шевченко', icon: '🌾', minutes: 14 },
    ],
  },
  {
    id: 'xx',
    title: 'Література ХХ століття',
    topics: [],
  },
  {
    id: 'suchasna',
    title: 'Сучасна українська література',
    topics: [],
  },
  {
    id: 'teoriya',
    title: 'Теорія літератури',
    topics: [
      { id: 'rody-i-zhanry', title: 'Роди й жанри літератури', author: 'Базове поняття', icon: '📚', minutes: 10 },
    ],
  },
];

const INDEX = new Map();
for (const section of SECTIONS) {
  for (const topic of section.topics) {
    INDEX.set(topic.id, { ...topic, sectionId: section.id, sectionTitle: section.title });
  }
}

export const topicMeta = id => INDEX.get(id) ?? null;
export const allTopicMeta = () => [...INDEX.values()];
export const topicCount = () => INDEX.size;

const loaded = new Map();

/** Повертає повний матеріал теми (слайди + питання), кешуючи його. */
export async function loadTopic(id) {
  if (loaded.has(id)) return loaded.get(id);
  const meta = topicMeta(id);
  if (!meta) throw new Error(`Немає теми «${id}»`);

  const module = await import(`./topics/${id}.js`);
  const topic = { ...meta, ...module.default };
  loaded.set(id, topic);
  return topic;
}

/** Завантажує всі теми одразу — потрібно для тренування зі змішаними питаннями. */
export async function loadAllTopics() {
  return Promise.all(allTopicMeta().map(m => loadTopic(m.id)));
}
