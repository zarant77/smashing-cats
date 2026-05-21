import * as THREE from "three";
import type { GameSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";

const RENDER_ORDER = 20;

export class ForegroundRenderer {
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

  public constructor(private readonly scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(1, 1);

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.renderOrder = RENDER_ORDER;

    scene.add(this.mesh);
  }

  public draw(_snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.mesh.position.set(viewport.screenWidth / 2, viewport.screenHeight / 2, 0);

    this.mesh.scale.set(viewport.screenWidth, viewport.screenHeight, 1);
  }

  public destroy(): void {
    this.scene.remove(this.mesh);

    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
