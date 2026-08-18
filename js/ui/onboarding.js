// Знайомство при першому запуску: кілька коротких екранів замість
// списку з двадцяти двох тем одразу.

import * as store from '../store.js';
import { enableReminders } from '../notify.js';
import { $ } from '../util.js';

export const needsOnboarding = () => store.get('onboarded') !== '1';

const GOALS = [
  { xp: 20, label: '5 хвилин', hint: 'по дорозі, між справами' },
  { xp: 50, label: '10 хвилин', hint: 'найзручніше — так і роблять більшість' },
  { xp: 100, label: '20 хвилин', hint: 'якщо до НМТ лишилось мало часу' },
];

export function renderOnboarding(root, onDone) {
  let step = 0;
  const steps = [welcome, name, goal, reminder, ready];

  function draw() {
    root.innerHTML = `<div class="ob">${steps[step]()}</div>`;
    root.querySelector('[data-next]')?.addEventListener('click', next);
    steps[step].bind?.(root);
  }

  function next() {
    step++;
    if (step >= steps.length) {
      store.set('onboarded', '1');
      onDone();
      return;
    }
    draw();
  }

  /* ---------------- екрани ---------------- */

  function welcome() {
    return `
      <div class="ob__art">📖</div>
      <h1 class="ob__title">Привіт!</h1>
      <p class="ob__text">
        Це застосунок для підготовки до НМТ з української літератури.
        Тут уся програма розкладена на короткі теми: спершу теорія,
        потім тест у форматі справжнього НМТ.
      </p>
      <p class="ob__text">
        Нічого вигадувати не треба — застосунок сам щодня каже,
        що робити далі. Налаштуємо за півхвилини.
      </p>
      <button class="btn btn--primary" data-next>Добре</button>`;
  }

  function name() {
    return `
      <div class="ob__art">✏️</div>
      <h1 class="ob__title">Як до тебе звертатись?</h1>
      <p class="ob__text">Щоб нагадування були не від безликого застосунку.</p>
      <input id="ob-name" class="ob__input" type="text" placeholder="Ім’я" maxlength="24" autocomplete="off">
      <button class="btn btn--primary" data-next>Далі</button>
      <button class="btn btn--ghost" data-next>Пропустити</button>`;
  }
  name.bind = root => {
    const input = root.querySelector('#ob-name');
    input.focus();
    input.addEventListener('input', () => store.set('name', input.value.trim()));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') next(); });
  };

  function goal() {
    const cur = store.getNum('daily_goal_xp');
    return `
      <div class="ob__art">🎯</div>
      <h1 class="ob__title">Скільки часу на день?</h1>
      <p class="ob__text">
        Краще мало, але щодня. Пізніше це можна змінити в налаштуваннях.
      </p>
      <div class="ob__choices">
        ${GOALS.map(g => `
          <button class="ob__choice ${g.xp === cur ? 'is-on' : ''}" data-goal="${g.xp}">
            <span class="ob__choice-t">${g.label}</span>
            <span class="ob__choice-h">${g.hint}</span>
          </button>`).join('')}
      </div>
      <button class="btn btn--primary" data-next>Далі</button>`;
  }
  goal.bind = root => {
    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-goal]');
      if (!btn) return;
      store.set('daily_goal_xp', btn.dataset.goal);
      for (const b of root.querySelectorAll('[data-goal]')) b.classList.toggle('is-on', b === btn);
    });
  };

  function reminder() {
    return `
      <div class="ob__art">🔔</div>
      <h1 class="ob__title">Нагадувати щодня?</h1>
      <p class="ob__text">
        Якщо за день не було жодного заняття, застосунок нагадає —
        щоб вогник не згас.
      </p>
      <input id="ob-time" class="ob__input" type="time" value="${store.get('reminder_time')}">
      <button class="btn btn--primary" id="ob-allow">Так, нагадуй</button>
      <button class="btn btn--ghost" data-next>Не треба</button>`;
  }
  reminder.bind = root => {
    root.querySelector('#ob-allow').addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      await enableReminders(root.querySelector('#ob-time').value);
      next();
    });
  };

  function ready() {
    const who = store.get('name');
    return `
      <div class="ob__art">🔥</div>
      <h1 class="ob__title">${who ? `Готово, ${who}!` : 'Готово!'}</h1>
      <p class="ob__text">Як це працює далі — три пункти:</p>
      <ol class="ob__list">
        <li><b>Щодня застосунок показує один наступний крок.</b>
        Не треба вибирати, з чого почати — просто тисни велику кнопку.</li>
        <li><b>Спочатку теорія, потім тест.</b> Тема вважається вивченою не тоді,
        коли ти склала тест, а коли згадала матеріал через кілька днів.</li>
        <li><b>Наступного дня застосунок сам підсуне повторення.</b>
        Це найважливіше — саме так матеріал лишається в голові.</li>
      </ol>
      <button class="btn btn--primary" data-next>Почати першу тему</button>`;
  }

  draw();
}

/** Підказка-палець на головну кнопку — показується один раз. */
export function maybeShowHint() {
  if (store.get('hint_seen') === '1') return;
  const btn = $('[data-go].btn--primary');
  if (!btn) return;

  btn.classList.add('is-pointed');
  const hint = document.createElement('div');
  hint.className = 'pointer-hint';
  hint.innerHTML = '<span>👆 Тисни сюди — з цього починається день</span>';
  btn.insertAdjacentElement('afterend', hint);

  const dismiss = () => {
    store.set('hint_seen', '1');
    btn.classList.remove('is-pointed');
    hint.remove();
  };
  btn.addEventListener('click', dismiss, { once: true });
  setTimeout(dismiss, 12000);
}
