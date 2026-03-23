"use client";

import { type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { PostHogProvider } from "@/components/shared/PostHogProvider";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import { useEnsureUser } from "@/hooks/useEnsureUser";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Add it to .env.local — see .env.example."
  );
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
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
