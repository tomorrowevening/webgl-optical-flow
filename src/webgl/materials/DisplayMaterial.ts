import { RawShaderMaterial, Texture } from 'three'
import glsl from 'glslify'
import vertex from '../glsl/defaultRaw.vert'
import fragment from '../glsl/display.frag'

export default class DisplayMaterial extends RawShaderMaterial {
  constructor(name: string, map: Texture | null) {
    super({
      name: name,
      vertexShader: glsl(vertex),
      fragmentShader: glsl(fragment),
      uniforms: {
        map: { value: map },
      },
    })
    this.name = name
  }

  get map(): Texture | null {
    return this.uniforms.map.value
  }

  set map(value: Texture | null) {
    this.uniforms.map.value = value
  }
}