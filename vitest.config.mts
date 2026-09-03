import { fileURLToPath } from "node:url";
import path from "pathe";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    alias: {
      "~": fileURLToPath(new URL(".", import.meta.url)),
    },
    setupFiles: [],
    globals: true,
  },
});
