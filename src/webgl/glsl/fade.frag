uniform sampler2D current;
uniform sampler2D prev;
uniform float time;
varying vec2 vUv;

const float circleRadius = 0.1;

float drawCircle(vec2 pos, vec2 uv) {
  float dist = distance(pos, uv);
  if(dist < circleRadius) {
    float a = 1.0;
    // Anti-alias
    float maxDist = circleRadius * 0.6;
    if(dist > maxDist) {
      a = 1.0 - ((dist - maxDist) / (circleRadius - maxDist));
    }
    return a;
  }
  return 0.0;
}

vec3 HueShift (in vec3 Color, in float Shift) {
  vec3 P = vec3(0.55735)*dot(vec3(0.55735),Color);
  
  vec3 U = Color-P;
  
  vec3 V = cross(vec3(0.55735),U);  

  Color = U*cos(Shift*6.2832) + V*sin(Shift*6.2832) + P;
  
  return vec3(Color);
}

void main() {
  // vec4 color = vec4(vUv, 0.0, 1.0);
  vec3 color = texture2D(prev, vUv).rgb;
  color -= vec3(0.01);

  vec4 inputImg = texture2D(current, vUv);
  color = mix(color, inputImg.rgb, inputImg.a);

  // Draw new circle
  vec2 pos = vec2(
    sin(time) * 0.3 + 0.5,
    cos(time) * 0.3 + 0.5
  );
  float circle = drawCircle(pos, vUv);
  color = mix(color, HueShift(vec3(vUv, 1.0), time * 0.1), circle);

  gl_FragColor = vec4(color, 1.0);
}