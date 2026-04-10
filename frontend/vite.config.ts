import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import ReactInspector from "vite-plugin-react-inspector";
export default defineConfig({
  plugins: [
    ReactInspector(),
    react(),
    tsconfigPaths({
      projects: ["../tsconfig.base.json"]
    })
  ],

  // 👇 THIS is the important part
  build: {
    emptyOutDir: true // recommended
  },

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    },
    fs: {
      allow: [".."] // monorepo root
    }
  }
});
