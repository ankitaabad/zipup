const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const FRONTEND_DIST = path.resolve("../frontend/dist"); // Vite output
const BACKEND_FRONTEND_DIST = path.resolve("dist-frontend");

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs", 
    minify: true,
    target: ["node20"],
    outfile: "dist/index.js",
    external: ["crypto","drizzle-arktype"],
    loader: { ".node": "file" },
    logLevel: "info",
    metafile: true
  })
  .then((result) => {
    console.log("Build succeeded");

    // write esbuild metafile (you already do this)
    fs.writeFileSync("meta.json", JSON.stringify(result.metafile, null, 2));

    // 👇 copy frontend build
    fs.rmSync(BACKEND_FRONTEND_DIST, { recursive: true, force: true });
    fs.cpSync(FRONTEND_DIST, BACKEND_FRONTEND_DIST, { recursive: true });

    console.log("✅ Frontend build copied to dist-frontend");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
