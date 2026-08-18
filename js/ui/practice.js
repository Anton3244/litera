// Тренування: повторення за графіком, робота над помилками, змішаний тест.

import * as store from '../store.js';
import { loadAllTopics } from '../../content/index.js';
import { runQuiz } from './quiz-engine.js';
import { go, refreshStats } from '../app.js';
import { shuffle, plural, toast } from '../util.js';

const MODES = {
  due: {
    icon: '🎯',
    title: 'Повторення',
    hint: 'Питання, які час освіжити в пам’яті',
    pick: (pool) => {
      const ids = new Set(store.dueQuestionIds(20).map(r => r.question_id));
      return pool.filter(q => ids.has(q.id));
    },
  },
  weak: {
    icon: '🩹',
    title: 'Робота над помилками',
    hint: 'Те, у чому найчастіше помиляєшся',
    pick: (pool) => {
      const ids = new Set(store.weakQuestionIds(20).map(r => r.question_id));
      return pool.filter(q => ids.has(q.id));
    },
  },
  mix: {
    icon: '🎲',
    title: 'Змішаний тест',
    hint: '10 випадкових питань з усіх тем',
    pick: (pool) => shuffle(pool).slice(0, 10),
  },
  exam: {
    icon: '📝',
    title: 'Пробний НМТ',
    hint: 'Усі питання поспіль, без підказок про життя',
    pick: (pool) => shuffle(pool),
  },
};

export async function renderPractice(root) {
  const topics = await loadAllTopics();
  const pool = flatten(topics);
  const counts = Object.fromEntries(
    Object.entries(MODES).map(([key, m]) => [key, m.pick(pool).length])
  );

  root.innerHTML = `
    <h1 class="page-title">Тренування</h1>
    <p class="page-sub">Тут питання перемішані з усіх пройдених тем.</p>

    ${Object.entries(MODES).map(([key, m]) => `
      <button class="topic" data-mode="${key}" ${counts[key] === 0 ? 'disabled style="opacity:.4"' : ''}>
        <span class="topic__badge">${m.icon}</span>
        <span class="topic__body">
          <span class="topic__title">${m.title}</span>
          <span class="topic__meta">
            <span>${m.hint}</span>
            <span>· ${counts[key]} ${plural(counts[key], 'питання', 'питання', 'питань')}</span>
          </span>
        </span>
        <span class="topic__chev">›</span>
      </button>`).join('')}

    <div class="section-h"><span class="section-h__title">Досягнення</span><span class="section-h__line"></span></div>
    ${awardsHtml()}
  `;

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (btn && !btn.disabled) go('run/' + btn.dataset.mode);
  });
}

export async function renderPracticeRun(root, [modeKey]) {
  const mode = MODES[modeKey];
  if (!mode) { go('practice'); return; }

  const topics = await loadAllTopics();
  const questions = mode.pick(flatten(topics));

  if (!questions.length) {
    root.innerHTML = `<div class="empty">
      <img class="empty__art" src="assets/art/empty-practice.webp" alt="">
      Тут поки порожньо. Пройди кілька тем — і питання з’являться.
      <div style="margin-top:20px"><button class="btn btn--ghost" data-nav="home">До тем</button></div></div>`;
    return;
  }

  runQuiz(root, {
    questions,
    mode: 'practice',
    useHearts: false,
    onFinish: results => showResult(root, mode, results),
  });
}

function flatten(topics) {
  return topics.flatMap(t => t.questions.map(q => ({ ...q, topicId: t.id, topicTitle: t.title })));
}

function showResult(root, mode, results) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const fresh = store.checkAwards({});
  refreshStats();

  root.innerHTML = `
    <div class="result">
      <img class="result__art" src="assets/art/${pct >= 80 ? 'result-good' : pct >= 50 ? 'result-mid' : 'result-low'}.webp" alt="">
      <h1 class="result__title">${mode.title} — готово</h1>
      <p class="result__sub">${correct} з ${total} правильних</p>

      <div class="result__grid">
        <div class="result__cell"><b>${pct}%</b><span>результат</span></div>
        <div class="result__cell"><b>+${correct * store.XP_CORRECT}</b><span>XP</span></div>
        <div class="result__cell"><b>${store.dueCount()}</b><span>ще на повтор</span></div>
      </div>

      <div style="display:grid;gap:10px">
        <button class="btn btn--primary" data-nav="practice">До тренувань</button>
        <button class="btn btn--ghost" data-nav="home">На головну</button>
      </div>
    </div>`;

  if (fresh.length) toast(`${fresh[0].icon} ${fresh[0].title}!`, 3000);
}

function awardsHtml() {
  const earned = store.earnedAwards();
  return `<div class="card">${store.AWARDS.map(a => {
    const has = !!earned[a.code];
    return `<div class="row" style="gap:14px">
      <img class="award__img ${has ? '' : 'award__img--locked'}" src="${a.img}" alt="">
      <div style="flex:1">
        <div class="row__label" style="${has ? '' : 'color:var(--text-dim)'}">${a.title}</div>
        <div class="row__hint">${a.hint}</div>
      </div>
      <div style="color:${has ? 'var(--ok)' : 'var(--text-faint)'}">${has ? '✓' : '🔒'}</div>
    </div>`;
  }).join('')}</div>`;
}
