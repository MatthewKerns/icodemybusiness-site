"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { initPostHog } from "@/lib/posthog";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) {
        url = url + "?" + search;
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { user } = useUser();

  useEffect(() => {
    if (user && posthog.__loaded) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    } else if (!user && posthog.__loaded) {
      posthog.reset();
    }
  }, [user]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
