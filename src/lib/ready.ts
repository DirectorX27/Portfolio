// Страница показывается целиком, а не по кусочкам: компоненты сообщают, чего ждать (waitFor),
// а reveal() убирает прелоудер из index.html, когда всё готово.

// Скелетон держится хотя бы столько от начала загрузки, чтобы не мигнуть на быстром кэше
const MIN_MS = 500;
// И не дольше: на медленной сети показываем то, что успело загрузиться
const MAX_MS = 3000;

// Текст, имя и роль, цифры часов, подписи часов
const FONTS = [
  '400 15px "Inter Display"',
  '500 15px "Inter Display"',
  '300 40px "JetBrains Mono"',
  '400 11px "Matrix Sans Print"',
];

const pending: Promise<unknown>[] = [];
let started = false;

export function waitFor(promise: Promise<unknown>) {
  // Ошибка загрузки не держит прелоудер: на месте файла останется плашка
  pending.push(promise.catch(() => {}));
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

  Promise.race([enough, delay(MAX_MS - performance.now())]).then(() => {
    const root = document.documentElement;
    root.dataset.ready = '';
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    const remove = () => preloader.remove();
    preloader.addEventListener('transitionend', remove, { once: true });
    // Страховка, если transitionend не придёт (фоновая вкладка)
    setTimeout(remove, 1000);
  });
}
