import { getImageAsset, images } from "../../assets/assets.js";
import type { RenderViewport } from "../viewport.js";

type Particle = {
  x: number;
  y: number;
  baseY: number;

  size: number;

  speedX: number;
  speedY: number;

  rotation: number;
  rotationSpeed: number;

  alpha: number;

  swayOffset: number;
  swaySpeed: number;
  swayAmount: number;

  image: HTMLImageElement;
};

const PARTICLE_SPRITES = [
  "environment.leaf1",
  "environment.leaf2",
  "environment.leaf3",
  "environment.leaf4",
  "environment.leaf5",
  "environment.leaf6",
] as const;

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;

export class ParticlesRenderer {
  private readonly particles: Particle[] = [];

  private time = 0;

  public constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT));
    }
  }

  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, deltaTime: number, viewport: RenderViewport): void {
    this.time += deltaTime;

    const screenWorldRight = canvas.width / viewport.scale;

    for (const particle of this.particles) {
      particle.x += particle.speedX * deltaTime;
      particle.baseY += particle.speedY * deltaTime;
      particle.y = particle.baseY + Math.sin(this.time * particle.swaySpeed + particle.swayOffset) * particle.swayAmount;
      particle.rotation += particle.rotationSpeed * deltaTime;

      if (particle.x > screenWorldRight + particle.size || particle.y > WORLD_HEIGHT + particle.size || particle.y < -particle.size) {
        Object.assign(particle, this.createParticle(-particle.size, Math.random() * WORLD_HEIGHT * 0.75));
      }

      this.drawParticle(ctx, particle, viewport);
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, particle: Particle, viewport: RenderViewport): void {
    const x = viewport.worldToScreenSize(particle.x);
    const y = viewport.worldToScreenY(particle.y);
    const size = viewport.worldToScreenSize(particle.size);

    ctx.save();

    ctx.globalAlpha = particle.alpha;

    ctx.translate(x, y);
    ctx.rotate(particle.rotation);

    ctx.drawImage(particle.image, -size / 2, -size / 2, size, size);

    ctx.restore();
  }

  private createParticle(x: number, y: number): Particle {
    return {
      x,
      y,

      baseY: y,

      size: 8 + Math.random() * 18,

      speedX: 12 + Math.random() * 28,
      speedY: -6 + Math.random() * 12,

      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: -1.5 + Math.random() * 3,

      alpha: 0.35 + Math.random() * 0.45,

      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 1 + Math.random() * 2,
      swayAmount: 6 + Math.random() * 14,

      image: this.getRandomSprite(),
    };
  }

  private getRandomSprite(): HTMLImageElement {
    const key = PARTICLE_SPRITES[Math.floor(Math.random() * PARTICLE_SPRITES.length)];
    const path = getImageAsset(key);

    return images.getLoaded(path);
  }
}
