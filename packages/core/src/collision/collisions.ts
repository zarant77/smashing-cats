export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Circle = {
  x: number;
  y: number;
  radius: number;
};

export function intersects(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function circlesIntersect(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  const radius = a.radius + b.radius;

  return dx * dx + dy * dy <= radius * radius;
}

export function Hurt2Circle(x: number, y: number, size: readonly [number, number], hurt: readonly [number, number, number]): Circle {
  const [width, height] = size;
  const [radius, offsetX, offsetY] = hurt;

  return {
    x: x + width / 2 + offsetX,
    y: y + height / 2 + offsetY,
    radius,
  };
}
