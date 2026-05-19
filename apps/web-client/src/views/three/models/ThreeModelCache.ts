import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ThreeModelDefinition } from "./threeModels.js";

export class ThreeModelCache {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<THREE.Group>>();
  private readonly failedPaths = new Set<string>();

  public constructor() {
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath("/draco/");
    this.loader.setDRACOLoader(dracoLoader);
  }

  public preload(paths: readonly string[]): Promise<void> {
    return Promise.all(paths.map((path) => this.load(path))).then(() => undefined);
  }

  public load(path: string): Promise<THREE.Group> {
    if (this.failedPaths.has(path)) {
      return Promise.reject(new Error(`Model already failed: ${path}`));
    }

    const cached = this.cache.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const promise = this.loader
      .loadAsync(path)
      .then((gltf) => gltf.scene)
      .catch((error: unknown) => {
        this.failedPaths.add(path);
        this.cache.delete(path);

        console.warn(`[three] failed to load model: ${path}`);
        console.error(error);

        throw error;
      });

    this.cache.set(path, promise);

    return promise;
  }

  public async clone(definition: ThreeModelDefinition): Promise<THREE.Group> {
    const source = await this.load(definition.path);
    const model = source.clone(true);
    const normalized = this.normalizePivot(model);

    normalized.rotation.y = definition.rotationY ?? 0;

    return normalized;
  }

  public hasFailed(path: string): boolean {
    return this.failedPaths.has(path);
  }

  public resetFailed(path: string): void {
    this.failedPaths.delete(path);
  }

  public clear(): void {
    this.cache.clear();
    this.failedPaths.clear();
  }

  private normalizePivot(model: THREE.Group): THREE.Group {
    const wrapper = new THREE.Group();

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    model.position.x = -center.x;
    model.position.y = -box.min.y;
    model.position.z = -center.z;

    wrapper.add(model);

    return wrapper;
  }
}
