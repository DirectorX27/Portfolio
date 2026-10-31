import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, animate, motion } from 'motion/react';
import { MeshGradient } from '@paper-design/shaders-react';
import type { PaperShaderElement } from '@paper-design/shaders';
import { contactGradient, contactShortcut, contactSplash, contacts } from '@/config/site';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { playConnectSound } from '@/lib/sound';
import styles from './ContactButton.module.css';

// Пружина для морфинга: быстрая, с лёгким перелётом
const spring = { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 } as const;

// Смещение pill к центру кнопки в % от её ширины: 4 pill по ~72px с gap 4 → шаг ≈105%.
// Вниз: половина pill + gap (8) + половина кнопки. Десктоп 16 + 8 + 20 = 44, ниже 1040: 20 + 8 + 24 = 52.
const fromButton = (i: number, y: number) => ({
  x: `${(1.5 - i) * 105}%`,
  y,
  scaleX: 0.4,
  scaleY: 1.25,
  opacity: 0,
  filter: 'blur(6px)',
});

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function ContactButton() {
  const desktop = useMediaQuery('(min-width: 1040px)');
  const offsetY = desktop ? 44 : 52;
  const [open, setOpen] = useState(false);
  const [keyDown, setKeyDown] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // MeshGradient в React 18 не пробрасывает ref, поэтому шейдер ищем внутри кнопки
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLSpanElement>(null);
  const listId = useId();

  // Вспышка оверлея + всплеск меша: резкий подъём к peak* и мягкий спад к значениям из макета
  const splash = useCallback(() => {
    if (overlayRef.current) {
      animate(overlayRef.current, { opacity: [0, 1, 0] }, { duration: contactSplash.overlayDuration, times: [0, 0.15, 1], ease: 'easeOut' });
    }
    const mount = buttonRef.current?.querySelector<PaperShaderElement>('[data-paper-shader]')?.paperShaderMount;
    if (!mount) return;
    const lerp = (from: number, to: number, k: number) => from + (to - from) * k;
    animate(0, [0, 1, 0], {
      duration: contactSplash.duration,
      times: [0, 0.12, 1],
      ease: ['easeOut', 'easeInOut'],
      onUpdate: (k) => {
        mount.setSpeed(lerp(contactGradient.speed, contactSplash.peakSpeed, k));
        mount.setUniforms({
          u_distortion: lerp(contactGradient.distortion, contactSplash.peakDistortion, k),
          u_swirl: lerp(contactGradient.swirl, contactSplash.peakSwirl, k),
        });
      },
    });
  }, []);

  const toggle = useCallback(() => {
    playConnectSound(!open);
    setOpen(!open);
    splash();
  }, [open, splash]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setOpen(false);
      if (e.code !== contactShortcut.code || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      setKeyDown(true);
      if (!e.repeat) toggle();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === contactShortcut.code) setKeyDown(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [toggle]);

  return (
    <MotionConfig transition={spring}>
      <div ref={rootRef} className={styles.root}>
        <AnimatePresence>
          {open && (
            <ul id={listId} className={styles.list}>
              {contacts.map((item, i) => (
                <motion.li
                  key={item.label}
                  className={styles.item}
                  initial={fromButton(i, offsetY)}
                  animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ ...fromButton(i, offsetY), transition: { ...spring, delay: i * 0.02 } }}
                  transition={{ ...spring, delay: Math.abs(1.5 - i) * 0.03 }}
                >
                  <a className={styles.pill} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                    {item.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>

        <motion.button
          ref={buttonRef}
          type="button"
          className={styles.button}
          onClick={toggle}
          aria-expanded={open}
          aria-controls={listId}
          aria-keyshortcuts={contactShortcut.label.toUpperCase()}
          style={{ '--overlay': contactSplash.overlay } as React.CSSProperties}
          animate={{ scale: keyDown ? 0.97 : 1 }}
          whileTap={{ scale: 0.97 }}
        >
          <MeshGradient
            className={styles.gradient}
            colors={[...contactGradient.colors]}
            speed={contactGradient.speed}
            scale={contactGradient.scale}
            distortion={contactGradient.distortion}
            swirl={contactGradient.swirl}
            frame={contactGradient.frame}
            aria-hidden="true"
          />
          <span ref={overlayRef} className={styles.overlay} aria-hidden="true" />
          <span className={styles.label}>Connect</span>
          <kbd className={styles.key} data-pressed={keyDown || undefined}>
            <svg className={styles.keycap} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M16 0a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4h12ZM4 1a3 3 0 0 0-3 3v12c0 .828 1.343 1.5 3 1.5h12c1.657 0 3-.672 3-1.5V4a3 3 0 0 0-3-3H4Z" />
            </svg>
            <span className={styles.keyLabel}>{contactShortcut.label}</span>
          </kbd>
        </motion.button>
      </div>
    </MotionConfig>
  );
}
