const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

// const FRONTEND_DIST = path.resolve("../frontend/dist"); // Vite output
// const BACKEND_FRONTEND_DIST = path.resolve("dist-frontend");
const DIST_DIR = path.resolve("dist");

// Clean dist
fs.rmSync(DIST_DIR, { recursive: true, force: true });
esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    minify: true,
    target: ["node24"],
    outfile: "dist/index.js",
    packages: "external",
    // loader: { ".node": "file" },
    logLevel: "info",
    metafile: true
  })
  .then((result) => {
    console.log("Build succeeded");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
