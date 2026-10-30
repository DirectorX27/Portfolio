import files from 'virtual:works';

// Работы в галерее — всё, что лежит в public/works (список и размеры собирает vite/works.ts).
// Чтобы добавить работу, достаточно положить файл в папку. Постер к видео — «Имя.poster.jpg».
// width/height — реальные пиксели файла: по ним считается пропорция до загрузки картинки.

// Подпись берётся из имени файла: «Заказчик.Название шота.mp4» → два блока (заказчик, шот),
// «Название шота.mp4» без точки → один блок. Делим по последней точке, чтобы «ida.project.Шот» не ломался.

export type Work = {
  src?: string; // путь от public/, например '/works/Flooz.Airdrop.mp4' (видео крутится без звука по кругу)
  width: number;
  height: number;
  poster?: string; // первый кадр видео: виден, пока видео не загрузилось
  alt?: string; // по умолчанию — подпись целиком
  href?: string; // ссылка на кейс, если есть
};

export const isVideo = (work: Work) => !!work.src && /\.(mp4|m4v|webm|mov)$/i.test(work.src);

// Блоки подписи: [заказчик, шот] или [шот]
export function captionOf(work: Work): string[] {
  const name = work.src ? decodeURIComponent(work.src.split('/').pop()!).replace(/\.[^.]+$/, '') : '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name];
}

export const altOf = (work: Work) => work.alt ?? captionOf(work).join(' — ');

// Порядок в галерее: сначала файлы из этого списка, остальные — после них по алфавиту.
// Новый файл можно сюда не добавлять, он всё равно появится.
// Первым Airdrop, дальше чередуем: не Flooz / Flooz — чтобы шоты одного проекта не шли подряд.
const order = [
  'Flooz.Airdrop.mp4',
  'Wallet.avif',
  'Flooz.Snipe tokens.mp4',
  'All time stats.mp4',
  'Flooz.Go pro.mp4',
  'Voice Memo.mp4',
  'Flooz.Leaderboard.mp4',
  'Hybrid Reach.Illustrations.webp',
  'Flooz.Filters.mp4',
  'To-do widget.avif',
  'Flooz.Trending.mp4',
  'Voice Recorder.avif',
];

// Ссылка на кейс или своё описание для скринридера — по имени файла
const extras: Record<string, Pick<Work, 'href' | 'alt'>> = {};

const fileOf = (work: Work) => work.src!.split('/').pop()!;
const rank = (work: Work) => {
  const i = order.indexOf(fileOf(work));
  return i === -1 ? order.length : i;
};

export const works: Work[] = files
  .map((work) => ({ ...work, ...extras[fileOf(work)] }))
  .sort((a, b) => rank(a) - rank(b) || fileOf(a).localeCompare(fileOf(b)));
