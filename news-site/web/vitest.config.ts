import { defineConfig } from "vitest/config";
import path from "path";

// No time-zone pin: date helpers format in UK time explicitly
// (SITE_TIME_ZONE), so tests must pass whatever zone the machine is in.

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
