// Печатка теми — те, чим закінчується тест.
//
// Раніше на екрані результату сперечалися п'ять речей: лелека, заголовок,
// три комірки з числами, орнамент і три кнопки. Жодна не була головною.
// Тут — один предмет, який сам проходить усі стани: кільце набирається
// до результату, щит впечатується, всередині проступає знак. Числа лишаються,
// але дрібно й нижче, бо вони довідка, а не подія.
//
// Форма щита та сама, що в значках рівнів: печатки й герби мають читатись
// як одна родина.

const SHIELD = 'M48 8l34 12v26c0 22-14 36-34 42C28 82 14 68 14 46V20z';
const INNER = 'M48 16l26 9v21c0 17-11 28-26 33-15-5-26-16-26-33V25z';

function calm() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {object} o
 * @param {number} o.score частка правильних, 0..1
 * @param {boolean} o.passed чи зарахована тема
 * @param {number} [o.size]
 */
export function topicSeal({ score, passed, size = 176 }) {
  const still = calm();
  const pct = Math.min(Math.max(score, 0), 1);

  // Кільце йде по колу, вписаному в квадрат 120×120; щит усередині — 96×96.
  const R = 54;
  const C = 2 * Math.PI * R;
  const off = (C * (1 - pct)).toFixed(1);

  const ink = passed ? 'var(--ok)' : 'var(--accent)';
  const stampBegin = still ? '0s' : '.62s';
  const markBegin = still ? '0s' : '1.02s';

  // Кільце: набирається з пружинним сповільненням, як денна ціль.
  const ring = `
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--bg-elev-2)" stroke-width="6"/>
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="${ink}" stroke-width="6"
      stroke-linecap="round" transform="rotate(-90 60 60)"
      stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${still ? off : C.toFixed(1)}">
      ${still ? '' : `<animate attributeName="stroke-dashoffset" from="${C.toFixed(1)}" to="${off}"
        dur=".85s" fill="freeze" calcMode="spline" keySplines=".22 1 .36 1" keyTimes="0;1"/>`}
    </circle>`;

  // Хвиля від удару — розходиться тієї ж миті, коли щит сідає на місце.
  const shock = still ? '' : `
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="${ink}" stroke-width="3" opacity="0">
      <animate attributeName="r" from="${R - 4}" to="${R + 16}" dur=".5s" begin="${stampBegin}" fill="freeze"/>
      <animate attributeName="opacity" values="0;.7;0" dur=".5s" begin="${stampBegin}" fill="freeze"/>
    </circle>`;

  // Знак усередині: галочка, коли тему зараховано. Коли ні — щит лишається
  // порожнім, а не тріснутим: тріщина читається як покарання, хоча вона
  // просто ще не дійшла.
  const mark = passed
    ? `<g fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
          stroke-dasharray="46" stroke-dashoffset="${still ? 0 : 46}">
         <path d="M34 49l10 10 19-21"/>
         ${still ? '' : `<animate attributeName="stroke-dashoffset" values="46;0" dur=".34s"
           begin="${markBegin}" fill="freeze"/>`}
       </g>`
    : `<text x="48" y="57" text-anchor="middle" fill="var(--text-dim)"
         font-size="25" font-weight="800" font-family="var(--font)"
         opacity="${still ? 1 : 0}">${Math.round(pct * 100)}%
         ${still ? '' : `<animate attributeName="opacity" values="0;1" dur=".3s"
           begin="${markBegin}" fill="freeze"/>`}
       </text>`;

  // Щит падає згори й сідає з відскоком.
  //
  // Дві дрібниці, на яких це спершу не працювало:
  // transform-origin керує CSS-трансформами, а SMIL пише в атрибут transform
  // і завжди масштабує від нуля координат — тому центр щита переносимо в нуль
  // вручну; і показувати групу через <animate> з мікродлительністю не можна,
  // для миттєвого присвоєння є <set>.
  const stamp = still ? '' : `
    <animateTransform attributeName="transform" type="scale" values="1.75;.94;1.03;1"
      keyTimes="0;.62;.83;1" dur=".62s" begin="${stampBegin}" fill="freeze"
      calcMode="spline" keySplines=".3 0 .2 1;.4 0 .5 1;.4 0 .2 1"/>`;

  return `<svg class="seal${passed ? ' seal--done' : ''}" width="${size}" height="${size}"
    viewBox="0 0 120 120" aria-hidden="true">
    ${ring}
    ${shock}
    <g transform="translate(60 60)" opacity="${still ? 1 : 0}">
      ${still ? '' : `<set attributeName="opacity" to="1" begin="${stampBegin}" fill="freeze"/>`}
      <g transform="scale(${still ? 1 : 1.75})">
        ${stamp}
        <g transform="translate(-48 -48)">
          <path d="${SHIELD}" fill="var(--bg-elev-2)" stroke="${ink}" stroke-width="3"/>
          <path d="${INNER}" fill="none" stroke="${ink}" stroke-width="2" opacity=".45"/>
          ${mark}
        </g>
      </g>
    </g>
  </svg>`;
}
