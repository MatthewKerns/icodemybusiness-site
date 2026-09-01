import Link from "next/link";
import type { Metadata } from "next";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Not authorized | iCodeMyBusiness",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-bg-primary px-4 py-24"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-secondary p-8 text-center">
        <p className="font-accent text-sm uppercase tracking-widest text-text-dim">
          403
        </p>
        <h1 className="mt-3 text-h2 font-bold text-text-primary">
          Not your account
        </h1>
        <p className="mt-3 text-text-muted">
          This area is limited to the iCodeMyBusiness owner account. If that&apos;s
          you, sign out and sign back in with your business email address.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <SignOutButton redirectUrl="/sign-in">
            <Button variant="outline">Sign out</Button>
          </SignOutButton>
          <Button asChild>
            <Link href="/">Back to site</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
