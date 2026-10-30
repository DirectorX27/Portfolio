// Сцены неба: доли облачности и осадков 0..1. Между ними рендер плавно перетекает.

export type SceneParams = { clouds: number; rain: number; snow: number; thunder: number; fog: number };
export type Scene = SceneParams & { label: string };

const SCENES = {
  clear: { label: 'clear', clouds: 0, rain: 0, snow: 0, thunder: 0, fog: 0 },
  partly: { label: 'partly cloudy', clouds: 0.45, rain: 0, snow: 0, thunder: 0, fog: 0 },
  cloudy: { label: 'overcast', clouds: 1, rain: 0, snow: 0, thunder: 0, fog: 0 },
  fog: { label: 'fog', clouds: 0.35, rain: 0, snow: 0, thunder: 0, fog: 1 },
  drizzle: { label: 'drizzle', clouds: 0.85, rain: 0.35, snow: 0, thunder: 0, fog: 0 },
  rain: { label: 'rain', clouds: 1, rain: 1, snow: 0, thunder: 0, fog: 0 },
  thunder: { label: 'thunderstorm', clouds: 1, rain: 1, snow: 0, thunder: 1, fog: 0 },
  snow: { label: 'snow', clouds: 0.85, rain: 0, snow: 1, thunder: 0, fog: 0 },
} satisfies Record<string, Scene>;

export const clearSky: Scene = SCENES.clear;

// Код WMO из Open-Meteo → сцена. cloud_cover уточняет облачность для ясной и облачной погоды.
export function sceneFromWMO(code: number, cloudCover: number): Scene {
  let scene: Scene;
  if (code === 0) scene = SCENES.clear;
  else if (code <= 2) scene = SCENES.partly;
  else if (code === 3) scene = SCENES.cloudy;
  else if (code === 45 || code === 48) scene = SCENES.fog;
  else if (code >= 51 && code <= 57) scene = SCENES.drizzle;
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) scene = SCENES.rain;
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) scene = SCENES.snow;
  else if (code >= 95) scene = SCENES.thunder;
  else scene = SCENES.clear;

  if (code <= 3) return { ...scene, clouds: Math.min(1, cloudCover / 100) };
  return scene;
}
