// Локальна копія першоджерел — щоб перевіряти зміст, а не шукати тексти щоразу.
//
// Навіщо. Майже всі підтверджені помилки в матеріалі були одного роду:
// наш переказ розходився з текстом твору. «Краде ключі» замість «пан сам
// віддає», переставлені зозулі, «напередодні» замість «у сам день»,
// вигаданий рядок замість справжнього. Щоб таке ловити, треба мати текст
// поруч — а не просити перевіряльника щоразу шукати його в мережі, де він
// натрапляє то на переказ, то на чужу редакцію.
//
// Що качаємо. Ті самі посилання, які вже стоять у content/texts.js і вже
// перевірені на доступність. Копія лежить поза репозиторієм і нікуди не
// їде: це робочий матеріал для звіряння, а не частина застосунку.
//
//   node tools/corpus.mjs <тека>

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { TEXTS } = await import(pathToFileURL(join(ROOT, 'content/texts.js')).href);

const outDir = process.argv[2];
if (!outDir) {
  console.error('вкажи теку: node tools/corpus.mjs <тека>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

/**
 * Тягнемо через curl, а не через fetch.
 *
 * УкрЛіб віддає неповний ланцюжок сертифікатів: проміжний він не надсилає,
 * і Node відмовляється — «unable to verify the first certificate». Браузери
 * й curl дотягують його самі. Це та сама вада, яку check.mjs уже позначає
 * як tlsQuirks. Перевірку сертифіката при цьому не вимикаємо: curl її робить.
 */
function get(url) {
  return execFileSync('curl', ['-sSL', '--max-time', '30', url], {
    encoding: 'buffer', maxBuffer: 32 * 1024 * 1024,
  });
}

const NL = String.fromCharCode(10);

function tidy(text) {
  return text
    .split(NL)
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join(NL);
}

function strip(html) {
  return tidy(html
    // Коментарі йдуть першими: УкрЛіб ховає в них частину стилів, і без цього
    // CSS протікає в текст твору.
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, NL)
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, NL)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&[a-z]+;/gi, ' '));
}

/** УкрЛіб віддає cp1251 і ріже довгі твори на сторінки через &page=N. */
function fetchUkrlib(url) {
  const parts = [];
  for (let page = 1; page <= 40; page++) {
    const u = page === 1 ? url : `${url}&page=${page}`;
    const buf = get(u);
    if (!buf.length) break;
    const body = strip(new TextDecoder('windows-1251').decode(buf));
    // Кінець настає, коли сторінка повторює попередню або порожня:
    // сайт на неіснуючій сторінці віддає останню, а не 404.
    if (!body || parts.includes(body)) break;
    parts.push(body);
  }
  return parts.join(NL);
}

/**
 * Вікіджерела беремо через action=raw — це чистий вікітекст без меню,
 * бічних панелей і футера. Інакше у файл потрапляє навігація сайту, і вона
 * така довга, що перевірка «чи достатньо тексту» проходить, хоча самого
 * твору у файлі немає: саме так «Катерина» й «Заповіт» приїхали як меню.
 */
function fetchWikisource(url, depth = 0) {
  const title = decodeURIComponent(new URL(url).pathname.replace(/^\/wiki\//, ''));
  const raw = new TextDecoder('utf-8').decode(
    get('https://uk.wikisource.org/w/index.php?action=raw&title=' + encodeURIComponent(title)));
  // Перенаправлення: action=raw віддає «#REDIRECT [[куди]]» і більше нічого.
  const redirect = raw.match(/^#(?:REDIRECT|ПЕРЕНАПРАВЛЕННЯ)\s*\[\[([^\]]+)\]\]/i);
  if (redirect && depth < 3) {
    return fetchWikisource(`https://uk.wikisource.org/wiki/${encodeURIComponent(redirect[1])}`, depth + 1);
  }
  return tidy(raw
    .replace(/\{\{[^{}]*\}\}/g, ' ')                  // шаблони
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')      // [[ціль|текст]] → текст
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<ref[\s\S]*?<\/ref>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[*#:;=|!].*$/gm, ''));                 // списки, заголовки, таблиці
}

function fetchPlain(url) {
  return strip(new TextDecoder('utf-8').decode(get(url)));
}

// Перша спроба відрізняти покажчик від твору була за довжиною рядків:
// мовляв, у творі є довга суцільна мова. Вона забракувала чотири короткі
// вірші — у вірша рядки короткі за природою. Тому тут лишилась тільки
// перевірка на обсяг, а чи той це взагалі твір, з'ясовує tools/quotes.mjs:
// коли жоден рядок цитати не знайшовся, файл підозрілий, а коли частина —
// підозрілий уже наш переказ.

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { return fn(); } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

const index = [];
let ok = 0; let failed = 0;
const problems = [];

for (const [topicId, links] of Object.entries(TEXTS)) {
  for (const [i, link] of links.entries()) {
    const name = `${topicId}${links.length > 1 ? `-${i + 1}` : ''}.txt`;
    const path = join(outDir, name);
    if (existsSync(path) && readFileSync(path, 'utf8').length > 400) {
      index.push({ topicId, name, title: link.title, chars: readFileSync(path, 'utf8').length });
      ok++;
      continue;
    }
    try {
      const text = await withRetry(() => {
        if (link.url.includes('ukrlib.com.ua')) return fetchUkrlib(link.url);
        if (link.url.includes('wikisource.org')) return fetchWikisource(link.url);
        return fetchPlain(link.url);
      });
      await sleep(400);
      if (!text || text.length < 400) throw new Error(`замало тексту (${text ? text.length : 0})`);
      writeFileSync(path, `# ${link.title}${NL}# ${link.url}${NL}${NL}${text}`, 'utf8');
      index.push({ topicId, name, title: link.title, chars: text.length });
      ok++;
    } catch (err) {
      problems.push(`${topicId}: «${link.title}» — ${err.message}`);
      failed++;
    }
  }
}

writeFileSync(join(outDir, '_index.json'), JSON.stringify(index, null, 1), 'utf8');

if (problems.length) {
  console.log('не вдалося:');
  for (const p of problems) console.log(`  ${p}`);
  console.log('');
}
console.log(`завантажено ${ok}, не вдалося ${failed}`);
console.log(`тем із текстом: ${new Set(index.map(x => x.topicId)).size} із ${Object.keys(TEXTS).length}`);
