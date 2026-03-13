// build.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  banner: {
    js: "#!/usr/bin/env node"
  }
});