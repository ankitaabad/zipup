import { db } from "./utils";

async function main() {
  await db.insert(logs).values([
    {
      level: "info",
      request_id: "test",
      log_id: "log_id_test",
      extra: JSON.stringify({ message: "testmessage" })
    }
  ]);
}
main();
