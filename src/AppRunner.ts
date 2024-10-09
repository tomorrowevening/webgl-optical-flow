import WebGLApp from './webgl/WebGLApp'

export default class AppRunner {
  private playing = false
  private raf = -1
  private webgl: WebGLApp

  constructor(canvas: HTMLCanvasElement, camera: HTMLVideoElement) {
    this.webgl = new WebGLApp(canvas, camera)
    this.webgl.resize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', this.onResize)
  }

  dispose() {
    window.removeEventListener('resize', this.onResize)
    this.pause()
    this.webgl.dispose()
  }

  play() {
    if (this.playing) return
    this.playing = true
    this.onUpdate()
  }

  private pause() {
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.raf = -1
  }

  private onUpdate = () => {
    if (!this.playing) return
    this.webgl.update()
    this.webgl.draw()
    this.raf = requestAnimationFrame(this.onUpdate)
  }

  private onResize = () => {
    this.webgl.resize(window.innerWidth, window.innerHeight)
  }
}
