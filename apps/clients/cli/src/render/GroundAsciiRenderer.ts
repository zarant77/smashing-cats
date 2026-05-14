import { AsciiBuffer } from "./AsciiBuffer.js";

export class GroundAsciiRenderer {
  public render(buffer: AsciiBuffer, groundRow: number): void {
    if (groundRow < 0 || groundRow >= buffer.height) {
      return;
    }

    for (let x = 0; x < buffer.width; x++) {
      buffer.set(x, groundRow, "═");
    }
  }
}
