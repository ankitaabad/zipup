import * as tar from "tar";
import ignore from "ignore";
import fs from "fs";
import { PassThrough, Readable } from "stream";

export function createTarStream(dir: string): Readable {
  const ig = ignore()
    .add(".git")
    .add("node_modules")
    .add(".DS_Store");

  if (fs.existsSync(".passupignore")) {
    ig.add(fs.readFileSync(".passupignore", "utf8"));
  }

  const files = fs.readdirSync(dir).filter((f) => !ig.ignores(f));

  // tar.c() returns Minipass
  const mini = tar.c(
    {
      gzip: true,
      cwd: dir,
      portable: true
    },
    files
  );

  // 🔑 Bridge Minipass → Node Readable
  const nodeStream = new PassThrough();
  mini.pipe(nodeStream);

  return nodeStream;
}
