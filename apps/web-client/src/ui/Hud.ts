import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

export class Hud {
  private readonly element: HTMLDivElement;

  public constructor(root: HTMLElement) {
    this.element = document.createElement("div");
    this.element.className = "hud";

    root.append(this.element);
  }

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    const players = snapshot?.players.filter((player) => player.alive) ?? [];

    if (players.length === 0) {
      this.element.replaceChildren();
      return;
    }

    this.element.replaceChildren(
      ...players.map((player) => {
        const item = document.createElement("div");

        item.className = player.playerId === localPlayerId ? "hud-player hud-player-local" : "hud-player";

        item.innerHTML = `
          <img
            class="hud-player-portrait"
            src="/portraits/${player.kind}.png"
            alt="${player.kind}"
          />

          <div class="hud-player-content">
            <div class="hud-player-top">
              <strong>${t(player.kind)}</strong>
              <span class="hud-player-score">⭐ ${player.score}</span>
            </div>

            <div class="hud-hp-row">
              <span class="hud-hp-icon">❤️</span>

              <div
                class="hud-hp-segments"
                style="grid-template-columns: repeat(${player.maxHp}, 1fr)"
                aria-label="${t("hp")} ${player.hp}/${player.maxHp}"
              >
                ${createHpSegments(player.hp, player.maxHp)}
              </div>
            </div>
          </div>
        `;

        return item;
      }),
    );
  }
}

function createHpSegments(hp: number, maxHp: number): string {
  return Array.from({ length: maxHp }, (_, index) => {
    const className = index < hp ? "hud-hp-segment hud-hp-segment-active" : "hud-hp-segment";

    return `<span class="${className}"></span>`;
  }).join("");
}
