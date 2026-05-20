import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export class ModelCache {
  private readonly loader = new GLTFLoader();
  private readonly dracoLoader = new DRACOLoader();

  private readonly cache = new Map<string, Promise<THREE.Group>>();
  private readonly loaded = new Map<string, THREE.Group>();

  public constructor() {
    this.dracoLoader.setDecoderPath("/draco/");

    this.loader.setDRACOLoader(this.dracoLoader);
  }

  public preload(paths: readonly string[]): Promise<void> {
    return Promise.all(paths.map((path) => this.load(path))).then(() => undefined);
  }

  public load(path: string): Promise<THREE.Group> {
    const cached = this.cache.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const promise = this.loader.loadAsync(path).then((gltf) => {
      this.loaded.set(path, gltf.scene);

      return gltf.scene;
    });

    this.cache.set(path, promise);

    return promise;
  }

  public async clone(path: string): Promise<THREE.Group> {
    const model = await this.load(path);

    return model.clone(true);
  }

  public get(path: string): Promise<THREE.Group> | undefined {
    return this.cache.get(path);
  }

  public getLoaded(path: string): THREE.Group {
    const model = this.loaded.get(path);

    if (model === undefined) {
      throw new Error(`Model is not loaded: ${path}`);
    }

    return model;
  }

  public dispose(): void {
    this.dracoLoader.dispose();
  }
}
