import * as THREE from "three";
import { getModelAsset, models } from "../../../assets/assets.js";
import { getModelInfoByKey } from "./threeModels.js";

const FALLBACK_MODEL_COLOR = 0xffcc33;

export class ThreeModelFactory {
  public async create(key: string): Promise<THREE.Group> {
    try {
      const info = getModelInfoByKey(key);
      const path = getModelAsset(key);
      const model = await models.clone(path);
      const wrapper = this.normalizePivot(model);

      wrapper.rotation.y = info.rotationY ?? 0;
      wrapper.position.z = info.offsetZ ?? 0;

      return wrapper;
    } catch (error) {
      console.warn(`[three] model asset is not found: ${key}. Using fallback cube.`, error);
      return this.createFallbackModel();
    }
  }

  private normalizePivot(model: THREE.Group): THREE.Group {
    const wrapper = new THREE.Group();

    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();

    box.getCenter(center);

    model.position.x = -center.x;
    model.position.y = -box.min.y;
    model.position.z = -center.z;

    wrapper.add(model);

    return wrapper;
  }

  private createFallbackModel(): THREE.Group {
    const wrapper = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: FALLBACK_MODEL_COLOR,
      roughness: 0.75,
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.y = 0.5;
    wrapper.add(mesh);

    return wrapper;
  }
}
