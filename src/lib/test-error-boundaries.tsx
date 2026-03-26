/**
 * Test utilities for triggering errors in development mode.
 *
 * These utilities allow developers to test error boundaries without needing
 * to simulate real error conditions. They are only active in development mode.
 *
 * Usage:
 *
 * 1. Import the test component into your page/component:
 *    ```tsx
 *    import { TestErrorTriggers } from '@/lib/test-error-boundaries';
 *
 *    // Add to your component during development
 *    {process.env.NODE_ENV === 'development' && <TestErrorTriggers />}
 *    ```
 *
 * 2. Or use console helpers in browser DevTools:
 *    ```js
 *    window.testErrorBoundaries.throwGenericError()
 *    window.testErrorBoundaries.throwConvexError('rate_limit')
 *    window.testErrorBoundaries.throwStripeError('card_declined')
 *    window.testErrorBoundaries.throwFormError()
 *    ```
 *
 * @module test-error-boundaries
 */

"use client";

// Only enable in development
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Error factory functions that create specific error types for testing
 */
export const ErrorFactories = {
  /**
   * Create a generic React error
   */
  generic: (message = "Test error: Generic component error"): Error => {
    return new Error(message);
  },

  /**
   * Create a Convex-style error
   */
  convex: (type: "rate_limit" | "network" | "generic" = "generic"): Error & { data: unknown } => {
    if (type === "rate_limit") {
      const error = new Error("Convex rate limit error") as Error & { data: unknown };
      error.data = {
        kind: "RateLimited",
        message: "Too many attempts. Please try again in a moment.",
      };
      return error;
    }

    if (type === "network") {
      const error = new Error("Convex network error") as Error & { data: unknown };
      error.data = "Unable to connect to the server. Please check your internet connection.";
      return error;
    }

    const error = new Error("Convex generic error") as Error & { data: unknown };
    error.data = "Something went wrong with the database operation.";
    return error;
  },

  /**
   * Create a Stripe-style error
   */
  stripe: (
    type: "card_declined" | "insufficient_funds" | "expired_card" | "rate_limit" | "validation" | "api" = "card_declined"
  ): Error & { type?: string; code?: string; decline_code?: string } => {
    const baseError = new Error("Stripe error") as Error & {
      type?: string;
      code?: string;
      decline_code?: string;
    };

    switch (type) {
      case "card_declined":
        baseError.type = "card_error";
        baseError.decline_code = "generic_decline";
        baseError.message = "Your card was declined. Please try a different payment method.";
        return baseError;

      case "insufficient_funds":
        baseError.type = "card_error";
        baseError.decline_code = "insufficient_funds";
        baseError.message = "Your card has insufficient funds.";
        return baseError;

      case "expired_card":
        baseError.type = "card_error";
        baseError.decline_code = "expired_card";
        baseError.message = "Your card has expired. Please use a different card.";
        return baseError;

      case "rate_limit":
        baseError.type = "rate_limit_error";
        baseError.message = "Too many payment attempts. Please wait a moment and try again.";
        return baseError;

      case "validation":
        baseError.type = "validation_error";
        baseError.message = "Payment information is invalid. Please check your details.";
        return baseError;

      case "api":
        baseError.type = "api_error";
        baseError.message = "Payment service temporarily unavailable. Please try again.";
        return baseError;

      default:
        return baseError;
    }
  },

  /**
   * Create a form-specific error
   */
  form: (message = "Test error: Form validation failed"): Error => {
    return new Error(message);
  },
};

/**
 * Component that throws an error for testing error boundaries.
 * Use this component inside an error boundary to test its behavior.
 */
export function ErrorThrower({ error }: { error: Error }) {
  if (isDevelopment) {
    throw error;
  }
  return null;
}

/**
 * Console helpers for manual testing in browser DevTools.
 * These are automatically attached to window.testErrorBoundaries in development.
 */
