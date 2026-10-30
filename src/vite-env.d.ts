/// <reference types="vite/client" />

// Список файлов из public/works, собирает vite/works.ts
declare module 'virtual:works' {
  const files: Array<{ src: string; width: number; height: number; poster?: string }>;
  export default files;
}
