import { RawShaderMaterial, Texture } from 'three'
import glsl from 'glslify'
import vertex from '../glsl/defaultRaw.vert'
import fade from '../glsl/fade.frag'

export default class OpticalFlowFadeMaterial extends RawShaderMaterial {
  constructor() {
    super({
      name: 'opticalFlowFade',
      vertexShader: glsl(vertex),
      fragmentShader: glsl(fade),
      uniforms: {
        current: { value: null },
        prev: { value: null },
        fade: { value: 0.01 },
      },
    })
  }

  get currentTexture(): Texture | null {
    return this.uniforms.current.value
  }

  set currentTexture(value: Texture | null) {
    this.uniforms.current.value = value
  }

  get prevTexture(): Texture | null {
    return this.uniforms.prev.value
  }

  set prevTexture(value: Texture | null) {
    this.uniforms.prev.value = value
  }

  get fade(): number {
    return this.uniforms.fade.value
  }

  set fade(value: number) {
    this.uniforms.fade.value = value
  }
}
