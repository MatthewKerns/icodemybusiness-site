"use client";

/**
 * Development-only test page for error boundaries
 * Navigate to /test-error-boundaries in development to test all error boundary implementations
 */

import { useState } from "react";
import { TestErrorTriggers, ErrorFactories } from "@/lib/test-error-boundaries";
import { ConvexErrorBoundary } from "@/components/shared/ConvexErrorBoundary";
import { StripeErrorBoundary } from "@/components/shared/StripeErrorBoundary";
import { FormErrorBoundary } from "@/components/shared/FormErrorBoundary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { EmailCaptureComponent } from "@/components/shared/EmailCapture";
import { AlertTriangle } from "lucide-react";

// Component that throws an error for testing
function ErrorThrower({ error }: { error: Error | null }) {
  if (error) {
    throw error;
  }
  return null;
}

export default function TestErrorBoundariesPage() {
  const [convexError, setConvexError] = useState<Error | null>(null);
  const [stripeError, setStripeError] = useState<Error | null>(null);
  const [formError, setFormError] = useState<Error | null>(null);
  const [genericError, setGenericError] = useState<Error | null>(null);

  // Prevent access in production
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="rounded-lg border border-error bg-error/10 p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-error" />
          <h1 className="text-h2 font-bold text-error">Access Denied</h1>
          <p className="mt-2 text-text-secondary">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-h1 font-bold text-text-primary">
            🧪 Error Boundary Testing
          </h1>
          <p className="mt-4 text-text-muted">
            Test all error boundary implementations in a controlled environment
          </p>
          <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 p-4">
            <p className="text-sm text-gold">
              <strong>Tip:</strong> Open your browser DevTools console to see
              error logging and use{" "}
              <code className="rounded bg-black px-2 py-1">
                window.testErrorBoundaries
              </code>{" "}
              helpers
            </p>
          </div>
        </div>

        {/* Test Sections */}
        <div className="space-y-8">
          {/* 1. ConvexErrorBoundary Test */}
          <section className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-h3 font-bold text-text-primary">
              1. ConvexErrorBoundary
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Tests Convex-specific error handling with retry functionality
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() =>
                  setConvexError(ErrorFactories.convex("rate_limit"))
                }
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Rate Limit
              </button>
              <button
                onClick={() => setConvexError(ErrorFactories.convex("network"))}
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Network Error
              </button>
              <button
                onClick={() => setConvexError(ErrorFactories.convex("generic"))}
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Generic Error
              </button>
              <button
                onClick={() => setConvexError(null)}
                className="rounded bg-success px-4 py-2 text-sm text-white hover:bg-success/90"
              >
                Reset
              </button>
            </div>
            <div className="mt-4">
              <ConvexErrorBoundary>
                <ErrorThrower error={convexError} />
                <div className="rounded-lg border border-border bg-bg-primary p-4">
                  <p className="text-text-secondary">
                    ✅ ConvexErrorBoundary working - no errors thrown
                  </p>
                  <EmailCaptureComponent
                    variant="compact"
                    source="test-page"
                    headline="Test EmailCapture with Convex"
                    subtitle="This component uses Convex mutations"
                  />
                </div>
              </ConvexErrorBoundary>
            </div>
          </section>

          {/* 2. StripeErrorBoundary Test */}
          <section className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-h3 font-bold text-text-primary">
              2. StripeErrorBoundary
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Tests Stripe-specific error handling with payment context
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() =>
                  setStripeError(ErrorFactories.stripe("card_declined"))
                }
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Card Declined
              </button>
              <button
                onClick={() =>
                  setStripeError(ErrorFactories.stripe("insufficient_funds"))
                }
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Insufficient Funds
              </button>
              <button
                onClick={() =>
                  setStripeError(ErrorFactories.stripe("rate_limit"))
                }
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Rate Limit
              </button>
              <button
                onClick={() => setStripeError(null)}
                className="rounded bg-success px-4 py-2 text-sm text-white hover:bg-success/90"
              >
                Reset
              </button>
            </div>
            <div className="mt-4">
              <StripeErrorBoundary>
                <ErrorThrower error={stripeError} />
                <div className="rounded-lg border border-border bg-bg-primary p-4">
                  <p className="text-text-secondary">
                    ✅ StripeErrorBoundary working - no errors thrown
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    Simulated Stripe checkout component would go here
                  </p>
                </div>
              </StripeErrorBoundary>
            </div>
          </section>

          {/* 3. FormErrorBoundary Test */}
          <section className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-h3 font-bold text-text-primary">
              3. FormErrorBoundary
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Tests form-specific error handling with inline display
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setFormError(ErrorFactories.form())}
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Form Error
              </button>
              <button
                onClick={() => setFormError(null)}
                className="rounded bg-success px-4 py-2 text-sm text-white hover:bg-success/90"
              >
                Reset
              </button>
            </div>
            <div className="mt-4">
              <FormErrorBoundary formName="Test Form">
                <ErrorThrower error={formError} />
                <div className="rounded-lg border border-border bg-bg-primary p-4">
                  <p className="text-text-secondary">
                    ✅ FormErrorBoundary working - no errors thrown
                  </p>
                  <form className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Test input field"
                      className="w-full rounded border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                    />
                    <button
                      type="button"
                      className="rounded bg-gold px-4 py-2 text-black"
                    >
                      Test Submit
                    </button>
                  </form>
                </div>
              </FormErrorBoundary>
            </div>
          </section>

          {/* 4. Base ErrorBoundary Test */}
          <section className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-h3 font-bold text-text-primary">
              4. Base ErrorBoundary
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Tests generic error boundary with customizable fallback
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setGenericError(ErrorFactories.generic())}
                className="mr-2 rounded border border-border bg-bg-primary px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              >
                Trigger Generic Error
              </button>
              <button
                onClick={() => setGenericError(null)}
                className="rounded bg-success px-4 py-2 text-sm text-white hover:bg-success/90"
              >
                Reset
              </button>
            </div>
            <div className="mt-4">
              <ErrorBoundary>
                <ErrorThrower error={genericError} />
                <div className="rounded-lg border border-border bg-bg-primary p-4">
                  <p className="text-text-secondary">
                    ✅ Base ErrorBoundary working - no errors thrown
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    Any component can be wrapped with the base ErrorBoundary
                  </p>
                </div>
              </ErrorBoundary>
            </div>
          </section>
        </div>

        {/* Instructions */}
        <div className="mt-12 rounded-xl border border-gold/30 bg-gold/5 p-8">
          <h2 className="text-h3 font-bold text-gold">Testing Instructions</h2>
          <div className="mt-4 space-y-4 text-sm text-text-secondary">
            <div>
              <h3 className="font-semibold text-text-primary">
                1. Using This Page:
              </h3>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Click any &ldquo;Trigger&rdquo; button to test an error boundary</li>
                <li>Observe the error boundary fallback UI</li>
                <li>Click &ldquo;Reset&rdquo; to clear the error and restore content</li>
                <li>Check browser console for Sentry error logging</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">
                2. Using Console Helpers:
              </h3>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  Open DevTools and type{" "}
                  <code className="rounded bg-black px-2 py-1">
                    window.testErrorBoundaries.help()
                  </code>
                </li>
                <li>
                  Use provided commands to trigger errors on any page
                </li>
                <li>
                  Example:{" "}
                  <code className="rounded bg-black px-2 py-1">
                    window.testErrorBoundaries.throwConvexError(&apos;rate_limit&apos;)
                  </code>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">
                3. Testing on Real Pages:
              </h3>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  <strong>/subscribe</strong> - Test ConvexErrorBoundary with
                  pricing section
                </li>
                <li>
                  <strong>/free-tools</strong> - Test EmailCapture with both
                  Convex and Form boundaries
                </li>
                <li>
                  <strong>/consulting</strong> - Test CalendlyEmbed with base
                  ErrorBoundary
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">
                4. Verify Sentry Integration:
              </h3>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Trigger each error type</li>
                <li>Check Sentry dashboard for logged errors</li>
                <li>Verify error context includes component name and type</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Floating test triggers */}
        <TestErrorTriggers />
      </div>
    </main>
  );
}
