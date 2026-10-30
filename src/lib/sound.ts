// UI-звуки синтезируются через Web Audio, без аудиофайлов
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// ±amount по высоте, чтобы звук не повторялся механически
const jitter = (amount: number) => 1 + (Math.random() - 0.5) * amount * 2;

// Мягкий «плюмб»: синус с быстрым падением высоты и коротким затуханием.
// В тёмную тему звук чуть ниже, в светлую — чуть выше.
export function playToggleSound(toDark: boolean) {
  const ac = audio();
  if (!ac) return;

  const t = ac.currentTime;
  const f = (toDark ? 1 : 1.25) * jitter(0.03);

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520 * f, t);
  osc.frequency.exponentialRampToValueAtTime(150 * f, t + 0.09);

  // Срезаем щелчок атаки
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

  osc.connect(filter).connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.17);
  osc.onended = () => {
    osc.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

// Волнистый «плюмб»: как у смены темы, синус с падением высоты, но длиннее
// и с вибрато — качается высота, а не громкость, поэтому звук без прерываний.
// Открытие — выше и длиннее, закрытие — ниже и короче.
export function playConnectSound(opening: boolean) {
  const ac = audio();
  if (!ac) return;

  const t = ac.currentTime;
  const duration = opening ? 0.32 : 0.24;
  const f = (opening ? 1.2 : 0.9) * jitter(0.03);

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(560 * f, t);
  osc.frequency.exponentialRampToValueAtTime(170 * f, t + duration * 0.6);

  // Вибрато: высота качается на ±70 центов ~12 раз в секунду, к концу волна затихает
  const lfo = ac.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(12, t);
  lfo.frequency.linearRampToValueAtTime(8, t + duration);
  const depth = ac.createGain();
  depth.gain.setValueAtTime(70, t);
  depth.gain.linearRampToValueAtTime(25, t + duration);
  lfo.connect(depth).connect(osc.detune);

  // Срезаем щелчок атаки
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(filter).connect(gain).connect(ac.destination);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + duration + 0.01);
  lfo.stop(t + duration + 0.01);
  osc.onended = () => {
    [osc, lfo, depth, filter, gain].forEach((node) => node.disconnect());
  };
}
