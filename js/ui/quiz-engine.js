// Рушій тестів. Використовується і в тесті теми, і в тренуванні.
// Підтримує два формати НМТ: одиничний вибір (А–Д) і завдання на відповідність.

import * as store from '../store.js';
import { LETTERS, shuffle, vibrate, escapeHtml } from '../util.js';
import { bumpStat, refreshStats, setHearts } from '../app.js';


/**
 * @param {HTMLElement} root куди малювати
 * @param {object} opts
 * @param {Array}  opts.questions питання (кожне з полем topicId)
 * @param {string} opts.mode 'lesson' | 'practice'
 * @param {boolean} opts.useHearts чи діють життя
 * @param {(results:Array, ranOut:boolean)=>void} opts.onFinish
 */
export function runQuiz(root, { questions, mode = 'lesson', useHearts = false, onFinish }) {
  let index = 0;
  let hearts = store.heartsPerRun();   // росте з рівнем
  let startedAt = performance.now();
  const results = [];

  // стан поточного питання
  let picked = null;          // одиничний вибір: індекс варіанта
  let assignment = [];        // відповідність: масив індексів правих варіантів
  let activeRow = 0;
  let shown = null;           // підготовлене питання (з перемішаними варіантами)
  let locked = false;

  // Слухачі вішаємо на власну обгортку, а не на #view: якщо тест запустять
  // повторно, стара обгортка зникне разом зі слухачами.
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="progressbar"><i id="q-bar"></i></div>
    <div id="q-host"></div>
    <div class="spacer-fb"></div>
    <div id="fb-host"></div>`;
  root.appendChild(wrap);

  const host = wrap.querySelector('#q-host');
  const fbHost = wrap.querySelector('#fb-host');
  const bar = wrap.querySelector('#q-bar');

  if (useHearts) setHearts(hearts);

  function prepare(q) {
    if (q.type === 'match') {
      return { ...q, right: q.right, answer: q.answer };
    }
    const order = shuffle(q.options.map((_, i) => i));
    return {
      ...q,
      options: order.map(i => q.options[i]),
      answer: order.indexOf(q.answer),
    };
  }

  function draw() {
    const q = questions[index];
    shown = prepare(q);
    picked = null;
    assignment = new Array(shown.left?.length ?? 0).fill(null);
    activeRow = 0;
    locked = false;
    startedAt = performance.now();

    bar.style.width = `${(index / questions.length) * 100}%`;
    host.innerHTML = shown.type === 'match' ? matchHtml(shown) : singleHtml(shown);
    fbHost.innerHTML = checkBarHtml(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Звідки питання — без цього в «Тренуванні» неможливо зрозуміти, про що мова. */
  function sourceHtml(q) {
    // Коли текст наведено поруч, підпис теми зайвий — а часом і підказує відповідь.
    if (q.passage) return '';
    if (!q.topicTitle) return '';
    const author = q.topicAuthor ? ` · ${escapeHtml(q.topicAuthor)}` : '';
    return `<div class="q__source">${escapeHtml(q.topicTitle)}${author}</div>`;
  }

  /**
   * Наведений текст, до якого ставиться питання. На НМТ це третина роботи:
   * незнайомий вірш або уривок прози, а до нього — п’ять завдань поспіль.
   */
  function passageHtml(q) {
    if (!q.passage) return '';
    const p = q.passage;
    const kind = p.kind === 'prose' ? 'passage--prose' : 'passage--verse';
    return `
      <div class="passage ${kind}">
        <div class="passage__text">${escapeHtml(p.text)}</div>
        ${p.source ? `<div class="passage__source">${escapeHtml(p.source)}</div>` : ''}
      </div>`;
  }

  function singleHtml(q) {
    return `
      <div class="slide">
        ${sourceHtml(q)}
        ${passageHtml(q)}
        <span class="q__tag">Одна правильна відповідь</span>
        <h2 class="q__prompt">${q.prompt}</h2>
        <div class="opts" id="opts">
          ${q.options.map((o, i) => `
            <button class="opt" data-opt="${i}">
              <span class="opt__letter">${LETTERS[i]}</span>
              <span>${escapeHtml(o)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function matchHtml(q) {
    return `
      <div class="slide">
        ${sourceHtml(q)}
        ${passageHtml(q)}
        <span class="q__tag">Відповідність</span>
        <h2 class="q__prompt">${q.prompt}</h2>
        <div class="match" id="match">
          ${q.left.map((l, i) => `
            <div class="match__row">
              <div class="match__left"><b>${i + 1}.</b> ${escapeHtml(l)}</div>
              <button class="match__pick ${i === 0 ? 'is-active' : ''}" data-row="${i}">—</button>
            </div>`).join('')}
        </div>
        <div class="match__bank" id="bank">
          ${q.right.map((r, i) => `
            <button class="match__opt" data-bank="${i}">
              <b>${LETTERS[i]}</b>${escapeHtml(r)}
            </button>`).join('')}
        </div>
      </div>`;
  }

  function checkBarHtml(ready) {
    return `
      <div class="fb" style="background:var(--bg)">
        <div class="fb__inner">
          <button class="btn btn--primary" id="check" ${ready ? '' : 'disabled'}>Перевірити</button>
          <div class="kbdhint">Цифри <b>1–5</b> обирають відповідь, <b>Enter</b> перевіряє</div>
        </div>
      </div>`;
  }

  function feedbackHtml(ok, q) {
    const last = index === questions.length - 1;
    return `
      <div class="fb ${ok ? 'fb--ok' : 'fb--err'}">
        <div class="fb__inner">
          <div class="fb__head">${ok ? '✓ Правильно!' : '✗ Не зовсім'}</div>
          <div class="fb__text">${q.explain ? escapeHtml(q.explain) : (ok ? 'Так тримати.' : 'Подивись пояснення в теорії.')}</div>
          <button class="btn ${ok ? 'btn--ok' : 'btn--err'}" id="next">${last ? 'Завершити' : 'Далі'}</button>
        </div>
      </div>`;
  }

  /* ---------- взаємодія ---------- */

  wrap.addEventListener('click', e => {
    const opt = e.target.closest('[data-opt]');
    if (opt && !locked) return pickOption(Number(opt.dataset.opt));

    const row = e.target.closest('[data-row]');
    if (row && !locked) return pickRow(Number(row.dataset.row));

    const bank = e.target.closest('[data-bank]');
    if (bank && !locked) return assign(Number(bank.dataset.bank));

    if (e.target.closest('#check')) return check();
    if (e.target.closest('#next')) return advance();
  });

  // На комп'ютері миша для тесту зайва: цифра обирає варіант, Enter перевіряє.
  function onKey(e) {
    // Якщо з тесту вийшли, не дочекавшись кінця, слухач знімає себе сам.
    if (!wrap.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (e.target instanceof Element && e.target.closest('input,textarea')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      if (locked) return;
      const i = n - 1;
      if (shown.type === 'match') {
        if (i < shown.right.length) { e.preventDefault(); assign(i); }
      } else if (i < shown.options.length) {
        e.preventDefault(); pickOption(i);
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const btn = wrap.querySelector('#next') || wrap.querySelector('#check:not([disabled])');
      if (btn) { e.preventDefault(); btn.click(); }
    }
  }
  document.addEventListener('keydown', onKey);

  function pickOption(i) {
    picked = i;
    for (const el of host.querySelectorAll('.opt')) {
      el.classList.toggle('is-picked', Number(el.dataset.opt) === i);
    }
    fbHost.innerHTML = checkBarHtml(true);
  }

  function pickRow(i) {
    if (assignment[i] !== null) {
      assignment[i] = null; // повторний тап знімає вибір
    }
    activeRow = i;
    drawMatchState();
  }

  function assign(bankIndex) {
    if (assignment.includes(bankIndex)) return; // варіант уже використано
    const row = assignment[activeRow] === null
      ? activeRow
      : assignment.findIndex(v => v === null);
    if (row === -1) return;

    assignment[row] = bankIndex;
    const nextEmpty = assignment.findIndex(v => v === null);
    activeRow = nextEmpty === -1 ? row : nextEmpty;
    drawMatchState();
  }

  function drawMatchState() {
    for (const el of host.querySelectorAll('[data-row]')) {
      const i = Number(el.dataset.row);
      const v = assignment[i];
      el.textContent = v === null ? '—' : LETTERS[v];
      el.classList.toggle('is-set', v !== null);
      el.classList.toggle('is-active', i === activeRow && v === null);
    }
    for (const el of host.querySelectorAll('[data-bank]')) {
      el.classList.toggle('is-used', assignment.includes(Number(el.dataset.bank)));
    }
    fbHost.innerHTML = checkBarHtml(assignment.every(v => v !== null));
  }

  /* ---------- перевірка ---------- */

  function check() {
    locked = true;
    const q = shown;
    let ok;

    if (q.type === 'match') {
      ok = assignment.every((v, i) => v === q.answer[i]);
      for (const el of host.querySelectorAll('[data-row]')) {
        const i = Number(el.dataset.row);
        const right = assignment[i] === q.answer[i];
        el.classList.add(right ? 'is-right' : 'is-wrong');
        if (!right) el.textContent = LETTERS[q.answer[i]];
      }
    } else {
      ok = picked === q.answer;
      host.querySelector('.opts').classList.add('is-locked');
      for (const el of host.querySelectorAll('.opt')) {
        const i = Number(el.dataset.opt);
        if (i === q.answer) el.classList.add('is-right');
        else if (i === picked) el.classList.add('is-wrong');
      }
    }

    const ms = performance.now() - startedAt;
    store.recordAnswer({
      topicId: q.topicId,
      questionId: q.id,
      correct: ok,
      ms,
      mode,
    });
    results.push({ id: q.id, topicId: q.topicId, correct: ok });

    if (ok) {
      bumpStat('xp');
      vibrate(15);
    } else {
      vibrate([25, 40, 25]);
      if (useHearts) {
        hearts--;
        setHearts(hearts);
        bumpStat('hearts');
      }
    }
    refreshStats();

    fbHost.innerHTML = feedbackHtml(ok, q);
  }

  function advance() {
    if (useHearts && hearts <= 0) {
      finish(true);
      return;
    }
    index++;
    if (index >= questions.length) finish(false);
    else draw();
  }

  function finish(ranOutOfHearts) {
    document.removeEventListener('keydown', onKey);
    setHearts(null);
    onFinish(results, ranOutOfHearts);
  }

  draw();
}
