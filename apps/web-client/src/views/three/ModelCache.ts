import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export class ModelCache {
  private readonly loader: GLTFLoader;
  private readonly cache = new Map<string, Promise<THREE.Object3D>>();

  public constructor() {
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath("/draco/");

    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(dracoLoader);
  }

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
