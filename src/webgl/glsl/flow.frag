precision highp float;

uniform sampler2D current;
uniform sampler2D prev;
uniform float offset;
uniform float lambda;
varying vec2 vUv;

#include ./opticalFlow.glsl;

void main() {
  vec2 flowA = opticalFlow(vUv, current, prev, offset, lambda);
  vec2 flowB = opticalFlow(vUv, current, prev, -offset, lambda);
  vec2 flow = abs(flowA) + abs(flowB);
  float velocityLen = clamp(1.0 - pow(1.0 - min(1.0, length(flow)), 3.0), 0.0, 1.0);
  gl_FragColor = vec4(flow, velocityLen, 1.0);
}