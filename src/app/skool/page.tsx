import type { Metadata } from "next";
import { SkoolRedirect } from "@/components/shared/SkoolRedirect";

// A tracking hop, not a page: keep it out of search results.
export const metadata: Metadata = {
  title: "Join the community on Skool",
  robots: { index: false, follow: false },
};

export default function SkoolPage() {
  return <SkoolRedirect />;
}
