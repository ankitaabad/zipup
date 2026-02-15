import dockrode from "dockerode";

const docker = new dockrode();
// const container = docker.createContainer({
//   Image: "node:20-bookworm-slim",
//   name: "my_node_container",
//   Cmd: ["node", "-e", "console.log('Hello from Node.js container!')"],
//   Labels: {
//     purpose: "demo",
//     name : "test-name",
//     appId: "test-app-id"
//   }
// });

async function startContainer() {
  // (await container).start();
  await docker.listContainers({ all: true }).then((containers) => {
    console.log({ containers: JSON.stringify(containers) });
  });
}
startContainer();
