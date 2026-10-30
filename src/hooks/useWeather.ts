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

// В РФ запрос к заблокированному хосту может не упасть, а повиснуть — ждём не дольше этого
const REQUEST_TIMEOUT_MS = 6000;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  const timer = window.setTimeout(abort, REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

async function fromOpenMeteo(latitude: number, longitude: number, signal: AbortSignal): Promise<Weather> {
  const data = await getJson<{
    current?: { temperature_2m?: number; weather_code?: number; cloud_cover?: number; wind_speed_10m?: number };
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m&timezone=auto`,
    signal,
  );
  const c = data.current;
  if (typeof c?.temperature_2m !== 'number' || typeof c.weather_code !== 'number') {
    throw new Error('No weather in response');
  }
  return {
    temperature: c.temperature_2m,
    code: c.weather_code,
    cloudCover: c.cloud_cover ?? 0,
    windSpeed: c.wind_speed_10m ?? 0,
  };
}

// Символ met.no (без суффикса _day/_night) → ближайший код WMO для сцены неба
function wmoFromSymbol(symbol: string): number {
  const s = symbol.replace(/_(day|night|polartwilight)$/, '');
  if (s.includes('thunder')) return 95;
  if (s.includes('snow')) return 71;
  if (s.includes('rain') || s.includes('sleet')) return s.includes('showers') ? 80 : 61;
  if (s === 'fog') return 45;
  if (s === 'cloudy') return 3;
  if (s === 'partlycloudy') return 2;
  if (s === 'fair') return 1;
  return 0;
}

// Запасной источник: met.no (Норвегия) — на случай, когда Open-Meteo недоступен, например из РФ
async function fromMetNo(latitude: number, longitude: number, signal: AbortSignal): Promise<Weather> {
  const data = await getJson<{
    properties?: {
      timeseries?: {
        data?: {
          instant?: { details?: { air_temperature?: number; cloud_area_fraction?: number; wind_speed?: number } };
          next_1_hours?: { summary?: { symbol_code?: string } };
        };
      }[];
    };
  }>(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`,
    signal,
  );
  const now = data.properties?.timeseries?.[0]?.data;
  const d = now?.instant?.details;
  if (typeof d?.air_temperature !== 'number') throw new Error('No weather in response');
  return {
    temperature: d.air_temperature,
    code: wmoFromSymbol(now?.next_1_hours?.summary?.symbol_code ?? ''),
    cloudCover: d.cloud_area_fraction ?? 0,
    windSpeed: (d.wind_speed ?? 0) * 3.6, // м/с → км/ч
  };
}

// Текущая погода: Open-Meteo, при ошибке — met.no (оба без ключа). null — данных ещё нет.
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
        let value: Weather;
        try {
          value = await fromOpenMeteo(latitude, longitude, controller.signal);
        } catch (err) {
          if (controller.signal.aborted) throw err;
          console.warn('[weather] Open-Meteo failed, trying met.no', err);
          value = await fromMetNo(latitude, longitude, controller.signal);
        }
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
