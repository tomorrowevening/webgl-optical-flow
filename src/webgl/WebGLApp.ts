/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Clock, ColorManagement, HalfFloatType, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene, Texture, TextureLoader, VideoTexture, WebGLRenderer } from 'three';
import { Pane } from 'tweakpane';
// Materials
import BlurEffect from './materials/BlurEffect';
import DisplayMaterial from './materials/DisplayMaterial';
import OpticalFlowMaterial from './materials/OpticalFlowMaterial';
import OpticalFlowFadeMaterial from './materials/OpticalFlowFadeMaterial';
import OpticalFlowImg from './materials/OpticalFlowImg';
// Utils
import { dispose, FBO, Pass } from './utils';

export default class WebGLApp {
  // Core
  private clock: Clock
  private debug!: Pane
  private renderer!: WebGLRenderer
  private scene!: Scene
  private camera!: OrthographicCamera

  // Render Targets
  private currentFBO!: FBO
  private prevFBO!: FBO
  private opticalFlowFBO!: FBO
  private opticalFlowFadeFBO!: FBO
  private opticalFlowFadeBlurFBO!: FBO
  private opticalFlowFadePrevFBO!: FBO

  // Shaders
  private opticalFlowMat!: OpticalFlowMaterial
  private opticalFlowFadeMat!: OpticalFlowFadeMaterial
  private opticalFlowBlur!: BlurEffect
  private opticalFlowImgMat!: OpticalFlowImg

  // Mesh
  private currentMesh!: Mesh
  private prevMesh!: Mesh
  private opticalFlowFadeMesh!: Mesh

  // Passes
  private cameraPass!: Pass
  private opticalFlow!: Pass
  private opticalFlowFade!: Pass
  private prevCameraPass!: Pass
  private prevOpticalFlowFade!: Pass

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
      depth: false,
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
  }

  private setupPasses() {
    const fpoSettings = { depthBuffer: false, stencilBuffer: false, type: HalfFloatType }

    // Render Targets
    this.currentFBO = new FBO(640, 480, fpoSettings)
    this.currentFBO.texture.name = 'current'

    this.prevFBO = new FBO(640, 480, fpoSettings)
    this.prevFBO.texture.name = 'prev'

    this.opticalFlowFBO = new FBO(640, 480, fpoSettings)
    this.opticalFlowFBO.texture.name = 'opticalFlow'

    this.opticalFlowFadeFBO = new FBO(640, 480, fpoSettings)
    this.opticalFlowFadeFBO.texture.name = 'opticalFlowFade'

    this.opticalFlowFadeBlurFBO = new FBO(640, 480, fpoSettings)
    this.opticalFlowFadeBlurFBO.texture.name = 'opticalFlowFadeBlur'

    this.opticalFlowFadePrevFBO = new FBO(640, 480, fpoSettings)
    this.opticalFlowFadePrevFBO.texture.name = 'opticalFlowFadePrev'

    // Render Passes
    const cameraMat = new MeshBasicMaterial({ map: new VideoTexture(this.video), name: 'video' })
    this.cameraPass = new Pass(cameraMat)

    this.opticalFlowMat = new OpticalFlowMaterial()
    this.opticalFlowMat.currentTexture = this.currentFBO.texture
    this.opticalFlowMat.prevTexture = this.prevFBO.texture
    this.opticalFlow = new Pass(this.opticalFlowMat)

    this.opticalFlowFadeMat = new OpticalFlowFadeMaterial()
    this.opticalFlowFadeMat.currentTexture = this.opticalFlowFadeBlurFBO.texture
    this.opticalFlowFadeMat.prevTexture = this.opticalFlowFadePrevFBO.texture
    this.opticalFlowFade = new Pass(this.opticalFlowFadeMat)

    this.opticalFlowBlur = new BlurEffect(640, 480)
    this.opticalFlowBlur.texture = this.opticalFlowFBO.texture
  }

  private setupScene() {
    this.scene = new Scene()

    // Scene
    const geom = new PlaneGeometry(640, 480)
    geom.applyMatrix4(new Matrix4().makeTranslation(320, -240, 0))

    const currentMeshMat = new DisplayMaterial('Display/currentRT', this.currentFBO.texture)
    this.currentMesh = new Mesh(geom, currentMeshMat)
    this.currentMesh.position.set(0, 0, 0)
    this.currentMesh.scale.setScalar(0.5)
    this.scene.add(this.currentMesh)

    this.prevMesh = new Mesh(geom, new DisplayMaterial('Display/prevRT', this.prevFBO.texture))
    this.prevMesh.position.set(0, -250, 0)
    this.prevMesh.scale.setScalar(0.5)
    this.scene.add(this.prevMesh)

    const opticalFlow = new Mesh(geom, new DisplayMaterial('Display/opticalFlowRT', this.opticalFlowFBO.texture))
    opticalFlow.position.set(330, 0, 0)
    opticalFlow.scale.setScalar(0.5)
    this.scene.add(opticalFlow)

    const opticalFlowFadeMeshMat = new DisplayMaterial('Display/opticalFlowFadeRT', this.opticalFlowFadeFBO.texture)
    this.opticalFlowFadeMesh = new Mesh(geom, opticalFlowFadeMeshMat)
    this.opticalFlowFadeMesh.position.set(330, -250, 0)
    this.opticalFlowFadeMesh.scale.setScalar(0.5)
    this.scene.add(this.opticalFlowFadeMesh)

    this.prevCameraPass = new Pass(currentMeshMat)
    this.prevOpticalFlowFade = new Pass(opticalFlowFadeMeshMat)

    // Applied Optical Flow to an image
    this.opticalFlowImgMat = new OpticalFlowImg()
    this.opticalFlowImgMat.opticalFlow = this.opticalFlowFadeFBO.texture
    const opticalFlowImg = new Mesh(geom, this.opticalFlowImgMat)
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
    opticalFlow.addBinding(this.opticalFlowMat, 'lambda', {
      min: 0,
      max: 0.2,
      step: 0.001,
      label: 'Lambda',
    })
    opticalFlow.addBinding(this.opticalFlowMat, 'offset', {
      min: 0,
      max: 0.2,
      step: 0.001,
      label: 'Offset',
    })
    opticalFlow.addBinding(this.opticalFlowFadeMat, 'fade', {
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Fade Amount',
    })
    opticalFlow.addBinding(this.opticalFlowImgMat, 'scale', {
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Optical Flow Scale',
    })
  }

  dispose() {
    dispose(this.scene)
    this.debug.dispose()
    this.renderer.dispose()
    // FBOs
    this.currentFBO.dispose()
    this.prevFBO.dispose()
    this.opticalFlowFBO.dispose()
    this.opticalFlowFadeFBO.dispose()
    this.opticalFlowFadeBlurFBO.dispose()
    this.opticalFlowFadePrevFBO.dispose()
    // Passes
    this.cameraPass.dispose()
    this.opticalFlow.dispose()
    this.opticalFlowFade.dispose()
    this.prevCameraPass.dispose()
    this.prevOpticalFlowFade.dispose()
  }

  update() {
    // Update previous shots
    this.prevCameraPass.draw(this.renderer, this.prevFBO.target)
    this.prevOpticalFlowFade.draw(this.renderer, this.opticalFlowFadePrevFBO.target)

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
}
