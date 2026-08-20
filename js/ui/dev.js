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
import { DEV_PASS_HASH, SYNC_URL } from '../config.js';
import * as push from '../push.js';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Замок від випадкового заходу. Один раз ввів — далі пускає без питань. */
function lockScreen(root, onUnlocked) {
  root.innerHTML = `
    <div class="ob">
      <div class="ob__art">🔒</div>
      <h1 class="ob__title">Режим створювача</h1>
      <p class="ob__text">Тут інструменти для налагодження. Потрібен пароль.</p>
      <input class="ob__input" id="dev-pass" type="password" placeholder="Пароль" autocomplete="off">
      <button class="btn btn--primary" id="dev-enter">Увійти</button>
      <button class="btn btn--ghost" data-go="home">Назад</button>
      <div class="ob__text" id="dev-err" style="text-align:center;margin:10px 0 0;color:var(--err)"></div>
    </div>`;

  const input = root.querySelector('#dev-pass');
  input.focus();

  async function tryEnter() {
    if (await sha256(input.value) !== DEV_PASS_HASH) {
      root.querySelector('#dev-err').textContent = 'Не той пароль';
      input.value = '';
      return;
    }
    store.set('dev_unlocked', '1');
    onUnlocked();
  }

  root.querySelector('#dev-enter').addEventListener('click', tryEnter);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });
}

export async function renderDev(root) {
  if (store.get('dev_unlocked') !== '1') {
    lockScreen(root, () => renderDev(root));
    return;
  }

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

    <div class="section-h"><span class="section-h__title">Пристрої та повідомлення</span><span class="section-h__line"></span></div>
    <div class="card">
      <div class="row">
        <div style="flex:1">
          <div class="row__label">Адмінський токен</div>
          <div class="row__hint">Зберігається лише на цьому пристрої. У застосунок не потрапляє.</div>
        </div>
      </div>
      <input class="ob__input" id="adm-token" type="password" placeholder="токен воркера" autocomplete="off">
      <div class="btn-row">
        <button class="btn btn--ghost" id="adm-load">Показати коди</button>
        <button class="btn btn--ghost" id="adm-forget">Забути токен</button>
      </div>
      <div id="adm-list" class="dev__note" style="margin-top:12px">—</div>
      <div id="adm-self" class="dev__note" style="margin-top:10px">Перевіряю цей пристрій…</div>
    </div>

    <div class="card">
      <div class="row">
        <div style="flex:1">
          <div class="row__label">Надіслати повідомлення</div>
          <div class="row__hint">Прийде на її пристрій, навіть якщо застосунок закрито.
          Якщо підписки ще немає — полежить у черзі до наступного заходу.</div>
        </div>
      </div>
      <input class="ob__input" id="msg-code" placeholder="код одержувача" autocomplete="off">
      <input class="ob__input" id="msg-title" placeholder="Заголовок" value="Літера">
      <input class="ob__input" id="msg-body" placeholder="Текст повідомлення">
      <button class="btn btn--primary" id="msg-send">Надіслати</button>
      <div id="msg-out" class="dev__note" style="margin-top:10px"></div>
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

    <div class="btn-row">
      <button class="btn btn--ghost" data-go="home">На головну</button>
      <button class="btn btn--ghost" id="dev-lock">Замкнути</button>
    </div>
  `;

  /* ---- пристрої та повідомлення ---- */

  // Чи підписаний сам цей пристрій — найшвидший спосіб зрозуміти,
  // працює ланцюжок узагалі чи ні.
  (async () => {
    const box = root.querySelector('#adm-self');
    if (!box) return;
    if (!push.supported()) { box.textContent = 'Цей браузер не вміє push-сповіщення'; return; }
    const on = await push.isSubscribed();
    box.textContent = on
      ? 'Цей пристрій підписаний — повідомлення на його код дійдуть'
      : 'Цей пристрій не підписаний. Увімкни нагадування в налаштуваннях.';
  })();


  const tokenInput = root.querySelector('#adm-token');
  const admList = root.querySelector('#adm-list');
  tokenInput.value = store.get('admin_token') || '';

  const api = () => (store.get('sync_url') || SYNC_URL || '').replace(/\/+$/, '');

  async function adminFetch(path, init = {}) {
    const token = tokenInput.value.trim();
    if (!token) throw new Error('Спершу введи токен');
    store.set('admin_token', token);
    const res = await fetch(api() + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token, ...(init.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) throw new Error('Токен не підійшов');
    if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
    return data;
  }

  const when = iso => {
    if (!iso) return 'ніколи';
    const d = new Date(iso);
    if (Number.isNaN(+d)) return '—';
    const days = Math.floor((Date.now() - d) / 86400000);
    if (days === 0) return 'сьогодні';
    if (days === 1) return 'учора';
    return `${days} дн. тому`;
  };

  root.querySelector('#adm-load').addEventListener('click', async () => {
    admList.textContent = 'Читаю…';
    try {
      const { codes } = await adminFetch('/admin/codes');
      if (!codes.length) { admList.textContent = 'Жодного коду ще немає'; return; }
      admList.innerHTML = codes.map(c => `
        <div class="dev__q" style="cursor:pointer" data-code="${c.code}">
          <div class="dev__qhead">${escapeHtml(c.name || 'без імені')}
            <span class="dev__id">${c.code}</span></div>
          <div class="dev__explain">
            ${c.xp ?? 0} XP · ${c.answers ?? 0} відповідей ·
            остання ${when(c.lastAnswerAt)} ·
            пристроїв: ${c.devices} ${c.pending ? `· у черзі: ${c.pending}` : ''}
          </div>
        </div>`).join('');
      for (const el of admList.querySelectorAll('[data-code]')) {
        el.addEventListener('click', () => {
          root.querySelector('#msg-code').value = el.dataset.code;
          toast('Код підставлено');
        });
      }
    } catch (e) {
      admList.textContent = e.message;
    }
  });

  root.querySelector('#adm-forget').addEventListener('click', () => {
    store.set('admin_token', '');
    tokenInput.value = '';
    admList.textContent = '—';
    toast('Токен стерто');
  });

  const msgOut = root.querySelector('#msg-out');
  root.querySelector('#msg-send').addEventListener('click', async () => {
    const code = root.querySelector('#msg-code').value.trim();
    const title = root.querySelector('#msg-title').value.trim() || 'Літера';
    const body = root.querySelector('#msg-body').value.trim();
    if (!code || !body) { msgOut.textContent = 'Потрібні код і текст'; return; }
    msgOut.textContent = 'Надсилаю…';
    try {
      const r = await adminFetch('/admin/send', {
        method: 'POST',
        body: JSON.stringify({ code, title, body }),
      });
      msgOut.textContent = r.delivered
        ? `Доставлено на ${r.delivered} пристр.`
        : (r.note || 'Покладено в чергу');
      root.querySelector('#msg-body').value = '';
    } catch (e) {
      msgOut.textContent = e.message;
    }
  });

  root.querySelector('#dev-lock').addEventListener('click', () => {
    store.set('dev_unlocked', '0');
    toast('Замкнено');
    renderDev(root);
  });

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
