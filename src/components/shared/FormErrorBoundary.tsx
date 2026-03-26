"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface FormErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  formName?: string;
}

interface FormErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class FormErrorBoundary extends Component<
  FormErrorBoundaryProps,
  FormErrorBoundaryState
> {
  constructor(props: FormErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with form context
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
        form: {
          formName: this.props.formName || "unknown",
        },
      },
      tags: {
        errorBoundary: "FormErrorBoundary",
      },
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    // Call optional reset handler to clear form state
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI for form errors
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-error/20 bg-error/5 px-4 py-8 text-center">
          <p className="font-accent text-4xl font-bold text-error">!</p>
          <h3 className="mt-4 text-lg font-bold text-text-primary">
            Form Error
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            {this.props.formName
              ? `An error occurred in the ${this.props.formName}.`
              : "An error occurred while processing the form."}
            <br />
            Please try again or refresh the page.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-6 rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            Reset Form
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
