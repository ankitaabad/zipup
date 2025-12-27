import cliProgress from "cli-progress";
import FormData from "form-data";
import { Readable } from "stream";

export async function uploadArtifact(
  stream: Readable,
  size: number,
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<void> {
  // if (!(stream instanceof Readable)) {
  //   throw new TypeError("uploadArtifact requires a Node.js Readable stream");
  // }

  const form = new FormData();
  form.append("file", stream, {
    knownLength: size,
    filename: "artifact.tar.gz"
  });

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  let uploaded = 0;

  const totalSize = form.getLengthSync();
  bar.start(totalSize, 0);

  // Track progress via data event
  form.on("data", (chunk: Buffer) => {
    uploaded += chunk.length;
    bar.update(uploaded);
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data" },
    body: form as any
  });

  bar.stop();

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  }
}
