import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

// Галерея собирается из файлов в public/works: сайт сам видит новые работы и узнаёт их размеры.
// «X.poster.jpg» — постер к видео «X.mp4», отдельной работой не считается.
// Модуль virtual:works отдаёт [{ src, width, height, poster? }].

const DIR = 'public/works';
const ID = 'virtual:works';
const RESOLVED = '\0' + ID;

const IMAGE = /\.(avif|jpe?g|png|webp|gif)$/i;
const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const POSTER = /\.poster\.(jpe?g|png|webp|avif)$/i;

type Size = { width: number; height: number };

// Ищет бокс ISO BMFF по имени (avif/heic — ispe, mp4/mov — tkhd) и читает размер из него
function findBox(buf: Buffer, type: string, from = 0) {
  return buf.indexOf(type, from, 'latin1');
}

function avifSize(buf: Buffer): Size | null {
  // ispe: version/flags (4), width (4), height (4). Берём самый большой — это основная картинка, а не превью
  let best: Size | null = null;
  for (let i = findBox(buf, 'ispe'); i !== -1; i = findBox(buf, 'ispe', i + 4)) {
    const width = buf.readUInt32BE(i + 8);
    const height = buf.readUInt32BE(i + 12);
    if (!best || width * height > best.width * best.height) best = { width, height };
  }
  return best;
}

function mp4Size(buf: Buffer): Size | null {
  // tkhd: у видеодорожки ширина и высота ненулевые (16.16 fixed) в конце бокса
  for (let i = findBox(buf, 'tkhd'); i !== -1; i = findBox(buf, 'tkhd', i + 4)) {
    const version = buf[i + 4];
    const off = i + 4 + 4 + (version === 1 ? 32 : 20) + 8 + 8 + 36;
    const width = Math.round(buf.readUInt32BE(off) / 65536);
    const height = Math.round(buf.readUInt32BE(off + 4) / 65536);
    if (width && height) return { width, height };
  }
  return null;
}

function jpegSize(buf: Buffer): Size | null {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15, кроме DHT/JPG/DAC
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function webpSize(buf: Buffer): Size | null {
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  if (chunk === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  return null;
}

function sizeOf(file: string): Size | null {
  const buf = readFileSync(file);
  const ext = file.split('.').pop()!.toLowerCase();
  try {
    if (ext === 'png') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (ext === 'gif') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (ext === 'jpg' || ext === 'jpeg') return jpegSize(buf);
    if (ext === 'webp') return webpSize(buf);
    if (ext === 'avif') return avifSize(buf);
    if (ext === 'mp4' || ext === 'mov' || ext === 'm4v') return mp4Size(buf);
  } catch {
    // битый файл — ниже подставится квадрат
  }
  return null;
}

function scan(root: string) {
  const dir = resolve(root, DIR);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => !f.startsWith('.'));
  } catch {
    return [];
  }
  const posters = new Map(files.filter((f) => POSTER.test(f)).map((f) => [f.replace(POSTER, ''), f]));

  return files
    .filter((f) => !POSTER.test(f) && (IMAGE.test(f) || VIDEO.test(f)))
    .map((f) => {
      const base = f.replace(/\.[^.]+$/, '');
      const poster = VIDEO.test(f) ? posters.get(base) : undefined;
      // webm не разбираем: размер берём у постера, без него — квадрат
      const size = sizeOf(join(dir, f)) ?? (poster && sizeOf(join(dir, poster))) ?? { width: 1, height: 1 };
      return { src: `/works/${f}`, ...size, ...(poster && { poster: `/works/${poster}` }) };
    });
}

export function works(): Plugin {
  let root = process.cwd();
  return {
    name: 'works',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === ID) return RESOLVED;
    },
    load(id) {
      if (id === RESOLVED) return `export default ${JSON.stringify(scan(root))};`;
    },
    // Файл добавили, удалили или заменили — пересобрать список и перезагрузить страницу
    configureServer(server) {
      const dir = resolve(root, DIR);
      server.watcher.add(dir);
      const refresh = (file: string) => {
        if (!resolve(file).startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
      server.watcher.on('change', refresh);
    },
  };
}
