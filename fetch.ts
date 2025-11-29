// import { apps } from "./src/db/schema";
// import { drizzle } from "drizzle-orm/libsql";

// const db = drizzle({
//   connection: {
//     url: "file:./my_database.db"
//   }
// });
// const x = db.select().from(apps).prepare();
// async function main() {
//   const result = (await x.all()).map((x) => {
//     x.extra = JSON.parse(x.extra as string);
//     return x;
//   });
//   console.log({ result });
// }

// main();
