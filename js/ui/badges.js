// Значки рівнів і привілеїв.
//
// Сім рівнів — сім гербів у спільній формі щита, щоб їх було видно як ряд,
// а не як випадковий набір. Усередині щита — знак рівня. Замкнені привілеї
// показуємо тим самим значком, але приглушеним, а не замочком: так одразу
// видно, що саме відкриється.

const SHIELD = 'M48 8l34 12v26c0 22-14 36-34 42C28 82 14 68 14 46V20z';
const INNER = 'M48 16l26 9v21c0 17-11 28-26 33-15-5-26-16-26-33V25z';

/** Малюнок усередині щита для кожного з семи рівнів. */
const MARKS = [
  // 0 Початківець — паросток
  `<path d="M48 68V44" stroke="var(--ok)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
   <path d="M48 50c-9 0-14-6-14-13 8 0 14 5 14 13Z" fill="var(--ok)"/>
   <path d="M48 44c8 0 13-5 13-12-7 0-13 5-13 12Z" fill="var(--ok)" opacity=".75"/>`,
  // 1 Читач — розгорнута книжка
  `<path d="M24 38c8-3 16-3 24 3v27c-8-6-16-6-24-3z" fill="#fff3c4"/>
   <path d="M72 38c-8-3-16-3-24 3v27c8-6 16-6 24-3z" fill="var(--accent)"/>
   <g stroke="var(--bg)" stroke-width="2" stroke-linecap="round" opacity=".55">
     <path d="M30 47c5-1 9 0 13 2M30 55c5-1 9 0 13 2M66 47c-5-1-9 0-13 2M66 55c-5-1-9 0-13 2"/>
   </g>
   <path d="M48 41v27" stroke="var(--accent-2)" stroke-width="2.4" stroke-linecap="round"/>`,
  // 2 Знавець — лупа
  `<circle cx="44" cy="44" r="14" fill="none" stroke="var(--accent)" stroke-width="4"/>
   <path d="M54 54l12 12" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>
   <circle cx="44" cy="44" r="7" fill="var(--accent)" opacity=".3"/>`,
  // 3 Літератор — перо з чорнильним кінчиком
  `<path d="M68 26c-18 1-32 13-36 30l-3 12 11-3c17-4 27-18 28-36 0-2 0-3 0-3Z" fill="var(--accent)"/>
   <path d="M64 30 34 62" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round"/>
   <g stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round" opacity=".8">
     <path d="M56 30 48 34M62 38l-8 4M64 48l-8 4M56 58l-8 4"/>
   </g>
   <path d="M29 68 22 76" stroke="var(--accent-2)" stroke-width="4" stroke-linecap="round"/>
   <circle cx="21" cy="77" r="3" fill="var(--accent-2)"/>`,
  // 4 Критик — шапочка випускника
  `<path d="M48 32 22 44l26 12 26-12z" fill="var(--accent)"/>
   <path d="M32 50v12c0 5 7 8 16 8s16-3 16-8V50" fill="none" stroke="var(--accent)" stroke-width="3.5"/>
   <path d="M67 47v11" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
   <circle cx="67" cy="61" r="3" fill="var(--accent)"/>`,
  // 5 Кобзар — бандура. Впізнають її не за силуетом, а за голосником
  // збоку та віялом приструнків, тож саме їх і промальовуємо.
  `<rect x="40" y="18" width="13" height="7" rx="3" fill="var(--accent)"/>
   <g fill="var(--bg)"><circle cx="43.5" cy="21.5" r="1.4"/><circle cx="46.5" cy="21.5" r="1.4"/><circle cx="49.5" cy="21.5" r="1.4"/></g>
   <rect x="43" y="24" width="6" height="15" fill="var(--accent)"/>
   <path d="M46 37c10 0 17 10 17 20 0 10-7 17-17 17s-17-7-17-17c0-10 7-20 17-20Z" fill="var(--accent)"/>
   <circle cx="39" cy="50" r="5" fill="var(--bg-elev-2)"/>
   <g stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" opacity=".75">
     <path d="M51 44v24M55 48v18M58 52v11"/>
   </g>
   <path d="M34 64h20" stroke="var(--bg)" stroke-width="2" opacity=".55" stroke-linecap="round"/>`,
  // 6 Класик — корона
  `<path d="M28 60 24 34l12 10 12-16 12 16 12-10-4 26z" fill="var(--accent)"/>
   <path d="M28 64h40" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
   <circle cx="36" cy="50" r="2.6" fill="var(--bg)"/>
   <circle cx="48" cy="46" r="2.6" fill="var(--bg)"/>
   <circle cx="60" cy="50" r="2.6" fill="var(--bg)"/>`,
];

