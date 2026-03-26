import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Standard error response shape for API routes
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Custom API error class with HTTP status code support
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Validation error for invalid input (400)
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication error for missing or invalid auth (401)
 */
export class AuthError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

/**
 * Authorization error for insufficient permissions (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN_ERROR");
    this.name = "ForbiddenError";
  }
}

/**
 * Not found error for missing resources (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends ApiError {
  constructor(message: string = "Internal server error", details?: unknown) {
    super(message, 500, "INTERNAL_ERROR", details);
    this.name = "InternalError";
  }
}

/**
 * Creates a standardized JSON error response and logs to Sentry.
 *
 * @param error - Error to handle (can be ApiError, Error, or unknown)
 * @param context - Additional context for Sentry logging
 * @returns NextResponse with error JSON and appropriate status code
 */
export function errorResponse(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    // Log to Sentry with appropriate severity
    const severity = error.statusCode >= 500 ? "error" : "warning";
    Sentry.captureException(error, {
      level: severity,
      contexts: {
        api: context,
      },
      tags: {
        error_code: error.code,
        status_code: error.statusCode.toString(),
      },
    });

    const response: ErrorResponse = {
      error: error.message,
    };
    if (error.code) response.code = error.code;
    if (error.details) response.details = error.details;

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    Sentry.captureException(error, {
      level: "error",
      contexts: {
        api: context,
      },
    });

    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }

  // Handle unknown errors
  const message = "An unexpected error occurred";
  Sentry.captureException(new Error(message), {
    level: "error",
    contexts: {
      api: {
        ...context,
        originalError: error,
      },
    },
  });

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Checks if an error is an ApiError instance
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extracts error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}
