// build.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["cfonts"],
  banner: {
    js: "#!/usr/bin/env node"
  }
});
