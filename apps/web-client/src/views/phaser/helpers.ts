import { getImageAsset, images } from "../../assetManager/assetManager.js";
import { IMAGES } from "../../assetManager/manifests/phaser.js";

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
