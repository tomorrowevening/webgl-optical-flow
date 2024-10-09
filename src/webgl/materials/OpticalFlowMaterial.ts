import { ShaderMaterial, Texture } from 'three'
import glsl from 'glslify'
import vertex from '../glsl/default.vert'
import flow from '../glsl/flow.frag'

export default class OpticalFlowMaterial extends ShaderMaterial {
  constructor() {
    super({
      name: 'opticalFlow',
      vertexShader: glsl(vertex),
      fragmentShader: glsl(flow),
      uniforms: {
        current: { value: null },
        prev: { value: null },
        offset: { value: 0.1 },
        lambda: { value: 0.001 },
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

  get offset(): number {
    return this.uniforms.offset.value
  }

  set offset(value: number) {
    this.uniforms.offset.value = value
  }

  get lambda(): number {
    return this.uniforms.lambda.value
  }

  set lambda(value: number) {
    this.uniforms.lambda.value = value
  }
}
