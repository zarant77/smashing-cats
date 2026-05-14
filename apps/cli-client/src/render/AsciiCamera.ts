export class AsciiCamera {
  public constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly worldWidthPerCell = 16,
    private readonly worldHeightPerCell = 24,
  ) {}

  public worldToScreenX(worldX: number, scrollX: number): number {
    return Math.round((worldX - scrollX) / this.worldWidthPerCell);
  }

  public screenXToColumn(screenX: number): number {
    return Math.round(screenX / this.worldWidthPerCell);
  }

  public worldToScreenY(worldY: number, groundY: number): number {
    return Math.round(this.height - 2 - (groundY - worldY) / this.worldHeightPerCell);
  }
}
