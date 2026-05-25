import { isNativeApp } from "../device/capacitor.js";

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

const navigatorWithMemory = navigator as NavigatorWithDeviceMemory;

function shouldLoadHeavyEffects(): boolean {
  const cores = navigator.hardwareConcurrency ?? 2;
  const memory = navigatorWithMemory.deviceMemory ?? 2;
  const isTouch = navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = window.matchMedia("(max-width: 760px)").matches;

  if (prefersReducedMotion) {
    return false;
  }

  if (isNativeApp) {
    return cores >= 4 && memory >= 3;
  }

  if (!isTouch) {
    return true;
  }

  return cores >= 6 && memory >= 4 && !isSmallScreen;
}

export function loadHeavyEffectsIfAllowed(): void {
  if (!shouldLoadHeavyEffects()) {
    return;
  }

  const link = document.createElement("link");

  link.rel = "stylesheet";
  link.href = "/css/heavy.css";
  link.dataset.effects = "heavy";

  document.head.appendChild(link);

  console.log("Heavy effects allowed");
}
