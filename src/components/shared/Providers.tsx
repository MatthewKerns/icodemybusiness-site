"use client";

import { type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { PostHogProvider } from "@/components/shared/PostHogProvider";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import { useEnsureUser } from "@/hooks/useEnsureUser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Lazy-init: avoid crashing during next build static page generation
let _convex: ConvexReactClient | null = null;
function getConvexClient(): ConvexReactClient {
  if (!_convex) {
    if (!convexUrl) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL is not set. Add it to .env.local — see .env.example."
      );
    }
    _convex = new ConvexReactClient(convexUrl);
  }
  return _convex;
}

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={getConvexClient()} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

function EnsureUser({ children }: { children: ReactNode }) {
  useEnsureUser();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClerkProvider>
        <EnsureUser>
          <PageViewTracker />
          <PostHogProvider>{children}</PostHogProvider>
        </EnsureUser>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}
