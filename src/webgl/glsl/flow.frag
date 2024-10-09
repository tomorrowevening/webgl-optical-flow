precision highp float;

uniform sampler2D current;
uniform sampler2D prev;
uniform float offset;
uniform float lambda;
varying vec2 vUv;

#include ./opticalFlow.glsl;

void main() {
  vec2 flow = opticalFlow(vUv, current, prev, offset, lambda);
  gl_FragColor = vec4(flow, 0.0, 1.0);
}