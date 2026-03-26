import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Standard error response shape for API routes.
 *
 * All API error responses follow this consistent structure to make
 * client-side error handling predictable.
 *
 * @property error - Human-readable error message
 * @property code - Optional error code for programmatic handling (e.g., "VALIDATION_ERROR")
 * @property details - Optional additional details about the error (e.g., validation errors)
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Custom API error class with HTTP status code support.
 *
 * Base class for all API errors. Extends the native Error class with
 * additional properties for HTTP status codes, error codes, and details.
 * Use the specialized subclasses (ValidationError, AuthError, etc.) for
 * common HTTP error scenarios.
 *
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (default: 500)
 * @param code - Optional error code for programmatic handling
 * @param details - Optional additional error details
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
 * Validation error for invalid input (400).
 *
 * Thrown when client input fails validation. The details parameter
 * can contain specific validation errors for each field.
 *
 * @param message - Human-readable validation error message
 * @param details - Optional validation details (e.g., field-level errors)
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication error for missing or invalid auth (401).
 *
 * Thrown when a request lacks valid authentication credentials.
 * Use this for missing tokens, expired sessions, or invalid credentials.
 *
 * @param message - Human-readable auth error message (default: "Unauthorized")
 */
export class AuthError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

/**
 * Authorization error for insufficient permissions (403).
 *
 * Thrown when an authenticated user lacks permission to access a resource.
 * Differs from AuthError (401) in that the user is authenticated but not authorized.
 *
 * @param message - Human-readable authorization error message (default: "Forbidden")
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN_ERROR");
    this.name = "ForbiddenError";
  }
}

/**
 * Not found error for missing resources (404).
 *
 * Thrown when a requested resource does not exist. This could be
 * a missing database record, file, or API endpoint.
 *
 * @param message - Human-readable not found message (default: "Resource not found")
 */
export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Rate limit error (429).
 *
 * Thrown when a client exceeds the allowed request rate. This helps
 * protect the API from abuse and ensures fair resource allocation.
 *
 * @param message - Human-readable rate limit message (default: "Too many requests. Please try again later.")
 */
export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

/**
 * Internal server error (500).
 *
 * Thrown when an unexpected error occurs on the server. This indicates
 * a problem with the server-side code or infrastructure, not client input.
 * Details can include stack traces or error context for debugging.
 *
 * @param message - Human-readable error message (default: "Internal server error")
 * @param details - Optional error details for debugging
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
 * Type guard to check if an error is an ApiError instance.
 *
 * Useful for narrowing error types in catch blocks to access
 * ApiError-specific properties like statusCode and code.
 *
 * @param error - Error to check
 * @returns True if the error is an ApiError instance
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extracts a human-readable error message from unknown error types.
 *
 * Handles different error shapes that can be thrown in JavaScript:
 *   - Error instances: Returns the message property
 *   - String errors: Returns the string directly
 *   - Other types: Returns a generic fallback message
 *
 * This helper centralizes error message extraction logic so it doesn't
 * need to be repeated throughout the codebase.
 *
 * @param error - Error of unknown type
 * @returns Human-readable error message string
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

/**
 * Higher-order function that wraps an API route handler with automatic error handling.
 * Any errors thrown in the handler will be caught and converted to proper error responses.
 *
 * @param handler - The API route handler to wrap
 * @param context - Optional context for error logging
 * @returns Wrapped handler with error handling
 *
 * @example
 * export const POST = withErrorHandler(async (request: NextRequest) => {
 *   // Your route logic here
 *   // Throw ApiError instances for expected errors
 *   throw new ValidationError("Invalid input");
 *
 *   return NextResponse.json({ success: true });
 * });
 */
export function withErrorHandler<T extends unknown[] = []>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  context?: Record<string, unknown>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return errorResponse(error, context);
    }
  };
}
