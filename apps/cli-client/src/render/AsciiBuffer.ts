export class AsciiBuffer {
  private readonly cells: string[][];

  public constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    this.cells = [];

    for (let y = 0; y < height; y++) {
      const row: string[] = [];

      for (let x = 0; x < width; x++) {
        row.push(" ");
      }

      this.cells.push(row);
    }
  }

  public clear(fill = " "): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[y]![x] = fill;
      }
    }
  }

  public set(x: number, y: number, value: string): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }

    this.cells[y]![x] = value;
  }

  public drawText(x: number, y: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.set(x + i, y, text[i] ?? " ");
    }
  }

  public drawSprite(x: number, bottomY: number, lines: string[]): void {
    const topY = bottomY - lines.length + 1;

    for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
      this.drawText(x, topY + rowIndex, lines[rowIndex] ?? "");
    }
  }

  public toString(): string {
    return this.cells.map((row) => row.join("")).join("\n");
  }
}
