// Екран прогресу: графік XP, точність, час, стан по темах.

import * as store from '../store.js';
import { levelBadge, perkIcon } from './badges.js';
import * as db from '../db.js';
import { loadAllTopics } from '../../content/index.js';
import { plural, WEEKDAYS } from '../util.js';

export async function renderStats(root) {
  const days = store.lastDays(14);
  const maxXp = Math.max(50, ...days.map(d => d.xp));
  const st = store.streak();

  const totals = db.one(`
    SELECT COUNT(*) AS answered,
           COALESCE(SUM(correct),0) AS correct
    FROM answers`) ?? { answered: 0, correct: 0 };
  const seconds = db.value('SELECT COALESCE(SUM(seconds),0) FROM days', [], 0);
  const accuracy = totals.answered ? Math.round((totals.correct / totals.answered) * 100) : 0;

  const topics = await loadAllTopics();
  const states = topics.map(t => ({ topic: t, ...store.topicState(t.id, t.questions.map(q => q.id)) }));
  const solid = states.filter(s => s.state === 'solid').length;

  root.innerHTML = `
    <h1 class="page-title">Прогрес</h1>
    <p class="page-sub">Усе, що ти вже зробила — тут.</p>

    ${levelsHtml()}

    <div class="result__grid" style="margin-bottom:16px">
      <div class="result__cell"><b style="color:var(--accent)">${st}</b><span>${plural(st, 'день', 'дні', 'днів')} поспіль</span></div>
      <div class="result__cell"><b>${store.totalXp()}</b><span>усього XP</span></div>
      <div class="result__cell"><b>${accuracy}%</b><span>точність</span></div>
    </div>

    <div class="card">
      <div class="row__label">XP за останні 2 тижні</div>
      <div class="bars">
        ${days.map(d => `
          <div class="bars__col" title="${d.day}: ${d.xp} XP">
            <div class="bars__bar" style="height:${Math.round((d.xp / maxXp) * 100)}%"></div>
            <div class="bars__lab">${WEEKDAYS[(new Date(d.day + 'T12:00:00').getDay() + 6) % 7]}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="row">
        <div class="row__label">Відповідей загалом</div>
        <div>${totals.answered}</div>
      </div>
      <div class="row">
        <div class="row__label">Правильних</div>
        <div>${totals.correct}</div>
      </div>
      <div class="row">
        <div class="row__label">Час за навчанням</div>
        <div>${formatTime(seconds)}</div>
      </div>
      <div class="row">
        <div class="row__label">Вивчено назубок</div>
        <div>${solid} з ${topics.length}</div>
      </div>
      <div class="row">
        <div class="row__label">Чекає на повторення</div>
        <div>${store.dueCount()}</div>
      </div>
    </div>

    <div class="section-h"><span class="section-h__title">Що вже вивчено</span><span class="section-h__line"></span></div>
    <p class="page-sub" style="margin-top:-4px">
      Смужка показує не результат тесту, а <b>міцність пам’яті</b>: вона росте,
      коли ти згадуєш матеріал через дедалі більші проміжки часу.
    </p>
    ${states.map(topicRow).join('')}
  `;
}

/** Драбинка рівнів: що вже відкрито і що дає наступний. */
function levelsHtml() {
  const lvl = store.levelInfo();
  return `
    <div class="card">
      <div class="lvl__head">
        ${levelBadge(lvl.index, { size: 52 })}
        <span class="row__label">Рівень ${lvl.number} — ${lvl.title}</span>
      </div>
      <div class="row__hint" style="margin-bottom:10px">
        ${lvl.next ? `${lvl.xp} XP · до «${lvl.next.title}» лишилось ${lvl.toNext}` : `${lvl.xp} XP · вище нікуди`}
      </div>
      <div class="lvl__bar" style="margin-bottom:14px"><i style="width:${Math.round(lvl.progress * 100)}%"></i></div>
      ${store.LEVELS.map((l, i) => {
    const open = i <= lvl.index;
    if (!l.perk) return '';
    return `<div class="perk ${open ? 'is-open' : ''}">
          <span class="perk__icon">${perkIcon(i, { locked: !open })}</span>
          <span class="perk__body">
            <span class="perk__title">${l.perk}</span>
            <span class="perk__hint">Рівень ${i + 1} · ${l.title} · ${l.xp} XP</span>
          </span>
        </div>`;
  }).join('')}
    </div>`;
}

function topicRow(s) {
  const meta = s.topic;
  const label = store.STATE_LABELS[s.state];
  const pct = Math.round(s.mastery * 100);
  return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:13px 14px">
      ${meta.cover
      ? `<img src="${meta.cover.replace('assets/art/', 'assets/art/thumb/')}" alt="" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex:none">`
      : `<span class="topic__badge" style="width:44px;height:44px;font-size:17px;border-radius:12px">${meta.icon}</span>`}
      <div style="flex:1;min-width:0">
        <div class="row__label" style="font-size:14px">${meta.title}</div>
        <div style="font-size:12px;color:${label.color};margin:2px 0 4px">${label.text}${s.due ? ` · ${s.due} на повтор` : ''}</div>
        <div class="topic__bar"><i style="width:${pct}%;background:${label.color}"></i></div>
      </div>
      <div style="font-weight:800;color:${label.color};font-size:14px">${pct}%</div>
    </div>`;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h} год ${m} хв` : `${m} хв`;
}
