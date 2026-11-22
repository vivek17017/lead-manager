
import type {
  ErrorRequestHandler,
  Response
} from "express";

import type { z } from "zod";

// A validation error for one form field
type FieldError = {
  field: string;
  message: string;
};

// Send a consistent JSON error response
export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: FieldError[]
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details && details.length > 0
        ? { details }
        : {})
    }
  });
}

// Convert Zod validation errors into API errors
export function sendValidationError(
  res: Response,
  issues: z.ZodIssue[],
  message = "Invalid request data"
): void {
  const details = issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));

  sendApiError(
    res,
    400,
    "VALIDATION_ERROR",
    message,
    details
  );
}

// Safely read a code from an unknown error
function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

// Check a known PostgreSQL error code
export function hasDatabaseCode(
  error: unknown,
  expectedCode: string
): boolean {
  return getErrorCode(error) === expectedCode;
}

// Identify database connection/availability errors
function isDatabaseUnavailable(error: unknown): boolean {
  const code = getErrorCode(error);

  if (!code) {
    return false;
  }

  const connectionErrors = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EPIPE",
    "57P01",
    "57P02",
    "57P03",
    "53300",
    "28P01",
    "3D000"
  ]);

  return code.startsWith("08") ||
    connectionErrors.has(code);
}

// Identify Express body-parser errors
function hasErrorType(
  error: unknown,
  expectedType: string
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === expectedType
  );
}

// Centralized Express error middleware
export const apiErrorHandler: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  next
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (hasErrorType(error, "entity.parse.failed")) {
    sendApiError(
      res,
      400,
      "INVALID_JSON",
      "Request body contains invalid JSON"
    );
    return;
  }

  if (hasErrorType(error, "entity.too.large")) {
    sendApiError(
      res,
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body exceeds the allowed size"
    );
    return;
  }

  // Log full details on the server, not to the client
  console.error(
    `[API ERROR] ${req.method} ${req.originalUrl}`,
    error
  );

  if (isDatabaseUnavailable(error)) {
    sendApiError(
      res,
      503,
      "DATABASE_UNAVAILABLE",
      "Database temporarily unavailable. Please try again later."
    );
    return;
  }

  sendApiError(
    res,
    500,
    "INTERNAL_ERROR",
    "An unexpected server error occurred"
  );
};
