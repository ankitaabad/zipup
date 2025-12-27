import EventEmitter from "events";

export const eventBus = new EventEmitter();

export const events = {
  APP_DEPLOYED: "app_deployed"
};

eventBus.on(events.APP_DEPLOYED, (appId: string, version: number) => {
  console.log(`App deployed: ${appId} version ${version}`);
});

export const emitAppDeployed = (appId: string, version: number) => {
  eventBus.emit(events.APP_DEPLOYED, appId, version);
};

emitAppDeployed("my-app", 1);


