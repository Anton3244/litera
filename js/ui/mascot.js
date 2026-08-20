// Лелека — обличчя застосунку.
//
// Дев'ять статичних поз плюс легкий рух у CSS. Свідомо без відео й Lottie:
// картинка з альфа-каналом важить ~25 КБ, а «дихання» дає анімація,
// тож нічого додаткового вантажити не треба.

const ART = 'assets/art/';

export const MOODS = [
  'hello', 'happy', 'encourage', 'bye', 'read', 'fire', 'crown', 'sleep', 'sad',
];

const ALT = {
  hello: 'Лелека вітається',
  happy: 'Лелека радіє',
  encourage: 'Лелека підбадьорює',
  bye: 'Лелека прощається',
  read: 'Лелека читає книжку',
  fire: 'Лелека тримає вогник',
  crown: 'Лелека в короні',
  sleep: 'Лелека спить',
  sad: 'Лелека засмучений',
};

/**
 * @param {string} mood одна з MOODS
 * @param {{size?:number, motion?:'breathe'|'bob'|'none', className?:string}} opts
 */
export function mascotHtml(mood = 'hello', opts = {}) {
  const { size = 96, motion = 'breathe', className = '' } = opts;
  const safe = MOODS.includes(mood) ? mood : 'hello';
  const cls = ['mascot', motion !== 'none' ? `mascot--${motion}` : '', className]
    .filter(Boolean).join(' ');
  // без lazy: лелека завжди у видимій частині екрана, відкладати нічого
  return `<img class="${cls}" src="${ART}mascot-${safe}.webp"
    width="${size}" height="${size}" alt="${ALT[safe]}" decoding="async">`;
}

/**
 * Настрій для головного екрана. Порядок перевірок — від найважливішого:
 * спершу свято, потім тривога за вогник, і лише тоді буденне вітання.
 */
export function moodForHome({ allDone, streak, studiedToday, maxLevel }) {
  if (maxLevel) return 'crown';
  if (allDone) return 'happy';
  if (streak >= 3 && !studiedToday) return 'sleep';   // серія під загрозою
  if (streak >= 3) return 'fire';
  return 'hello';
}

/** Настрій для екрана результату. */
export function moodForResult({ perfect, ranOut, score }) {
  if (ranOut) return 'sad';
  if (perfect) return 'happy';
  if (score >= 0.8) return 'fire';
  return 'encourage';
}
