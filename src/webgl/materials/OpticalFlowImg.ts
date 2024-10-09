import { RawShaderMaterial, Texture } from 'three'
import glsl from 'glslify'
import vertex from '../glsl/defaultRaw.vert'
import flowImg from '../glsl/flowImg.frag'

export default class OpticalFlowImg extends RawShaderMaterial {
  constructor() {
    super({
      name: 'opticalFlowImg',
      vertexShader: glsl(vertex),
      fragmentShader: glsl(flowImg),
      uniforms: {
        map: { value: null },
        opticalFlow: { value: null },
        scale: { value: 0.1 },
      },
    })
  }

  get map(): Texture | null {
    return this.uniforms.map.value
  }

  set map(value: Texture | null) {
    this.uniforms.map.value = value
  }

  get opticalFlow(): Texture | null {
    return this.uniforms.opticalFlow.value
  }

  set opticalFlow(value: Texture | null) {
    this.uniforms.opticalFlow.value = value
  }

  get scale(): number {
    return this.uniforms.scale.value
  }

  set scale(value: number) {
    this.uniforms.scale.value = value
  }
}
