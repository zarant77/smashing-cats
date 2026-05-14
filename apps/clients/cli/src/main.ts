import { createTranslator } from "@smashing-cats/i18n";
import { AppController } from "./AppController.js";

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const serverUrl = process.argv[2]?.startsWith("ws://") || process.argv[2]?.startsWith("wss://") ? process.argv[2] : "ws://localhost:8080";

const locale = getArgValue("--locale") ?? "en";
const t = createTranslator(locale);

const app = new AppController({
  serverUrl,
  t,
});

app.start();
