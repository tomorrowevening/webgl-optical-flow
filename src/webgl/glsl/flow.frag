uniform sampler2D current;
uniform sampler2D prev;
uniform float offset;
uniform float lambda;
varying vec2 vUv;

#include ./opticalFlow.glsl;

void main() {
  gl_FragColor = vec4(opticalFlow(vUv, current, prev, offset, lambda), 0.0, 1.0);
}