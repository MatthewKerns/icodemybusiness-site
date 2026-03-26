"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showBackButton?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI following the pattern from error.tsx
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
          <p className="font-accent text-6xl font-bold text-error">!</p>
          <h2 className="mt-4 text-h3 font-bold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-2 text-text-muted">
            An unexpected error occurred. Please try again.
          </p>
          <div className="mt-8 flex gap-4">
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Try again
            </button>
            {this.props.showBackButton && (
              <Link
                href="/"
                className="rounded-lg border border-border px-6 py-3 font-medium text-text-primary transition-colors hover:border-blue"
              >
                Back to Home
              </Link>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
