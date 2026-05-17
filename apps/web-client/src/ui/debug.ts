export function showFPS(): void {
  const element = document.createElement("div");

  element.style.position = "fixed";
  element.style.top = "8px";
  element.style.right = "8px";
  element.style.zIndex = "50";

  element.style.color = "#00ff00";
  element.style.fontFamily = "monospace";
  element.style.fontSize = "18px";
  element.style.fontWeight = "bold";

  element.style.pointerEvents = "none";
  element.style.userSelect = "none";

  document.body.append(element);

  let frames = 0;
  let lastTime = performance.now();

  function loop(): void {
    frames++;

    const now = performance.now();

    if (now - lastTime >= 1000) {
      element.textContent = `${frames} FPS`;

      frames = 0;
      lastTime = now;
    }

    requestAnimationFrame(loop);
  }

  loop();
}
