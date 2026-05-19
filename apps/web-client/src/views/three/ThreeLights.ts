import * as THREE from "three";

export class ThreeLights {
  private readonly group = new THREE.Group();

  public constructor(scene: THREE.Scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(-300, -400, 500);

    this.group.add(ambientLight);
    this.group.add(directionalLight);

    scene.add(this.group);
  }

  public destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.group.clear();
  }
}
