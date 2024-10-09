/* eslint-disable @typescript-eslint/ban-ts-comment */
import { dispose } from '../utils';
import { CopyMaterial, KawaseBlurMaterial } from 'postprocessing';
import { BufferAttribute, BufferGeometry, Material, Mesh, OrthographicCamera, Scene, Texture, WebGLRenderTarget, WebGLRenderer } from 'three';

export default class BlurEffect {
  texture!: Texture;
  copyMaterial: CopyMaterial;
  blurMaterial: KawaseBlurMaterial;
  material!: Material;

  scene: Scene;
  private renderTargetA: WebGLRenderTarget;
  private renderTargetB: WebGLRenderTarget;
  private camera: OrthographicCamera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 100);
  private mesh: Mesh;

  constructor(width: number, height: number) {
    this.blurMaterial = new KawaseBlurMaterial();
    this.blurMaterial.name = 'Post/KawaseBlurMaterial';
    this.blurMaterial.scale = 1;
    this.blurMaterial.setSize(width, height);
    this.copyMaterial = new CopyMaterial();
    this.copyMaterial.name = 'Post/CopyMaterial';

    this.material = this.blurMaterial;
    this.scene = new Scene();
    this.scene.name = 'BlurScene';
    const vertices = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
		const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);
		const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.name = 'blurredMesh';
    this.scene.add(this.mesh);

    this.renderTargetA = new WebGLRenderTarget(width, height, { depthBuffer: false });
    this.renderTargetB = this.renderTargetA.clone();
    this.renderTargetA.texture.name = 'Blur.Target.A';
    this.renderTargetB.texture.name = 'Blur.Target.B';
  }

  dispose() {
    this.texture.dispose();
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    dispose(this.scene);
  }

  draw(renderer: WebGLRenderer, target?: WebGLRenderTarget<Texture> | undefined): void {
    const scene = this.scene;
		const camera = this.camera;
		const renderTargetA = this.renderTargetA;
		const renderTargetB = this.renderTargetB;
		const material = this.blurMaterial;
    // @ts-ignore
		const kernelSequence = material.kernelSequence;

		let previousBuffer: Texture = this.texture;
		this.material = material;

		// Render the multi-pass blur.
		for(let i = 0, l = kernelSequence.length; i < l; ++i) {
			// Alternate between targets.
			const buffer = ((i & 1) === 0) ? renderTargetA : renderTargetB;
			material.kernel = kernelSequence[i];
			material.inputBuffer = previousBuffer;
			renderer.setRenderTarget(buffer);
			renderer.render(scene, camera);
			previousBuffer = buffer.texture;
		}

		// Copy the result to the output buffer.
		this.material = this.copyMaterial;
		this.copyMaterial.inputBuffer = previousBuffer;
    // @ts-ignore
		renderer.setRenderTarget(target);
		renderer.render(scene, camera);

    // Reset
    renderer.setRenderTarget(null);
  }

  resize(width: number, height: number) {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
    this.blurMaterial.setSize(width, height);
  }

  get kernel(): number {
    return this.blurMaterial.kernel;
  }

  set kernel(value: number) {
    this.blurMaterial.kernel = value;
  }

  get scale(): number {
    return this.blurMaterial.scale;
  }

  set scale(value: number) {
    this.blurMaterial.scale = value;
  }
}
