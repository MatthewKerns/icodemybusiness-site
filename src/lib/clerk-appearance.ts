import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Shared Clerk appearance config — dark theme with gold/brand accent.
 * Used by both sign-in and sign-up pages.
 */
export const clerkAppearance: ClerkAppearance = {
  variables: {
    colorPrimary: "#D4AF37",
    colorBackground: "#111111",
    colorText: "#FFFFFF",
    colorTextSecondary: "#A0A0A0",
    colorInputBackground: "#1A1A1A",
    colorInputText: "#FFFFFF",
    borderRadius: "0.5rem",
  },
  elements: {
    card: "shadow-[0_0_30px_rgba(212,175,55,0.1)]",
    headerTitle: "text-white",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButton:
      "border-gray-700 bg-[#1A1A1A] text-white hover:bg-[#222]",
    formFieldLabel: "text-gray-300",
    formFieldInput: "border-gray-700 bg-[#1A1A1A] text-white",
    footerActionLink: "text-[#D4AF37] hover:text-[#e5c349]",
  },
};
