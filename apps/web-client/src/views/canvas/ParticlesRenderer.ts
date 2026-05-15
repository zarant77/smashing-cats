import { assets } from "../../assets/assets.js";

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
  "/environments/leaf1.png",
  "/environments/leaf2.png",
  "/environments/leaf3.png",
  "/environments/leaf4.png",
  "/environments/leaf5.png",
  "/environments/leaf6.png",
] as const;

export class ParticlesRenderer {
  private readonly particles: Particle[] = [];

  private time = 0;

  public constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(Math.random() * 1600, Math.random() * 900));
    }
  }

  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, deltaTime: number): void {
    this.time += deltaTime;

    for (const particle of this.particles) {
      particle.x += particle.speedX * deltaTime;

      particle.baseY += particle.speedY * deltaTime;

      particle.y = particle.baseY + Math.sin(this.time * particle.swaySpeed + particle.swayOffset) * particle.swayAmount;

      particle.rotation += particle.rotationSpeed * deltaTime;

      if (particle.x > canvas.width + particle.size || particle.y > canvas.height + particle.size || particle.y < -particle.size) {
        Object.assign(particle, this.createParticle(-particle.size, Math.random() * canvas.height * 0.75));
      }

      this.drawParticle(ctx, particle);
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
    ctx.save();

    ctx.globalAlpha = particle.alpha;

    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    ctx.drawImage(particle.image, -particle.size / 2, -particle.size / 2, particle.size, particle.size);

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
    const path = PARTICLE_SPRITES[Math.floor(Math.random() * PARTICLE_SPRITES.length)];

    return assets.get(path);
  }
}
