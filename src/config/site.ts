// Всё, что меняется без правки вёрстки, лежит здесь.

export const profile = {
  name: 'Daniil Afonin',
  // Первое слово показывается при загрузке, клик по нему листает дальше по кругу
  roles: ['product', 'focused', 'rational', 'creative'],
  roleSuffix: 'designer',
  about: 'I design transparent, human-centered products and the interactions within them.',
  openToWork: true,
  contactHref: 'mailto:daniil4823@gmail.com',
} as const;

// Кнопки, которые раскрываются из Contact (ниже 1040 они же повторяются под галереей)
export const contacts = [
  { label: 'Mail', href: 'mailto:daniil4823@gmail.com' },
  { label: 'Telegram', href: 'https://t.me/afonindaniil' },
  { label: 'X', href: 'https://x.com/afonindv' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/afoninux/' },
] as const;

// Клавиша раскрытия. KeyC — физическая клавиша, поэтому работает и в русской раскладке
export const contactShortcut = { code: 'KeyC', label: 'c' } as const;

export const location = {
  label: 'MSK',
  timeZone: 'Europe/Moscow',
  latitude: 55.7558,
  longitude: 37.6173,
} as const;

export const avatar = {
  // 320×320 (2× от 148px), без звука; постер — первый кадр
  videoWebm: '/media/avatar.webm',
  videoMp4: '/media/avatar.mp4',
  poster: '/media/avatar-poster.jpg',
} as const;

// Параметры MeshGradient один в один из Paper (кнопка Contact)
export const contactGradient = {
  colors: ['#C7C3A2', '#373D4D', '#7F7D93', '#CDA56E'],
  speed: 0.6,
  scale: 5,
  distortion: 0.4,
  swirl: 0.1,
  frame: 470745.4600002129,
} as const;

// Отклик на нажатие Contact: вспышка оверлея (цвет из макета) и всплеск меша.
// peak* — значения градиента в пике всплеска, дальше они плавно возвращаются к contactGradient.
export const contactSplash = {
  overlay: '#FDFCF81A',
  overlayDuration: 0.45, // с
  duration: 1.1, // с, длина всплеска
  peakSpeed: 7,
  peakDistortion: 1,
  peakSwirl: 0.9,
} as const;

export const weather = {
  refreshMs: 15 * 60 * 1000,
  cacheKey: 'weather:msk:v2', // v2: в кэше вместе с температурой код погоды, облачность и ветер
} as const;

// Галерея работ (данные — src/data/works.ts). Размеры в px, скорости в px/с.
export const gallery = {
  columns: 1, // 1 — карточки друг под другом на всю ширину колонки
  columnGap: 20,
  rowGap: 32,
  paddingTop: 32, // отступ первой карточки сверху, как padding-block колонки
  radius: 20,
  border: 0.8, // обводка картинки = токен stroke: 0.8px, цвет --border-divider в обеих темах
  caption: {
    layout: 'row' as 'row' | 'stack', // row: две половины ширины, обе по левому краю; stack: две строки
    gap: 12, // от картинки до подписи
    paddingInline: 20, // боковые отступы подписи
    lineHeight: 20,
    fontSize: 14,
  },
  autoSpeed: 36, // медленный дрейф
  driftEase: 0.06, // как быстро дрейф гаснет при наведении на ленту и возвращается (0..1)
  columnSpeed: [1], // множители по колонкам: разные значения дают параллакс
  ease: 0.08, // догонка прокрутки (0..1, меньше — плавнее)
  wheel: 0.6,
  drag: 1.5,
  bend: 12, // сила изгиба от скорости, 0 — без изгиба
  bleed: 24, // запас канваса по бокам, чтобы изгиб не обрезался краем колонки
  minDpr: 2, // не ниже 2x, как у шейдеров Paper: браузер может сообщить 1 на ретине (превью, зум), и галерея мылится
  maxDpr: 2,
} as const;
