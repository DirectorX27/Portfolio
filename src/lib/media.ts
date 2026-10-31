import type { SyntheticEvent } from 'react';

// Файлы из public/ (видео, постеры, аватар, логотипы) на сайте отдаёт jsDelivr прямо из репозитория:
// GitHub Pages в РФ отдаёт их в десятки раз медленнее. Адрес задаёт сборка в CI (VITE_MEDIA_CDN),
// он привязан к коммиту, поэтому кэш не путает версии. Локально переменной нет — файлы с самого сайта.
const CDN = (import.meta.env.VITE_MEDIA_CDN ?? '').replace(/\/$/, '');

// '/works/X.mp4' → адрес на CDN
export const media = (path: string) => CDN + path;

// Адрес на CDN → тот же файл с сайта. Остальные адреса не меняются
export const local = (url: string) => (CDN && url.startsWith(CDN) ? url.slice(CDN.length) : url);

export const fromCdn = (url: string) => !!CDN && url.startsWith(CDN);

// onError для <img> и <video>: CDN не ответил — один раз пробуем файл с сайта
export function fallback(e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) {
  const el = e.currentTarget;
  const src = el.getAttribute('src');
  if (src && fromCdn(src)) el.src = local(src);
}
