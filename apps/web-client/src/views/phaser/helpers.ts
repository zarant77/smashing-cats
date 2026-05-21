import { getImageAsset, images } from "../../assets/assets.js";
import { IMAGES } from "../../assets/manifests/phaser.js";

export function registerLoadedImages(scene: Phaser.Scene): void {
  for (const key of Object.keys(IMAGES)) {
    if (scene.textures.exists(key)) {
      continue;
    }

    const path = getImageAsset(key);
    const image = images.getLoaded(path);

    scene.textures.addImage(key, image);
  }
}
