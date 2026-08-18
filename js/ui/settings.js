// Налаштування: ім’я, денна ціль, життя, нагадування, резервна копія.

import * as store from '../store.js';
import * as db from '../db.js';
import { enableReminders, disableReminders, syncMirror } from '../notify.js';
import { toast, dayKey } from '../util.js';
import { refreshStats, applyAccent } from '../app.js';

const ACCENTS = [
  { name: 'Бурштин', value: '#ffb43d' },
  { name: 'Фіалка', value: '#a78bfa' },
  { name: 'М’ята', value: '#3ddc97' },
  { name: 'Захід', value: '#ff7a6b' },
];

export async function renderSettings(root) {
  root.innerHTML = `
    <h1 class="page-title">Налаштування</h1>
    <p class="page-sub">Усе зберігається на цьому пристрої.</p>

    <div class="card">
      <div class="row">
        <div><div class="row__label">Ім’я</div><div class="row__hint">Як до тебе звертатись</div></div>
        <input id="s-name" type="text" value="${escapeAttr(store.get('name'))}" placeholder="—"
          style="width:130px;background:var(--bg-elev-2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:9px 11px;font:inherit;font-size:14px">
      </div>
      <div class="row">
        <div><div class="row__label">Ціль на день</div><div class="row__hint">Скільки XP набирати щодня</div></div>
        <select id="s-goal">
          ${[20, 30, 50, 80, 120].map(v => `<option value="${v}" ${store.getNum('daily_goal_xp') === v ? 'selected' : ''}>${v} XP</option>`).join('')}
        </select>
      </div>
      <div class="row">
        <div><div class="row__label">Життя в тестах</div>
        <div class="row__hint">${store.heartsPerRun()} помилок — і тест починається спочатку</div></div>
        <button class="switch ${store.getBool('hearts_on') ? 'is-on' : ''}" id="s-hearts" aria-label="Життя"></button>
      </div>
      <div class="row">
        <div>
          <div class="row__label">Колір застосунку</div>
          <div class="row__hint">${store.canPickAccent()
      ? 'Привілей рівня «Літератор»'
      : `Відкриється на рівні «Літератор» — ${store.LEVELS[3].xp} XP`}</div>
        </div>
        <div class="accents ${store.canPickAccent() ? '' : 'is-locked'}">
          ${ACCENTS.map(a => `<button class="accent ${store.get('accent') === a.value ? 'is-on' : ''}"
            style="background:${a.value}" data-accent="${a.value}" title="${a.name}"></button>`).join('')}
        </div>
      </div>
    </div>

    <div class="section-h"><span class="section-h__title">Нагадування</span><span class="section-h__line"></span></div>
    <div class="card">
      <div class="row">
        <div><div class="row__label">Нагадувати щодня</div><div class="row__hint" id="s-perm-hint"></div></div>
        <button class="switch ${store.getBool('reminders_on') ? 'is-on' : ''}" id="s-rem" aria-label="Нагадування"></button>
      </div>
      <div class="row">
        <div><div class="row__label">Час</div><div class="row__hint">Коли надсилати нагадування</div></div>
        <input id="s-time" type="time" value="${store.get('reminder_time')}">
      </div>
    </div>
    <p class="page-sub" style="margin-top:-6px">
      Щоб нагадування приходили надійно, додай сайт на головний екран телефона
      («Поділитися» → «На початковий екран»).
    </p>

    <div class="section-h"><span class="section-h__title">Дані</span><span class="section-h__line"></span></div>
    <div class="card">
      <div class="row">
        <div><div class="row__label">Показати знайомство ще раз</div>
        <div class="row__hint">Прогрес залишиться на місці</div></div>
        <button class="btn btn--ghost" id="s-tour" style="width:auto;padding:9px 14px;font-size:14px">Показати</button>
      </div>
      <div class="row">
        <div><div class="row__label">Резервна копія</div><div class="row__hint">Файл .sqlite з усім прогресом</div></div>
        <button class="btn btn--ghost" id="s-export" style="width:auto;padding:9px 14px;font-size:14px">Зберегти</button>
      </div>
      <div class="row">
        <div><div class="row__label">Відновити з файлу</div><div class="row__hint">Замінить поточний прогрес</div></div>
        <button class="btn btn--ghost" id="s-import" style="width:auto;padding:9px 14px;font-size:14px">Обрати</button>
      </div>
      <div class="row">
        <div><div class="row__label" style="color:var(--err)">Стерти весь прогрес</div><div class="row__hint">Скасувати буде неможливо</div></div>
        <button class="btn btn--ghost" id="s-wipe" style="width:auto;padding:9px 14px;font-size:14px;color:var(--err)">Стерти</button>
      </div>
    </div>
    <input type="file" id="s-file" accept=".sqlite,.db,application/octet-stream" hidden>
  `;

  const permHint = root.querySelector('#s-perm-hint');
  permHint.textContent = !('Notification' in window)
    ? 'Браузер не підтримує сповіщення'
    : Notification.permission === 'denied'
      ? 'Сповіщення заблоковані в налаштуваннях браузера'
      : 'Нагадає, якщо за день не було занять';

  root.querySelector('#s-name').addEventListener('change', e => {
    store.set('name', e.target.value.trim().slice(0, 24));
    syncMirror();
    toast('Збережено');
  });

  root.querySelector('#s-goal').addEventListener('change', e => {
    store.set('daily_goal_xp', e.target.value);
    refreshStats();
    toast('Ціль оновлено');
  });

  root.querySelector('#s-hearts').addEventListener('click', e => {
    const on = !store.getBool('hearts_on');
    store.set('hearts_on', on ? '1' : '0');
    e.currentTarget.classList.toggle('is-on', on);
  });

  root.querySelector('#s-rem').addEventListener('click', async e => {
    const btn = e.currentTarget;
    if (store.getBool('reminders_on')) {
      disableReminders();
      btn.classList.remove('is-on');
      return;
    }
    const res = await enableReminders(root.querySelector('#s-time').value);
    btn.classList.toggle('is-on', res.ok);
    if (!res.ok) toast(res.reason, 3200);
    else toast('Нагадування увімкнено');
  });

  root.querySelector('#s-time').addEventListener('change', e => {
    store.set('reminder_time', e.target.value);
    syncMirror();
    toast('Час оновлено');
  });

  root.querySelector('.accents').addEventListener('click', e => {
    const btn = e.target.closest('[data-accent]');
    if (!btn) return;
    if (!store.canPickAccent()) {
      toast(`Відкриється на рівні «Літератор» — ${store.LEVELS[3].xp} XP`, 3000);
      return;
    }
    store.set('accent', btn.dataset.accent);
    applyAccent();
    for (const b of root.querySelectorAll('[data-accent]')) b.classList.toggle('is-on', b === btn);
  });

  root.querySelector('#s-tour').addEventListener('click', () => {
    store.set('onboarded', '0');
    location.hash = '#/home';
    location.reload();
  });

  root.querySelector('#s-export').addEventListener('click', () => {
    db.flush();
    const blob = new Blob([db.exportBytes()], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `litera-${dayKey()}.sqlite`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  const fileInput = root.querySelector('#s-file');
  root.querySelector('#s-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Замінити поточний прогрес даними з файлу?')) return;
    try {
      await db.importBytes(await file.arrayBuffer());
      location.reload();
    } catch (err) {
      toast('Не вдалося прочитати файл', 3000);
      console.error(err);
    }
  });

  root.querySelector('#s-wipe').addEventListener('click', async () => {
    if (!confirm('Стерти весь прогрес: XP, вогник, історію відповідей?')) return;
    await db.wipe();
    location.reload();
  });
}

function escapeAttr(s) {
  return String(s ?? '').replace(/"/g, '&quot;');
}
