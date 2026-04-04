import { AsyncLocalStorage } from "async_hooks";
import SenseLogs from "senselogs";
import { asyncLocalStorage, generateId } from "./helper";
import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

export const appLogger = new SenseLogs(
  { timestamp: true },
  { service: "zipup-service" }
);
// appLogger.addFilter(["debug", "info", "warn", "error", "fatal"]);
type ContextType = {
  logger: SenseLogs;
};
export const loggerMiddleware = (): MiddlewareHandler => {
  return createMiddleware(async (c, next) => {
    const requestId = c.req.header("Zipup-Request-ID") || generateId();
    const logger = appLogger.child({
      requestId
    });
    c.header("Zipup-Request-ID", requestId);
    const scheme = c.req.header("X-Forwarded-Proto");
    logger.debug(`Request scheme: ${scheme}`);
    c.set("scheme", scheme || "http");
    return asyncLocalStorage.run({ logger }, async () => {
      await next();
    });
  });
};

// Helper to get the current logger anywhere in your async chain
export const getLogger = () => {
  const store = asyncLocalStorage.getStore();
  if (!store) {
    return appLogger.child({
      requestId: "system",
      phase: "startup"
    });
  }
  return store.logger;
};
