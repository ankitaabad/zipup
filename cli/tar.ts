import * as tar from "tar";
import ignore from "ignore";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

export function createTarStream(dir: string) {
  const ig = ignore().add(".git").add("node_modules").add(".DS_Store");

  if (fs.existsSync(".paasupignore")) {
    ig.add(fs.readFileSync(".paasupignore", "utf8"));
  }

  const files = fs.readdirSync(dir).filter((f) => !ig.ignores(f));

  const tarStream = tar.c(
    { gzip: true, cwd: dir, portable: true },
    files
  );

  const readable = new PassThrough();
  tarStream.pipe(readable);

  return readable; //
}
