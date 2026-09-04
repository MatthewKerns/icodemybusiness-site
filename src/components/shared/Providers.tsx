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
    // unsavedChangesWarning off, deliberately. Convex registers a beforeunload
    // handler by default that fires whenever ANY mutation is still in flight,
    // and useTrackEvent sends a fire-and-forget visitorEvents.track mutation on
    // every tracked click. So a click that both tracks and navigates raced its
    // own analytics write and Chrome asked "Leave site? Changes you made may
    // not be saved." The worst case was the assessment gate's "Create a free
    // account" (AssessmentGate.tsx:77), i.e. the highest-intent click on the
    // site: choosing Cancel there never reaches /sign-up at all.
    //
    // Nothing this warning protects is real. Discovery state is persisted
    // server-side every turn, and the one mutation whose loss would matter,
    // discoveryAssessments.submit, is a single call the visitor waits on.
    _convex = new ConvexReactClient(convexUrl, {
      unsavedChangesWarning: false,
    });
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
