// Що робити, коли зміст теми змінився.
//
// Стара відповідь на переписане питання нічого не варта: вона нічого не
// доводить і тільки псує графік повторень. Тому чесніше скинути саме цю тему
// й попросити пройти її ще раз, ніж робити вигляд, що все гаразд.
//
// Теорію можна правити скільки завгодно — скидання спричиняють лише
// зміни в питаннях.

import * as db from './db.js';
import * as store from './store.js';
import { loadAllTopics } from '../content/index.js';
import { CHANGELOG, LATEST } from '../content/changelog.js';

/** Короткий відбиток питань теми: id, формулювання, варіанти, правильна відповідь. */
function fingerprint(topic) {
  const canon = topic.questions.map(q => [
    q.id,
    q.prompt,
    (q.options ?? []).join('|'),
    (q.left ?? []).join('|'),
    (q.right ?? []).join('|'),
    JSON.stringify(q.answer),
  ].join('~')).join('\n');

  let hash = 0x811c9dc5;                       // FNV-1a, 32 біти — достатньо
  for (let i = 0; i < canon.length; i++) {
    hash ^= canon.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Прибирає з бази все, що стосується теми: відповіді, повторення, прогрес. */
export function resetTopic(topicId) {
  db.tx(() => {
    db.run('DELETE FROM answers WHERE topic_id = ?', [topicId]);
    db.run('DELETE FROM srs WHERE topic_id = ?', [topicId]);
    db.run('DELETE FROM topic_progress WHERE topic_id = ?', [topicId]);
  });
}

/**
 * Звіряє відбитки тем із збереженими. Змінені теми скидає.
 * @returns {Promise<{reset: string[], entries: Array}>}
 */
export async function applyUpdates() {
  const topics = await loadAllTopics();
  const reset = [];
  const firstRun = !store.get('hash_seeded');

  for (const topic of topics) {
    const key = `hash:${topic.id}`;
    const now = fingerprint(topic);
    const was = store.get(key);

    if (was === now) continue;

    // Перший запуск після появи цієї перевірки — просто запам’ятовуємо,
    // нічого не скидаючи: питання ж не змінювались.
    if (was && !firstRun && store.topicStarted(topic.id)) {
      resetTopic(topic.id);
      reset.push(topic.title);
    }
    store.set(key, now);
  }
  store.set('hash_seeded', '1');

  // Новачкові нема чого показувати: для неї весь застосунок і так новий.
  if (firstRun) {
    markChangelogSeen();
    return { reset: [], entries: [] };
  }

  const seen = store.get('changelog_seen') ?? '';
  const entries = CHANGELOG.filter(c => c.date > seen);

  return { reset, entries };
}

export function markChangelogSeen() {
  store.set('changelog_seen', LATEST);
}
