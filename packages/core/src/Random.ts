export class Random {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.next() / 0xffffffff;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  public pick<T>(items: readonly T[]): T {
    const item = items[this.nextInt(0, items.length - 1)];
    if (item === undefined) {
      throw new Error("Cannot pick from an empty array");
    }
    return item;
  }
}
