# Промты для генерации графики

Всё на английском — модели так работают заметно лучше. Комментарии на русском.

Куда класть готовое: `assets/art/`. Имена файлов указаны у каждого промта — если назвать
именно так, я подключу их к коду одним заходом.

---

## 0. Сначала — стилевое ядро

Все картинки должны выглядеть одним набором. Для этого в каждый промт вставляется один
и тот же блок стиля:

```
STYLE: flat vector illustration, cozy educational app art, warm amber and deep violet
palette — amber #ffb43d, ember orange #ff7a3d, violet #7c5cff, near-black plum #12101a,
mint #3ddc97 as rare accent; dark plum background, soft gradient shading, subtle grain
texture, clean simple geometric shapes, gentle rim light, generous negative space,
minimal detail, no outlines
```

**Порядок работы:**

1. Сгенерируй первым делом обложку «Слова о полку» (промт 1.1) и отбери один кадр,
   который нравится.
2. Дальше все остальные картинки делай **со ссылкой на него**, иначе набор развалится:
   - Midjourney: добавь `--sref <ссылка на выбранную картинку>`
   - ChatGPT / GPT-image: приложи её в чат и напиши «same style as this image»
   - Stable Diffusion: IP-Adapter или один и тот же seed + LoRA стиля

**Технические хвосты** (дописывать в конец):

| Инструмент | Хвост |
|---|---|
| Midjourney | `--style raw --v 7 --no text, letters, words, watermark, signature, frame, ui, buttons` |
| ChatGPT / GPT-image | «no text or letters anywhere in the image, transparent background» (умеет прозрачный фон) |
| Stable Diffusion | negative: `text, letters, watermark, signature, ui, frame, blurry, extra limbs, deformed hands, faces` |

**Три правила, иначе будет мусор:**

- **Никакого текста.** Кириллицу модели не умеют — получится «ЩЕВЧЕНКЪ». Все подписи
  рисует сам сайт поверх картинки.
- **Никаких лиц крупным планом.** Просить портрет Шевченко бесполезно — выйдет чужой
  человек. Люди только силуэтами, со спины или в тени.
- **Никаких мелких UI-иконок.** Иконки вкладок внизу генератором делать не надо, они
  должны быть чёткими в 20px — это работа для SVG.

---

## 1. Обложки тем

Формат **16:9**, генерировать 1024×576, класть в проект ужатыми до ~600px по ширине.
Композиция: главный объект в центре-справа, слева воздух — туда ляжет название.

### 1.1 «Слово о полку Ігоревім» → `cover-slovo-o-polku.webp`

```
A lone medieval Rus warrior's shield and three spears standing in an empty steppe at dusk,
solar eclipse — a black disc with a thin amber corona — low in the sky, long grass,
distant horizon, dramatic and quiet, no people. [STYLE] --ar 16:9
```

### 1.2 Шевченко, «Катерина» → `cover-shevchenko-kateryna.webp`

```
A lonely dirt road crossing an endless wheat field under a pale moon, a small dark
silhouette of a woman with a bundle walking away from the viewer, wind bending the wheat,
melancholic, cold blue night against warm amber wheat, no face visible. [STYLE] --ar 16:9
```

### 1.3 Теория литературы → `cover-rody-i-zhanry.webp`

```
Three abstract symbols floating above an open book: a scroll, a stylized lyre and a
theatre mask, arranged like constellations connected by thin glowing lines, geometric,
symbolic, no people. [STYLE] --ar 16:9
```

### 1.4 Устное народное творчество → `cover-folklore.webp`

```
A bandura leaning against a wooden bench beside a night campfire, sparks rising into the
dark, faint Ukrainian folk ornament pattern glowing in the smoke, warm and intimate,
no people. [STYLE] --ar 16:9
```

### 1.5 Литература ХХ века → `cover-xx.webp`

```
A typewriter on a desk in a dark room, a single sheet of paper caught mid-air, harsh
violet light through a barred window casting long shadows, tense and modernist,
constructivist geometry, no people. [STYLE] --ar 16:9
```

### 1.6 Современная литература → `cover-suchasna.webp`

```
An open book dissolving upward into flying birds and abstract geometric fragments,
bright optimistic amber light against deep violet, contemporary and airy,
no people. [STYLE] --ar 16:9
```

### Шаблон для новых тем

```
[ОДИН предмет или пейзаж, связанный с произведением] + [время суток и свет] +
[настроение одним словом] + no people, no text. [STYLE] --ar 16:9
```

