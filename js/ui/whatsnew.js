// Віконце «Що нового» після оновлення застосунку.

import { markChangelogSeen } from '../updates.js';
import { plural } from '../util.js';

/**
 * @param {{reset: string[], entries: Array}} update
 * @returns {Promise<void>} закривається натисканням
 */
export function showWhatsNew({ reset, entries }) {
  if (!entries.length && !reset.length) return Promise.resolve();

  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `
    <div class="modal__card">
      <div class="modal__art">✨</div>
      <h2 class="modal__title">Що нового</h2>

      ${entries.map(e => `
        <div class="modal__block">
          <div class="modal__head">${e.title}</div>
          <ul class="modal__list">${e.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>`).join('')}

      ${reset.length ? `
        <div class="modal__block modal__block--warn">
          <div class="modal__head">Варто пройти ще раз</div>
          <p class="modal__text">
            Я виправив питання ${reset.length === 1 ? 'у темі' : 'у темах'} нижче — старі відповіді
            стосувались попереднього варіанта, тому ${plural(reset.length, 'ця тема', 'ці теми', 'ці теми')}
            ${plural(reset.length, 'повернулась', 'повернулись', 'повернулись')} на початок.
            Перепройти — хвилин десять, і матеріал заразом освіжиться.
          </p>
          <ul class="modal__list">${reset.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>` : ''}

      <button class="btn btn--primary" id="modal-ok">Зрозуміло</button>
    </div>`;

  document.body.appendChild(box);

  return new Promise(resolve => {
    const close = () => {
      markChangelogSeen();
      box.remove();
      resolve();
    };
    box.querySelector('#modal-ok').addEventListener('click', close);
    box.addEventListener('click', e => { if (e.target === box) close(); });
  });
}
