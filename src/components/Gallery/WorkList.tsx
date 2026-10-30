import { useEffect, useRef } from 'react';
import { altOf, captionOf, isVideo, type Work } from '@/data/works';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gallery } from '@/config/site';
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
            focusable && <WorkVideo work={work} />
          ) : (
            <img src={work.src} alt={altOf(work)} width={work.width} height={work.height} loading="lazy" />
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

// Видео без звука по кругу: грузится и играет, только пока на экране.
// До этого виден постер; при reduced-motion видео не запускается.
function WorkVideo({ work }: { work: Work }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <video
      ref={ref}
      src={work.src}
      poster={work.poster}
      aria-label={altOf(work)}
      width={work.width}
      height={work.height}
      muted
      loop
      playsInline
      preload="none"
    />
  );
}
