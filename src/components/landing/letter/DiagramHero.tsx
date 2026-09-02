import { WeekDiagram, MechanismDiagram } from "./Diagrams";

/**
 * The diagram-led hero, used by `/`.
 *
 * The argument the VSL will eventually narrate, drawn: where the week actually
 * goes, then what I do about it. These are not placeholders — when the video is
 * recorded it joins them on /vsl rather than replacing them, because a reader
 * who won't press play still needs the argument.
 *
 * Which diagrams appear here is a one-line editorial decision, deliberately kept
 * that cheap. RhythmDiagram is also available in ./Diagrams but is held back:
 * it argues the same risk-reversal point as the GUARANTEE block further down,
 * and two of those in one page blunt each other.
 */
export function DiagramHero() {
  return (
    <div className="mx-auto mt-12 max-w-4xl space-y-16">
      <WeekDiagram />
      <MechanismDiagram />
    </div>
  );
}
