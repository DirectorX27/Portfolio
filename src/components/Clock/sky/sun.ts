// Положение солнца по упрощённой формуле: для цвета неба точности в доли градуса хватает.
// altitude — высота над горизонтом в градусах, x — сторона неба: −1 восток (утро), 1 запад (вечер).
export function sunPosition(date: Date, latitude: number, longitude: number) {
  const r = Math.PI / 180;
  const d = date.getTime() / 86_400_000 - 10957.5; // дни от J2000
  const g = (357.529 + 0.98560028 * d) * r;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r;
  const e = (23.439 - 0.00000036 * d) * r;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const H = gmst * 15 * r + longitude * r - ra; // часовой угол
  const phi = latitude * r;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  return { altitude: alt / r, x: Math.sin(H) };
}

// Фаза луны 0..1 (0 новолуние, 0.5 полнолуние) от опорного новолуния 6 января 2000,
// синодический месяц 29.53 дня
export function moonPhase(date: Date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000;
  return (((days / 29.530588853) % 1) + 1) % 1;
}
