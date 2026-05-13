import * as THREE from "three";
import { CAMERA_FAR, CAMERA_FOV, CAMERA_NEAR, DEFAULT_HEIGHT, DEFAULT_WIDTH } from "./constants.js";

export type CameraMode = "perspective" | "flat";

export class CameraController {
  private readonly perspectiveCamera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  private readonly flatCamera = new THREE.OrthographicCamera(0, 1, 1, 0, CAMERA_NEAR, CAMERA_FAR);

  private mode: CameraMode = "perspective";

  public get camera(): THREE.Camera {
    return this.mode === "perspective" ? this.perspectiveCamera : this.flatCamera;
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  public toggle(): void {
    this.mode = this.mode === "perspective" ? "flat" : "perspective";
  }

  public resize(width: number, height: number): void {
    this.perspectiveCamera.aspect = width / height;
    this.perspectiveCamera.updateProjectionMatrix();

    this.flatCamera.left = 0;
    this.flatCamera.right = width;
    this.flatCamera.top = height;
    this.flatCamera.bottom = 0;
    this.flatCamera.updateProjectionMatrix();
  }

  public update(width: number, height: number): void {
    const focusX = width / 2;

    this.perspectiveCamera.position.set(focusX, 260, 760);
    this.perspectiveCamera.lookAt(focusX, 80, 0);

    this.flatCamera.position.set(0, -200, 1000);
    this.flatCamera.lookAt(0, -200, 0);
  }
}
