import blessed from "blessed";

import { startPupilAnimator } from "./pupilAnimator.mjs";
import { CAT } from "./splash-cat.mjs";

const TITLE_LAYOUT_HEIGHT = 4;
const TITLE_OFFSET_X = 3;
const TITLE_OVERLAY_LINES = [
  {
    y: 23,
    text: "Smash!ng Cats Mission Control",
    color: "yellow",
  },
  {
    y: 25,
    text: "Press any key to launch",
    color: "gray",
  },
];

export async function splash() {
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: "Smash!ng Cats",
    });

    const catLines = CAT.trim().split("\n");
    const catHeight = catLines.length;

    const pupils = {
      left: [
        { x: 23, y: 10 },
        { x: 25, y: 10 },
        { x: 28, y: 10 },
      ],
      right: [
        { x: 41, y: 9 },
        { x: 42, y: 9 },
        { x: 44, y: 9 },
      ],
    };

    let visibleLines = 1;
    let closed = false;
    let animator = null;

    const cat = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      align: "center",
      valign: "middle",
    });

    const animationTimer = setInterval(() => {
      visibleLines = Math.min(visibleLines + 1, catHeight);
      renderFrame();

      if (visibleLines >= catHeight) {
        clearInterval(animationTimer);

        const origin = getCatOrigin(screen, catLines);

        animator = startPupilAnimator({
          screen,
          pupils,
          origin,
        });
      }
    }, 35);

    function renderFrame() {
      const frameLines = visibleLines >= catHeight ? getCatWithTitle(catLines) : catLines;
      const animatedCat = getAnimatedCat(frameLines, visibleLines);
      const topPadding = "\n".repeat(catHeight - visibleLines);
      const bottomPadding = "\n".repeat(TITLE_LAYOUT_HEIGHT);

      cat.setContent(`${topPadding}` + `{cyan-fg}${animatedCat}{/cyan-fg}` + bottomPadding);

      screen.render();
    }

    function launch() {
      if (closed) {
        return;
      }

      closed = true;

      clearInterval(animationTimer);
      animator?.stop();
      screen.destroy();
      resolve();
    }

    function exit() {
      if (closed) {
        return;
      }

      closed = true;

      clearInterval(animationTimer);
      animator?.stop();
      screen.destroy();
      process.exit(0);
    }

    screen.key(["C-c"], exit);
    screen.key(["escape", "q"], launch);

    screen.program.input.once("data", (data) => {
      if (data.toString() === "\u0003") {
        exit();
        return;
      }

      launch();
    });

    renderFrame();
  });
}

function getAnimatedCat(lines, visibleLines) {
  return lines.slice(-visibleLines).join("\n");
}

function getCatWithTitle(catLines) {
  const lines = [...catLines];

  for (const titleLine of TITLE_OVERLAY_LINES) {
    lines[titleLine.y] = overlayText(lines[titleLine.y], titleLine.text, titleLine.color);
  }

  return lines;
}

function overlayText(line, text, color) {
  const chars = [...line];
  const start = Math.max(0, Math.floor((chars.length - text.length) / 2) + TITLE_OFFSET_X);
  const end = Math.min(chars.length, start + text.length);

  chars.splice(start, end - start, `{${color}-fg}${text}{/${color}-fg}`);

  return chars.join("");
}

function getCatOrigin(screen, catLines) {
  const maxLineWidth = Math.max(...catLines.map((line) => [...line].length));
  const contentHeight = catLines.length + TITLE_LAYOUT_HEIGHT;

  return {
    x: Math.max(0, Math.floor((screen.width - maxLineWidth) / 2)),
    y: Math.max(0, Math.floor((screen.height - contentHeight) / 2)),
  };
}
