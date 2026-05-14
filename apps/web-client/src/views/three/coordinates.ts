export function getWorldY(topY: number, height: number, groundY: number): number {
  const centerScreenY = topY + height / 2;

  return groundY - centerScreenY;
}
