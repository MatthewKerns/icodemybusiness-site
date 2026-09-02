"use client";

import { createContext, useContext } from "react";

/**
 * Which hero the visitor is reading the letter under.
 *
 * Named for the hero, not the route, on purpose. When the video version wins and
 * is promoted to `/`, events from both sides of that promotion stay correctly
 * attributed to the design that produced them — values like "home" and "vsl"
 * would go incoherent the moment the two merged.
 *
 * This is a reporting dimension, not a render input: nothing branches on it.
 */
export type LetterSurface = "diagram" | "video";

const Ctx = createContext<LetterSurface | null>(null);

export function LetterSurfaceProvider({
  surface,
  children,
}: {
  surface: LetterSurface;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={surface}>{children}</Ctx.Provider>;
}

/**
 * Returns null outside a provider — an honest absence rather than a default that
 * would quietly lie if these components are ever reused off the landing pages.
 */
export function useLetterSurface(): LetterSurface | null {
  return useContext(Ctx);
}
