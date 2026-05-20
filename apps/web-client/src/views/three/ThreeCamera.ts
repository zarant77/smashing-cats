import * as THREE from "three";

export class ThreeCamera {
  private readonly camera: THREE.PerspectiveCamera;

  public constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(10, width / height, 1, 5000);

    this.resize(width, height);
  }

  public get active(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public resize(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    this.camera.aspect = width / height;

    this.camera.position.set(centerX, centerY - 800, -3200);
    this.camera.up.set(0, -1, 0);

    this.camera.lookAt(centerX, centerY - 200, 0);

    this.camera.updateProjectionMatrix();
  }
}
