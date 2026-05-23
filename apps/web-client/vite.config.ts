import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import pkg from "../../package.json" with { type: "json" };

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true,
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 3000,
  },
  define: {
    __ASSET_VERSION__: JSON.stringify(pkg.version),
  },
});
