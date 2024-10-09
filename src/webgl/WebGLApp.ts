/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Clock, ColorManagement, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, TextureLoader, VideoTexture, WebGLRenderer } from 'three';
import { Pane } from 'tweakpane'
import glsl from 'glslify'
// Materials
import DisplayMaterial from './materials/DisplayMaterial';
import BlurEffect from './materials/BlurEffect';
// Shaders
import vertex from './glsl/default.vert'
import flow from './glsl/flow.frag'
import fade from './glsl/fade.frag'
import flowImg from './glsl/flowImg.frag'
// Utils
import { FBO, Pass } from './utils';

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
  private opticalFlowFadeFBO!: FBO
  private opticalFlowFadeBlurFBO!: FBO
  private opticalFlowFadePrevFBO!: FBO

  // Shaders
  private opticalFlowMat!: ShaderMaterial
  private opticalFlowFadeMat!: ShaderMaterial
  private opticalFlowBlur!: BlurEffect
  private opticalFlowImgMat!: ShaderMaterial

  // Mesh
  private currentMesh!: Mesh
  private currentMeshRT!: Mesh
  private prevMesh!: Mesh
  private opticalFlowFadeMesh!: Mesh
  private opticalFlowFadeMeshRT!: Mesh

  // Passes
  private cameraPass!: Pass
  private opticalFlow!: Pass
  private opticalFlowFade!: Pass

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
    this.renderer.setClearAlpha(0);
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

    this.opticalFlowFadeFBO = new FBO(640, 480, { depthBuffer: false, stencilBuffer: false })
    this.opticalFlowFadeFBO.texture.name = 'opticalFlowFade'

    this.opticalFlowFadeBlurFBO = new FBO(640, 480, { depthBuffer: false, stencilBuffer: false })
    this.opticalFlowFadeBlurFBO.texture.name = 'opticalFlowFadeBlur'

    this.opticalFlowFadePrevFBO = new FBO(640, 480, { depthBuffer: false, stencilBuffer: false })
    this.opticalFlowFadePrevFBO.texture.name = 'opticalFlowFadePrev'

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

    this.opticalFlowFadeMat = new ShaderMaterial({
      name: 'opticalFlowFade',
      vertexShader: glsl(vertex),
      fragmentShader: glsl(fade),
      uniforms: {
        current: { value: this.opticalFlowFadeBlurFBO.texture },
        prev: { value: this.opticalFlowFadePrevFBO.texture },
        fade: { value: 0.05 },
      },
    })
    this.opticalFlowFade = new Pass(this.opticalFlowFadeMat)

    this.opticalFlowBlur = new BlurEffect(640, 480)
    this.opticalFlowBlur.texture = this.opticalFlowFBO.texture
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

    // Not visible
    this.currentMeshRT = this.currentMesh.clone()
    this.currentMeshRT.name = 'currentMeshRT'
    this.currentMeshRT.position.set(0, 0, 0)
    this.currentMeshRT.scale.setScalar(1)

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

    this.opticalFlowFadeMesh = new Mesh(geom, new DisplayMaterial('opticalFlowFadeRT', this.opticalFlowFadeFBO.texture))
    this.opticalFlowFadeMesh.name = 'opticalFlowFade'
    this.opticalFlowFadeMesh.position.set(330, -250, 0)
    this.opticalFlowFadeMesh.scale.setScalar(0.5)
    this.scene.add(this.opticalFlowFadeMesh)

    // Not visible
    this.opticalFlowFadeMeshRT = this.opticalFlowFadeMesh.clone()
    this.opticalFlowFadeMeshRT.name = 'opticalFlowFadeMeshRT'
    this.opticalFlowFadeMeshRT.position.set(0, 0, 0)
    this.opticalFlowFadeMeshRT.scale.setScalar(1)

    // Applied Optical Flow to an image
    this.opticalFlowImgMat = new ShaderMaterial({
      name: 'opticalFlowImg',
      vertexShader: glsl(vertex),
      fragmentShader: glsl(flowImg),
      uniforms: {
        map: { value: null },
        opticalFlow: { value: this.opticalFlowFadeFBO.texture },
        scale: { value: 1 },
      },
    })
    const opticalFlowImg = new Mesh(geom, this.opticalFlowImgMat)
    opticalFlowImg.name = 'opticalFlowImg'
    opticalFlowImg.position.set(660, 0, 0)
    opticalFlowImg.scale.setScalar(0.5)
    this.scene.add(opticalFlowImg)

    new TextureLoader()
      .load('./fpo.jpg', (data: Texture) => {
        this.opticalFlowImgMat.uniforms.map.value = data
      })
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
    opticalFlow.addBinding(this, 'flowFadeAmount', {
      min: 0,
      max: 1,
      step: 0.001,
      label: 'Fade Amount',
    })
    opticalFlow.addBinding(this, 'opticalFlowScale', {
      min: 0,
      max: 3,
      step: 0.001,
      label: 'Optical Flow Scale',
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
    // Update previous shots
    this.renderer.setRenderTarget(this.prevFBO.target)
    this.renderer.render(this.currentMeshRT, this.feedCamera)

    this.renderer.setRenderTarget(this.opticalFlowFadePrevFBO.target)
    this.renderer.render(this.opticalFlowFadeMeshRT, this.feedCamera)

    // Update passes
    this.cameraPass.draw(this.renderer, this.currentFBO.target)
    this.opticalFlow.draw(this.renderer, this.opticalFlowFBO.target)
    this.opticalFlowBlur.draw(this.renderer, this.opticalFlowFadeBlurFBO.target)
    this.opticalFlowFade.draw(this.renderer, this.opticalFlowFadeFBO.target)
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

  get flowFadeAmount(): number {
    return this.opticalFlowFadeMat.uniforms.fade.value
  }

  set flowFadeAmount(value: number) {
    this.opticalFlowFadeMat.uniforms.fade.value = value
  }

  get opticalFlowScale(): number {
    return this.opticalFlowImgMat.uniforms.scale.value
  }

  set opticalFlowScale(value: number) {
    this.opticalFlowImgMat.uniforms.scale.value = value
  }
}
