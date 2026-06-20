"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { EmailCapture } from "@/components/shared/EmailCapture";

interface AgentErrorBoundaryProps {
  children: ReactNode;
}

interface AgentErrorBoundaryState {
  hasError: boolean;
}

export class AgentErrorBoundary extends Component<
  AgentErrorBoundaryProps,
  AgentErrorBoundaryState
> {
  constructor(props: AgentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AgentErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: "agent_widget",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmailCapture
          source="agent-fallback"
          headline="Chat with us another way"
          subtitle="Our AI agent is taking a break. Leave your email and we'll reach out."
        />
      );
    }

    return this.props.children;
  }
}
