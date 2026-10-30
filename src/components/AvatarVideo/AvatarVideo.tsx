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

  // Цикл ведём сами: в Safari атрибут loop иногда замирает на последнем кадре.
  // Если браузер остановил видео (вкладка ушла в фон, экран погас), запускаем снова, когда страница видна.
  // При prefers-reduced-motion оставляем постер, видео не играет.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const play = () => {
      if (mq.matches) video.pause();
      else if (document.visibilityState === 'visible') video.play().catch(() => {});
    };
    const restart = () => {
      video.currentTime = 0;
      play();
    };
    const resume = () => {
      if (video.paused) play();
    };

    play();
    mq.addEventListener('change', play);
    video.addEventListener('ended', restart);
    video.addEventListener('pause', resume);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    return () => {
      mq.removeEventListener('change', play);
      video.removeEventListener('ended', restart);
      video.removeEventListener('pause', resume);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
    };
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
