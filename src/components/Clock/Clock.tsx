import { useZonedTime } from '@/hooks/useZonedTime';
import { useWeather, formatTemperature } from '@/hooks/useWeather';
import { location, weather as weatherConfig } from '@/config/site';
import { describeSky, useSky } from './useSky';
import styles from './Clock.module.css';

export function Clock() {
  const { hours, minutes, iso } = useZonedTime(location.timeZone);
  const weather = useWeather({
    latitude: location.latitude,
    longitude: location.longitude,
    refreshMs: weatherConfig.refreshMs,
    cacheKey: weatherConfig.cacheKey,
  });
  const { skyRef, fxRef } = useSky({ weather, latitude: location.latitude, longitude: location.longitude });
  const temp = formatTemperature(weather?.temperature ?? null);
  const sky = describeSky(weather);

  return (
    <div
      className={styles.clock}
      role="group"
      aria-label={`Moscow, ${hours}:${minutes}, ${temp}${sky ? `, ${sky}` : ''}`}
    >
      {/* Небо по погоде и положению солнца: шейдер + дождь/снег поверх */}
      <canvas ref={skyRef} className={styles.sky} aria-hidden="true" />
      <canvas ref={fxRef} className={styles.sky} aria-hidden="true" />
      <span className={styles.label} aria-hidden="true">
        {temp}
      </span>
      <time className={styles.time} dateTime={iso} aria-hidden="true">
        <span>{hours}</span>
        <span>{minutes}</span>
      </time>
      <span className={styles.label} aria-hidden="true">
        {location.label}
      </span>
    </div>
  );
}
