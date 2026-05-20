import * as THREE from "three";
import { getModelAsset, models } from "../../../assets/assets.js";
import { getModelInfoByKey } from "./threeModels.js";

export class ThreeModelFactory {
  public async create(key: string): Promise<THREE.Group> {
    const info = getModelInfoByKey(key);
    const path = getModelAsset(key);
    const model = await models.clone(path);
    const wrapper = this.normalizePivot(model);

    wrapper.rotation.y = info.rotationY ?? 0;
    wrapper.position.z = info.offsetZ ?? 0;

    return wrapper;
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
}
