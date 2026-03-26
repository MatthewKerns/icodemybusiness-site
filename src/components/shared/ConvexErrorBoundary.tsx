"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { parseConvexError } from "@/lib/errors";
import { RefreshCw } from "lucide-react";

interface ConvexErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: ReactNode;
}

interface ConvexErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

/**
 * Specialized error boundary for Convex query and mutation errors.
 * Parses Convex-specific errors (rate limits, network issues) and provides
 * user-friendly error messages with retry functionality.
 */
export class ConvexErrorBoundary extends Component<
  ConvexErrorBoundaryProps,
  ConvexErrorBoundaryState
> {
  constructor(props: ConvexErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): ConvexErrorBoundaryState {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with Convex-specific context
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
        convex: {
          errorMessage: parseConvexError(error),
        },
      },
      tags: {
        errorBoundary: "ConvexErrorBoundary",
      },
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });

    // Reset error state after a brief delay to show loading state
    setTimeout(() => {
      this.setState({ hasError: false, error: null, isRetrying: false });
    }, 500);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = parseConvexError(this.state.error);

      // Show loading state during retry
      if (this.state.isRetrying) {
        return (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-gold" />
              <p className="text-sm text-text-muted">Retrying...</p>
            </div>
          </div>
        );
      }

      // Default Convex-specific error UI
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center px-4 text-center">
          <p className="font-accent text-4xl font-bold text-error">!</p>
          <h3 className="mt-3 text-lg font-semibold text-text-primary">
            Connection Error
          </h3>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            {errorMessage}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
