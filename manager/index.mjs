#!/usr/bin/env node

import { bootstrapManager } from "./bootstrap.mjs";
import { splash } from "./splash.mjs";

await splash();

bootstrapManager().catch((error) => {
  console.error(error);
  process.exit(1);
});
