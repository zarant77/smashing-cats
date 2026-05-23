import { t } from "@smashing-cats/i18n";
import type { GameSnapshot } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";

export class HudAsciiRenderer {
  public render(buffer: AsciiBuffer, snapshot: GameSnapshot): void {
    let x = 1;

    for (const player of snapshot.players) {
      const name = t(player.kind);

      const hp = `${"★".repeat(Math.max(0, player.hp))}` + `${"☆".repeat(Math.max(0, player.maxHp - player.hp))}`;

      const content = ` ${name}  ${hp}  ${t("score")}: ${player.score} `;

      const width = content.length;

      buffer.drawText(x, 0, `┌${"─".repeat(width)}┐`);

      buffer.drawText(x, 1, `│${content}│`);

      buffer.drawText(x, 2, `└${"─".repeat(width)}┘`);

      x += width + 4;
    }
  }
}
