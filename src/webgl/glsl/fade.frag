uniform sampler2D current;
uniform sampler2D prev;
uniform float fade;
varying vec2 vUv;

void main() {
  vec3 color = texture2D(prev, vUv).rgb;
  color = max(color - vec3(fade), vec3(0.0));

  vec4 inputImg = texture2D(current, vUv);
  color += inputImg.rgb;

  gl_FragColor = vec4(color, 1.0);
}