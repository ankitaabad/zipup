import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [tsconfigPaths({
      projects: ["./tsconfig.json"] // path to your root TS config
    })],

  test: {
    environment: "node",
    // Test file patterns
    include: ["__test__/**/*.test.ts"]
  }
});
