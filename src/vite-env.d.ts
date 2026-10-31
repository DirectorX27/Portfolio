/// <reference types="vite/client" />

interface ImportMetaEnv {
  // CDN для файлов из public/, задаётся в CI (см. src/lib/media.ts)
  readonly VITE_MEDIA_CDN?: string;
}

// Список файлов из public/works, собирает vite/works.ts
declare module 'virtual:works' {
  const files: Array<{ src: string; width: number; height: number; poster?: string }>;
  export default files;
}
