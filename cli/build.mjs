// build.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node"
  }
});
