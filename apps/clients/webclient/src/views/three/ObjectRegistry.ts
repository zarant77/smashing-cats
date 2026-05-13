import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export type SceneObject = {
  root: THREE.Group;
  fallback: THREE.Mesh;
  model: THREE.Object3D | undefined;
  modelPath: string | undefined;
};

export class ObjectRegistry {
  private readonly objects = new Map<string, SceneObject>();

  public constructor(private readonly scene: THREE.Scene) {}

  public get(key: string, color: number): SceneObject {
    const existing = this.objects.get(key);

    if (existing !== undefined) {
      this.setFallbackColor(existing, color);
      return existing;
    }

    const root = new THREE.Group();
    const fallback = this.createFallbackBox(color);

    root.add(fallback);
    this.scene.add(root);

    const object: SceneObject = {
      root,
      fallback,
      model: undefined,
      modelPath: undefined,
    };

    this.objects.set(key, object);

    return object;
  }

  public async attachModel(object: SceneObject, modelPath: string, loadModel: (path: string) => Promise<THREE.Object3D>): Promise<void> {
    if (object.modelPath === modelPath) {
      return;
    }

    object.modelPath = modelPath;

    try {
      const source = await loadModel(modelPath);

      if (object.modelPath !== modelPath) {
        return;
      }

      if (object.model !== undefined) {
        object.root.remove(object.model);
        this.disposeObject3D(object.model);
      }

      const model = SkeletonUtils.clone(source);

      model.userData["fitted"] = false;

      object.model = model;
      object.root.add(model);
      object.fallback.visible = false;
    } catch {
      object.fallback.visible = true;
    }
  }

  public cleanup(activeKeys: Set<string>): void {
    for (const [key, object] of this.objects) {
      if (activeKeys.has(key)) {
        continue;
      }

      this.dispose(object);
      this.objects.delete(key);
    }
  }

  public disposeAll(): void {
    for (const object of this.objects.values()) {
      this.dispose(object);
    }

    this.objects.clear();
  }

  public fitModelToBox(model: THREE.Object3D, width: number, height: number, depth: number): void {
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      return;
    }

    const scale = Math.min(width / size.x, height / size.y, depth / size.z);

    model.scale.set(-scale, scale, scale);
  }

  private createFallbackBox(color: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.08,
      transparent: true,
      // opacity: 0.25,
    });

    return new THREE.Mesh(geometry, material);
  }

  private setFallbackColor(object: SceneObject, color: number): void {
    const material = object.fallback.material;

    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.setHex(color);
    }
  }

  private dispose(object: SceneObject): void {
    this.scene.remove(object.root);
    this.disposeObject3D(object.root);
  }

  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.geometry.dispose();

      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          material.dispose();
        }

        return;
      }

      child.material.dispose();
    });
  }
}
