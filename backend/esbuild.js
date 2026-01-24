const esbuild = require("esbuild");
const fs = require("node:fs");
const result = esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    minify: true,
    target: ["node20"],
    outfile: "dist/index.js",
    // external: ["ssh2"],
    loader: { ".node": "file" },
    logLevel: "info",
    metafile: true
  })
  .then((result) => {
    console.log("Build succeeded");
    fs.writeFileSync("meta.json", JSON.stringify(result.metafile));
    return result;
  })
  .catch(() => process.exit(1));
