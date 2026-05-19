import * as THREE from "three";

export type ThreeCameraMode = "2d" | "3d";

export class ThreeCamera {
  private readonly camera2d: THREE.OrthographicCamera;
  private readonly camera3d: THREE.PerspectiveCamera;

  private mode: ThreeCameraMode = "2d";

  public constructor(width: number, height: number) {
    this.camera2d = new THREE.OrthographicCamera(0, width, 0, height, -1000, 1000);
    this.camera3d = new THREE.PerspectiveCamera(10, width / height, 1, 5000);

    this.resize(width, height);
  }

  public get active(): THREE.Camera {
    return this.mode === "2d" ? this.camera2d : this.camera3d;
  }

  public setMode(mode: ThreeCameraMode): void {
    this.mode = mode;
  }

  public toggleMode(): ThreeCameraMode {
    this.mode = this.mode === "2d" ? "3d" : "2d";

    return this.mode;
  }

  public resize(width: number, height: number): void {
    this.setup2d(width, height);
    this.setup3d(width, height);
  }

  private setup2d(width: number, height: number): void {
    this.camera2d.left = 0;
    this.camera2d.right = width;
    this.camera2d.top = 0;
    this.camera2d.bottom = height;

    this.camera2d.position.set(0, 0, 100);
    this.camera2d.rotation.set(0, 0, 0);
    this.camera2d.scale.x = -1;

    this.camera2d.updateProjectionMatrix();
  }

  private setup3d(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    this.camera3d.aspect = width / height;

    this.camera3d.position.set(centerX, centerY - 800, -3200);
    this.camera3d.up.set(0, -1, 0);
    this.camera3d.lookAt(centerX, centerY - 200, 0);

    this.camera3d.updateProjectionMatrix();
  }
}
