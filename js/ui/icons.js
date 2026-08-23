// Векторні іконки та анімації.
//
// Усе намальовано кодом, а не картинками: вогник важить близько кілограма
// байтів проти тридцяти в анімованого WebP, масштабується без втрат
// і перефарбовується змінними теми.
//
// Рух — через SMIL (<animate>), бо він працює всередині <img> і не потребує
// ні бібліотек, ні окремих CSS-правил на кожну іконку.

/**
 * Чи просив користувач менше руху. SMIL живе поза CSS, тому правило
 * prefers-reduced-motion у стилях його не зупиняє — питаємо самі.
 */
function calm() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Вогник у шапці. Дихає й мерехтить. */
export function flameSvg(size = 20, alive = true) {
  if (!alive || calm()) {
    // Згаслий вогник: той самий силует, але сірий і нерухомий —
    // так видно, що серія обірвалась, а не що іконка зникла.
    const fill = alive ? '#ff6b1a' : 'var(--text-faint)';
    return `<svg class="ico ico--flame${alive ? '' : ' is-out'}" width="${size}" height="${size}" viewBox="0 0 76 96" aria-hidden="true">
      <path fill="${fill}" d="M38 92C18 92 8 78 8 62 8 42 26 34 30 12c14 8 16 20 14 28 4-3 6-8 6-14 12 10 18 22 18 36 0 16-10 30-30 30Z"/>
    </svg>`;
  }
  return `<svg class="ico ico--flame" width="${size}" height="${size}" viewBox="0 0 76 96" aria-hidden="true">
    <path fill="#ff6b1a" d="M38 92C18 92 8 78 8 62 8 42 26 34 30 12c14 8 16 20 14 28 4-3 6-8 6-14 12 10 18 22 18 36 0 16-10 30-30 30Z">
      <animateTransform attributeName="transform" type="scale" additive="sum"
        values="1 1;1.04 .96;.97 1.05;1 1" dur="1.6s" repeatCount="indefinite"/>
    </path>
    <path fill="var(--accent)" d="M38 86c-11 0-18-8-18-18 0-12 11-16 13-30 8 6 9 13 8 18 3-2 4-5 4-9 7 7 11 14 11 21 0 10-7 18-18 18Z">
      <animateTransform attributeName="transform" type="scale" additive="sum"
        values="1 1;.94 1.07;1.06 .95;1 1" dur="1.1s" repeatCount="indefinite"/>
    </path>
    <path fill="#fff3c4" d="M38 80c-6 0-10-5-10-11 0-7 6-9 7-17 5 4 5 8 5 11 2-1 2-3 2-5 4 4 6 8 6 11 0 6-4 11-10 11Z">
      <animate attributeName="opacity" values="1;.55;1" dur=".7s" repeatCount="indefinite"/>
    </path>
  </svg>`;
}

/** Зірка досвіду в шапці. Нерухома: вона поруч із числом, що й так змінюється. */
export function starSvg(size = 17) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">
    <path fill="var(--accent)" d="M48 10l11.4 23.1L85 36.8 66.5 54.8l4.4 25.5L48 68.3 25.1 80.3l4.4-25.5L11 36.8l25.6-3.7z"/>
  </svg>`;
}

/** Життя в шапці. Порожнє серце — коли їх не лишилось. */
export function heartSvg(size = 17, full = true) {
  const d = 'M48 80C27 66 15 55 15 41c0-10 8-17 17-17 7 0 12 4 16 10 4-6 9-10 16-10 9 0 17 7 17 17 0 14-12 25-33 39Z';
  return full
    ? `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">
        <path fill="var(--err)" d="${d}"/></svg>`
    : `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">
        <path fill="none" stroke="var(--text-faint)" stroke-width="6" d="${d}"/></svg>`;
}

/** Кільце денної цілі. Заповнюється з пружинним сповільненням. */
export function ringSvg(pct, size = 60, stroke = 6, animate = true) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = (c * (1 - Math.min(Math.max(pct, 0), 1))).toFixed(1);
  if (calm()) animate = false;
  const half = size / 2;
  const fill = `
    <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="var(--accent)"
      stroke-width="${stroke}" stroke-linecap="round"
      transform="rotate(-90 ${half} ${half})"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${animate ? c.toFixed(1) : off}">
      ${animate ? `<animate attributeName="stroke-dashoffset" from="${c.toFixed(1)}" to="${off}"
        dur="1.1s" fill="freeze" calcMode="spline" keySplines=".22 1 .36 1" keyTimes="0;1"/>` : ''}
    </circle>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="var(--bg-elev-2)" stroke-width="${stroke}"/>
    ${fill}
  </svg>`;
}

/** Галочка або хрестик після відповіді. Лінія промальовується. */
export function verdictSvg(ok, size = 72) {
  const still = calm();
  const color = ok ? 'var(--ok)' : 'var(--err)';
  const ink = ok ? '#0f2a20' : '#2c1114';
  const mark = ok
    ? '<path d="M34 49l10 10 19-21"/>'
    : '<path d="M36 36l24 24M60 36 36 60"/>';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">
    ${still ? '' : `<circle cx="48" cy="48" r="30" fill="none" stroke="${color}" stroke-width="4" opacity="0">
      <animate attributeName="r" values="30;44" dur=".7s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".8;0" dur=".7s" repeatCount="indefinite"/>
    </circle>`}
    <circle cx="48" cy="48" r="30" fill="${color}"/>
    <g fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
       stroke-dasharray="70" stroke-dashoffset="${still ? 0 : 70}">
      ${mark}
      ${still ? '' : '<animate attributeName="stroke-dashoffset" values="70;0" dur=".35s" begin=".08s" fill="freeze"/>'}
    </g>
  </svg>`;
}

