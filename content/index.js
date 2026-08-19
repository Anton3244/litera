// Каталог курсу. Тут лише «обкладинки» тем — сам матеріал підвантажується
// окремим файлом з content/topics/<id>.js, коли тему відкривають.
//
// Розділи названо так само, як в офіційній програмі НМТ.
// Повний перелік творів і те, що ще лишилось написати, — у ROADMAP.md.

import { VIDEOS } from './videos.js';
import { TEXTS } from './texts.js';

const ART = 'assets/art/';

export const SECTIONS = [
  {
    id: 'folklore',
    title: 'Усна народна творчість',
    cover: ART + 'cover-folklore.webp',
    topics: [
      {
        id: 'obryadovi-pisni', title: 'Обрядові та побутові пісні', author: 'Різновиди народних пісень',
        icon: '🌻', minutes: 11, cover: ART + 'cover-folklore.webp',
      },
      {
        id: 'pisni-marusi-churay', title: 'Пісні Марусі Чурай', author: '«Віють вітри», «Засвіт встали козаченьки»',
        icon: '🎶', minutes: 9, cover: ART + 'cover-pisni-marusi-churay.webp',
      },
      {
        id: 'istorychni-pisni', title: 'Історичні пісні', author: '«Ой Морозе», «Чи не той то хміль»',
        icon: '⚔️', minutes: 9, cover: ART + 'cover-istorychni-pisni.webp',
      },
      {
        id: 'duma-marusya-bohuslavka', title: '«Дума про Марусю Богуславку»', author: 'Народна дума',
        icon: '🪕', minutes: 10, cover: ART + 'cover-duma-marusya-bohuslavka.webp',
      },
      {
        id: 'balada-oy-letila-strila', title: '«Ой летіла стріла»', author: 'Народна балада',
        icon: '🏹', minutes: 8, cover: ART + 'cover-balada-oy-letila-strila.webp',
      },
    ],
  },
  {
    id: 'davnya',
    title: 'Давня українська література',
    topics: [
      {
        id: 'povist-mynulykh-lit', title: '«Повість минулих літ»', author: 'Нестор Літописець',
        icon: '📜', minutes: 11, cover: ART + 'cover-povist-mynulykh-lit.webp',
      },
      {
        id: 'slovo-o-polku', title: '«Слово про похід Ігорів»', author: 'Пам’ятка XII ст.',
        icon: '🛡️', minutes: 12, cover: ART + 'cover-slovo-o-polku.webp',
      },
      {
        id: 'skovoroda', title: 'Григорій Сковорода', author: 'Три твори з програми',
        icon: '🐝', minutes: 12, cover: ART + 'cover-skovoroda.webp',
      },
    ],
  },
  {
    id: 'nova',
    title: 'Література кінця XVIII — початку XX ст.',
    topics: [
      {
        id: 'kotlyarevsky-eneida', title: '«Енеїда»', author: 'Іван Котляревський',
        icon: '⛵', minutes: 13, cover: ART + 'cover-kotlyarevsky-eneida.webp',
      },
      {
        id: 'kotlyarevsky-natalka', title: '«Наталка Полтавка»', author: 'Іван Котляревський',
        icon: '🎭', minutes: 12, cover: ART + 'cover-kotlyarevsky-natalka.webp',
      },
      {
        id: 'shevchenko-kateryna', title: '«Катерина»', author: 'Тарас Шевченко',
        icon: '🌾', minutes: 14, cover: ART + 'cover-shevchenko-kateryna.webp',
      },
      {
        id: 'shevchenko-zapovit', title: '«Заповіт»', author: 'Тарас Шевченко',
        icon: '🕯️', minutes: 8, cover: ART + 'cover-shevchenko-zapovit.webp',
      },
      {
        id: 'shevchenko-kavkaz', title: '«Кавказ»', author: 'Тарас Шевченко',
        icon: '🏔️', minutes: 11, cover: ART + 'cover-shevchenko-kavkaz.webp',
      },
      {
        id: 'shevchenko-son', title: '«Сон»', author: 'Тарас Шевченко',
        icon: '💤', minutes: 12, cover: ART + 'cover-shevchenko-son.webp',
      },
      {
        id: 'shevchenko-i-mertvym', title: '«І мертвим, і живим…»', author: 'Тарас Шевченко',
        icon: '✉️', minutes: 11, cover: ART + 'cover-shevchenko-i-mertvym.webp',
      },
      {
        id: 'kulish-chorna-rada', title: '«Чорна рада»', author: 'Пантелеймон Куліш',
        icon: '⚜️', minutes: 14, cover: ART + 'cover-kulish-chorna-rada.webp',
      },
      {
        id: 'nechuy-kaydasheva-simya', title: '«Кайдашева сім’я»', author: 'Іван Нечуй-Левицький',
        icon: '🍐', minutes: 13, cover: ART + 'cover-nechuy-kaydasheva-simya.webp',
      },
      {
        id: 'myrnyy-khiba-revut-voly', title: '«Хіба ревуть воли, як ясла повні?»', author: 'Панас Мирний',
        icon: '🐂', minutes: 14, cover: ART + 'cover-myrnyy-khiba-revut-voly.webp',
      },
      {
        id: 'karpenko-karyy-martyn-borulya', title: '«Мартин Боруля»', author: 'Іван Карпенко-Карий',
        icon: '📋', minutes: 12, cover: ART + 'cover-karpenko-karyy-martyn-borulya.webp',
      },
      {
        id: 'franko-zakhar-berkut', title: '«Захар Беркут»', author: 'Іван Франко',
        icon: '🦅', minutes: 13, cover: ART + 'cover-franko-zakhar-berkut.webp',
      },
      {
        id: 'franko-poeziya', title: 'Поезія Івана Франка', author: '«Зів’яле листя», «Мойсей»',
        icon: '🍂', minutes: 12, cover: ART + 'cover-franko-poeziya.webp',
      },
    ],
  },
  {
    id: 'xx',
    title: 'Література ХХ ст.',
    cover: ART + 'cover-xx.webp',
    topics: [
      {
        id: 'kotsyubynsky-tini', title: '«Тіні забутих предків»', author: 'Михайло Коцюбинський',
        icon: '🏔', minutes: 14,
      },
      {
        id: 'kotsyubynsky-intermezzo', title: '«Intermezzo»', author: 'Михайло Коцюбинський',
        icon: '🌾', minutes: 11,
      },
      {
        id: 'stefanyk-kaminnyy-khrest', title: '«Камінний хрест»', author: 'Василь Стефаник',
        icon: '✝️', minutes: 11,
      },
      {
        id: 'kobylyanska-valse', title: '«Valse mélancolique»', author: 'Ольга Кобилянська',
        icon: '🎹', minutes: 12,
      },
      {
        id: 'lesya-contra-spem-spero', title: '«Contra spem spero!»', author: 'Леся Українка',
        icon: '🌸', minutes: 9,
      },
      {
        id: 'lesya-lisova-pisnya', title: '«Лісова пісня»', author: 'Леся Українка',
        icon: '🌲', minutes: 15,
      },
      {
        id: 'voronyy-blakytna-panna', title: '«Блакитна Панна»', author: 'Микола Вороний',
        icon: '💙', minutes: 9,
      },
      {
        id: 'oles-poeziya', title: 'Поезія Олександра Олеся', author: '«Чари ночі», «О слово рідне!»',
        icon: '🌙', minutes: 11,
      },
      {
        id: 'tychyna-poeziya', title: 'Поезія Павла Тичини', author: 'Три вірші з програми',
        icon: '🎺', minutes: 13,
      },
      {
        id: 'rylsky-u-tepli-dni', title: '«У теплі дні збирання винограду…»', author: 'Максим Рильський',
        icon: '🍇', minutes: 10,
      },
      {
        id: 'khvylovyy-ya-romantyka', title: '«Я (Романтика)»', author: 'Микола Хвильовий',
        icon: '🔥', minutes: 13,
      },
      {
        id: 'yanovsky-mayster-korablya', title: '«Майстер корабля»', author: 'Юрій Яновський',
        icon: '⛵', minutes: 12,
      },
      {
        id: 'pidmohylnyy-misto', title: '«Місто»', author: 'Валер’ян Підмогильний',
        icon: '🏙', minutes: 13,
      },
      {
        id: 'vyshnya-usmishky', title: 'Усмішки Остапа Вишні', author: '«Моя автобіографія», «Сом»',
        icon: '🎣', minutes: 11,
      },
      {
        id: 'kulish-myna-mazaylo', title: '«Мина Мазайло»', author: 'Микола Куліш',
        icon: '🎭', minutes: 13,
      },
      {
        id: 'antonych-rizdvo', title: '«Різдво»', author: 'Богдан-Ігор Антонич',
        icon: '❄️', minutes: 9,
      },
      {
        id: 'sosyura-lyubit-ukrainu', title: '«Любіть Україну!»', author: 'Володимир Сосюра',
        icon: '🌻', minutes: 9,
      },
      {
        id: 'dovzhenko-zacharovana-desna', title: '«Зачарована Десна»', author: 'Олександр Довженко',
        icon: '🏞', minutes: 13,
      },
      {
        id: 'malyshko-pisnya-pro-rushnyk', title: '«Пісня про рушник»', author: 'Андрій Малишко',
        icon: '🧵', minutes: 9,
      },
      {
        id: 'honchar-modry-kamen', title: '«Модри Камень»', author: 'Олесь Гончар',
        icon: '🏔', minutes: 10,
      },
      {
        id: 'symonenko-poeziya', title: 'Поезія Василя Симоненка', author: 'Три вірші з програми',
        icon: '🦢', minutes: 12,
      },
      {
        id: 'holoborodko-nasha-mova', title: '«Наша мова»', author: 'Василь Голобородько',
        icon: '🗣', minutes: 9,
      },
      {
        id: 'tyutyunnyk-try-zozuli', title: '«Три зозулі з поклоном»', author: 'Григір Тютюнник',
        icon: '🕊', minutes: 11,
      },
      {
        id: 'stus-hospody', title: '«Господи, гніву пречистого…»', author: 'Василь Стус',
        icon: '⛓', minutes: 10,
      },
      {
        id: 'drach-balada-pro-sonyashnyk', title: '«Балада про соняшник»', author: 'Іван Драч',
        icon: '🌞', minutes: 10,
      },
      {
        id: 'pavlychko-dva-kolory', title: '«Два кольори»', author: 'Дмитро Павличко',
        icon: '🧶', minutes: 9,
      },
      {
        id: 'kostenko-strashni-slova', title: '«Страшні слова, коли вони мовчать»', author: 'Ліна Костенко',
        icon: '✒️', minutes: 10,
      },
      {
        id: 'kostenko-marusya-churay', title: '«Маруся Чурай»', author: 'Ліна Костенко',
        icon: '🎼', minutes: 15,
      },
    ],
  },
  {
    id: 'emigranty',
    title: 'Письменники-емігранти',
    topics: [
      {
        id: 'bahryanyy-tyhrolovy', title: '«Тигролови»', author: 'Іван Багряний',
        icon: '🐅', minutes: 14,
      },
      {
        id: 'malanyuk-uryvok-z-poemy', title: '«Уривок з поеми»', author: 'Євген Маланюк',
        icon: '🗡', minutes: 10,
      },
    ],
  },
  {
    id: 'suchasna',
    title: 'Сучасний літературний процес',
    cover: ART + 'cover-suchasna.webp',
    topics: [
      {
        id: 'suchasnyy-protses', title: 'Сучасний літературний процес', author: 'Постмодернізм і його автори',
        icon: '🌀', minutes: 11,
      },
    ],
  },
  {
    id: 'teoriya',
    title: 'Теорія літератури',
    topics: [
      {
        id: 'rody-i-zhanry', title: 'Роди й жанри літератури', author: 'Базове поняття',
        icon: '📚', minutes: 10, cover: ART + 'cover-rody-i-zhanry.webp',
      },
      {
        id: 'teoriya-virshuvannya', title: 'Віршування', author: 'Розмір, рима, строфа',
        icon: '📐', minutes: 12,
      },
      {
        id: 'teoriya-tropy', title: 'Художні засоби', author: 'Тропи й стилістичні фігури',
        icon: '🎨', minutes: 13,
      },
      {
        id: 'teoriya-napryamy', title: 'Літературні напрями', author: 'Від бароко до постмодернізму',
        icon: '🧭', minutes: 13,
      },
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

  // Посилання на повний текст твору — одразу на першому слайді, щоб можна було
  // відкрити оригінал ще до теорії.
  const texts = TEXTS[id];
  if (texts?.length && topic.slides.length) {
    const links = texts.map(t =>
      `<a class="srcbox__link" href="${t.url}" target="_blank" rel="noopener">${t.title}</a>`).join('');
    topic.slides = [{
      ...topic.slides[0],
      html: topic.slides[0].html + `
        <div class="srcbox">
          <div class="srcbox__head">📖 Читати повністю</div>
          ${links}
          <div class="srcbox__note">Відкриється на ${texts[0].source}, у новій вкладці</div>
        </div>`,
    }, ...topic.slides.slice(1)];
  }

  // Відео зберігаються окремо (content/videos.js) — так їх легко міняти,
  // не чіпаючи написаний вручну текст теми.
  const videos = VIDEOS[id];
  if (videos?.length) {
    topic.slides = [...topic.slides, {
      kicker: 'Відеорозбір',
      title: videos.length > 1 ? 'Подивись, як це пояснюють' : 'Подивись розбір',
      html: '<p>Те саме, але голосом і з прикладами. Вмикається за натисканням.</p>',
      videos,
    }];
  }

  loaded.set(id, topic);
  return topic;
}

/** Завантажує всі теми одразу — потрібно для тренування зі змішаними питаннями. */
export async function loadAllTopics() {
  return Promise.all(allTopicMeta().map(m => loadTopic(m.id)));
}
