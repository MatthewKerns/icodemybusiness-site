import { WeekDiagram } from "./Diagrams";

/**
 * The diagram-led hero, used by `/`.
 *
 * The argument the VSL will eventually narrate, drawn: where the month actually
 * goes, and how little of it reaches the work that grows the business. Not a
 * placeholder — when the video is recorded it joins the diagrams on /vsl rather
 * than replacing them, because a reader who won't press play still needs the
 * argument.
 *
 * Which diagrams appear here is a one-line editorial decision, deliberately kept
 * that cheap. Two others exist in ./Diagrams and are deliberately not rendered:
 *
 *   MechanismDiagram (Map / Build / Hand over) — Matthew's call, 2026-09-02:
 *   "a good start but we need to work through this — it's not good enough to
 *   deploy to prod". Off the page until it is.
 *
 *   RhythmDiagram (weekly shipping vs one delivery) — argues the same
 *   risk-reversal point as the GUARANTEE block further down, and two of those in
 *   one page blunt each other. Worth having instead of the guarantee, not
 *   alongside it.
 */
export function DiagramHero() {
  return (
    <div className="mx-auto mt-12 max-w-4xl space-y-16">
      <WeekDiagram />
    </div>
  );
}
