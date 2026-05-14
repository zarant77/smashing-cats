import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  noExternal: ["@smashing-cats/client-netcode", "@smashing-cats/core", "@smashing-cats/i18n", "@smashing-cats/protocol"],
});
