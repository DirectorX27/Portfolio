import { useEffect, useRef, useState } from 'react';
import { avatar, profile } from '@/config/site';
import { imageLoaded, waitFor } from '@/lib/ready';
import styles from './AvatarVideo.module.css';

// Постер — обычная картинка под видео: Safari рисует poster у <video> с задержкой,
// а картинку прелоудер может дождаться. Видео проявляется поверх, когда пошли кадры.
export function AvatarVideo() {
  const imgRef = useRef<HTMLImageElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (imgRef.current) waitFor(imageLoaded(imgRef.current));
  }, []);

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
    <div className={styles.avatar} role="img" aria-label={`${profile.name}, portrait`}>
      <img ref={imgRef} className={styles.layer} src={avatar.poster} alt="" />
      <video
        ref={ref}
        className={styles.layer}
        data-playing={playing || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onPlaying={() => setPlaying(true)}
      >
        <source src={avatar.videoWebm} type="video/webm" />
        <source src={avatar.videoMp4} type="video/mp4" />
      </video>
    </div>
  );
}
