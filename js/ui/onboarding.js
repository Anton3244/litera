// Знайомство при першому запуску: кілька коротких екранів замість
// списку з двадцяти двох тем одразу.

import * as store from '../store.js';
import { mascotHtml } from './mascot.js';
import { enableReminders } from '../notify.js';
import * as sync from '../sync.js';
import { $ } from '../util.js';

export const needsOnboarding = () => store.get('onboarded') !== '1';

const GOALS = [
  { xp: 20, label: '5 хвилин', hint: 'по дорозі, між справами' },
  { xp: 50, label: '10 хвилин', hint: 'найзручніше — так і роблять більшість' },
  { xp: 100, label: '20 хвилин', hint: 'якщо до НМТ лишилось мало часу' },
];

export function renderOnboarding(root, onDone) {
  let step = 0;
  const steps = [welcome, account, name, goal, reminder, ready];

  function finish() {
    store.set('onboarded', '1');
    onDone();
  }

  function draw() {
    root.innerHTML = `<div class="ob">${steps[step]()}</div>`;
    root.querySelector('[data-next]')?.addEventListener('click', next);
    steps[step].bind?.(root);
  }

  function next() {
    step++;
    if (step >= steps.length) { finish(); return; }
    draw();
  }

  /* ---------------- екрани ---------------- */

  function welcome() {
    return `
      <div class="ob__art">${mascotHtml('hello', { size: 128, className: 'mascot--pop' })}</div>
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

  /** Вхід замість реєстрації: код — це і є обліковий запис, тільки без пароля. */
  function account() {
    return `
      <div class="ob__art">${mascotHtml('encourage', { size: 128, className: 'mascot--pop' })}</div>
      <h1 class="ob__title">Ти тут уперше?</h1>
      <p class="ob__text">
        Якщо ти вже займалась на іншому пристрої, введи свій код —
        і весь прогрес переїде сюди. Якщо ні, просто рушай далі.
      </p>
      <div class="ob__choices">
        <button class="ob__choice" id="ob-first"><span class="ob__choice-t">Я тут уперше</span>
          <span class="ob__choice-h">почати з чистого аркуша</span></button>
        <button class="ob__choice" id="ob-has"><span class="ob__choice-t">У мене вже є код</span>
          <span class="ob__choice-h">перенести прогрес з іншого пристрою</span></button>
      </div>
      <div id="ob-login" hidden>
        ${sync.serverUrl() ? '' : `<input class="ob__input" id="ob-url" type="text"
           placeholder="Адреса сервера" value="${sync.serverUrl()}">`}
        <input class="ob__input" id="ob-code" type="text" placeholder="Код" maxlength="32"
               style="letter-spacing:.16em;text-transform:uppercase">
        <button class="btn btn--primary" id="ob-enter">Увійти</button>
        <div class="ob__text" id="ob-status" style="text-align:center;margin:10px 0 0"></div>
      </div>`;
  }
  account.bind = root => {
    const box = root.querySelector('#ob-login');
    root.querySelector('#ob-first').addEventListener('click', next);
    root.querySelector('#ob-has').addEventListener('click', () => {
      box.hidden = false;
      root.querySelector('#ob-code').focus();
    });

    root.querySelector('#ob-enter').addEventListener('click', async e => {
      const status = root.querySelector('#ob-status');
      const url = root.querySelector('#ob-url')?.value.trim();
      const code = root.querySelector('#ob-code').value.trim().toUpperCase();
      if (!code) { status.textContent = 'Введи код'; return; }
      if (url) store.set('sync_url', url);
      if (!sync.serverUrl()) {
        status.textContent = 'Спершу введи адресу сервера — вона є в налаштуваннях на першому пристрої.';
        return;
      }

      e.currentTarget.disabled = true;
      status.textContent = 'Шукаю твій прогрес…';
      store.set('sync_code', code);

      try {
        const { hadRemote } = await sync.syncNow();
        if (!hadRemote) {
          status.textContent = 'За цим кодом нічого немає — перевір, чи не помилилась.';
          e.currentTarget.disabled = false;
          return;
        }
        status.textContent = 'Знайшла! Переношу…';
        finish();
      } catch (err) {
        status.textContent = 'Не вийшло: ' + err.message;
        e.currentTarget.disabled = false;
      }
    });
  };

  function name() {
    return `
      <div class="ob__art">${mascotHtml('read', { size: 128, className: 'mascot--pop' })}</div>
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
      <div class="ob__art">${mascotHtml('fire', { size: 128, className: 'mascot--pop' })}</div>
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
      <div class="ob__art">${mascotHtml('bye', { size: 128, className: 'mascot--pop' })}</div>
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
    if (!store.get('sync_code')) store.set('sync_code', sync.makeCode(8));
    return `
      <div class="ob__art">${mascotHtml('happy', { size: 128, className: 'mascot--pop' })}</div>
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
