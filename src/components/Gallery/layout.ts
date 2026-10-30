import type { Work } from '@/data/works';

// Masonry: каждая работа уходит в колонку, где сумма пропорций (h/w) меньше.
// От ширины не зависит, поэтому одинаково для WebGL и HTML-списка.
export function distribute(items: Work[], columns: number): number[][] {
  const count = Math.max(1, Math.min(columns, items.length));
  const cols: number[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);

  items.forEach((work, i) => {
    const target = heights.indexOf(Math.min(...heights));
    cols[target].push(i);
    heights[target] += work.height / work.width;
  });

  return cols;
}
