precision lowp float;

uniform sampler2D map;
uniform sampler2D opticalFlow;
uniform float scale;
varying vec2 vUv;

void main() {
  vec4 flowImg = texture2D(opticalFlow, vUv);
  vec2 flow = flowImg.xy * scale;
  vec2 uv = vUv + flow;
  gl_FragColor = texture2D(map, uv);
}