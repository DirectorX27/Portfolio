import { useEffect, useState } from 'react';

type ZonedTime = { hours: string; minutes: string; iso: string };

function read(timeZone: string): ZonedTime {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { hours: get('hour'), minutes: get('minute'), iso: now.toISOString() };
}

// Часы и минуты в указанном часовом поясе. Тикает ровно на смене минуты.
export function useZonedTime(timeZone: string): ZonedTime {
  const [time, setTime] = useState(() => read(timeZone));

  useEffect(() => {
    let timer: number;
    const schedule = () => {
      setTime(read(timeZone));
      const msToNextMinute = 60_000 - (Date.now() % 60_000);
      timer = window.setTimeout(schedule, msToNextMinute + 20);
    };
    schedule();

    // Фоновые вкладки троттлят таймеры — пересчитываем при возвращении
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timer);
        schedule();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timeZone]);

  return time;
}
