import blessed from "blessed";
import { readFileSync } from "node:fs";

import { getModuleLabel } from "./config.mjs";
import { getLogo } from "./logo.mjs";
import { menuTree } from "./missions.mjs";
import { getRunningDevSession, stopDevSession } from "./processRegistry.mjs";
import { getLastBuild } from "./stateStore.mjs";

export function createTui({ onAction }) {
  const logo = getLogo();
  const contentTop = logo.height + 1;

  const screen = blessed.screen({
    smartCSR: true,
    title: "Smash!ng Cats Mission Control",
  });

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: logo.height,
    tags: true,
    align: "center",
    content: `{cyan-fg}${logo.text}{/cyan-fg}`,
  });

  const menu = blessed.list({
    parent: screen,
    label: " Missions ",
    top: contentTop,
    left: 0,
    width: "35%",
    height: "62%",
    border: "line",
    keys: true,
    vi: true,
    mouse: true,
    style: {
      selected: {
        bg: "blue",
        fg: "white",
        bold: true,
      },

      border: {
        fg: "cyan",
      },
    },
  });

  const status = blessed.box({
    parent: screen,
    label: " Status ",
    top: contentTop,
    left: "35%",
    width: "65%",
    height: "62%",
    border: "line",
    tags: true,
    padding: 1,
    style: {
      border: {
        fg: "green",
      },
    },
  });

  const logs = blessed.box({
    parent: screen,
    label: " Logs ",
    top: "70%",
    left: 0,
    width: "100%",
    height: "30%",
    border: "line",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: true,
    padding: 1,
    style: {
      border: {
        fg: "yellow",
      },
    },
  });

  blessed.box({
    parent: screen,
    bottom: 0,
    left: 2,
    height: 1,
    width: "100%-4",
    tags: true,
    content: "{gray-fg}↑/↓ menu • Enter run • r restart • s stop • q quit{/gray-fg}",
  });

  const actions = flattenActions(menuTree);

  let busy = false;
  let busyText = "";

  menu.setItems(actions.map((item) => item.label));
  menu.focus();

  menu.on("select", async (_, index) => {
    await runAction(actions[index]);
  });

  screen.key(["q", "C-c"], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key("s", () => {
    if (busy) {
      return;
    }

    stopDevSession();
    render();
  });

  screen.key("r", async () => {
    if (busy) {
      return;
    }

    busy = true;
    busyText = "Restart dev";

    render();

    try {
      await onAction("dev:restart", {});
    } catch (error) {
      logs.setContent(formatError(error));
    } finally {
      busy = false;
      busyText = "";
    }

    render();
  });

  async function runAction(item) {
    if (item === undefined || busy) {
      return;
    }

    if (item.action === "exit") {
      screen.destroy();
      process.exit(0);
    }

    busy = true;
    busyText = item.label.trim();

    render();

    try {
      await onAction(item.action, item.payload ?? {});
    } catch (error) {
      logs.setContent(formatError(error));
    } finally {
      busy = false;
      busyText = "";
    }

    render();
  }

  function render() {
    renderStatus(status, busy, busyText);
    renderLogs(logs);

    screen.render();
  }

  const refreshTimer = setInterval(render, 1000);

  refreshTimer.unref();

  screen.on("destroy", () => {
    clearInterval(refreshTimer);
  });

  render();

  return {
    screen,
    render,
    header,
    menu,
    status,
    logs,
  };
}

function flattenActions(items, depth = 0) {
  return items.flatMap((item) => {
    const prefix = "  ".repeat(depth);
    const label = `${prefix}${item.children ? "▸" : "•"} ${item.title}`;

    if (item.children === undefined) {
      return [
        {
          label,
          action: item.action,
          payload: item.payload,
        },
      ];
    }

    return flattenActions(item.children, depth + 1);
  });
}

function renderStatus(box, busy, busyText) {
  const devSession = getRunningDevSession();
  const lastBuild = getLastBuild();

  const lines = ["{bold}Smash!ng Cats Mission Control{/bold}", ""];

  if (busy) {
    lines.push(`{yellow-fg}Busy: ${busyText}{/yellow-fg}`);
    lines.push("");
  }

  if (devSession === null) {
    lines.push("{red-fg}Dev: stopped{/red-fg}");
  } else {
    lines.push("{green-fg}Dev: running{/green-fg}");
    lines.push(`PID: ${devSession.pid}`);
    lines.push(`Port: ${devSession.port}`);
    lines.push(`Modules: ${getModuleLabel(devSession.modules)}`);
    lines.push(`Started: ${devSession.startedAt}`);
  }

  lines.push("");

  if (lastBuild === null) {
    lines.push("{gray-fg}Last build: none{/gray-fg}");
  } else {
    lines.push("{bold}Last build{/bold}");
    lines.push(`Type: ${lastBuild.type}`);
    lines.push(`Modules: ${getModuleLabel(lastBuild.modules)}`);
    lines.push(`Status: ${lastBuild.success ? "{green-fg}success{/green-fg}" : "{red-fg}failed{/red-fg}"}`);
    lines.push(`Finished: ${lastBuild.finishedAt}`);
  }

  box.setContent(lines.join("\n"));
}

function renderLogs(box) {
  const devSession = getRunningDevSession();

  if (devSession === null) {
    box.setContent("{gray-fg}No running dev session.{/gray-fg}");
    return;
  }

  try {
    const content = readFileSync(devSession.logPath, "utf8");

    const lines = content.trim().split("\n").slice(-12);

    box.setContent(lines.join("\n") || "{gray-fg}No logs yet.{/gray-fg}");
  } catch {
    box.setContent("{gray-fg}No logs yet.{/gray-fg}");
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return `{red-fg}${error.stack ?? error.message}{/red-fg}`;
  }

  return `{red-fg}${String(error)}{/red-fg}`;
}
