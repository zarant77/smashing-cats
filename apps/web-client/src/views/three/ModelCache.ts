import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ModelCache {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<THREE.Object3D>>();

  public load(path: string): Promise<THREE.Object3D> {
    const cached = this.cache.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const promise = this.loader.loadAsync(path).then((gltf) => gltf.scene);
    this.cache.set(path, promise);

    return promise;
  }
}