/** Сплеск досвіду за правильну відповідь. */
export function xpBurstSvg(amount, size = 96) {
  const rays = [
    [60, 18, 60, 6], [86, 28, 95, 19], [34, 28, 25, 19],
    [92, 52, 104, 52], [28, 52, 16, 52],
  ].map(([x1, y1, x2, y2], i) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <animate attributeName="opacity" values="1;0" dur=".9s" begin="${i * 0.08}s" repeatCount="indefinite"/>
    </line>`).join('');
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 120 100" aria-hidden="true">
    <path fill="var(--accent)" d="M60 30l5.2 10.6 11.8 1.7-8.5 8.3 2 11.7L60 56.7l-10.5 5.6 2-11.7-8.5-8.3 11.8-1.7z">
      <animateTransform attributeName="transform" type="scale" additive="sum"
        values="1 1;1.15 1.15;1 1" dur=".5s" repeatCount="1"/>
    </path>
    <g stroke="var(--accent)" stroke-width="3" stroke-linecap="round">${rays}</g>
    <text x="60" y="90" text-anchor="middle" fill="var(--accent)" font-size="17"
      font-weight="800" font-family="var(--font)">+${amount} XP</text>
  </svg>`;
}

/**
 * Конфеті за ідеальний результат. Падає один раз і зупиняється.
 *
 * Кожен клаптик — <g>, що їде вниз, і <rect> усередині, що крутиться
 * навколо власного центра. Одним трансформом це не зробити: обертання
 * і зсув в SMIL додаються, і клаптик відлітає геть з кадру.
 */
export function confettiSvg(size = 280) {
  if (calm()) return '';
  const colors = ['var(--accent)', 'var(--accent-2)', 'var(--ok)', '#ff6bd6', '#4fc3f7'];
  const bits = Array.from({ length: 24 }, (_, i) => {
    const x = 8 + (i * 71) % 264;
    const drift = ((i % 5) - 2) * 14;
    const delay = ((i % 8) * 0.09).toFixed(2);
    const spin = (i % 2 ? 1 : -1) * (240 + (i % 3) * 180);
    const c = colors[i % colors.length];
    const w = 5 + (i % 3) * 2;
    const h = w * 1.8;
    return `<g>
      <animateTransform attributeName="transform" type="translate"
        from="${x} -20" to="${x + drift} 200" dur="1.9s" begin="${delay}s" fill="freeze"
        calcMode="spline" keySplines=".32 .06 .62 1" keyTimes="0;1"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="${c}" opacity="0">
        <animateTransform attributeName="transform" type="rotate"
          from="0" to="${spin}" dur="1.9s" begin="${delay}s" fill="freeze"/>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.72;1"
          dur="1.9s" begin="${delay}s" fill="freeze"/>
      </rect>
    </g>`;
  }).join('');
  return `<svg class="confetti" width="${size}" height="${Math.round(size * 0.66)}"
    viewBox="0 0 280 185" aria-hidden="true">${bits}</svg>`;
}