Хорошо работает: предмет-символ вместо сюжета. «Разбитый глечик», «пустая колыбель»,
«сгоревшая хата», «вишнёвый сад ночью». Плохо: пересказ сцены с людьми.

---

## 2. Значки достижений

Формат **1:1**, 1024×1024, прозрачный фон, в проект — 256×256.
Все восемь должны быть одной формой — иначе не соберутся в ряд.

Общая рамка для всех восьми:

```
A single circular medal badge, thick amber rim, glossy enamel center, small violet ribbon
tail at the bottom, centered symmetrical object on transparent background, game
achievement icon, chunky and readable at small size, [СИМВОЛ]. [STYLE] --ar 1:1
```

Подставить вместо `[СИМВОЛ]`:

| Файл | `[СИМВОЛ]` | За что |
|---|---|---|
| `award-first-lesson.png` | `a small green sprout with two leaves in the center` | первый урок |
| `award-perfect.png` | `an archery target with an arrow in the bullseye` | тест без ошибок |
| `award-streak-3.png` | `a small stylized flame in the center` | 3 дня подряд |
| `award-streak-7.png` | `a lightning bolt in the center` | неделя подряд |
| `award-streak-30.png` | `a small crown in the center` | месяц подряд |
| `award-xp-500.png` | `a four-pointed star with a soft glow` | 500 XP |
| `award-xp-2000.png` | `a faceted violet gemstone in the center` | 2000 XP |
| `award-reviewer.png` | `a stylized brain made of simple geometric curves` | 100 повторений |

> Одним заходом дешевле: попроси «a sheet of 8 circular achievement badges in a 4×2 grid,
> identical rim and ribbon, different central symbols: sprout, target, flame, lightning,
> crown, star, gemstone, brain» — и потом нарежь. Так они точно будут одинаковой формы.

---

## 3. Экран результата

Формат **1:1**, 512×512, прозрачный фон. Показываются крупно после теста.

| Файл | Промт (+ `[STYLE] --ar 1:1`) |
|---|---|
| `result-perfect.png` | `A golden trophy cup with amber light rays bursting behind it, celebratory, transparent background` |
| `result-good.png` | `Amber and violet confetti and streamers exploding upward from a small burst, joyful, transparent background` |
| `result-mid.png` | `A young green sprout pushing up through cracked dry earth, hopeful, transparent background` |
| `result-low.png` | `A single small seed glowing softly in dark soil, patient and quiet, transparent background` |
| `result-hearts-out.png` | `A soft amber heart with a gentle crack across it, warm not sad, transparent background` |

---

## 4. Пустые состояния

Формат **4:3**, 800×600, прозрачный фон.

| Файл | Промт (+ `[STYLE] --ar 4:3`) |
|---|---|
| `empty-practice.png` | `An open empty notebook with a sprout growing from its pages, calm and inviting, transparent background` |
| `empty-error.png` | `A closed book with a small tangled knot of thread beside it, apologetic mood, transparent background` |

---

## 5. Иконка приложения

Формат **1:1**, 1024×1024. Пойдёт на домашний экран телефона.

```
App icon: a single burning candle whose flame is shaped like an open book, amber flame on
deep plum background, rounded square icon, bold and readable at 48 pixels, flat vector,
centered, no text. [STYLE] --ar 1:1
```

Альтернатива, если свеча не понравится:

```
App icon: a stylized quill pen made of a single amber flame stroke, deep plum rounded
square background, minimal, bold silhouette, readable at 48 pixels, no text.
[STYLE] --ar 1:1
```

Букву «Л» просить не надо — модель нарисует что-то похожее на « Π». Если нужна буква,
её накладываю я поверх готового фона.

---

## 6. Картинка для превью ссылки (og:image)

Формат **1.91:1**, 1200×630. Это то, что увидит подруга, когда ты кинешь ей ссылку
в мессенджер.

```
A wide banner: an open book lying on a dark surface, a warm amber flame floating above
its pages, soft violet glow around, calm and inviting, lots of empty space on the left
half for a title. [STYLE] --ar 1.91:1
```

---

## Что делать с готовыми файлами

1. Положи в `assets/art/` с именами из таблиц выше.
2. Прогони через сжатие в webp — иначе телефон будет грузить это по мобильному интернету
   (`cwebp -q 82`, или любой онлайн-конвертер).
3. Скажи мне — я подключу их к коду: обложки в карточки тем, значки в достижения,
   иллюстрации на экран результата, и добавлю в кеш service worker'а для офлайна.

Прозрачность держат PNG и WebP. JPEG — нет, для значков не годится.
