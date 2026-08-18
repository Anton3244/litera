// Екран прогресу: графік XP, точність, час, стан по темах.

import * as store from '../store.js';
import * as db from '../db.js';
import { allTopicMeta } from '../../content/index.js';
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

  const progress = store.allTopicProgress();
  const metas = allTopicMeta();
  const done = metas.filter(m => progress[m.id]?.completed_at).length;

  root.innerHTML = `
    <h1 class="page-title">Прогрес</h1>
    <p class="page-sub">Усе, що ти вже зробила — тут.</p>

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
        <div class="row__label">Тем пройдено</div>
        <div>${done} з ${metas.length}</div>
      </div>
      <div class="row">
        <div class="row__label">Чекає на повторення</div>
        <div>${store.dueCount()}</div>
      </div>
    </div>

    <div class="section-h"><span class="section-h__title">По темах</span><span class="section-h__line"></span></div>
    ${metas.map(m => topicRow(m, progress[m.id])).join('')}
  `;
}

function topicRow(meta, p) {
  const best = p?.best_score ? Math.round(p.best_score * 100) : 0;
  return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:13px 14px">
      ${meta.cover
      ? `<img src="${meta.cover}" alt="" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex:none">`
      : `<span class="topic__badge" style="width:44px;height:44px;font-size:17px;border-radius:12px">${meta.icon}</span>`}
      <div style="flex:1;min-width:0">
        <div class="row__label" style="font-size:14px">${meta.title}</div>
        <div class="topic__bar"><i style="width:${best}%"></i></div>
      </div>
      <div style="font-weight:800;color:${best >= 80 ? 'var(--ok)' : 'var(--text-dim)'}">${best}%</div>
    </div>`;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h} год ${m} хв` : `${m} хв`;
}
