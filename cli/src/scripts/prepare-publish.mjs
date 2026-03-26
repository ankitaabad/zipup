import fs from "fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

delete pkg.devDependencies;
delete pkg.packageManager;
delete pkg.scripts
fs.writeFileSync("dist/package.json", JSON.stringify(pkg, null, 2));
fs.copyFileSync("README.md", "dist/README.md");
// fs.copyFileSync("LICENSE", "dist/LICENSE");
