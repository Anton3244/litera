// Головний екран: план на сьогодні, вогники за тиждень, теми зі станом пам’яті.

import * as store from '../store.js';
import { SECTIONS, loadAllTopics } from '../../content/index.js';
import { ringSvg, plural, clamp, WEEKDAYS } from '../util.js';
import { go } from '../app.js';

export async function renderHome(root) {
  const topics = await loadAllTopics();
  const plan = store.dailyPlan(topics);
  const byId = Object.fromEntries(plan.states.map(s => [s.topic.id, s]));

  const name = store.get('name');
  const goal = store.getNum('daily_goal_xp');
  const todayXp = store.dayStats().xp;
  const pct = clamp(todayXp / goal, 0, 1);
  const st = store.streak();

  root.innerHTML = `
    <h1 class="page-title">${name ? `Привіт, ${name}!` : 'Сьогодні'}</h1>
    <p class="page-sub">${greeting(plan, st)}</p>

    <div class="goal">
      <div class="goal__ring">
        ${ringSvg(pct)}
        <div class="goal__ring-num">${Math.round(pct * 100)}%</div>
      </div>
      <div>
        <div class="goal__title">${plan.allDone ? 'План на сьогодні виконано' : 'План на сьогодні'}</div>
        <div class="goal__sub">${todayXp} з ${goal} XP · 🔥 ${st} ${plural(st, 'день', 'дні', 'днів')}</div>
      </div>
    </div>

    ${plan.allDone ? enoughHtml() : ''}

    <div class="card plan">
      ${plan.tasks.map(taskHtml).join('')}
    </div>

    ${plan.next ? `<button class="btn btn--primary" data-go="${plan.next.go}" style="margin-bottom:22px">
      ${plan.next.key === 'review' ? 'Повторити' : plan.next.key === 'new' ? 'Почати тему' : 'Дотягнути ціль'}
    </button>` : ''}

    <div class="card">
      <div class="row__label">Тиждень</div>
      <div class="week">${weekHtml()}</div>
    </div>

    ${SECTIONS.map(s => sectionHtml(s, byId)).join('')}

    <p class="page-sub" style="margin-top:26px;text-align:center">
      Тем у програмі більше — вони додаються поступово.
    </p>
  `;

  root.addEventListener('click', e => {
    const topic = e.target.closest('[data-topic]');
    if (topic) { go('topic/' + topic.dataset.topic); return; }
    const nav = e.target.closest('[data-go]');
    if (nav) go(nav.dataset.go);
  });
}

function greeting(plan, streak) {
  if (plan.allDone) return 'Усе заплановане зроблено.';
  if (plan.next?.key === 'review') return 'Почнімо з повторення — щоб учорашнє не вивітрилось.';
  if (streak > 0) return 'Один урок — і вогник горить далі.';
  return 'Почнімо з чогось невеликого.';
}

/** Головне, про що просили: чесно сказати, що на сьогодні досить. */
function enoughHtml() {
  return `
    <div class="enough">
      <div class="enough__title">💛 На сьогодні досить</div>
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
