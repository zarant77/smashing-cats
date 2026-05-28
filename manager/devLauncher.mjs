#!/usr/bin/env node

import { spawn } from "node:child_process";

const allClientViews = ["canvas", "phaser", "three"];
const defaultModules = ["server", ...allClientViews];
const selectedModules = parseList(process.env.ENABLED_MODULES, defaultModules).filter(
  (moduleName) => moduleName === "server" || allClientViews.includes(moduleName),
);
const selectedViews = selectedModules.filter((moduleName) => allClientViews.includes(moduleName));
const children = [];
let stopping = false;

if (selectedModules.length === 0) {
  console.log("No dev modules selected. Nothing to start.");
  process.exit(0);
}

console.log(`Starting dev modules: ${selectedModules.join(", ")}`);

if (selectedModules.includes("server")) {
  startProcess("server", ["--filter", "@smashing-cats/server", "dev"], {});
} else {
  console.log("Skipping server dev process.");
}

if (selectedViews.length > 0) {
  const enabledViews = selectedViews.join(",");

  startProcess("web", ["--filter", "@smashing-cats/web-client", "dev"], {
    ENABLED_VIEWS: enabledViews,
    VITE_ENABLED_VIEWS: enabledViews,
  });
} else {
  console.log("No client views selected. Skipping web dev process.");
}

if (children.length === 0) {
  process.exit(0);
}

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);

function parseList(value, fallback) {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function startProcess(label, args, env) {
  console.log(`Starting ${label}: pnpm ${args.join(" ")}`);

  const child = spawn("pnpm", args, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (signal !== null) {
      console.log(`${label} stopped by ${signal}.`);
    } else {
      console.log(`${label} exited with code ${code ?? 0}.`);
    }

    if (!stopping) {
      stopping = true;
      stopChildren();
    }

    if (children.every((runningChild) => runningChild.exitCode !== null || runningChild.signalCode !== null)) {
      process.exit(code ?? 0);
    }
  });
}

function stopChildren() {
  stopping = true;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
  }
}
