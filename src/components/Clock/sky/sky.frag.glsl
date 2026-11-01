precision highp float;

uniform vec2 uRes;
uniform float uTime, uSeed;
uniform vec3 uTop, uBot, uWarm, uCloudCol, uFogCol;
uniform vec2 uSun;
uniform float uSunA, uSunDisc, uStarA, uClouds, uFog, uFlash, uScrim, uDrift, uFogDrift, uCity, uMoonPhase;

const vec3 CITY = vec3(1.0, 0.7, 0.48); // натриевые фонари: рыжая засветка снизу

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p + 3.1; a *= 0.5; }
  return v;
}

// Блик объектива: мягкий диск со светлой кромкой
vec3 ghost(vec2 uv, vec2 c, float r, vec3 tint) {
  float d = length(uv - c);
  float disc = smoothstep(r, r * 0.7, d);
  float rim = exp(-pow((d - r * 0.92) / (r * 0.12), 2.0));
  return tint * (disc * 0.05 + rim * 0.07);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = vec2(frag.x / uRes.x, 1.0 - frag.y / uRes.y);
  vec3 col = mix(uTop, uBot, smoothstep(0.0, 1.0, uv.y));
  // Засветка города у горизонта
  col += CITY * uCity * (0.22 * exp(-(1.0 - uv.y) * 4.5) + 0.03);

  // Звёзды: случайная точка в ячейке сетки, мерцают
  vec2 sp = uv * 34.0;
  vec2 cell = floor(sp);
  float h = hash(cell + uSeed);
  if (h > 0.9) {
    vec2 o = vec2(hash(cell + 1.7), hash(cell + 3.1)) - 0.5;
    float d = length(fract(sp) - 0.5 - o * 0.6) * uRes.x / 34.0; // в пикселях
    float tw = 0.5 + 0.5 * sin(uTime * (1.0 + h * 2.0) + h * 60.0);
    col += smoothstep(1.4, 0.0, d) * uStarA * tw * (h - 0.9) * 10.0;
  }

  // Луна с фазой: 0 новолуние, 0.25 первая четверть, 0.5 полнолуние, 0.75 последняя четверть.
  // В северном полушарии растущая луна освещена справа.
  vec2 mo = (uv - vec2(0.7, 0.27)) / 0.05; // локальные координаты, радиус 1
  float mr = length(mo);
  float litFrac = 0.5 - 0.5 * cos(6.2832 * uMoonPhase);
  col += vec3(0.9, 0.9, 0.85) * uStarA * 0.24 * litFrac * exp(-mr * 0.5);
  float k = cos(6.2832 * uMoonPhase);
  float edge = k * sqrt(max(0.0, 1.0 - mo.y * mo.y)); // линия терминатора
  float moonLit = uMoonPhase < 0.5
    ? smoothstep(edge - 0.1, edge + 0.1, mo.x)
    : 1.0 - smoothstep(-edge - 0.1, -edge + 0.1, mo.x);
  float maria = 0.86 + 0.14 * noise(mo * 2.2 + 4.0); // «моря» на диске
  vec3 earthshine = col + vec3(0.03, 0.035, 0.05);   // тёмная часть чуть светлее неба
  vec3 moon = mix(earthshine, vec3(0.96, 0.95, 0.89) * maria, moonLit);
  col = mix(col, moon, smoothstep(1.0, 0.86, mr) * uStarA);

  // Солнце как в Apple Погоде. Здесь — то, что лежит в небе под облаками: дымка и кольцо гало.
  // Ядро, свечение, блики и лучи — в конце, поверх притемнения.
  float sd = length(uv - uSun);
  // Белый с лёгкой примесью тёплого: днём почти чистый, на закате рыжеет
  vec3 sunCol = mix(vec3(1.0, 0.99, 0.96), uWarm, 0.6);
  // Дымка: небо вокруг солнца выцветает в бледно-голубое, как при рассеянии в атмосфере
  float haze = exp(-sd * 2.6) * uSunA;
  col = mix(col, mix(vec3(0.8, 0.88, 0.98), sunCol, exp(-sd * 6.0)), clamp(haze * 0.55, 0.0, 1.0));
  // Кольцо гало: радужная полоса, красный внутри, синий снаружи
  float rd = sd - 0.36, w = 0.016;
  vec3 rainbow = vec3(exp(-pow((rd + w) / w, 2.0)), exp(-pow(rd / w, 2.0)), exp(-pow((rd - w) / w, 2.0)));
  float breathe = 0.85 + 0.15 * sin(uTime * 0.4);
  col += (rainbow * 0.9 + 0.15 * exp(-pow(rd / (w * 3.0), 2.0))) * 0.11 * uSunA * breathe;

  // Облака: fbm с искажением координат, растянуты по горизонтали
  vec2 p = vec2(uv.x * 1.7 + uDrift, uv.y * 2.8) + uSeed * 7.0;
  vec2 q = vec2(fbm(p + uTime * 0.012), fbm(p + vec2(5.2, 1.3) - uTime * 0.009));
  vec2 wp = p + 0.9 * q;
  float d = fbm(wp);
  float th = mix(0.74, 0.22, uClouds);
  float dens = smoothstep(th, th + 0.26, d) * smoothstep(0.0, 0.05, uClouds);
  // Свет: сравниваем плотность с точкой чуть ближе к солнцу — освещённая кромка светлее.
  // В сплошной облачности рельеф мягче, иначе небо похоже на мрамор.
  vec2 toSun = normalize(uSun - uv + 1e-4) * 0.05;
  float dl = fbm(wp + vec2(toSun.x * 1.7, toSun.y * 2.8));
  float lit = clamp(0.55 + (d - dl) * mix(5.0, 2.5, uClouds), 0.0, 1.0);
  vec3 cc = uCloudCol * mix(mix(0.62, 0.78, uClouds), 1.04, lit) * mix(1.0, 0.82, smoothstep(0.4, 1.0, dens) * uv.y);
  cc += uWarm * uSunA * pow(lit, 3.0) * 0.3 * (1.0 - dens * 0.5);
  cc += CITY * uCity * (0.04 + 0.11 * uv.y); // ночью облака подсвечены городом снизу
  col = mix(col, cc, dens * 0.96);
  col = mix(col, uCloudCol * 0.8, smoothstep(0.55, 1.0, uClouds) * 0.4 * (1.0 - dens * 0.5));

  // Туман: мягкие клочья, гуще у низа
  float fn = fbm(vec2(uv.x * 2.2 + uFogDrift, uv.y * 5.0 - uTime * 0.015) + uSeed * 3.0);
  float fn2 = fbm(vec2(uv.x * 1.2 - uFogDrift * 0.6, uv.y * 3.0) + uSeed * 5.0 + 11.0);
  float band = smoothstep(0.05, 0.9, uv.y);
  float fogA = uFog * clamp((fn * 0.7 + fn2 * 0.6 - 0.35) * 1.6 * band + band * 0.3, 0.0, 0.88);
  col = mix(col, uFogCol + CITY * uCity * 0.12, fogA);

  // Вспышка молнии сверху вниз
  col += vec3(0.88, 0.9, 1.0) * uFlash * mix(0.75, 0.2, uv.y);

  // Читаемость: притемнение и виньетка
  col *= 1.0 - uScrim;
  col *= 1.0 - smoothstep(0.3, 0.52, length(uv - 0.5)) * 0.22;

  // Солнце светит поверх притемнения и виньетки, иначе белое ядро становится серым.
  // Облака его закрывают (occl), блики и лучи рождаются в объективе и лежат поверх всего.
  float occl = 1.0 - dens * 0.9;
  col += sunCol * uSunA * occl * (0.9 * exp(-sd * 18.0) + 0.38 * exp(-sd * 6.5) + 0.1 * exp(-sd * 2.2));
  // Ядро пересвечено: края нет, плато белого переходит в свечение
  float core = smoothstep(0.085, 0.0, sd);
  col = mix(col, vec3(1.0), clamp(core * 1.6, 0.0, 1.0) * uSunDisc * occl);

  vec2 axis = vec2(0.5) - uSun;
  float drift = 0.012 * sin(uTime * 0.3);
  vec3 g = ghost(uv, uSun + axis * (0.38 + drift), 0.035, vec3(1.0, 0.95, 0.85));
  g += ghost(uv, uSun + axis * (0.52 + drift), 0.055, vec3(0.9, 0.95, 1.0));
  g += ghost(uv, uSun + axis * (0.68 + drift), 0.075, vec3(0.85, 0.92, 1.0));
  g += ghost(uv, uSun + axis * (0.86 + drift), 0.045, vec3(1.0, 0.9, 0.8));
  g += ghost(uv, uSun + axis * (1.35 + drift * 2.0), 0.11, vec3(0.8, 0.9, 1.0));
  col += g * uSunDisc;

  vec2 sv = uv - uSun;
  float ang = atan(sv.y, sv.x);
  float rays = pow(abs(sin(ang * 5.0 + uTime * 0.03)), 30.0) * 0.6 + pow(abs(sin(ang * 9.0 - 1.3 - uTime * 0.02)), 50.0) * 0.4;
  col += sunCol * rays * exp(-sd * 7.0) * 0.175 * uSunDisc * occl;

  // Потолок яркости 0.9: выше колена свет плавно сжимается и не доходит до белого текста.
  // Только пока видно солнце — вспышки молний в грозу не трогаем.
  vec3 over = max(col - 0.68, 0.0);
  vec3 capped = min(col, vec3(0.68)) + 0.22 * (1.0 - exp(-over / 0.22));
  col = mix(col, capped, uSunDisc);

  gl_FragColor = vec4(col, 1.0);
}
