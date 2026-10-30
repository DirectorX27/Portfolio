import type { SceneParams } from './scenes';
import fragment from './sky.frag.glsl?raw';

// Небо внутри часов: WebGL-шейдер рисует градиент по высоте солнца, звёзды, облака и туман,
// поверх в 2D-канвасе падают дождь и снег. Состояние плавно догоняет цель, поэтому
// смена погоды и времени суток перетекает, а не переключается.

export type SkyState = SceneParams & { wind: number; altitude: number; sunX: number; moonPhase: number };

type Rgb = [number, number, number];
type Drop = { x: number; y: number; l: number; v: number };
type Flake = { z: number; x: number; y: number; ph: number; r: number; v: number; a: number; sway: number; freq: number };

const KEYS = ['clouds', 'rain', 'snow', 'thunder', 'fog', 'wind', 'altitude', 'sunX'] as const;

// 2×, как у галереи: браузер может сообщить 1 на ретине (превью, зум), и небо мылится
const DPR = 2;

const vertex = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const mix = (c1: Rgb, c2: Rgb, k: number): Rgb => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const lum = (c: Rgb) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
const desat = (c: Rgb, k: number) => {
  const l = lum(c) * 255;
  return mix(c, [l, l, l], k);
};
const unit = (c: Rgb): Rgb => [clamp(c[0] / 255), clamp(c[1] / 255), clamp(c[2] / 255)];
const rgba = (c: Rgb, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// [высота солнца, верх неба, низ неба]. Ночь — глубокий синий, а не чёрный,
// иначе круг сливается с тёмной темой.
const SKY = (
  [
    [-18, '#0c1530', '#1a2645'],
    [-10, '#111c40', '#26335c'],
    [-4, '#1a2a5e', '#a5607c'],
    [0, '#33508e', '#ee9466'],
    [5, '#4a76bf', '#f4c18c'],
    [14, '#3e7fd5', '#a8ccee'],
    [40, '#2a6ed5', '#8cc2f2'],
  ] as const
).map(([alt, top, bottom]) => ({ alt, top: hex(top), bottom: hex(bottom) }));

function skyAt(alt: number): [Rgb, Rgb] {
  if (alt <= SKY[0].alt) return [SKY[0].top, SKY[0].bottom];
  for (let i = 1; i < SKY.length; i++) {
    if (alt <= SKY[i].alt) {
      const a = SKY[i - 1], b = SKY[i];
      const k = (alt - a.alt) / (b.alt - a.alt);
      return [mix(a.top, b.top, k), mix(a.bottom, b.bottom, k)];
    }
  }
  const last = SKY[SKY.length - 1];
  return [last.top, last.bottom];
}

// Спрайты снежинок: плотное ядро и мягкий край. soft — для ближних, «вне фокуса».
// Ночью снег голубее: он подсвечен небом, а не солнцем.
function flakeSprite(core: number, color: Rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(core, rgba(color, 0.85));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return c;
}
let flakes: { sharp: { day: HTMLCanvasElement; night: HTMLCanvasElement }; soft: { day: HTMLCanvasElement; night: HTMLCanvasElement } } | null = null;
const flakeSprites = () =>
  (flakes ??= {
    sharp: { day: flakeSprite(0.4, [255, 255, 255]), night: flakeSprite(0.4, [215, 225, 245]) },
    soft: { day: flakeSprite(0.12, [255, 255, 255]), night: flakeSprite(0.12, [215, 225, 245]) },
  });

export class SkyRenderer {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private uniforms = new Map<string, WebGLUniformLocation>();
  private fx: CanvasRenderingContext2D | null;
  private cur: SkyState;
  private target: SkyState;
  private size = 0;
  private seed = rnd(0, 10);
  private time = this.seed * 100;
  private drift = 0;
  private fogDrift = 0;
  private flashT = 9;
  private nextFlash = rnd(1, 3);
  private drops: Drop[] = Array.from({ length: 150 }, () => ({ x: rnd(-0.2, 1.2), y: Math.random(), l: rnd(0.028, 0.055), v: rnd(1.4, 2.2) }));
  // Снег в глубину: z = 0 далеко (мелкие, медленные, тусклые), z = 1 близко (крупнее, быстрее, мягче).
  // Дальних больше, как в реальном снегопаде. Сортировка — ближние рисуются поверх.
  private flakes: Flake[] = Array.from({ length: 130 }, () => {
    const z = Math.random() ** 1.8;
    return {
      z, x: Math.random(), y: Math.random(), ph: rnd(0, 6.28),
      r: lerp(0.0022, 0.011, z) * rnd(0.8, 1.2),
      v: lerp(0.03, 0.13, z) * rnd(0.85, 1.15),
      a: lerp(0.3, 0.95, z) * rnd(0.65, 1),
      sway: lerp(0.008, 0.035, z),
      freq: rnd(0.6, 1.6),
    };
  }).sort((p, q) => p.z - q.z);

  constructor(
    private skyCanvas: HTMLCanvasElement,
    private fxCanvas: HTMLCanvasElement,
    initial: SkyState,
  ) {
    this.cur = { ...initial };
    this.target = { ...initial };
    this.gl = this.initGl();
    this.fx = fxCanvas.getContext('2d');
  }

  // false — WebGL недоступен, остаётся плоский фон часов
  get supported() {
    return this.gl !== null;
  }

  private initGl() {
    const gl = this.skyCanvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return null;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[sky]', gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    this.program = prog;

    // Один треугольник на весь экран
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i);
      const loc = info && gl.getUniformLocation(prog, info.name);
      if (info && loc) this.uniforms.set(info.name, loc);
    }
    return gl;
  }

  resize(size: number) {
    if (size === this.size || size <= 0) return;
    this.size = size;
    const px = Math.round(size * DPR);
    this.skyCanvas.width = this.skyCanvas.height = px;
    this.fxCanvas.width = this.fxCanvas.height = px;
    this.gl?.viewport(0, 0, px, px);
    this.fx?.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  set(state: SkyState, instant = false) {
    this.target = { ...state };
    if (instant) this.cur = { ...state };
  }

  // dt = 0 — статичный кадр (reduced motion): состояние сразу встаёт в цель
  frame(dt: number) {
    if (!this.size) return;
    const k = dt > 0 ? 1 - Math.exp(-dt * 2.5) : 1;
    for (const key of KEYS) this.cur[key] = lerp(this.cur[key], this.target[key], k);
    // Фазу не сглаживаем: за сутки она меняется на 3%, а на переходе 1 → 0 сглаживание прогнало бы весь цикл
    this.cur.moonPhase = this.target.moonPhase;
    this.time += dt;
    this.drawSky(dt);
    this.drawParticles(dt);
  }

  // Контекст не теряем: канвас тот же, и при повторном монтировании (StrictMode) он нужен живым
  destroy() {
    const gl = this.gl;
    if (!gl) return;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.buffer);
    this.gl = null;
  }

  private uniform(name: string, v: number | readonly number[]) {
    const gl = this.gl!;
    const loc = this.uniforms.get(name);
    if (!loc) return;
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
    else gl.uniform3f(loc, v[0], v[1], v[2]);
  }

  private drawSky(dt: number) {
    const { gl, cur } = this;
    if (!gl) return;
    const day = smooth(-8, 6, cur.altitude);
    const night = 1 - smooth(-14, -4, cur.altitude);
    const golden = smooth(-6, 0, cur.altitude) * (1 - smooth(4, 16, cur.altitude));

    // Облачность обесцвечивает небо, осадки затемняют
    let [top, bottom] = skyAt(cur.altitude);
    const grey = clamp(cur.clouds * 0.8 + cur.fog * 0.4);
    const dark = 1 - cur.rain * 0.32 - cur.thunder * 0.12;
    top = shade(desat(top, grey * 0.8), dark);
    bottom = shade(desat(bottom, grey * 0.7), dark);

    // Гроза: двойная вспышка раз в несколько секунд
    if (cur.thunder > 0.5 && dt > 0) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flashT = 0;
        this.nextFlash = rnd(3, 8);
      }
    }
    this.flashT += dt;
    const flash =
      cur.thunder *
      (Math.max(0, 1 - this.flashT / 0.12) + 0.7 * Math.max(0, 1 - Math.abs(this.flashT - 0.24) / 0.09));

    this.drift += (0.006 + cur.wind * 0.04) * dt;
    this.fogDrift += (0.015 + cur.wind * 0.03) * dt;

    const cloudCol = shade(
      mix([255, 255, 255], [255, 200, 170], golden * 0.6),
      lerp(0.2, 0.97, day) * (1 - cur.rain * 0.35),
    );
    const l = (lum(top) + lum(bottom)) / 2;
    const px = this.skyCanvas.width;

    this.uniform('uRes', [px, px]);
    this.uniform('uTime', this.time);
    this.uniform('uSeed', this.seed);
    this.uniform('uTop', unit(top));
    this.uniform('uBot', unit(bottom));
    this.uniform('uSun', [0.5 + 0.4 * cur.sunX, clamp(0.92 - cur.altitude / 45, 0.12, 1.05)]);
    this.uniform('uSunA', smooth(-6, 2, cur.altitude) * (1 - cur.clouds * 0.8));
    this.uniform('uSunDisc', smooth(-1, 1, cur.altitude) * (1 - cur.clouds * 0.9));
    this.uniform('uWarm', unit(mix([255, 246, 225], [255, 160, 90], golden)));
    this.uniform('uStarA', night * (1 - cur.clouds) ** 2 * (1 - cur.fog * 0.85));
    this.uniform('uMoonPhase', cur.moonPhase);
    this.uniform('uClouds', cur.clouds);
    this.uniform('uCloudCol', unit(cloudCol));
    this.uniform('uFog', cur.fog);
    this.uniform('uFogCol', unit(mix(bottom, [235, 235, 232], 0.3 * day + 0.12)));
    this.uniform('uFlash', flash * 0.8);
    this.uniform('uScrim', 0.05 + clamp((l - 0.35) * 0.45, 0, 0.22));
    this.uniform('uDrift', this.drift);
    this.uniform('uFogDrift', this.fogDrift);
    // Облака и туман отражают свет города, поэтому в пасмурную ночь засветка сильнее
    this.uniform('uCity', (1 - smooth(-10, -2, cur.altitude)) * (0.7 + 0.5 * Math.max(cur.clouds, cur.fog)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawParticles(dt: number) {
    const { fx: ctx, cur, size: S } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, S, S);
    const day = smooth(-8, 6, cur.altitude);
    const night = 1 - smooth(-14, -4, cur.altitude);

    // Дождь: тонкие косые штрихи, наклон от ветра
    if (cur.rain > 0.01) {
      const slant = 0.08 + cur.wind * 0.35;
      const n = Math.round(this.drops.length * cur.rain);
      ctx.strokeStyle = rgba(mix([200, 215, 240], [255, 255, 255], day), 0.38 * Math.min(1, cur.rain * 1.5));
      ctx.lineWidth = Math.max(0.5, S / 280);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = this.drops[i];
        d.y += d.v * dt;
        d.x += d.v * slant * dt;
        if (d.y - d.l > 1) {
          d.y = -rnd(0, 0.2);
          d.x = rnd(-0.3, 1.1);
        }
        ctx.moveTo(d.x * S, d.y * S);
        ctx.lineTo((d.x - d.l * slant) * S, (d.y - d.l) * S);
      }
      ctx.stroke();
    }

    // Снег: хлопья с мягким краем, ближние размыты сильнее (как вне фокуса)
    if (cur.snow > 0.01) {
      const visible = Math.min(1, cur.snow * 1.5) * lerp(0.7, 1, day);
      const sprites = flakeSprites();
      for (const p of this.flakes) {
        // Слабый снег убирает хлопья равномерно по глубине, а не только ближние
        if (p.ph / 6.28 > cur.snow) continue;
        p.y += p.v * dt;
        p.x += (Math.cos(this.time * p.freq + p.ph) * p.sway + cur.wind * lerp(0.03, 0.1, p.z)) * dt;
        if (p.y - p.r > 1) {
          p.y = -p.r * 2;
          p.x = Math.random();
        }
        if (p.x > 1.05) p.x -= 1.1;
        const near = p.z > 0.7;
        const r = Math.max(0.6, p.r * S);
        const size = r * (near ? 3.2 : 2.4);
        const set = near ? sprites.soft : sprites.sharp;
        ctx.globalAlpha = p.a * visible * (near ? 0.75 : 1);
        ctx.drawImage(night > 0.5 ? set.night : set.day, p.x * S - size / 2, p.y * S - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }
  }
}
