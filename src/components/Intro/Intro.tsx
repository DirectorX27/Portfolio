import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { contactGradient, profile } from '@/config/site';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import styles from './Intro.module.css';

// Как часто сменяется слово
const INTERVAL_MS = 4500;
// Задержка между буквами при проявлении, мс
const LETTER_STAGGER_MS = 45;
// Длительность сдвига «designer», как transition: width у .role
const WIDTH_TRANSITION_MS = 450;

// Цвета волны — из MeshGradient кнопки Contact: --mesh-0..3 в keyframes letter-reveal
const meshColors = Object.fromEntries(
  contactGradient.colors.map((color, i) => [`--mesh-${i}`, color]),
) as React.CSSProperties;

export function Intro() {
  const { roles, roleSuffix } = profile;
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const current = roles[step % roles.length];
  const roleRef = useRef<HTMLSpanElement>(null);
  // Ширина старого слова, замеренная прямо перед сменой
  const prevWidth = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      prevWidth.current = roleRef.current?.getBoundingClientRect().width ?? null;
      setStep((s) => s + 1);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // «designer» едет плавно: ширина слова-роли анимируется от старой к новой, потом снова auto
  useLayoutEffect(() => {
    const el = roleRef.current;
    const from = prevWidth.current;
    if (!el) return;
    // Снимаем ширину, оставшуюся от прошлой смены: в фоновой вкладке transitionend может не прийти,
    // и тогда новое слово замерялось бы по старой ширине и наезжало на «designer»
    el.style.width = '';
    if (from === null || reduced) return;
    const to = el.getBoundingClientRect().width;
    if (Math.abs(to - from) < 0.5) return;
    el.style.width = `${from}px`;
    void el.offsetWidth; // фиксируем стартовую ширину, иначе переход не запустится
    el.style.width = `${to}px`;
    const reset = () => (el.style.width = '');
    el.addEventListener('transitionend', reset, { once: true });
    // Страховка, если transitionend не придёт
    const timer = window.setTimeout(reset, WIDTH_TRANSITION_MS + 100);
    return () => {
      el.removeEventListener('transitionend', reset);
      window.clearTimeout(timer);
      reset();
    };
  }, [step, reduced]);

  return (
    <section className={styles.intro} aria-labelledby="intro-title">
      <h1 id="intro-title" className={styles.title}>
        {profile.name}
      </h1>
      <p className={styles.description}>
        is a{' '}
        <span className={styles.accent}>
          <span className="visually-hidden">{roles[0]}</span>
          <span ref={roleRef} className={styles.role} style={meshColors} aria-hidden="true">
            {/* key={step}: при смене слова буквы монтируются заново и анимация проявления стартует с начала.
                На первом показе (step 0) слово стоит без анимации */}
            <Fragment key={step}>
              {reduced || step === 0
                ? current
                : [...current].map((letter, i) => (
                    <span key={i} className={styles.letter} style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}>
                      {letter}
                    </span>
                  ))}
            </Fragment>
          </span>{' '}
          {roleSuffix}
        </span>
      </p>
    </section>
  );
}
