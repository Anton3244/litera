// Головний екран. Головне правило: видно один наступний крок,
// а не двадцять дві теми одразу.

import * as store from '../store.js';
import { SECTIONS, loadAllTopics } from '../../content/index.js';
import { ringSvg, plural, clamp, WEEKDAYS } from '../util.js';
import { go } from '../app.js';
import { maybeShowHint } from './onboarding.js';
import { mascotHtml, moodForHome } from './mascot.js';

export async function renderHome(root) {
  const topics = await loadAllTopics();
  const plan = store.dailyPlan(topics);
  const byId = Object.fromEntries(plan.states.map(s => [s.topic.id, s]));

  const name = store.get('name');
  const goal = store.getNum('daily_goal_xp');
  const todayXp = store.dayStats().xp;
  const st = store.streak();
  const doneCount = plan.tasks.filter(t => t.done).length;

  const lvl = store.levelInfo();
  const fresh = store.popLevelUp();

  root.innerHTML = `
    <div class="hello">
      ${mascotHtml(moodForHome({
        allDone: plan.allDone,
        streak: st,
        studiedToday: todayXp > 0,
        maxLevel: lvl.index === 6,
      }), { size: 64 })}
      <div style="flex:1;min-width:0">
        <div class="hello__hi ${store.hasGoldFrame() ? 'is-gold' : ''}">${name ? `Привіт, ${name}` : 'Сьогодні'}</div>
        <div class="hello__sub">${todayXp} з ${goal} XP · 🔥 ${st} ${plural(st, 'день', 'дні', 'днів')}${store.freezeUsed() ? ' · ❄️' : ''}</div>
      </div>
      <div class="hello__ring">
        ${ringSvg(clamp(todayXp / goal, 0, 1), 46, 5)}
      </div>
    </div>

    ${fresh ? levelUpHtml(fresh, lvl) : ''}
    ${levelHtml(lvl)}
    ${plan.allDone ? enoughHtml() : stepHtml(plan, doneCount)}

    <div class="card plan">${plan.tasks.map(taskHtml).join('')}</div>

    <div class="card">
      <div class="row__label">Тиждень</div>
      <div class="week">${weekHtml()}</div>
    </div>

    ${upNextHtml(plan, byId)}

    <button class="btn btn--ghost" id="show-all">Усі теми (${topics.length})</button>
    <div id="all-topics" hidden>
      ${SECTIONS.map(s => sectionHtml(s, byId)).join('')}
    </div>
  `;

  root.addEventListener('click', e => {
    const topic = e.target.closest('[data-topic]');
    if (topic) { go('topic/' + topic.dataset.topic); return; }
    const nav = e.target.closest('[data-go]');
    if (nav) { go(nav.dataset.go); return; }
    if (e.target.closest('#show-all')) {
      const box = root.querySelector('#all-topics');
      box.hidden = !box.hidden;
      root.querySelector('#show-all').textContent =
        box.hidden ? `Усі теми (${topics.length})` : 'Згорнути';
    }
  });

  maybeShowHint();
}

function levelHtml(lvl) {
  return `
    <button class="lvl" data-go="stats">
      <span class="lvl__icon">${lvl.icon}</span>
      <span class="lvl__body">
        <span class="lvl__top">
          <b>Рівень ${lvl.number} · ${lvl.title}</b>
          <span>${lvl.next ? `до «${lvl.next.title}» ${lvl.toNext} XP` : 'максимум'}</span>
        </span>
        <span class="lvl__bar"><i style="width:${Math.round(lvl.progress * 100)}%"></i></span>
      </span>
    </button>`;
}

function levelUpHtml(fresh, lvl) {
  return `
    <div class="lvlup">
      <div class="lvlup__icon">${fresh.icon}</div>
      <div class="lvlup__title">Новий рівень: ${fresh.title}</div>
      ${fresh.perk ? `<div class="lvlup__perk">Відкрито: ${fresh.perk}</div>` : ''}
      <div class="lvlup__hint">Усі привілеї — у розділі «Прогрес»</div>
    </div>`;
}

