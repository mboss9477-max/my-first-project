import { defineConfig } from "vitest/config";
import path from "path";

// Date formatting uses the process time zone, so pin it: without this the
// formatDate tests pass in UTC and fail west of it (e.g. America/New_York).
process.env.TZ = "UTC";

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
