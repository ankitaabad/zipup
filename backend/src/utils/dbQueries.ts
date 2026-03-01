import { and, eq } from "drizzle-orm";
import { appsTable, artifactsTable, deploymentsTable } from "../db/schema";
import { db } from "@backend/db/dbClient";
import { sql } from "drizzle-orm";

async function getLatestDeployment() {
  // Get latest successful deployment per app_id
  return await db
    .select()
    .from(deploymentsTable)
    .where(
      sql`${deploymentsTable.id} = (
      SELECT d2.id
      FROM deployments d2
      WHERE d2.app_id = ${deploymentsTable.app_id} AND d2.status = 'success'
      ORDER BY d2.created_at DESC
      LIMIT 1
    )`
    );
}

export async function getArtifactWithApp(artifactId: string) {
  const result = await db
    .select()
    .from(artifactsTable)
    .leftJoin(appsTable, eq(artifactsTable.app_id, appsTable.id))
    .where(eq(artifactsTable.id, artifactId))
    .limit(1);
  if (!result[0]) {
    return { artifact: null, app: null };
  }
  return { artifact: result[0].artifacts, app: result[0].apps };
}

export async function getAppWithLatestArtifact(appId: string) {
  const result = await db
    .select()
    .from(appsTable)
    .leftJoin(
      artifactsTable,
      and(
        eq(appsTable.id, artifactsTable.app_id),
        sql`${artifactsTable.version} = (
          SELECT MAX(version) FROM artifacts WHERE app_id = ${appId}
        )`
      )
    )
    .where(eq(appsTable.id, appId))
    .limit(1);

  if (!result[0]) {
    return { app: null, artifact: null };
  }
  return { app: result[0].apps, artifact: result[0].artifacts };
}