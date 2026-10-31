// Страница показывается целиком, а не по кусочкам: компоненты сообщают, чего ждать (waitFor),
// а reveal() убирает прелоудер из index.html, когда всё готово.

import { LOW_DPI } from './pixels';

// Скелетон держится хотя бы столько от начала загрузки, чтобы не мигнуть на быстром кэше
const MIN_MS = 500;
// И не дольше: на медленной сети показываем то, что успело загрузиться
const MAX_MS = 3000;

// Текст, имя и роль, цифры часов, подписи часов
const FONTS = [
  '400 15px "Inter Display"',
  '500 15px "Inter Display"',
  '300 40px "JetBrains Mono"',
  window.matchMedia(LOW_DPI).matches ? '400 10px "Matrix Sans Print 1x"' : '400 11px "Matrix Sans Print"',
];

// WebGL-галерея открывается отдельно от страницы: её скелетон ждёт первый кадр первого видео,
// но не дольше этого от начала загрузки — потом лента показывается с постером
const GALLERY_MAX_MS = 6000;

const pending: Promise<unknown>[] = [];
let gallery: Promise<unknown> | null = null;
let started = false;

export function waitFor(promise: Promise<unknown>) {
  // Ошибка загрузки не держит прелоудер: на месте файла останется плашка
  pending.push(promise.catch(() => {}));
}

// Чего ждёт скелетон галереи. Если никто не позвал (мобильный список), галерея открывается вместе со страницей
export function waitForGallery(promise: Promise<unknown>) {
  gallery = promise.catch(() => {});
}

// Картинка из DOM загрузилась (или не смогла). decode() у картинки в DOM может зависнуть,
// пока страница не рисует кадры, поэтому слушаем load
export function imageLoaded(img: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    if (img.complete) return resolve();
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}

const delay =(ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

// Зовётся из эффекта App: эффекты детей срабатывают раньше, поэтому все waitFor уже собраны
export function reveal() {
  if (started) return;
  started = true;

  // Шрифты первого экрана грузим явно: fonts.ready до первой вёрстки может вернуться раньше их загрузки
  const fonts = FONTS.map((font) => document.fonts.load(font).catch(() => {}));
  const loaded = Promise.all([...fonts, ...pending]);
  const enough = Promise.all([loaded, delay(MIN_MS - performance.now())]);

  const root = document.documentElement;
  const page = Promise.race([enough, delay(MAX_MS - performance.now())]).then(() => {
    root.dataset.ready = '';
  });
  // Галерея — не раньше страницы, чтобы её скелетон не гас первым. Чего ждать, смотрим, когда страница
  // готова: сцену могли пересоздать (StrictMode в разработке), и ожидание старой уже не сбудется
  page
    .then(() => gallery && Promise.race([gallery, delay(GALLERY_MAX_MS - performance.now())]))
    .then(() => {
      root.dataset.galleryReady = '';
      const preloader = document.getElementById('preloader');
      if (!preloader) return;
      const remove = () => preloader.remove();
      // Свой переход, а не всплывший от плашек внутри
      preloader.addEventListener('transitionend', (e) => e.target === preloader && remove());
      // Страховка, если transitionend не придёт (фоновая вкладка)
      setTimeout(remove, 1000);
    });
}
