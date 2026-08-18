// Тест по темі: питання у форматі НМТ + екран результату.

import * as store from '../store.js';
import * as db from '../db.js';
import { loadTopic } from '../../content/index.js';
import { runQuiz } from './quiz-engine.js';
import { go, refreshStats } from '../app.js';
import { shuffle, toast } from '../util.js';

export async function renderQuiz(root, [topicId]) {
  const topic = await loadTopic(topicId);
  const questions = shuffle(topic.questions)
    .map(q => ({ ...q, topicId, topicTitle: topic.title, topicAuthor: topic.author }));

  runQuiz(root, {
    questions,
    mode: 'lesson',
    useHearts: store.getBool('hearts_on'),
    onFinish: (results, ranOut) => showResult(root, topic, results, ranOut),
  });
}

function showResult(root, topic, results, ranOut) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const score = total ? correct / total : 0;
  const perfect = total > 0 && correct === total && !ranOut;

  let bonus = 0;
  if (!ranOut) {
    store.saveQuizResult(topic.id, score);
    if (score >= 0.8) bonus += store.XP_LESSON_DONE;
    if (perfect) bonus += store.XP_PERFECT;
    store.addXp(bonus);
  }

  const fresh = store.checkAwards({ perfect });
  refreshStats();
  db.dailyBackup();   // тепер у базі точно є що берегти

  const ART = 'assets/art/';
  const mood = ranOut ? { art: 'result-hearts-out', title: 'Життя скінчились' }
    : perfect ? { art: 'result-good', title: 'Ідеально!' }
      : score >= 0.8 ? { art: 'result-mid', title: 'Тема пройдена!' }
        : score >= 0.5 ? { art: 'result-mid', title: 'Уже краще' }
          : { art: 'result-low', title: 'Ще трохи попрацюємо' };

  root.innerHTML = `
    <div class="result">
      <img class="result__art" src="${ART}${mood.art}.webp" alt="">
      <h1 class="result__title">${mood.title}</h1>
      <p class="result__sub">${topic.title}</p>

      <div class="result__grid">
        <div class="result__cell"><b>${correct}/${total}</b><span>правильних</span></div>
        <div class="result__cell"><b>${Math.round(score * 100)}%</b><span>результат</span></div>
        <div class="result__cell"><b>+${correct * store.XP_CORRECT + bonus}</b><span>XP</span></div>
      </div>

      ${fresh.length ? `<div class="card" style="text-align:left">
        <div class="row__label" style="margin-bottom:8px">Нові досягнення</div>
        ${fresh.map(a => `<div class="row" style="gap:14px">
          <img class="award__img" src="${a.img}" alt="">
          <div style="flex:1"><div class="row__label">${a.title}</div>
          <div class="row__hint">${a.hint}</div></div></div>`).join('')}
      </div>` : ''}

      ${score < 0.8 && !ranOut ? `<p class="page-sub">Щоб тема зарахувалась, треба ${'≥'} 80%.</p>` : ''}

      <div style="display:grid;gap:10px;margin-top:8px">
        <button class="btn btn--primary" data-again>Пройти ще раз</button>
        <button class="btn btn--ghost" data-theory>Повернутись до теорії</button>
        <button class="btn btn--ghost" data-nav="home">На головну</button>
      </div>
    </div>`;

  if (fresh.length) toast(`${fresh[0].icon} ${fresh[0].title}!`, 3000);

  root.querySelector('[data-again]').addEventListener('click', () => renderQuiz(root, [topic.id]));
  root.querySelector('[data-theory]').addEventListener('click', () => go('topic/' + topic.id));
}
