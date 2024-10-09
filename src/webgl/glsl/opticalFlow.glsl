/**
 * Optical flow GLSL module.
 * May work best if the views are pre-processed (e.g: blur).
 *
 * @see https://forum.openframeworks.cc/t/ofxflowtools-optical-flow-fluid-dynamics-and-particles-in-glsl/15470
 * @see https://github.com/moostrik/ofxFlowTools
 * @see https://github.com/diwi/PixelFlow
 * @see http://thomasdiewald.com/blog/?p=2766
 * @see https://adamferriss.com/gush/
 * @see https://github.com/princemio/ofxMIOFlowGLSL/blob/master/src/FlowShader.cpp
 */

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float luma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

#define opticalFlowPixel_extern 0
#define opticalFlowPixel_normal 1
#define opticalFlowPixel_luma 2
#ifndef opticalFlowPixel
  #define opticalFlowPixel opticalFlowPixel_luma
#endif

#if opticalFlowPixel == opticalFlowPixel_luma
  vec4 pixel(sampler2D img, vec2 uv) {
    vec4 color = texture2D(img, uv);

    return vec4(vec3(luma(color)), color.a);
  }
#elif opticalFlowPixel == opticalFlowPixel_normal
  vec4 pixel(sampler2D img, vec2 uv) { return texture2D(img, uv); }
#else
  // To provide external `pixel` lookup function.
  vec4 pixel(sampler2D img, vec2 uv);
#endif

// @todo Sample mimaps at different LODs/scales to capture wider features.
vec2 opticalFlow(in vec2 uv, in sampler2D next, in sampler2D past,
    in float offset, in float lambda) {
  vec2 off = vec2(offset, 0.0);

  vec4 gradX = (pixel(next, uv+off.xy)-pixel(next, uv-off.xy))+
    (pixel(past, uv+off.xy)-pixel(past, uv-off.xy));

  vec4 gradY = (pixel(next, uv+off.yx)-pixel(next, uv-off.yx))+
    (pixel(past, uv+off.yx)-pixel(past, uv-off.yx));

  vec4 gradMag = sqrt((gradX*gradX)+(gradY*gradY)+vec4(lambda));

  vec4 diff = pixel(next, uv)-pixel(past, uv);

  return vec2((diff*(gradX/gradMag)).x, (diff*(gradY/gradMag)).x);
}

vec2 opticalFlow(in vec2 uv, in sampler2D views[2], in float offset,
    in float lambda) {
  return opticalFlow(uv, views[0], views[1], offset, lambda);
}

#pragma glslify: export(opticalFlow);