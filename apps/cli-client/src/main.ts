import { Command } from "commander";

import { i18n } from "@smashing-cats/i18n";
import { AppController } from "./AppController.js";

const program = new Command();

program
  .name("smashing-cats-cli")
  .option("-s, --server <url>", "WebSocket server URL", "ws://localhost:8080")
  .option("-l, --locale <locale>", "CLI locale", "en")
  .parse(process.argv);

const options = program.opts<{
  server: string;
  locale: string;
}>();

i18n.changeLocale(options.locale ?? "en");

const app = new AppController(options.server);

app.start();
