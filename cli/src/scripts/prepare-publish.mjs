import fs from "fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

delete pkg.dependencies;
delete pkg.devDependencies;
delete pkg.packageManager;

fs.writeFileSync(
  "dist/package.json",
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      bin: pkg.bin,
      license: pkg.license,
      repository: pkg.repository
    },
    null,
    2
  )
);
fs.copyFileSync("README.md", "dist/README.md");
// fs.copyFileSync("LICENSE", "dist/LICENSE");
