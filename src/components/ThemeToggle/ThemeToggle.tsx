import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from '@/hooks/useTheme';
import { playToggleSound } from '@/lib/sound';
import styles from './ThemeToggle.module.css';

// easeOutBack: лёгкий перелёт по повороту и масштабу
const transition = { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] } as const;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  const onToggle = () => {
    playToggleSound(!isDark);
    toggle();
  };

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.button}
        onClick={onToggle}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-pressed={isDark}
      >
        <svg viewBox="0 0 12 12" width="20" height="20" aria-hidden="true">
          {/* Обе иконки рисуются одновременно: старая уходит на +90°, новая входит с −90° */}
          <AnimatePresence initial={false} mode="popLayout">
            <motion.g
              key={isDark ? 'sun' : 'moon'}
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={transition}
            >
              {isDark ? (
                <path
                  transform="translate(0 -6)"
                  d="M8.945 12a2.97 2.97 0 0 1-1.84 2.749 2.985 2.985 0 0 1-3.248-0.647A2.974 2.974 0 0 1 5.971 9.025a2.98 2.98 0 0 1 2.105 0.872A2.97 2.97 0 0 1 8.945 12M1.601 12.524H1.025A0.525 0.525 0 0 1 0.5 12a0.523 0.523 0 0 1 0.525-0.524h0.577A0.525 0.525 0 0 1 2.127 12a0.523 0.523 0 0 1-0.525 0.524m9.373 0h-0.571A0.525 0.525 0 0 1 9.879 12a0.523 0.523 0 0 1 0.525-0.524h0.572A0.525 0.525 0 0 1 11.5 12a0.523 0.523 0 0 1-0.525 0.524m-4.982-4.4a0.525 0.525 0 0 1-0.525-0.524V7.024A0.523 0.523 0 0 1 5.993 6.5a0.525 0.525 0 0 1 0.524 0.524V7.6a0.523 0.523 0 0 1-0.525 0.524m0 9.376a0.525 0.525 0 0 1-0.525-0.523V16.4a0.523 0.523 0 0 1 0.525-0.524 0.525 0.525 0 0 1 0.525 0.524v0.576A0.523 0.523 0 0 1 5.992 17.5M2.877 9.412a0.525 0.525 0 0 1-0.373-0.157l-0.409-0.403a0.525 0.525 0 0 1 0.372-0.898c0.14 0 0.274 0.056 0.373 0.154l0.409 0.408a0.523 0.523 0 0 1 0 0.739 0.525 0.525 0 0 1-0.372 0.157m6.635 6.611a0.525 0.525 0 0 1-0.367-0.152l-0.409-0.409a0.523 0.523 0 0 1 0.57-0.869q0.098 0.048 0.17 0.131l0.409 0.408a0.523 0.523 0 0 1 0 0.739 0.525 0.525 0 0 1-0.373 0.152m-0.404-6.611a0.525 0.525 0 0 1-0.517-0.627c0.02-0.102 0.071-0.196 0.145-0.269l0.409-0.408a0.525 0.525 0 0 1 0.74 0.744l-0.41 0.403a0.525 0.525 0 0 1-0.367 0.157M2.467 16.023a0.525 0.525 0 0 1-0.372-0.152 0.523 0.523 0 0 1-0.001-0.739l0.41-0.408a0.525 0.525 0 0 1 0.745 0 0.523 0.523 0 0 1 0 0.738l-0.409 0.409a0.525 0.525 0 0 1-0.373 0.152"
                />
              ) : (
                <path
                  transform="translate(0 -1.5)"
                  d="M10.94 9.074a5.115 5.115 0 0 1-9.815-2.82 5.14 5.14 0 0 1 3.315-3.685 0.885 0.885 0 0 1 0.5-0.035 0.9 0.9 0 0 1 0.445 0.224 0.905 0.905 0 0 1 0.24 0.92 3.5 3.5 0 0 0-0.04 2.105 3.135 3.135 0 0 0 2.15 2.155 3.45 3.45 0 0 0 2.1-0.04 0.915 0.915 0 0 1 0.5 0 0.9 0.9 0 0 1 0.65 0.696 0.9 0.9 0 0 1-0.045 0.48"
                />
              )}
            </motion.g>
          </AnimatePresence>
        </svg>
      </button>
      {/* Невидимый нативный switch под пальцем: на iOS Safari даёт тактильный отклик */}
      <span aria-hidden="true" className={styles.haptic}>
        <input
          type="checkbox"
          tabIndex={-1}
          aria-hidden="true"
          checked={isDark}
          onChange={onToggle}
          ref={(el) => el?.setAttribute('switch', '')}
        />
      </span>
    </div>
  );
}
