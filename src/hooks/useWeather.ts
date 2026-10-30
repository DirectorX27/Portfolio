import { useEffect, useState } from 'react';

export type Weather = {
  temperature: number; // °C
  code: number; // код погоды WMO
  cloudCover: number; // %
  windSpeed: number; // км/ч
};

type Cached = Weather & { fetchedAt: number };

type Options = {
  latitude: number;
  longitude: number;
  refreshMs: number;
  cacheKey: string;
};

function readCache(key: string): Cached | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: Cached) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // приватный режим — просто без кэша
  }
}

const strip = ({ temperature, code, cloudCover, windSpeed }: Cached): Weather => ({
  temperature,
  code,
  cloudCover,
  windSpeed,
});

// Текущая погода через Open-Meteo (без ключа). null — данных ещё нет.
export function useWeather({ latitude, longitude, refreshMs, cacheKey }: Options): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(() => {
    const cached = readCache(cacheKey);
    return cached ? strip(cached) : null;
  });

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const cached = readCache(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < refreshMs) {
        setWeather(strip(cached));
        return;
      }
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m&timezone=auto`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number; cloud_cover?: number; wind_speed_10m?: number };
        };
        const c = data.current;
        if (typeof c?.temperature_2m !== 'number' || typeof c.weather_code !== 'number') {
          throw new Error('No weather in response');
        }
        const value: Weather = {
          temperature: c.temperature_2m,
          code: c.weather_code,
          cloudCover: c.cloud_cover ?? 0,
          windSpeed: c.wind_speed_10m ?? 0,
        };
        setWeather(value);
        writeCache(cacheKey, { ...value, fetchedAt: Date.now() });
      } catch (err) {
        // Оставляем последнее известное значение
        if (!controller.signal.aborted) console.warn('[weather]', err);
      }
    };

    load();
    const timer = window.setInterval(load, refreshMs);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [latitude, longitude, refreshMs, cacheKey]);

  return weather;
}

export function formatTemperature(value: number | null): string {
  if (value === null) return '—°C';
  const rounded = Math.round(value);
  // Типографский минус и без «-0»
  const sign = rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)}°C`;
}
