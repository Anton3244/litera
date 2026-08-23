// Теорія: слайди з поясненням теми, гортаються кнопкою «Далі».

import * as store from '../store.js';
import { loadTopic } from '../../content/index.js';
import { go } from '../app.js';
import { vibrate } from '../util.js';
import { divider, dropCap } from './ornaments.js';

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
        ${i === 0 && topic.cover
      ? `<img class="slide__cover" src="${topic.cover}" alt="" decoding="async">` : ''}
        <div class="slide__kicker">${s.kicker} · ${i + 1} з ${topic.slides.length}</div>
        <h2 class="slide__title">${s.title}</h2>
        <div class="slide__body">${s.html}</div>
        ${(s.videos ?? (s.video ? [s.video] : [])).map(videoHtml).join('')}
        ${last ? divider(1) : ''}
      </article>`;

    decorateQuotes(host);

    bar.style.width = `${((i + 1) / topic.slides.length) * 100}%`;
    prevBtn.disabled = i === 0;
    nextBtn.textContent = last ? 'Перейти до тесту →' : 'Далі';

    store.saveTheoryProgress(topicId, i + 1, last);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Плитка з відео вантажить ютуб лише після натискання: сторінка лишається
  // легкою, а без інтернету просто показує заглушку замість програвача.
  host.addEventListener('click', e => {
    const plate = e.target.closest('[data-video]');
    if (!plate) return;
    const id = plate.dataset.video;
    plate.outerHTML = `<div class="video video--live">
      <iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0"
        title="Відео до теми" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen loading="lazy"></iframe>
    </div>`;
  });

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

/**
 * Перша літера першої цитати на слайді стає буквицею.
 *
 * Працюємо по DOM, а не по рядку: у цитаті трапляються <b> та <em>,
 * і різати розмітку регулярним виразом означало б рано чи пізно її зламати.
 * Чіпаємо лише той випадок, коли цитата починається звичайним текстом.
 */
function decorateQuotes(host) {
  const q = host.querySelector('.quote');
  if (!q || q.querySelector('.dropcap')) return;

  const node = q.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return;

  const text = node.nodeValue;
  const at = text.search(/\S/);
  if (at < 0) return;
  const ch = text[at];
  if (!/[А-ЯЄІЇҐа-яєіїґA-Za-z]/.test(ch)) return;

  node.nodeValue = text.slice(at + 1);
  const cap = document.createElement('span');
  cap.innerHTML = dropCap(ch);
  q.insertBefore(cap.firstElementChild, node);
  q.classList.add('quote--cap');
}

/**
 * @param {{id:string,title:string,author?:string,minutes?:number}} video
 */
function videoHtml(video) {
  const meta = [video.author, video.minutes ? `${video.minutes} хв` : null].filter(Boolean).join(' · ');
  return `
    <button class="video" data-video="${video.id}">
      <img class="video__thumb" src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt=""
           loading="lazy" onerror="this.remove()">
      <span class="video__veil"></span>
      <span class="video__play">▶</span>
      <span class="video__caption">
        <span class="video__title">${video.title}</span>
        ${meta ? `<span class="video__meta">${meta}</span>` : ''}
      </span>
    </button>`;
}
