# Portfolio — Daniil Afonin

Портфолио по макету Paper «My folio» (артборд **main**, 1280×832).
Сверстана левая колонка **About** и бесконечная WebGL-галерея **Gallery** (пока с заглушками).

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # проверка типов
npm run build      # прод-сборка в dist/
```

Стек: Vite 5 + React 18 + TypeScript, CSS Modules, `ogl@1.0.11` (галерея), `@paper-design/shaders-react@0.0.82`
(та же версия, что в экспорте Paper, — градиент кнопки совпадает с макетом).

## Структура

```
public/
  logos/                 логотипы компаний (80×80, показываются 20×20)
  media/avatar-poster.jpg постер аватара (виден, пока нет видео)
  media/avatar.webm|mp4  ← сюда положить видео аватара
src/
  config/site.ts         профиль, локация, градиент, видео, погода, галерея
  data/works.ts          работы в галерее
  data/experience.ts     список опыта
  hooks/                 useZonedTime, useWeather, useTheme, useReducedMotion
  styles/                tokens.css (токены Paper + тёмная тема), fonts.css, global.css
  components/
    Page/                каркас: две колонки 320 + 600, gap 80
    About/               левая колонка, собирает блоки ниже
    AvatarVideo/         видео-аватар 158×158, radius 32
    Clock/               живые часы MSK + температура + небо по погоде (sky/)
    Intro/               имя и описание
    Experience/          список опыта
    ContactButton/       кнопка с MeshGradient
    OpenToWork/          бейдж с мигающим индикатором
    ThemeToggle/         переключатель темы
    Gallery/             бесконечная WebGL-галерея + HTML-список (см. ARCHITECTURE.md)
  assets/fonts/          Inter Variable, Geist Mono Light, Matrix Sans Print
docs/
  ARCHITECTURE.md        как устроено и где что менять
  DESIGN-SPEC.md         эталонные значения из макета
  QA-CHECKLIST.md        чек-лист самопроверки
  OPEN-QUESTIONS.md      открытые вопросы и допущения
  qa/layout-check.js     скрипт сверки размеров для консоли
```

## Частые правки

| Что | Где |
|---|---|
| Видео аватара | положить `avatar.webm` и/или `avatar.mp4` в `public/media/` |
| Текст, ссылка Contact, Open to work | `src/config/site.ts` → `profile` |
| Ссылки Mail/Telegram/X/LinkedIn, клавиша раскрытия | `src/config/site.ts` → `contacts`, `contactShortcut` |
| Компании и годы | `src/data/experience.ts` |
| Цвета/скорость градиента | `src/config/site.ts` → `contactGradient` |
| Цвета тем | `src/styles/tokens.css` |
| Город часов | `src/config/site.ts` → `location` |
| Работы в галерее | положить файл `Заказчик.Название шота.ext` (или `Название шота.ext`) в `public/works/`; порядок — `order` в `src/data/works.ts` |
| Скорость, параллакс, изгиб галереи | `src/config/site.ts` → `gallery` |

Режим отладки: `http://localhost:5173/?debug` обводит пунктиром контейнер галереи.
