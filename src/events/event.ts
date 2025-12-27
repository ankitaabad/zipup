import EventEmitter from "events";
import { artifactsTable } from "../db/schema";
import { eq } from "drizzle-orm";

export const eventBus = new EventEmitter();

export const passupEvents = {
  "app_deployed": "app_deployed",
  "artifact_uploaded": "artifact_uploaded"
};

eventBus.on(
  passupEvents.artifact_uploaded,
  async (event: { artifactId: string }) => {
    console.log(`Artifact uploaded: ${event.artifactId}`);
    // get artifact info
    const artifact = await db
      .select()
      .from(artifactsTable)
      .where(eq(artifactsTable.id, event.artifactId))
      .get();
    console.log(`Artifact info: ${JSON.stringify(artifact)}`);
    if (!artifact) {
      console.error(`Artifact not found: ${event.artifactId}`);
      return;
    }

    console.log(`Artifact info: ${JSON.stringify(artifact)}`);
  }
);
