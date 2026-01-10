import { TraversalError } from "arktype";
import { Context } from "hono";
import { getLogger } from "./logger";
abstract class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}
export class BadRequest extends HttpError {
  constructor(message = "Bad request") {
    super(400, "BAD_REQUEST", message);
  }
}

export class Unauthorized extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, "UNAUTHORIZED", message);
  }
}

export function errorHandler(c: Context, error: Error) {
  const logger = getLogger();
  console.error(error);
  logger.debug(`error occured ${error.message}`);
  // 1. Your HTTP errors
  if (error instanceof HttpError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message
        }
      },
      error.status
    );
  }

  // 2. ArkType validation errors
  if (error instanceof TraversalError) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid request payload"
        }
      },
      400
    );
  }

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Something went wrong"
            : error instanceof Error
            ? error.message
            : "Unknown error"
      }
    },
    500
  );
}
