import { ShaderMaterial, Texture } from 'three'
import glsl from 'glslify'
import vertex from '../glsl/default.vert'
import fragment from '../glsl/display.frag'

export default class DisplayMaterial extends ShaderMaterial {
  constructor(name: string, map: Texture | null) {
    super({
      name,
      vertexShader: glsl(vertex),
      fragmentShader: glsl(fragment),
      uniforms: {
        map: { value: map },
      },
    })
  }

  get map(): Texture | null {
    return this.uniforms.map.value
  }

  set map(value: Texture | null) {
    this.uniforms.map.value = value
  }
}