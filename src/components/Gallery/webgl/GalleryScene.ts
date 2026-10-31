import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import type { OGLRenderingContext } from 'ogl';
import { isVideo, type Work } from '@/data/works';
import { gallery } from '@/config/site';
import { distribute } from '../layout';
import { cardHeight, drawCard, imageHeight, readPalette, toRgb, type Palette } from './card';
import vertex from './shaders/vertex.glsl?raw';
import fragment from './shaders/fragment.glsl?raw';

// Бесконечная галерея по мотивам Codrops (Luis Bizarro, OGL):
// плоскости в 3D по пиксельной раскладке, плавная прокрутка с догонкой,
// перенос карточек по кругу и изгиб от скорости в вершинном шейдере.

type Entry = {
  work: Work;
  canvas: HTMLCanvasElement;
  texture: Texture;
  program: Program;
  image: HTMLImageElement | null; // картинка или постер видео
  video: HTMLVideoElement | null;
  videoTexture: Texture | null;
  frame: boolean; // у видео новый кадр, текстуру надо обновить
  visible: boolean; // хотя бы одна копия карточки на экране или рядом
  distance: number; // от ближайшей копии до экрана, px (0 — на экране)
  still: boolean; // картинка или постер загрузились (или не смогли)
  started: number; // когда видео поставлено в загрузку, performance.now()
  retries: number; // повторы после обрыва сети
};

const VIDEO_WAIT = 4000; // сколько следующее видео ждёт, пока предыдущее начнёт играть, мс
const VIDEO_RETRIES = 3;

