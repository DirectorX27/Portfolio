import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { works } from '@/data/works';
import { gallery } from '@/config/site';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ContactLinks } from '@/components/ContactLinks/ContactLinks';
import { WorkList } from './WorkList';
import { GalleryScene } from './webgl/GalleryScene';
import { webglSupported } from './webgl/supported';
import styles from './Gallery.module.css';

// Десктоп: бесконечная WebGL-лента в колонке 560px. Мобильный или без WebGL: обычный список.
// HTML-список есть всегда — на десктопе он скрыт визуально и нужен скринридерам.
export function Gallery() {
  const desktop = useMediaQuery('(min-width: 1040px)');
  const reduced = useReducedMotion();
  const webgl = desktop && works.length > 0 && webglSupported();
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GalleryScene | null>(null);

  useEffect(() => {
    if (!webgl || !stageRef.current) return;
    const scene = new GalleryScene(stageRef.current, works, reduced);
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // reduced передаётся отдельно, без пересоздания сцены
  }, [webgl]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reduced);
  }, [reduced]);

  return (
    <main className={styles.gallery} id="gallery" aria-label="Work" data-mode={webgl ? 'webgl' : 'list'}>
      {webgl && (
        <div
          ref={stageRef}
          className={styles.canvas}
          data-slot="gallery-canvas"
          style={{ '--gallery-bleed': `${gallery.bleed}px` } as CSSProperties}
        />
      )}
      <WorkList works={works} hidden={webgl} />
      {!desktop && <ContactLinks />}
    </main>
  );
}
