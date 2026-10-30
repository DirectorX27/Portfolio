#define PI 3.1415926535897932384626433832795

precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uStrength;
uniform vec2 uViewportSizes;

varying vec2 vUv;

// Изгиб из Codrops: середина экрана уходит в глубину пропорционально скорости
void main() {
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  p.z += sin(p.y / uViewportSizes.y * PI + PI / 2.0) * -uStrength;
  vUv = uv;
  gl_Position = projectionMatrix * p;
}
