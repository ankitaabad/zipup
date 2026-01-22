import { getLogger } from "@backend/utils/logger";
import { Hono } from "hono";

export const logsRouter = new Hono();

logsRouter.all("/select/*", async (c) => {
  const logger = getLogger();
  const originalUrl = new URL(c.req.url);

  // strip `/logs`
  const rewrittenPath = originalUrl.pathname.replace(/^\/logs/, "");

  const targetUrl = new URL(originalUrl.toString());
  targetUrl.protocol = "http:";
  targetUrl.hostname = "victorialogs";
  targetUrl.port = "9428";
  targetUrl.pathname = rewrittenPath;

  logger.debug("Proxying VictoriaLogs request", {
    from: originalUrl.pathname,
    to: targetUrl.pathname,
  });

  const headers = new Headers(c.req.raw.headers);
  headers.delete("host");
  headers.delete("content-length");

  const res = await fetch(targetUrl.toString(), {
    method: c.req.method,
    headers,
    body: c.req.raw.body,
  });

  return c.body(res.body, res.status, res.headers);
});
