import { useEffect, useRef } from 'react';
import { avatar, profile } from '@/config/site';
import styles from './AvatarVideo.module.css';

export function AvatarVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  // Уважаем prefers-reduced-motion: оставляем постер, видео не играет
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (mq.matches) video.pause();
      else video.play().catch(() => {});
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <video
      ref={ref}
      className={styles.avatar}
      poster={avatar.poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={`${profile.name}, portrait`}
    >
      <source src={avatar.videoWebm} type="video/webm" />
      <source src={avatar.videoMp4} type="video/mp4" />
    </video>
  );
}
