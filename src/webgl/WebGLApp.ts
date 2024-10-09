/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Clock, ColorManagement, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, VideoTexture, WebGLRenderer } from 'three';
import { Pane } from 'tweakpane'
import glsl from 'glslify'
import vertex from './glsl/default.vert'
import flow from './glsl/flow.frag'
// import fade from './glsl/fade.frag'
import { FBO, Pass } from './utils';
import DisplayMaterial from './materials/DisplayMaterial';

export default class WebGLApp {
  // Core
  private clock: Clock
  private debug!: Pane
  private renderer!: WebGLRenderer
  private scene!: Scene
  private camera!: OrthographicCamera
  private feedCamera!: OrthographicCamera

  // Render Targets
  private currentFBO!: FBO
  private prevFBO!: FBO
  private opticalFlowFBO!: FBO
  // Shaders
  private opticalFlowMat!: ShaderMaterial
  // private opticalFlowFadeMat!: ShaderMaterial

  // App
  private currentMesh!: Mesh
  private prevMesh!: Mesh
  private cameraPass!: Pass
  private opticalFlow!: Pass

  // Elements
  private canvas: HTMLCanvasElement
  private video: HTMLVideoElement

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    this.canvas = canvas
    this.video = video
    this.clock = new Clock()

    this.setupCore()
    this.setupPasses()
    this.setupScene()
    this.setupDebug()
    this.clock.start()
  }

  private setupCore() {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      stencil: false,
    })
    this.renderer.autoClear = false;
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.setClearColor(0x101010);
    this.renderer.setClearAlpha(1);
    this.renderer.setPixelRatio(devicePixelRatio)
    ColorManagement.enabled = false;

    this.camera = new OrthographicCamera(0, window.innerWidth, 0, -window.innerHeight, 1, 100)
    this.camera.position.z = 10

    this.feedCamera = new OrthographicCamera(0, 640, 0, -480, 1, 100)
    this.feedCamera.position.set(0, 0, 10)
  }

  private setupPasses() {
    // Render Targets
    this.currentFBO = new FBO(640, 480, { depthBuffer: false, stencilBuffer: false })
    this.currentFBO.texture.name = 'current'

    this.prevFBO = new FBO(640, 480, { depthBuffer: false, stencilBuffer: false })
    this.prevFBO.texture.name = 'prev'

    this.opticalFlowFBO = new FBO(640, 480, { depthBuffer: false, stencilBuffer: false })
    this.opticalFlowFBO.texture.name = 'opticalFlow'

    // Render Passes
    const cameraMat = new MeshBasicMaterial({ map: new VideoTexture(this.video), name: 'video' })
    this.cameraPass = new Pass(cameraMat)

    this.opticalFlowMat = new ShaderMaterial({
      name: 'opticalFlow',
      vertexShader: glsl(vertex),
      fragmentShader: glsl(flow),
      uniforms: {
        current: { value: this.currentFBO.texture },
        prev: { value: this.prevFBO.texture },
        offset: { value: 0.1 },
        lambda: { value: 0.001 },
      },
    })
    this.opticalFlow = new Pass(this.opticalFlowMat)
  }

  private setupScene() {
    this.scene = new Scene()

    // Scene
    const geom = new PlaneGeometry(640, 480)
    geom.applyMatrix4(new Matrix4().makeTranslation(320, -240, 0))

    this.currentMesh = new Mesh(geom, new DisplayMaterial('currentRT', this.currentFBO.texture))
    this.currentMesh.name = 'currentMesh'
    this.currentMesh.position.set(0, 0, 0)
    this.currentMesh.scale.setScalar(0.5)
    this.scene.add(this.currentMesh)

    this.prevMesh = new Mesh(geom, new DisplayMaterial('prevRT', this.prevFBO.texture))
    this.prevMesh.name = 'prevMesh'
    this.prevMesh.position.set(0, -250, 0)
    this.prevMesh.scale.setScalar(0.5)
    this.scene.add(this.prevMesh)

    const opticalFlow = new Mesh(geom, new DisplayMaterial('opticalFlowRT', this.opticalFlowFBO.texture))
    opticalFlow.name = 'opticalFlow'
    opticalFlow.position.set(330, 0, 0)
    opticalFlow.scale.setScalar(0.5)
    this.scene.add(opticalFlow)
  }

  private setupDebug() {
    // Debug
    this.debug = new Pane()

    // @ts-ignore
    const opticalFlow = this.debug.addFolder({ title: 'Optical Flow' })
    opticalFlow.addBinding(this.opticalFlowMat.uniforms.lambda, 'value', {
      min: 0,
      max: 0.2,
      step: 0.001,
      label: 'Lambda',
    })
    opticalFlow.addBinding(this.opticalFlowMat.uniforms.offset, 'value', {
      min: 0,
      max: 0.2,
      step: 0.001,
      label: 'Offset',
    })
  }

  dispose() {
    this.debug.dispose()
    this.renderer.dispose()
    this.currentFBO.dispose()
    this.prevFBO.dispose()
    this.opticalFlowFBO.dispose()
  }

  update() {
    // const time = this.clock.getElapsedTime()
    // this.opticalFlowFadeMat.uniforms.time.value = time

    // Update RTs
    this.renderer.setRenderTarget(this.prevFBO.target)
    this.currentMesh.scale.setScalar(1)
    this.renderer.render(this.currentMesh, this.feedCamera)
    this.currentMesh.scale.setScalar(0.5)

    this.cameraPass.draw(this.renderer, this.currentFBO.target)
    this.opticalFlow.draw(this.renderer, this.opticalFlowFBO.target)
  }

  draw() {
    // Show scene
    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number) {
    // Rendering
    this.camera.right = width
    this.camera.bottom = -height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
}
