import { useEffect, useRef, useState } from 'react';
import { altOf, captionOf, isVideo, type Work } from '@/data/works';
import { gallery } from '@/config/site';
import { imageLoaded, waitFor } from '@/lib/ready';
import { fallback } from '@/lib/media';
import { distribute } from './layout';
import styles from './WorkList.module.css';

type Props = { works: Work[]; hidden: boolean };

// Тот же masonry, что и в WebGL, но обычной вёрсткой
export function WorkList({ works, hidden }: Props) {
  const columns = distribute(works, gallery.columns);

  return (
    <div className={hidden ? 'visually-hidden' : styles.list}>
      {columns.map((indices, c) => (
        <ul key={c} className={styles.column}>
          {indices.map((i) => (
            <li key={i}>
              <WorkCard work={works[i]} focusable={!hidden} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function WorkCard({ work, focusable }: { work: Work; focusable: boolean }) {
  const figure = (
    <figure className={styles.card}>
      <div className={styles.media} style={{ aspectRatio: `${work.width} / ${work.height}` }}>
        {work.src &&
          (isVideo(work) ? (
            // В скрытом списке (рядом WebGL) видео не грузим второй раз, подписи хватает скринридеру
            focusable && (
              <>
                {work.poster && <Still work={work} src={work.poster} alt="" eager />}
                <WorkVideo work={work} />
              </>
            )
          ) : (
            <Still work={work} src={work.src} alt={altOf(work)} eager={focusable} />
          ))}
      </div>
      <figcaption className={styles.caption}>
        {captionOf(work).map((text) => (
          <span key={text} className={styles.part}>
            {text}
          </span>
        ))}
      </figcaption>
    </figure>
  );

  if (!work.href) return figure;
  const external = /^https?:\/\//.test(work.href);
  return (
    <a
      className={styles.link}
      href={work.href}
      tabIndex={focusable ? undefined : -1}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
    >
      {figure}
    </a>
  );
}

// Картинка или постер. В видимом списке грузятся сразу, а не при подлёте к экрану,
// чтобы при прокрутке не появлялись на глазах; если сеть не успела — проявляются плавно
function Still({ work, src, alt, eager }: { work: Work; src: string; alt: string; eager: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    // Из кэша картинка может загрузиться раньше, чем React повесит onLoad
    if (img.complete) setLoaded(true);
    // Карточку на первом экране (планшет повыше) ждёт прелоудер
    if (eager && img.getBoundingClientRect().top < window.innerHeight) waitFor(imageLoaded(img));
  }, [eager]);

  return (
    <img
      ref={ref}
      className={styles.still}
      data-loaded={loaded || undefined}
      src={src}
      alt={alt}
      width={work.width}
      height={work.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={fallback}
    />
  );
}

// Видео без звука по кругу: грузится и играет, только пока на экране.
// Под ним постер-картинка; видео проявляется, когда пошли кадры.
function WorkVideo({ work }: { work: Work }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={styles.video}
      data-playing={playing || undefined}
      src={work.src}
      aria-label={altOf(work)}
      width={work.width}
      height={work.height}
      muted
      loop
      playsInline
      preload="none"
      onPlaying={() => setPlaying(true)}
      onError={fallback}
    />
  );
}