/** Один наступний крок — найпомітніший елемент екрана. */
function stepHtml(plan, doneCount) {
  const task = plan.next;
  const total = plan.tasks.length;
  const verb = task.key === 'review' ? 'Повторити'
    : task.key === 'new' ? 'Почати тему'
      : 'Потренуватись';

  return `
    <div class="step">
      <div class="step__badge">Крок ${doneCount + 1} з ${total} на сьогодні</div>
      <div class="step__title">${task.title}</div>
      <div class="step__hint">${task.hint}</div>
      <button class="btn btn--primary" data-go="${task.go}">${verb}</button>
      <div class="step__why">${why(task.key)}</div>
    </div>`;
}

function why(key) {
  if (key === 'review') return 'Повторення йде першим: учорашнє забувається швидше, ніж засвоюється нове.';
  if (key === 'new') return 'Спершу теорія по слайдах, потім тест у форматі НМТ. Разом хвилин десять.';
  return 'Кілька питань зі змішаних тем — щоб добити денну ціль.';
}

function enoughHtml() {
  return `
    <div class="enough">
      ${mascotHtml('happy', { size: 84, motion: 'bob', className: 'mascot--pop' })}
      <div class="enough__title">На сьогодні досить</div>
      <div class="enough__text">
        Повторення зроблено, нову тему пройдено, ціль набрана.
        Далі вчити можна, але вже без потреби — пам’ять краще працює,
        коли між заходами є пауза.
      </div>
      <button class="btn btn--ghost" data-go="practice">Усе одно потренуватись</button>
    </div>`;
}

function taskHtml(task) {
  return `
    <button class="plan__row ${task.done ? 'is-done' : ''}" data-go="${task.go}">
      <span class="plan__check">${task.done ? '✓' : ''}</span>
      <span class="plan__body">
        <span class="plan__title">${task.title}</span>
        <span class="plan__hint">${task.hint}</span>
      </span>
      ${task.done ? '' : '<span class="topic__chev">›</span>'}
    </button>`;
}

/** Три найближчі теми — щоб було видно, куди рухаємось, без повного списку. */
function upNextHtml(plan, byId) {
  const queue = plan.states
    .filter(s => s.state !== 'solid')
    .slice(0, 3)
    .map(s => s.topic);
  if (!queue.length) return '';

  return `
    <div class="section-h">
      <span class="section-h__title">Далі за планом</span>
      <span class="section-h__line"></span>
    </div>
    ${queue.map(t => topicHtml(t, byId[t.id])).join('')}`;
}

function weekHtml() {
  return store.weekFlames().map((d, i) => `
    <div class="day ${d.lit ? 'is-lit' : ''} ${d.isToday ? 'is-today' : ''}">
      <div class="day__dot">${d.lit ? '🔥' : ''}</div>
      <div class="day__label">${WEEKDAYS[i]}</div>
    </div>`).join('');
}

function sectionHtml(section, byId) {
  const head = `
    <div class="section-h">
      <span class="section-h__title">${section.title}</span>
      <span class="section-h__line"></span>
    </div>`;
  if (!section.topics.length) return head + soonHtml(section);
  return head + section.topics.map(t => topicHtml(t, byId[t.id])).join('');
}

function soonHtml(section) {
  return `
    <div class="tile tile--soon">
      ${section.cover ? `<img class="tile__cover" src="${section.cover}" alt="" loading="lazy">` : ''}
      <div class="tile__veil"></div>
      <div class="tile__body">
        <div class="tile__title">${section.title}</div>
        <div class="tile__meta"><span>матеріали готуються</span></div>
      </div>
    </div>`;
}

function topicHtml(topic, s) {
  const label = store.STATE_LABELS[s?.state ?? 'new'];
  const pct = Math.round((s?.mastery ?? 0) * 100);

  return `
    <button class="tile ${s?.state === 'solid' ? 'is-done' : ''} ${topic.cover ? '' : 'tile--plain'}"
            data-topic="${topic.id}">
      ${topic.cover
      ? `<img class="tile__cover" src="${topic.cover}" alt="" loading="lazy">`
      : `<span class="tile__glyph">${topic.icon}</span>`}
      <span class="tile__veil"></span>
      <span class="tile__body">
        <span class="tile__title">${topic.title}</span>
        <span class="tile__meta">
          <span>${topic.author}</span>
          <span style="color:${label.color}">· ${label.text}</span>
          ${s?.due ? `<span style="color:var(--accent-2)">· ${s.due} на повтор</span>` : ''}
        </span>
      </span>
      ${s?.state === 'solid' ? '<span class="tile__done">✓</span>' : ''}
      <span class="tile__bar"><i style="width:${pct}%"></i></span>
    </button>`;
}