export const consoleHelpers = {
  /**
   * Throw a generic component error
   */
  throwGenericError: () => {
    if (!isDevelopment) {
      console.warn("Error testing is only available in development mode");
      return;
    }
    throw ErrorFactories.generic();
  },

  /**
   * Throw a Convex error
   * @param type - Type of Convex error: 'rate_limit', 'network', or 'generic'
   */
  throwConvexError: (type: "rate_limit" | "network" | "generic" = "generic") => {
    if (!isDevelopment) {
      console.warn("Error testing is only available in development mode");
      return;
    }
    throw ErrorFactories.convex(type);
  },

  /**
   * Throw a Stripe error
   * @param type - Type of Stripe error
   */
  throwStripeError: (
    type: "card_declined" | "insufficient_funds" | "expired_card" | "rate_limit" | "validation" | "api" = "card_declined"
  ) => {
    if (!isDevelopment) {
      console.warn("Error testing is only available in development mode");
      return;
    }
    throw ErrorFactories.stripe(type);
  },

  /**
   * Throw a form error
   */
  throwFormError: () => {
    if (!isDevelopment) {
      console.warn("Error testing is only available in development mode");
      return;
    }
    throw ErrorFactories.form();
  },

  /**
   * Print help message showing available test commands
   */
  help: () => {
    console.log(`
🧪 Error Boundary Test Utilities

Available commands:
  window.testErrorBoundaries.throwGenericError()
    - Tests base ErrorBoundary

  window.testErrorBoundaries.throwConvexError(type)
    - Tests ConvexErrorBoundary
    - Types: 'rate_limit', 'network', 'generic'
    - Example: window.testErrorBoundaries.throwConvexError('rate_limit')

  window.testErrorBoundaries.throwStripeError(type)
    - Tests StripeErrorBoundary
    - Types: 'card_declined', 'insufficient_funds', 'expired_card', 'rate_limit', 'validation', 'api'
    - Example: window.testErrorBoundaries.throwStripeError('card_declined')

  window.testErrorBoundaries.throwFormError()
    - Tests FormErrorBoundary

Note: These utilities only work in development mode.
    `);
  },
};

/**
 * Install console helpers on window object for easy access in DevTools
 * (only in development and browser environment)
 */
if (isDevelopment && typeof window !== "undefined") {
  (window as typeof window & { testErrorBoundaries: typeof consoleHelpers }).testErrorBoundaries = consoleHelpers;

  // Log helpful message on page load
  console.log(
    "%c🧪 Error Boundary Test Utilities Available",
    "color: #d4af37; font-weight: bold; font-size: 14px;",
    "\nType window.testErrorBoundaries.help() for usage instructions"
  );
}

/**
 * React component that provides a UI for triggering test errors.
 * Only renders in development mode.
 *
 * Usage:
 * ```tsx
 * import { TestErrorTriggers } from '@/lib/test-error-boundaries';
 *
 * // Add to your page during development
 * {process.env.NODE_ENV === 'development' && <TestErrorTriggers />}
 * ```
 */
export function TestErrorTriggers() {
  if (!isDevelopment) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-gold/30 bg-bg-primary p-4 shadow-lg">
      <h3 className="mb-3 text-sm font-semibold text-gold">🧪 Test Error Boundaries</h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => consoleHelpers.throwGenericError()}
          className="rounded border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-bg-secondary"
        >
          Generic Error
        </button>
        <button
          onClick={() => consoleHelpers.throwConvexError("rate_limit")}
          className="rounded border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-bg-secondary"
        >
          Convex Rate Limit
        </button>
        <button
          onClick={() => consoleHelpers.throwStripeError("card_declined")}
          className="rounded border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-bg-secondary"
        >
          Stripe Card Declined
        </button>
        <button
          onClick={() => consoleHelpers.throwFormError()}
          className="rounded border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-bg-secondary"
        >
          Form Error
        </button>
      </div>
      <p className="mt-2 text-[10px] text-text-muted">
        Or use window.testErrorBoundaries in console
      </p>
    </div>
  );
}
