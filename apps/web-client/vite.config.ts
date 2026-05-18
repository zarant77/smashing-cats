import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 3000,
  },
});
