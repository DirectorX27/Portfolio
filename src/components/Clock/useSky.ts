import { useEffect, useRef } from 'react';
import type { Weather } from '@/hooks/useWeather';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { waitFor } from '@/lib/ready';
import { clearSky, sceneFromWMO } from './sky/scenes';
import { moonPhase, sunPosition } from './sky/sun';
import { SkyRenderer, type SkyState } from './sky/SkyRenderer';

type Options = { weather: Weather | null; latitude: number; longitude: number };

// Солнце двигается медленно: пересчитываем его раз в полминуты, небо догоняет плавно
const SUN_REFRESH_MS = 30_000;

function stateOf(weather: Weather | null, latitude: number, longitude: number): SkyState {
  const scene = weather ? sceneFromWMO(weather.code, weather.cloudCover) : clearSky;
  const now = new Date();
  const sun = sunPosition(now, latitude, longitude);
  return {
    moonPhase: moonPhase(now),
    clouds: scene.clouds,
    rain: scene.rain,
    snow: scene.snow,
    thunder: scene.thunder,
    fog: scene.fog,
    wind: weather ? Math.min(1, weather.windSpeed / 40) : 0.3,
    altitude: sun.altitude,
    sunX: sun.x,
  };
}

// Подключает небо к двум канвасам: skyRef — WebGL-фон, fxRef — дождь и снег поверх.
// При reduced motion рисует статичный кадр, вне экрана не рисует вовсе.
export function useSky({ weather, latitude, longitude }: Options) {
  const skyRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SkyRenderer | null>(null);
  const reduced = useReducedMotion();

  // Актуальные данные для таймера и первого кадра, без перезапуска эффекта
  const latest = useRef({ weather, latitude, longitude });
  latest.current = { weather, latitude, longitude };
  const current = () => stateOf(latest.current.weather, latest.current.latitude, latest.current.longitude);

  useEffect(() => {
    const sky = skyRef.current;
    const fx = fxRef.current;
    if (!sky || !fx) return;

    const renderer = new SkyRenderer(sky, fx, current());
    if (!renderer.supported) {
      // Без WebGL остаётся плоский фон часов из макета
      sky.style.display = 'none';
      fx.style.display = 'none';
      renderer.destroy();
      return;
    }
    rendererRef.current = renderer;
    // Прелоудер ждёт, пока небо отрисует первый кадр
    waitFor(new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    let visible = true;
    let raf = 0;
    let last = performance.now();
    const still = () => renderer.frame(0);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible) renderer.frame(dt);
      raf = requestAnimationFrame(loop);
    };

    const resize = new ResizeObserver(([entry]) => {
      renderer.resize(entry.contentRect.width);
      if (reduced) still();
    });
    resize.observe(sky);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(sky);

    const sunTimer = window.setInterval(() => {
      renderer.set(current());
      if (reduced) still();
    }, SUN_REFRESH_MS);

    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(sunTimer);
      resize.disconnect();
      io.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
    // current() читает latest — пересоздаём рендер только при смене reduced motion
  }, [reduced]);

  // Новая погода: небо плавно перетекает в новую сцену
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.set(stateOf(weather, latitude, longitude));
    if (reduced) renderer.frame(0);
  }, [weather, latitude, longitude, reduced]);

  return { skyRef, fxRef };
}

export function describeSky(weather: Weather | null) {
  return weather ? sceneFromWMO(weather.code, weather.cloudCover).label : null;
}
