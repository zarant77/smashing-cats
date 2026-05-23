import Phaser from "phaser";
import { getImageAsset } from "../../../assetManager/assetManager.js";

type Particle = {
  image: Phaser.GameObjects.Image;

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

  public constructor(
    private readonly scene: Phaser.Scene,
    count: number,
  ) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT));
    }
  }

  public update(deltaTime: number, screenWorldRight: number): void {
    this.time += deltaTime;

    for (const particle of this.particles) {
      particle.x += particle.speedX * deltaTime;
      particle.baseY += particle.speedY * deltaTime;
      particle.y =
        particle.baseY + Math.sin(this.time * particle.swaySpeed + particle.swayOffset) * particle.swayAmount;
      particle.rotation += particle.rotationSpeed * deltaTime;

      if (
        particle.x > screenWorldRight + particle.size ||
        particle.y > WORLD_HEIGHT + particle.size ||
        particle.y < -particle.size
      ) {
        this.resetParticle(particle, -particle.size, Math.random() * WORLD_HEIGHT * 0.75);
      }

      this.applyParticleTransform(particle);
    }
  }

  public destroy(): void {
    for (const particle of this.particles) {
      particle.image.destroy();
    }

    this.particles.length = 0;
  }

  private createParticle(x: number, y: number): Particle {
    const key = this.getRandomSpriteKey();

    const image = this.scene.add.image(x, y, key);
    image.setOrigin(0.5);
    image.setDepth(-10);

    const particle: Particle = {
      image,

      x,
      y,
      baseY: y,

      size: 0,

      speedX: 0,
      speedY: 0,

      rotation: 0,
      rotationSpeed: 0,

      alpha: 0,

      swayOffset: 0,
      swaySpeed: 0,
      swayAmount: 0,
    };

    this.resetParticle(particle, x, y);

    return particle;
  }

  private resetParticle(particle: Particle, x: number, y: number): void {
    particle.x = x;
    particle.y = y;
    particle.baseY = y;

    particle.size = 8 + Math.random() * 18;

    particle.speedX = 12 + Math.random() * 28;
    particle.speedY = -6 + Math.random() * 12;

    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = -1.5 + Math.random() * 3;

    particle.alpha = 0.35 + Math.random() * 0.45;

    particle.swayOffset = Math.random() * Math.PI * 2;
    particle.swaySpeed = 1 + Math.random() * 2;
    particle.swayAmount = 6 + Math.random() * 14;

    particle.image.setTexture(this.getRandomSpriteKey());

    this.applyParticleTransform(particle);
  }

  private applyParticleTransform(particle: Particle): void {
    particle.image.setPosition(particle.x, particle.y);
    particle.image.setDisplaySize(particle.size, particle.size);
    particle.image.setRotation(particle.rotation);
    particle.image.setAlpha(particle.alpha);
  }

  private getRandomSpriteKey(): string {
    return PARTICLE_SPRITES[Math.floor(Math.random() * PARTICLE_SPRITES.length)];
  }
}