/**
 * @param {number} level індекс рівня 0..6
 * @param {{size?:number, dim?:boolean}} opts dim — для ще не досягнутого
 */
export function levelBadge(level, opts = {}) {
  const { size = 64, dim = false } = opts;
  const i = Math.min(Math.max(level, 0), MARKS.length - 1);
  return `<svg class="badge${dim ? ' badge--dim' : ''}" width="${size}" height="${size}"
    viewBox="0 0 96 96" aria-hidden="true">
    <path d="${SHIELD}" fill="var(--bg-elev-2)" stroke="var(--accent)" stroke-width="3"/>
    <path d="${INNER}" fill="none" stroke="var(--accent-2)" stroke-width="2" opacity=".65"/>
    ${MARKS[i]}
  </svg>`;
}

/** Значки привілеїв — по одному на кожен рівень, крім першого. */
const PERKS = {
  // шосте життя
  heart: `<path d="M48 74C30 62 20 52 20 41c0-8 6-14 13-14 6 0 10 3 15 9 5-6 9-9 15-9 7 0 13 6 13 14 0 11-10 21-28 33Z" fill="var(--err)"/>`,
  // заморозка вогника
  freeze: `<g stroke="#7fd4ff" stroke-width="4" stroke-linecap="round">
     <path d="M48 22v52M26 34l44 28M70 34 26 62"/>
     <path d="M40 27l8 7 8-7M40 69l8-7 8 7"/>
   </g>`,
  // вибір кольору
  palette: `<path d="M48 22c-15 0-26 11-26 25 0 13 9 22 22 22 5 0 7-3 7-6 0-4-4-5-4-9 0-3 3-6 7-6h6c9 0 14-6 14-14 0-7-11-12-26-12Z"
      fill="none" stroke="var(--accent-2)" stroke-width="4"/>
    <circle cx="36" cy="40" r="4" fill="var(--err)"/>
    <circle cx="50" cy="34" r="4" fill="var(--accent)"/>
    <circle cx="62" cy="42" r="4" fill="var(--ok)"/>`,
  // сьоме життя — друге серце поверх першого: цифру на такому розмірі
  // все одно не прочитати, а два серця відрізняються з одного погляду
  heart7: `<path d="M36 66C21 56 12 47 12 38c0-7 5-12 11-12 5 0 9 3 13 8 4-5 8-8 13-8 6 0 11 5 11 12 0 9-9 18-24 28Z"
      fill="var(--err)" opacity=".45"/>
    <path d="M58 80C43 70 34 61 34 52c0-7 5-12 11-12 5 0 9 3 13 8 4-5 8-8 13-8 6 0 11 5 11 12 0 9-9 18-24 28Z"
      fill="var(--err)" stroke="var(--bg-elev-2)" stroke-width="2.5"/>`,
  // золота рамка
  frame: `<rect x="22" y="28" width="52" height="40" rx="8" fill="none" stroke="var(--accent)" stroke-width="4"/>
    <path d="M30 36h6M30 36v6M66 36h-6M66 36v6M30 60h6M30 60v-6M66 60h-6M66 60v-6"
      stroke="#fff3c4" stroke-width="2.5" stroke-linecap="round" fill="none"/>`,
  // усе відкрито
  star: `<path d="M48 22l7.6 15.4L73 40l-12.4 12.1 3 17.1L48 61.1l-15.6 8.1 3-17.1L23 40l17.4-2.6z" fill="var(--accent)"/>`,
};

const PERK_ORDER = ['heart', 'freeze', 'palette', 'heart7', 'frame', 'star'];

/**
 * @param {number} level рівень, до якого прив'язаний привілей (1..6)
 * @param {{size?:number, locked?:boolean}} opts
 */
export function perkIcon(level, opts = {}) {
  const { size = 34, locked = false } = opts;
  const key = PERK_ORDER[Math.min(Math.max(level - 1, 0), PERK_ORDER.length - 1)];
  return `<svg class="badge${locked ? ' badge--dim' : ''}" width="${size}" height="${size}"
    viewBox="0 0 96 96" aria-hidden="true">${PERKS[key]}</svg>`;
}
