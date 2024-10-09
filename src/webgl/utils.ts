/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PositionalAudio,
  RawShaderMaterial,
  RenderTargetOptions,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

export const orthoCamera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 100);

export const triangle = new BufferGeometry();
triangle.setAttribute('position', new Float32BufferAttribute([-0.5, -0.5, 0, 1.5, -0.5, 0, -0.5, 1.5, 0], 3));
triangle.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1], 3));
triangle.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));

/**
 * Updates your geometry to be offset
 * @param geometry Your geometry
 * @param x X-offset
 * @param y Y-offset
 * @param z Z-offset
 */
export function anchorGeometry(geometry: BufferGeometry, x: number, y: number, z: number) {
  geometry.applyMatrix4(new Matrix4().makeTranslation(x, -y, -z));
}

/**
 * Anchors your geometry to the top-left
 * @param geometry Your geometry
 */
export function anchorGeometryTL(geometry: BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const x = (box.max.x - box.min.x) / 2;
  const y = (box.max.y - box.min.y) / 2;
  anchorGeometry(geometry, x, y, 0);
}

// Dispose textures
export function disposeTextures(material: Material) {
  for (const i in material) {
    const value = material[i];
    if (value && value !== null) {
      if (value.isTexture) value.dispose();
    }
  }
}

// Dispose material
export const disposeMaterial = (material?: Material | Material[]): void => {
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach((mat: Material) => {
      disposeTextures(mat);
      mat.dispose();
    });
  } else {
    if (material instanceof RawShaderMaterial || material instanceof ShaderMaterial) {
      for (const i in material.uniforms) {
        const value = material.uniforms[i].value;
        if (value && value !== null) {
          if (value.isTexture) value.dispose();
        }
      }
    }
    disposeTextures(material);
    material.dispose();
  }
};

// Dispose object
export const dispose = (object: Object3D): void => {
  if (!object) return;

  // Dispose children
  while (object.children.length > 0) {
    const child = object.children[0];
    if (child instanceof PositionalAudio) {
      child.pause();
      if (child.parent) {
        child.parent.remove(child);
      }
    } else {
      dispose(child);
    }
  }

  // Dispose object
  if (object.parent) object.parent.remove(object);
  // @ts-ignore
  if (object.isMesh) {
    const mesh = object as Mesh;
    mesh.geometry?.dispose();
    disposeMaterial(mesh.material);
  }

  // @ts-ignore
  if (object.dispose !== undefined) object.dispose();
};

/**
 * Updates an Orthographic camera's view to fit pixel-perfect in view
 */
export function updateCameraOrtho(camera: OrthographicCamera, width: number, height: number): void {
  camera.left = width / -2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = height / -2;
  camera.position.x = width / 2;
  camera.position.y = height / -2;
  camera.updateProjectionMatrix();
}

/**
 * Updates a Perspective camera's FOV to fit pixel-perfect
 */
export function updateCameraPerspective(
  camera: PerspectiveCamera,
  width: number,
  height: number,
  distance: number,
): void {
  const aspect = width / height;
  const fov = 2 * Math.atan(width / aspect / (2 * distance)) * (180 / Math.PI);
  camera.fov = fov;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

//////////////////////////////////////////////////
// Rendering / Shaders
export class Pass {
  camera: OrthographicCamera = orthoCamera;
  scene: Scene = new Scene();
  protected _material: Material;
  protected _mesh: Mesh;

  /**
   * A layer that can be used for post-processing, GPGPU, etc
   * @param  {Material} material Usually either a ShaderMaterial or RawShaderMaterial
   */
  constructor(material: Material) {
    this._material = material;
    this._mesh = new Mesh(triangle.clone(), this._material);
    this.scene.add(this._mesh);
    this.scene.name = 'PassScene';
  }

  dispose() {
    dispose(this.scene);
  }

  /**
   * The customized draw call for the pass, usually so params can be updated/swapped
   */
  draw(renderer: WebGLRenderer, target: WebGLRenderTarget | null) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    //
  }

  get material(): Material {
    return this._material;
  }

  set material(value: Material) {
    this._material = value;
    this._mesh.material = value;
  }
}

export class FBO {
  rt1: WebGLRenderTarget;
  target: WebGLRenderTarget;

  constructor(width: number, height: number, params?: RenderTargetOptions) {
    this.rt1 = new WebGLRenderTarget(width, height, params);
    this.rt1.texture.name = 'rt1'
    this.target = this.rt1;
  }

  dispose() {
    this.rt1.dispose();
  }

  /**
   * Resizes the Render Target
   * @param width The width of the Render Target
   * @param height The height of the Render Target
   */
  resize(width: number, height: number) {
    this.rt1.setSize(width, height);
  }

  get texture(): Texture {
    return this.target.texture;
  }
}

/**
 * Meant for compute shaders (aka GPGPU shaders)
 */
export class DoubleFBO extends FBO {
  rt2: WebGLRenderTarget;
  other: WebGLRenderTarget;
  flip = true;

  constructor(width: number, height: number, params?: RenderTargetOptions) {
    super(width, height, params);
    this.rt2 = this.rt1.clone();
    this.rt2.texture.name = 'rt2'
    this.other = this.rt2;
  }

  override dispose() {
    super.dispose();
    this.rt2.dispose();
  }

  /**
   * Resizes the Render Targets
   * @param width The width of the Render Targets
   * @param height The height of the Render Targets
   */
  resize(width: number, height: number) {
    this.rt1.setSize(width, height);
    this.rt2.setSize(width, height);
  }

  /**
   * Ping-pongs the FBO
   */
  swap() {
    if (this.flip) {
      this.target = this.rt2;
      this.other = this.rt1;
    } else {
      this.target = this.rt1;
      this.other = this.rt2;
    }
    this.flip = !this.flip;
  }

  get otherTexture(): Texture {
    return this.other.texture;
  }
}
