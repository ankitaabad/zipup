import { withErrorHandler } from "./../utils/middlewares";
import { db } from "@backend/db/dbClient";
import { deploymentsTable } from "@backend/db/schema";
import { BadRequest } from "@backend/utils/errorHandler";
import { createAppKeyAuthenticatedRouter } from "@backend/utils/middlewares";
import { eq } from "drizzle-orm";

export const deploymentRouter = createAppKeyAuthenticatedRouter();

deploymentRouter.get(
  "/:deployment_id",
  withErrorHandler(async (c) => {
    const deployment_id = c.req.param("deployment_id");
    if (!deployment_id) {
      throw new BadRequest("Deployment id is required");
    }

    const data = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, deployment_id))
      .get();
    return c.json({ data });
  })
);
