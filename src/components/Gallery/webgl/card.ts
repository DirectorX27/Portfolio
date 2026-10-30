import { captionOf, type Work } from '@/data/works';
import { gallery } from '@/config/site';

// Карточка (картинка + подпись) рисуется в 2D-канвас и уходит в WebGL одной текстурой,
// чтобы подпись изгибалась вместе с картинкой.

export type Palette = { secondary: string; placeholder: string; border: string };

export const captionHeight =
  gallery.caption.gap + gallery.caption.lineHeight * (gallery.caption.layout === 'row' ? 1 : 2);

export function imageHeight(work: Work, width: number) {
  return (width * work.height) / work.width;
}

export function cardHeight(work: Work, width: number) {
  return imageHeight(work, width) + captionHeight;
}

export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  return {
    secondary: css.getPropertyValue('--textsecondary').trim(),
    placeholder: css.getPropertyValue('--surfaceneutral').trim(),
    border: css.getPropertyValue('--border-divider').trim(),
  };
}

// Любой css-цвет → [r, g, b] в 0..1 для шейдера
export function toRgb(color: string): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

export function drawCard(
  canvas: HTMLCanvasElement,
  work: Work,
  image: HTMLImageElement | null,
  width: number,
  dpr: number,
  palette: Palette,
) {
  const imgH = imageHeight(work, width);
  const h = imgH + captionHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, h);

  // Картинка: cover в рамку с пропорцией из данных (обычно совпадает с файлом один в один)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, imgH, gallery.radius);
  ctx.clip();
  if (image) {
    const scale = Math.max(width / image.naturalWidth, imgH / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, (width - dw) / 2, (imgH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = palette.placeholder;
    ctx.fillRect(0, 0, width, imgH);
  }
  ctx.restore();

  // Подпись: как строки Experience (Inter Display opsz 32, 14/20, regular, textsecondary)
  const { gap, lineHeight, fontSize, layout, paddingInline } = gallery.caption;
  ctx.font = `400 ${fontSize}px 'Inter Display Static', system-ui, sans-serif`;
  ctx.letterSpacing = '-0.2px';
  ctx.textBaseline = 'middle';
  const top = imgH + gap + lineHeight / 2;

  ctx.textAlign = 'left';
  ctx.fillStyle = palette.secondary;
  const parts = captionOf(work);
  const inner = width - paddingInline * 2;
  if (layout === 'row') {
    // Два блока — половины ширины с зазором 8, как company/period в Experience, оба по левому краю.
    // Один блок занимает всю ширину
    const slot = (inner - 8 * (parts.length - 1)) / parts.length;
    parts.forEach((text, i) => ctx.fillText(fit(ctx, text, slot), paddingInline + i * (slot + 8), top));
  } else {
    parts.forEach((text, i) => ctx.fillText(fit(ctx, text, inner), paddingInline, top + i * lineHeight));
  }
}
