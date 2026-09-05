"use client";

import { type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PostHogProvider } from "@/components/shared/PostHogProvider";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useBindDiscoverySession } from "@/hooks/useBindDiscoverySession";

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

/**
 * Everything that has to happen when an identity appears, in one place inside
 * the Convex+Clerk provider so both hooks' calls carry the token.
 *
 * It sits above the router outlet and never remounts, which is the point: a
 * visitor who signs in from the portal never mounts the assessment component,
 * so the binding could not live there.
 */
function SessionHooks() {
  useEnsureUser();
  useBindDiscoverySession();
  return null;
}

/**
 * The hooks run in a SIBLING of `children`, behind a boundary that renders
 * nothing when it trips.
 *
 * Both hooks call Convex `useQuery`, and a failing `useQuery` THROWS during
 * render. Sitting in the root layout, that throw had nothing between it and
 * `app/global-error.tsx`, so one Convex problem replaced the entire site with
 * "A critical error occurred" — seen on the apex on 2026-09-05 minutes after the
 * cutover, splash rendering first and the page dying after hydration.
 *
 * The asymmetry is deliberate. What these hooks do — recording a user row,
 * attaching a conversation to an account — is invisible to the visitor when it
 * fails. The page is the funnel. So the hooks are the part allowed to break.
 * Sentry still receives the error through ErrorBoundary's componentDidCatch, so
 * this is silent to the visitor, not to us.
 */
function SessionBridge({ children }: { children: ReactNode }) {
  return (
    <>
      <ErrorBoundary fallback={null}>
        <SessionHooks />
      </ErrorBoundary>
      {children}
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClerkProvider>
        <SessionBridge>
          <PageViewTracker />
          <PostHogProvider>{children}</PostHogProvider>
        </SessionBridge>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}
