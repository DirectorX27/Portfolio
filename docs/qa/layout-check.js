// Сверка вёрстки с макетом. Открой сайт в окне 1280×832, светлая тема,
// вставь скрипт в консоль DevTools. Выведет таблицу: ожидание / факт / ok.
(() => {
  const expected = [
    // [селектор, x, y, w, h] — значения из Paper, артборд main 1280×832
    ['aside', 170, 0, 300, 832],
    ['aside video', 170, 32, 148, 148],
    ['aside [role=group]', 322, 32, 148, 148],
    ['aside h1', 170, 212, 300, 20],
    ['#intro-title + p', 170, 232, 300, 20],
    ['#bio-title', 170, 284, 300, 20],
    ['#bio-title + p', 170, 312, 300, 40],
    ['#experience-title', 170, 384, 300, 20],
    ['aside ul', 170, 408, 300, 192],
    ['aside li:nth-child(1)', 170, 408, 300, 48],
    ['aside button:not([aria-pressed])', 170, 712, 300, 40],
    ['aside button[aria-pressed]', 442, 772, 28, 28],
    ['main', 550, 0, 560, 832],
  ];
  const rows = expected.map(([sel, ...exp]) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, expected: exp.join(' '), actual: 'NOT FOUND', ok: false };
    const b = el.getBoundingClientRect();
    const act = [b.x, b.y + scrollY, b.width, b.height].map(Math.round);
    const ok = act.every((v, i) => Math.abs(v - exp[i]) <= 1);
    return { sel, expected: exp.join(' '), actual: act.join(' '), ok };
  });
  console.table(rows);
  const fonts = ['Inter Display', 'Geist Mono', 'Matrix Sans Print'].map((f) => ({
    font: f,
    loaded: [...document.fonts].some((ff) => ff.family.replace(/"/g, '') === f && ff.status === 'loaded'),
  }));
  console.table(fonts);
  console.log('Viewport', innerWidth, '×', innerHeight, '| theme:', document.documentElement.dataset.theme);
})();
