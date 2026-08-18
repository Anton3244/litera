// Теорія: слайди з поясненням теми, гортаються кнопкою «Далі».

import * as store from '../store.js';
import { loadTopic } from '../../content/index.js';
import { go } from '../app.js';
import { vibrate } from '../util.js';

export async function renderLesson(root, [topicId]) {
  const topic = await loadTopic(topicId);
  const saved = store.topicProgress(topicId);
  let i = Math.min(saved.slides_seen > 0 ? saved.slides_seen - 1 : 0, topic.slides.length - 1);

  root.innerHTML = `
    <div class="progressbar"><i id="lesson-bar"></i></div>
    <div id="slide-host"></div>
    <div style="height:96px"></div>
    <div class="fb" style="background:var(--bg);border-color:var(--line)">
      <div class="fb__inner btn-row">
        <button class="btn btn--ghost" id="prev" style="max-width:110px">Назад</button>
        <button class="btn btn--primary" id="next"></button>
      </div>
    </div>`;

  const host = root.querySelector('#slide-host');
  const bar = root.querySelector('#lesson-bar');
  const nextBtn = root.querySelector('#next');
  const prevBtn = root.querySelector('#prev');

  function draw() {
    const s = topic.slides[i];
    const last = i === topic.slides.length - 1;

    host.innerHTML = `
      <article class="slide">
        <div class="slide__kicker">${s.kicker} · ${i + 1} з ${topic.slides.length}</div>
        <h2 class="slide__title">${s.title}</h2>
        <div class="slide__body">${s.html}</div>
      </article>`;

    bar.style.width = `${((i + 1) / topic.slides.length) * 100}%`;
    prevBtn.disabled = i === 0;
    nextBtn.textContent = last ? 'Перейти до тесту →' : 'Далі';

    store.saveTheoryProgress(topicId, i + 1, last);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextBtn.addEventListener('click', () => {
    if (i === topic.slides.length - 1) {
      vibrate(12);
      go('quiz/' + topicId);
      return;
    }
    i++;
    draw();
  });

  prevBtn.addEventListener('click', () => {
    if (i > 0) { i--; draw(); }
  });

  draw();
}