type Item = {
  mesh: Mesh;
  entry: Entry;
  column: number;
  top: number; // позиция внутри петли колонки, px
  height: number;
  loop: number; // высота петли колонки, px
  y: number; // текущая позиция на экране, px (для клика)
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const speedOf = (column: number) => (gallery.columnSpeed as readonly number[])[column] ?? 1;

export class GalleryScene {
  private renderer: Renderer;
  private gl: OGLRenderingContext;
  private camera: Camera;
  private scene = new Transform();
  private geometry: Plane;
  private entries: Entry[];
  private columns: number[][];
  private items: Item[] = [];
  private screen = { width: 0, height: 0 };
  private viewport = { width: 0, height: 0 };
  private colWidth = 0;
  private colX: number[] = [];
  private palette: Palette = readPalette();
  private scroll = { current: 0, target: 0, last: 0 };
  private strength: number[];
  private maxBulge = 0; // предел изгиба к камере, чтобы карточки не выходили за канвас
  private direction = 1;
  private hover = false;
  private drift = 1; // 0..1: дрейф плавно гаснет при наведении и разгоняется обратно
  private drag: { y: number; lastY: number; start: number; moved: boolean } | null = null;
  private raf = 0;
  private time = 0;
  private destroyed = false;
  private cleanups: Array<() => void> = [];
  private loads: Promise<void>[] = []; // декодирование картинки или постера, по индексу работы
  private videos = false; // первый экран готов — можно грузить видео
  readonly ready: Promise<unknown>; // всё, что видно на первом экране, — его ждёт прелоудер

  constructor(
    private container: HTMLElement,
    works: Work[],
    private reduced: boolean,
  ) {
    this.renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr: Math.min(Math.max(window.devicePixelRatio || 1, gallery.minDpr), gallery.maxDpr),
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(this.gl.canvas);

    this.camera = new Camera(this.gl, { fov: 45 });
    this.camera.position.z = 5;
    // Изгиб идёт по вертикали, поэтому сегменты нужны только по высоте
    this.geometry = new Plane(this.gl, { heightSegments: 24 });

    this.columns = distribute(works, gallery.columns);
    this.strength = this.columns.map(() => 0);
    this.entries = works.map((work) => this.createEntry(work));

    const font = this.listen();
    this.resize();
    // Картинки ниже первого экрана уступают сеть первому экрану и аватару
    const first = this.firstScreen();
    this.loads = this.entries.map((e, i) => this.loadStill(e, first.includes(i) ? 'auto' : 'low'));
    this.ready = Promise.all([font, ...first.map((i) => this.loads[i])]);
    // Видео тяжелее всего остального вместе взятого, поэтому ждут, пока первый экран покажется
    this.ready.then(() => (this.videos = true));
    this.raf = requestAnimationFrame(this.update);
  }

  // Работы, которые видны сразу: в каждой колонке сверху, пока не кончится высота экрана
  private firstScreen() {
    if (!this.colWidth) return this.columns.map((indices) => indices[0]);
    return this.columns.flatMap((indices) => {
      const visible: number[] = [];
      let top = gallery.paddingTop;
      for (const i of indices) {
        if (top >= this.screen.height) break;
        visible.push(i);
        top += cardHeight(this.entries[i].work, this.colWidth) + gallery.rowGap;
      }
      return visible;
    });
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    this.entries.forEach(this.syncVideo);
  }

  // Видео играет, только пока карточка видна. При reduced-motion стоит на месте.
  private syncVideo = (entry: Entry) => {
    const { video } = entry;
    if (!video?.getAttribute('src')) return;
    const play = entry.visible && !this.reduced;
    if (play && video.paused) video.play().catch(() => {});
    else if (!play && !video.paused) video.pause();
  };

  // Видео грузятся по очереди: когда карточка подъезжает к экрану и её постер уже на месте.
  // Следующее ждёт, пока предыдущее начнёт играть, но не дольше VIDEO_WAIT — иначе
  // на медленной сети одно тяжёлое видео держит все остальные.
  private loadNextVideo() {
    if (!this.videos) return;
    const now = performance.now();
    const busy = this.entries.some(
      (e) =>
        e.visible &&
        e.video?.getAttribute('src') &&
        !e.video.error &&
        e.video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA &&
        now - e.started < VIDEO_WAIT,
    );
    if (busy) return;
    let next: Entry | undefined;
    for (const e of this.entries) {
      if (!e.visible || !e.still || !e.video || e.video.getAttribute('src')) continue;
      if (!next || e.distance < next.distance) next = e;
    }
    if (!next?.video || !next.work.src) return;
    next.video.src = next.work.src;
    next.started = now;
    this.syncVideo(next);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((fn) => fn());
    this.entries.forEach((e) => {
      if (e.video) {
        e.video.pause();
        e.video.removeAttribute('src');
        e.video.load();
      }
      this.gl.deleteTexture(e.texture.texture);
      if (e.videoTexture) this.gl.deleteTexture(e.videoTexture.texture);
      e.program.remove();
    });
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl.canvas.remove();
  }

  private createEntry(work: Work): Entry {
    const { gl } = this;
    const canvas = document.createElement('canvas');
    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      premultiplyAlpha: true,
    });
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tMap: { value: texture },
        tVideo: { value: texture },
        uVideo: { value: 0 },
        uImage: { value: 1 },
        uCover: { value: [1, 1] },
        uSize: { value: [1, 1] },
        uRadius: { value: gallery.radius },
        uBorder: { value: gallery.border },
        uBorderColor: { value: toRgb(this.palette.border) },
        uPx: { value: 1 },
        uStrength: { value: 0 },
        uViewportSizes: { value: [1, 1] },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const entry: Entry = {
      work,
      canvas,
      texture,
      program,
      image: null,
      video: null,
      videoTexture: null,
      frame: false,
      visible: false,
      distance: Infinity,
      still: false,
      started: 0,
      retries: 0,
    };

    if (work.src && isVideo(work)) {
      // src ставится в loadNextVideo, когда карточка подъедет к экрану
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      entry.video = video;

      const videoTexture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
      entry.videoTexture = videoTexture;
      video.addEventListener('loadeddata', () => {
        if (this.destroyed) return;
        // cover: видео заполняет рамку с пропорцией из данных
        const box = work.width / work.height;
        const own = video.videoWidth / video.videoHeight;
        program.uniforms.uCover.value = own > box ? [box / own, 1] : [1, own / box];
        program.uniforms.tVideo.value = videoTexture;
        program.uniforms.uVideo.value = 1;
        videoTexture.image = video;
        entry.frame = true;
      });
      // Сеть оборвала загрузку: сбрасываем src, и очередь поставит видео заново
      video.addEventListener('error', () => {
        if (this.destroyed || entry.retries >= VIDEO_RETRIES) return;
        entry.retries++;
        setTimeout(() => {
          if (this.destroyed) return;
          video.removeAttribute('src');
          video.load();
        }, 1000 * entry.retries);
      });
      // Браузер сообщает о каждом новом кадре, а текстура обновляется в update()
      const onFrame = () => {
        if (this.destroyed) return;
        entry.frame = true;
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    }

    return entry;
  }

  private loadStill(entry: Entry, priority: 'auto' | 'low'): Promise<void> {
    const { work } = entry;
    const still = work.src && isVideo(work) ? work.poster : work.src;
    if (!still) {
      entry.still = true;
      return Promise.resolve();
    }
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = priority;
    img.src = still;
    return img
      .decode()
      .then(() => {
        if (this.destroyed) return;
        entry.image = img;
        this.redraw(entry);
      })
      .catch(() => {
        // файл не загрузился — остаётся плашка
      })
      .finally(() => (entry.still = true));
  }

  private redraw(entry: Entry) {
    if (!this.colWidth) return;
    drawCard(entry.canvas, entry.work, entry.image, this.colWidth, this.renderer.dpr, this.palette);
    const { uniforms } = entry.program;
    const h = cardHeight(entry.work, this.colWidth);
    uniforms.uImage.value = imageHeight(entry.work, this.colWidth) / h;
    uniforms.uSize.value = [this.colWidth, h];
    uniforms.uPx.value = 1 / this.renderer.dpr;
    uniforms.uBorderColor.value = toRgb(this.palette.border);
    entry.texture.image = entry.canvas;
    entry.texture.needsUpdate = true;
  }

  private redrawAll = () => {
    if (this.destroyed) return;
    this.entries.forEach((e) => this.redraw(e));
  };

  private resize = () => {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;

    this.screen = { width, height };
    this.renderer.setSize(width, height);
    this.camera.perspective({ aspect: width / height });

    // Перевод px → единицы сцены через fov камеры
    const fov = (this.camera.fov * Math.PI) / 180;
    const vh = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: vh * this.camera.aspect, height: vh };
    this.entries.forEach((e) => (e.program.uniforms.uViewportSizes.value = [this.viewport.width, vh]));

    // Ширина колонки считается от настроенного числа колонок, даже если работ меньше
    const inner = width - gallery.bleed * 2;
    const colWidth = (inner - gallery.columnGap * (gallery.columns - 1)) / gallery.columns;
    const used = this.columns.length * colWidth + (this.columns.length - 1) * gallery.columnGap;
    const left = gallery.bleed + (inner - used) / 2;
    this.colX = this.columns.map((_, c) => left + c * (colWidth + gallery.columnGap));
    // При изгибе к камере середина карточек выходит на z = -strength и растёт в z / (z - s) раз.
    // Карточки занимают used из width по центру, значит рост до краёв канваса — при s = z * (1 - used / width).
    // Берём 90% от этого, чтобы сглаженный край и обводка тоже помещались
    this.maxBulge = this.camera.position.z * (1 - used / width) * 0.9;

    if (colWidth !== this.colWidth) {
      this.colWidth = colWidth;
      this.redrawAll();
    }
    this.build();
  };

  // Раскладывает карточки по колонкам. Если колонка короче экрана, набор повторяется,
  // чтобы при переносе по кругу не было видно дыр.
  private build() {
    this.items.forEach((item) => item.mesh.setParent(null));
    this.items = [];

    const heights = this.entries.map((e) => cardHeight(e.work, this.colWidth));
    const need = this.screen.height + Math.max(0, ...heights) + gallery.rowGap;

    this.columns.forEach((indices, column) => {
      const base = indices.reduce((sum, i) => sum + heights[i] + gallery.rowGap, 0);
      const repeats = Math.max(1, Math.ceil(need / base));
      const loop = base * repeats;
      let top = 0;

      for (let r = 0; r < repeats; r++) {
        for (const i of indices) {
          const entry = this.entries[i];
          const mesh = new Mesh(this.gl, { geometry: this.geometry, program: entry.program });
          // Программа общая для копий одной работы, поэтому силу изгиба ставим перед отрисовкой
          mesh.onBeforeRender(() => {
            entry.program.uniforms.uStrength.value = this.strength[column];
          });
          mesh.setParent(this.scene);
          this.items.push({ mesh, entry, column, top, height: heights[i], loop, y: 0 });
          top += heights[i] + gallery.rowGap;
        }
      }
    });
  }

  private update = (now: number) => {
    this.raf = requestAnimationFrame(this.update);

    // Время, а не кадры: на 60 и 120 Гц скорость одна. После фоновой вкладки шаг ограничен.
    const dt = this.time ? Math.min((now - this.time) / 1000, 1 / 30) : 1 / 60;
    this.time = now;
    const frames = dt * 60;

    const drifting = !this.drag && !this.hover && !this.reduced;
    this.drift = lerp(this.drift, drifting ? 1 : 0, 1 - Math.pow(1 - gallery.driftEase, frames));
    if (!this.drag) {
      this.scroll.target += this.direction * gallery.autoSpeed * this.drift * dt;
    }
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, 1 - Math.pow(1 - gallery.ease, frames));
    const velocity = (this.scroll.current - this.scroll.last) / frames;
    this.scroll.last = this.scroll.current;

    const { width: sw, height: sh } = this.screen;
    const { width: vw, height: vh } = this.viewport;
    if (!sw) return;

    this.strength = this.strength.map((s, c) => {
      // Отрицательная сила выгибает середину к камере: её ограничиваем запасом bleed, вглубь — без предела
      const goal = this.reduced ? 0 : Math.max(((velocity * speedOf(c)) / sw) * gallery.bend, -this.maxBulge);
      return lerp(s, goal, 1 - Math.pow(0.85, frames));
    });

    const margin = sh; // видео заранее грузится за экран до появления
    const visible = new Set<Entry>();
    for (const entry of this.entries) entry.distance = Infinity;
    for (const item of this.items) {
      const offset = this.scroll.current * speedOf(item.column);
      item.y = mod(item.top + gallery.paddingTop - offset + item.height, item.loop) - item.height;

      const { mesh } = item;
      mesh.scale.x = (vw * this.colWidth) / sw;
      mesh.scale.y = (vh * item.height) / sh;
      mesh.position.x = -vw / 2 + mesh.scale.x / 2 + (this.colX[item.column] / sw) * vw;
      mesh.position.y = vh / 2 - mesh.scale.y / 2 - (item.y / sh) * vh;
      if (item.y < sh + margin && item.y + item.height > -margin) visible.add(item.entry);
      const distance = Math.max(0, item.y - sh, -(item.y + item.height));
      item.entry.distance = Math.min(item.entry.distance, distance);
    }

    for (const entry of this.entries) {
      if (!entry.video) continue;
      const shown = visible.has(entry);
      if (shown !== entry.visible) {
        entry.visible = shown;
        this.syncVideo(entry);
      }
      // Кадр видео уходит прямо в текстуру, без перерисовки карточки
      if (shown && entry.frame && entry.videoTexture?.image) {
        entry.frame = false;
        entry.videoTexture.needsUpdate = true;
      }
    }
    this.loadNextVideo();

    this.renderer.render({ scene: this.scene, camera: this.camera });
  };

  private hit(e: PointerEvent): Item | undefined {
    const rect = this.gl.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return this.items.find((item) => {
      const left = this.colX[item.column];
      return x >= left && x <= left + this.colWidth && y >= item.y && y <= item.y + item.height;
    });
  }

  private open(work: Work) {
    if (!work.href) return;
    if (/^https?:\/\//.test(work.href)) window.open(work.href, '_blank', 'noopener');
    else window.location.assign(work.href);
  }

  private listen() {
    const canvas = this.gl.canvas;
    canvas.style.cursor = 'grab';

    // Колесо крутит ленту над всей страницей. Если страница сама прокручивается (низкое окно),
    // вне галереи колесо остаётся странице. Ctrl+колесо — масштаб, его не трогаем.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const pageScrolls = document.documentElement.scrollHeight > window.innerHeight + 1;
      if (pageScrolls && !this.container.contains(e.target as Node)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.screen.height : 1;
      const delta = e.deltaY * unit;
      if (!delta) return;
      this.scroll.target += delta * gallery.wheel;
      this.direction = Math.sign(delta);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      this.drag = { y: e.clientY, lastY: e.clientY, start: this.scroll.target, moved: false };
      canvas.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      if (!this.drag) {
        canvas.style.cursor = this.hit(e)?.entry.work.href ? 'pointer' : 'grab';
        return;
      }
      const distance = this.drag.y - e.clientY;
      if (Math.abs(distance) > 4) this.drag.moved = true;
      const step = this.drag.lastY - e.clientY;
      if (step) this.direction = Math.sign(step);
      this.drag.lastY = e.clientY;
      this.scroll.target = this.drag.start + distance * gallery.drag;
    };

    const onEnter = () => (this.hover = true);
    const onLeave = () => (this.hover = false);

    const onUp = (e: PointerEvent) => {
      if (!this.drag) return;
      const { moved } = this.drag;
      this.drag = null;
      canvas.style.cursor = 'grab';
      if (!moved && e.type === 'pointerup') {
        const item = this.hit(e);
        if (item) this.open(item.entry.work);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const ro = new ResizeObserver(this.resize);
    ro.observe(this.container);

    // Цвета подписи и плашек берутся из токенов темы
    const mo = new MutationObserver(() => {
      this.palette = readPalette();
      this.redrawAll();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    this.cleanups.push(
      () => window.removeEventListener('wheel', onWheel),
      () => ro.disconnect(),
      () => mo.disconnect(),
    );

    // Перерисовать подписи, когда догрузится шрифт
    return document.fonts
      .load(`${gallery.caption.fontSize}px 'Inter Display Static'`)
      .then(this.redrawAll)
      .catch(() => {});
  }
}
