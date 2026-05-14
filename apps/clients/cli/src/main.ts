import { Command } from "commander";

import { createTranslator } from "@smashing-cats/i18n";
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

const t = createTranslator(options.locale);

const app = new AppController({
  serverUrl: options.server,
  t,
});

app.start();
