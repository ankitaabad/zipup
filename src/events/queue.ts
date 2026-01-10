import { Queue, Worker } from "bullmq";

// Create a new connection in every instance
const redisUrl = `http://redis`;
const redisPort = 6379;
const myQueue = new Queue("myqueue", {
  connection: {
    host: redisUrl,
    port: redisPort,
    keyPrefix: "zipup"
  }
});

const myWorker = new Worker("myqueue", async (job) => {}, {
  connection: {
    host: redisUrl,
    port: redisPort,
    keyPrefix: "zipup"
  }
});
