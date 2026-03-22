"use client";

import { type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

// PostHog placeholder — will be added in Story 6.4
function PostHogProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClerkProvider>
        <PostHogProvider>{children}</PostHogProvider>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}
