// Режим створювача: #/dev
//
// Не згадується ніде в інтерфейсі — заходити просто за адресою.
// Тут зручно перечитати всі питання теми разом із правильними відповідями,
// швидко стрибнути в будь-який урок і перевірити сповіщення чи рівні,
// не проходячи весь курс заново.

import * as store from '../store.js';
import * as db from '../db.js';
import * as sync from '../sync.js';
import { allTopicMeta, loadTopic, loadAllTopics } from '../../content/index.js';
import { CHANGELOG } from '../../content/changelog.js';
import { showWhatsNew } from './whatsnew.js';
import { resetTopic } from '../updates.js';
import { go, refreshStats } from '../app.js';
import { toast, LETTERS, escapeHtml } from '../util.js';

export async function renderDev(root) {
  const metas = allTopicMeta();
  const topics = await loadAllTopics();
  const picked = store.get('dev_topic') || metas[0].id;

  root.innerHTML = `
    <h1 class="page-title">Режим створювача</h1>
    <p class="page-sub">Її очам це не призначено — сюди тільки за адресою #/dev.</p>

    <div class="card">
      <div class="row__label" style="margin-bottom:8px">Стан</div>
      <div class="dev__grid">
        ${stat('Рівень', `${store.levelInfo().number} · ${store.levelInfo().title}`)}
        ${stat('XP', store.totalXp())}
        ${stat('Вогник', store.streak())}
        ${stat('Відповідей', db.value('SELECT COUNT(*) FROM answers', [], 0))}
        ${stat('На повтор', store.dueCount())}
        ${stat('Життів у тесті', store.heartsPerRun())}
        ${stat('Тем у курсі', topics.length)}
        ${stat('Питань', topics.reduce((n, t) => n + t.questions.length, 0))}
        ${stat('Синхронізація', sync.isConfigured() ? 'налаштована' : 'вимкнена')}
        ${stat('Код', sync.syncCode() || '—')}
      </div>
    </div>

    <div class="section-h"><span class="section-h__title">Матеріал теми</span><span class="section-h__line"></span></div>
    <div class="card">
      <select id="dev-topic" style="width:100%;margin-bottom:12px">
        ${metas.map(m => `<option value="${m.id}" ${m.id === picked ? 'selected' : ''}>${m.title} — ${m.author}</option>`).join('')}
      </select>
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn--ghost" id="dev-theory">Теорія</button>
        <button class="btn btn--ghost" id="dev-quiz">Тест</button>
        <button class="btn btn--ghost" id="dev-reset">Скинути</button>
      </div>
      <div id="dev-content"></div>
    </div>

    <div class="section-h"><span class="section-h__title">Перевірки</span><span class="section-h__line"></span></div>
    <div class="card">
      <div class="row">
        <div><div class="row__label">Тестове сповіщення</div>
        <div class="row__hint">Прийде негайно — так вона побачить, який вигляд має нагадування</div></div>
        <button class="btn btn--ghost" id="dev-notify" style="width:auto;padding:9px 14px;font-size:14px">Надіслати</button>
      </div>
      <div class="row">
        <div><div class="row__label">Вікно «Що нового»</div>
        <div class="row__hint">Показати як є, не чекаючи оновлення</div></div>
        <button class="btn btn--ghost" id="dev-whatsnew" style="width:auto;padding:9px 14px;font-size:14px">Показати</button>
      </div>
      <div class="row">
        <div><div class="row__label">Накинути XP</div>
        <div class="row__hint">Щоб подивитись рівні й привілеї, не проходячи курс</div></div>
        <div style="display:flex;gap:6px">
          ${[150, 400, 800, 2500].map(v => `<button class="btn btn--ghost" data-xp="${v}"
            style="width:auto;padding:9px 11px;font-size:13px">+${v}</button>`).join('')}
        </div>
      </div>
      <div class="row">
        <div><div class="row__label">Показати знайомство</div>
        <div class="row__hint">Прогрес лишиться</div></div>
        <button class="btn btn--ghost" id="dev-tour" style="width:auto;padding:9px 14px;font-size:14px">Показати</button>
      </div>
    </div>

    <button class="btn btn--ghost" data-go="home">На головну</button>
  `;

  const contentBox = root.querySelector('#dev-content');
  const select = root.querySelector('#dev-topic');

  async function drawContent() {
    const topic = await loadTopic(select.value);
    contentBox.innerHTML = `
      <div class="dev__note">${topic.slides.length} слайдів · ${topic.questions.length} питань</div>
      ${topic.questions.map((q, n) => questionHtml(q, n)).join('')}`;
  }

  select.addEventListener('change', () => {
    store.set('dev_topic', select.value);
    drawContent();
  });

  root.querySelector('#dev-theory').addEventListener('click', () => go('topic/' + select.value));
  root.querySelector('#dev-quiz').addEventListener('click', () => go('quiz/' + select.value));

  root.querySelector('#dev-reset').addEventListener('click', () => {
    resetTopic(select.value);
    toast('Тему скинуто');
    refreshStats();
  });

  root.querySelector('#dev-notify').addEventListener('click', async () => {
    if (!('Notification' in window)) { toast('Браузер не вміє сповіщення', 3000); return; }
    if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') {
      toast('Дозвіл не надано', 3000);
      return;
    }
    const body = 'Так виглядатиме щоденне нагадування 🔥';
    const reg = await navigator.serviceWorker?.ready.catch(() => null);
    if (reg) await reg.showNotification('Час української літератури', { body, icon: 'assets/icon-192.png' });
    else new Notification('Час української літератури', { body });
    toast('Надіслано');
  });

  root.querySelector('#dev-whatsnew').addEventListener('click', () => {
    showWhatsNew({ reset: ['Приклад теми'], entries: CHANGELOG });
  });

  root.querySelector('#dev-tour').addEventListener('click', () => {
    store.set('onboarded', '0');
    location.reload();
  });

  root.addEventListener('click', e => {
    const xp = e.target.closest('[data-xp]');
    if (!xp) return;
    store.addXp(Number(xp.dataset.xp));
    refreshStats();
    toast(`+${xp.dataset.xp} XP · рівень ${store.levelInfo().number}`);
    setTimeout(() => renderDev(root), 400);
  });

  drawContent();
}

const stat = (label, value) => `
  <div class="dev__cell"><b>${value}</b><span>${label}</span></div>`;

function questionHtml(q, n) {
  const body = q.type === 'match'
    ? `<div class="dev__match">
         ${q.left.map((l, i) => `<div><b>${i + 1}.</b> ${escapeHtml(l)}
           <span class="dev__ok">→ ${LETTERS[q.answer[i]]} ${escapeHtml(q.right[q.answer[i]])}</span></div>`).join('')}
         <div class="dev__extra">зайвий: ${escapeHtml(q.right.filter((_, i) => !q.answer.includes(i))[0] ?? '—')}</div>
       </div>`
    : `<div class="dev__opts">
         ${q.options.map((o, i) => `<div class="${i === q.answer ? 'dev__ok' : ''}">
           ${LETTERS[i]}. ${escapeHtml(o)}</div>`).join('')}
       </div>`;

  return `
    <div class="dev__q">
      <div class="dev__qhead">${n + 1}. ${escapeHtml(q.prompt)}
        <span class="dev__id">${q.id}</span></div>
      ${body}
      <div class="dev__explain">${escapeHtml(q.explain ?? '—')}</div>
    </div>`;
}
