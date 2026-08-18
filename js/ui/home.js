// Головний екран: денна ціль, вогники за тиждень, список тем.

import * as store from '../store.js';
import { SECTIONS } from '../../content/index.js';
import { ringSvg, plural, clamp, WEEKDAYS } from '../util.js';
import { go } from '../app.js';

export async function renderHome(root) {
  const name = store.get('name');
  const goal = store.getNum('daily_goal_xp');
  const todayXp = store.dayStats().xp;
  const pct = clamp(todayXp / goal, 0, 1);
  const st = store.streak();
  const due = store.dueCount();
  const progress = store.allTopicProgress();

  root.innerHTML = `
    <h1 class="page-title">${name ? `Привіт, ${name}!` : 'Привіт!'}</h1>
    <p class="page-sub">${greeting(st, todayXp, goal)}</p>

    <div class="goal">
      <div class="goal__ring">
        ${ringSvg(pct)}
        <div class="goal__ring-num">${Math.round(pct * 100)}%</div>
      </div>
      <div>
        <div class="goal__title">Ціль на сьогодні — ${goal} XP</div>
        <div class="goal__sub">${todayXp} з ${goal} · залишилось ${Math.max(0, goal - todayXp)}</div>
      </div>
    </div>

    <div class="card">
      <div class="row" style="padding-top:0;border-bottom:0">
        <div>
          <div class="row__label">🔥 ${st} ${plural(st, 'день', 'дні', 'днів')} поспіль</div>
          <div class="row__hint">${st === 0 ? 'Почни серію сьогодні' : 'Не загаси вогник!'}</div>
        </div>
      </div>
      <div class="week">${weekHtml()}</div>
    </div>

    ${due > 0 ? `
      <button class="topic" data-go="practice" style="border-color:rgba(124,92,255,.45)">
        <span class="topic__badge" style="background:linear-gradient(145deg,#7c5cff,#5a3fd6)">🎯</span>
        <span class="topic__body">
          <span class="topic__title">Час повторити</span>
          <span class="topic__meta">${due} ${plural(due, 'питання', 'питання', 'питань')} чекає на тебе</span>
        </span>
        <span class="topic__chev">›</span>
      </button>` : ''}

    ${SECTIONS.map(s => sectionHtml(s, progress)).join('')}

    <p class="page-sub" style="margin-top:26px;text-align:center">
      Це поки що основа. Теми додаються файлами в <code>content/topics/</code>.
    </p>
  `;

  root.addEventListener('click', e => {
    const topic = e.target.closest('[data-topic]');
    if (topic) { go('topic/' + topic.dataset.topic); return; }
    const nav = e.target.closest('[data-go]');
    if (nav) go(nav.dataset.go);
  });
}

function greeting(streak, xp, goal) {
  if (xp >= goal) return 'Ціль на сьогодні виконана. Можна ще — але вже без тиску 💛';
  if (streak > 0) return 'Один урок — і вогник горить далі.';
  return 'Почнімо з чогось невеликого.';
}

function weekHtml() {
  return store.weekFlames().map((d, i) => `
    <div class="day ${d.lit ? 'is-lit' : ''} ${d.isToday ? 'is-today' : ''}">
      <div class="day__dot">${d.lit ? '🔥' : ''}</div>
      <div class="day__label">${WEEKDAYS[i]}</div>
    </div>`).join('');
}

function sectionHtml(section, progress) {
  const head = `
    <div class="section-h">
      <span class="section-h__title">${section.title}</span>
      <span class="section-h__line"></span>
    </div>`;

  if (!section.topics.length) return head + soonHtml(section);
  return head + section.topics.map(t => topicHtml(t, progress[t.id])).join('');
}

/** Розділ, який ще не наповнили: показуємо обкладинку приглушено. */
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

function topicHtml(topic, p) {
  const theory = p?.theory_done ? 0.5 : 0;
  const quiz = (p?.best_score ?? 0) * 0.5;
  const pct = Math.round((theory + quiz) * 100);
  const done = !!p?.completed_at;

  const meta = [topic.author];
  meta.push(p?.best_score ? `найкраще ${Math.round(p.best_score * 100)}%` : `${topic.minutes} хв`);

  return `
    <button class="tile ${done ? 'is-done' : ''} ${topic.cover ? '' : 'tile--plain'}" data-topic="${topic.id}">
      ${topic.cover
      ? `<img class="tile__cover" src="${topic.cover}" alt="" loading="lazy">`
      : `<span class="tile__glyph">${topic.icon}</span>`}
      <span class="tile__veil"></span>
      <span class="tile__body">
        <span class="tile__title">${topic.title}</span>
        <span class="tile__meta">${meta.map(m => `<span>${m}</span>`).join('')}</span>
      </span>
      ${done ? '<span class="tile__done">✓</span>' : ''}
      <span class="tile__bar"><i style="width:${pct}%"></i></span>
    </button>`;
}
