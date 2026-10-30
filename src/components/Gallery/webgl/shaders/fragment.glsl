precision highp float;

uniform sampler2D tMap;
uniform sampler2D tVideo;
uniform float uVideo; // 1 — в области картинки показываем видео
uniform float uImage; // доля картинки в высоте карточки (сверху)
uniform vec2 uCover; // масштаб uv видео для cover
uniform vec2 uSize; // размер карточки, css px
uniform float uRadius; // скругление картинки, css px
uniform float uBorder; // толщина обводки, css px
uniform vec3 uBorderColor;
uniform float uPx; // один физический пиксель в css px, для сглаживания

varying vec2 vUv;

float roundedBox(vec2 p, vec2 size, float r) {
  vec2 q = abs(p) - size + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// tMap — карточка с подписью, уже с премультиплицированной альфой.
// Видео идёт отдельной текстурой прямо из <video>, а скругление берётся из альфы карточки.
// Обводка рисуется здесь поверх и картинки, и видео.
void main() {
  vec4 card = texture2D(tMap, vUv);
  float top = 1.0 - uImage;
  vec4 color = card;

  if (uVideo > 0.5 && vUv.y >= top) {
    vec2 uv = vec2(vUv.x, (vUv.y - top) / uImage);
    uv = (uv - 0.5) * uCover + 0.5;
    color = vec4(texture2D(tVideo, uv).rgb * card.a, card.a);
  }

  // Обводка внутри рамки картинки, как border у box-sizing: border-box
  float imageH = uImage * uSize.y;
  vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
  float d = roundedBox(p - vec2(uSize.x, imageH) * 0.5, vec2(uSize.x, imageH) * 0.5, uRadius);
  float stroke = smoothstep(-uBorder - uPx * 0.5, -uBorder + uPx * 0.5, d) * step(p.y, imageH);
  color.rgb = mix(color.rgb, uBorderColor * color.a, stroke);

  gl_FragColor = color;
}
