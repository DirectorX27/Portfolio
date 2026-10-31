import { useLayoutEffect, type RefObject } from 'react';
import { LOW_DPI } from '@/lib/pixels';

// На экране 1x ставит начало строки на целый пиксель — тогда точки Matrix Sans 1x
// попадают ровно в пиксели. По центру круга строка нечётной ширины начинается с половины
// пикселя, поэтому сдвигаем на остаток. На ретине ничего не делает.
export function useSnapToPixel(ref: RefObject<HTMLElement | null>, text: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia(LOW_DPI);

    const snap = () => {
      el.style.translate = '';
      if (!mq.matches || !el.firstChild) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const { left, top } = range.getBoundingClientRect();
      const dx = Math.round(left) - left;
      const dy = Math.round(top) - top;
      if (dx || dy) el.style.translate = `${dx}px ${dy}px`;
    };

    snap();
    // Шрифт мог ещё не загрузиться, а ширина строки зависит от него
    document.fonts.ready.then(snap);
    window.addEventListener('resize', snap);
    mq.addEventListener('change', snap);
    return () => {
      window.removeEventListener('resize', snap);
      mq.removeEventListener('change', snap);
    };
  }, [ref, text]);
}
