/**
 * The letter's diagrams — the argument drawn rather than narrated.
 *
 * These are not decoration and not a stand-in that gets deleted when the VSL is
 * recorded: a reader who won't press play still needs the argument, so the
 * video joins them rather than replacing them.
 *
 * Drawing notes: single scale per diagram, every label naming a value the
 * drawing reaches, all colours from the site tokens (gold #D4AF37, dim #A08628,
 * text #E6ECF1 / #9AA7B2 / #6B7885), and enough room in each viewBox for the
 * outermost text so nothing clips.
 */

import { PATHS } from "@/content/landing";

const GOLD = "#D4AF37";
const GOLD_DIM = "#A08628";
const TEXT = "#E6ECF1";
const MUTED = "#9AA7B2";
const DIM = "#6B7885";
const LINE = "#2A3441";

function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0">
      <div className="overflow-x-auto">{children}</div>
      <figcaption className="mt-4 text-sm leading-relaxed text-text-dim">
        {caption}
      </figcaption>
    </figure>
  );
}

/**
 * Beat 1 — the problem, as proportions of a working week.
 *
 * Deliberately labelled as an example rather than a statistic: these are the
 * shapes I keep finding, not a measured average, and presenting them as data
 * would be inventing evidence.
 */
export function WeekDiagram() {
  // One scale: 40 hours across 600 user units of bar.
  const HOURS = 40;
  const BAR_W = 600;
  const perHour = BAR_W / HOURS;
  const segments = [
    { label: "Repeating the same work", hours: 13, fill: GOLD },
    { label: "Chasing information", hours: 9, fill: GOLD_DIM },
    { label: "Fixing broken handoffs", hours: 6, fill: "#5A4A18" },
    { label: "Actually growing the business", hours: 12, fill: "#1E2732" },
  ];

  let x = 0;
  const placed = segments.map((s) => {
    const seg = { ...s, x, w: s.hours * perHour };
    x += seg.w;
    return seg;
  });

  return (
    <Figure caption="An example of the shape we find, not a measured average — the point is that the work worth paying you for is the smallest block on the bar.">
      <svg
        viewBox="0 0 660 250"
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-labelledby="week-t week-d"
      >
        <title id="week-t">Where a 40-hour week goes before any automation</title>
        <desc id="week-d">
          A single bar representing 40 hours, split into four blocks: repeating
          the same work 13 hours, chasing information 9 hours, fixing broken
          handoffs 6 hours, and actually growing the business 12 hours.
        </desc>

        <text x="30" y="28" fill={TEXT} fontSize="16" fontWeight="600">
          A week, before we touch it
        </text>

        <g transform="translate(30, 50)">
          {placed.map((s) => (
            <g key={s.label}>
              <rect
                x={s.x}
                y={0}
                width={s.w - 2}
                height={44}
                fill={s.fill}
                rx="2"
              />
              <text
                x={s.x + (s.w - 2) / 2}
                y={28}
                fill={s.hours >= 9 ? "#14110A" : TEXT}
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
              >
                {s.hours}h
              </text>
            </g>
          ))}
          {/* Scale ticks — every label names a value the bar reaches. */}
          <line x1="0" y1="56" x2={BAR_W} y2="56" stroke={LINE} strokeWidth="1" />
          {[0, 10, 20, 30, 40].map((h) => (
            <g key={h}>
              <line
                x1={h * perHour}
                y1="56"
                x2={h * perHour}
                y2="62"
                stroke={LINE}
                strokeWidth="1"
              />
              <text
                x={h * perHour}
                y="76"
                fill={DIM}
                fontSize="11"
                textAnchor="middle"
              >
                {h}h
              </text>
            </g>
          ))}
        </g>

        {/* Legend, two per row so labels never collide with the bar. */}
        <g transform="translate(30, 150)">
          {placed.map((s, i) => (
            <g
              key={s.label}
              transform={`translate(${(i % 2) * 320}, ${Math.floor(i / 2) * 30})`}
            >
              <rect x="0" y="0" width="11" height="11" fill={s.fill} rx="2" />
              <text x="20" y="10" fill={MUTED} fontSize="13">
                {s.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </Figure>
  );
}

/** Beat 2 — the mechanism, in the order it actually happens. */
export function MechanismDiagram() {
  const stages = [
    {
      n: "01",
      title: "Map",
      lines: ["Find where the hours actually", "go, in your real workflows."],
    },
    {
      n: "02",
      title: "Build",
      lines: ["Remove them with a system.", "AI where it earns its place."],
    },
    {
      n: "03",
      title: "Hand over",
      lines: ["You run it without me. Never", "built to keep you dependent."],
    },
  ];

  return (
    <Figure caption="AI sits inside step two as a tool, not at the top as the point. Plenty of what I remove needs a process change, not a model.">
      <svg
        viewBox="0 0 660 210"
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-labelledby="mech-t mech-d"
      >
        <title id="mech-t">The three stages of an engagement</title>
        <desc id="mech-d">
          Three stages in sequence: map where the hours go, build the system that
          removes them, then hand it over so the client runs it themselves.
        </desc>

        <text x="30" y="28" fill={TEXT} fontSize="16" fontWeight="600">
          What actually happens
        </text>

        {stages.map((s, i) => {
          const x = 30 + i * 205;
          return (
            <g key={s.n}>
              <rect
                x={x}
                y="50"
                width="180"
                height="120"
                rx="8"
                fill="#0A0A0A"
                stroke={i === 0 ? GOLD : LINE}
                strokeWidth="1"
              />
              <text x={x + 18} y="78" fill={GOLD} fontSize="11" fontWeight="600" letterSpacing="1.5">
                {s.n}
              </text>
              <text x={x + 18} y="102" fill={TEXT} fontSize="17" fontWeight="600">
                {s.title}
              </text>
              {s.lines.map((line, li) => (
                <text
                  key={line}
                  x={x + 18}
                  y={126 + li * 17}
                  fill={MUTED}
                  fontSize="13"
                >
                  {line}
                </text>
              ))}
              {i < stages.length - 1 && (
                <path
                  d={`M ${x + 186} 110 L ${x + 202} 110`}
                  stroke={GOLD_DIM}
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                />
              )}
            </g>
          );
        })}

        <defs>
          <marker
            id="arrowhead"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 z" fill={GOLD_DIM} />
          </marker>
        </defs>
      </svg>
    </Figure>
  );
}

/** Beat 3 — why the delivery rhythm is the risk reversal. */
export function RhythmDiagram() {
  const weeks = [1, 2, 3, 4, 5, 6];
  const colW = 92;

  return (
    <Figure caption="The difference isn't speed, it's when you find out. On the top row a bad assumption surfaces in week one; on the bottom it surfaces after the money is spent.">
      <svg
        viewBox="0 0 660 260"
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-labelledby="rhythm-t rhythm-d"
      >
        <title id="rhythm-t">Weekly delivery compared with a single end delivery</title>
        <desc id="rhythm-d">
          Two rows across six weeks. The top row ships working software in every
          week. The bottom row shows status updates for five weeks and a single
          delivery in week six.
        </desc>

        <text x="30" y="28" fill={TEXT} fontSize="16" fontWeight="600">
          When you find out it&#8217;s working
        </text>

        {/* Week axis */}
        {weeks.map((w, i) => (
          <text
            key={w}
            x={100 + i * colW + 26}
            y="60"
            fill={DIM}
            fontSize="11"
            textAnchor="middle"
          >
            Week {w}
          </text>
        ))}

        {/* Row 1 — how I work */}
        <text x="30" y="97" fill={GOLD} fontSize="12" fontWeight="600">
          How I work
        </text>
        {weeks.map((w, i) => (
          <g key={`a${w}`}>
            <rect
              x={100 + i * colW}
              y="76"
              width="52"
              height="34"
              rx="4"
              fill="rgba(212,175,55,0.15)"
              stroke={GOLD}
              strokeWidth="1"
            />
            <text
              x={100 + i * colW + 26}
              y="98"
              fill={GOLD}
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              ship
            </text>
          </g>
        ))}

        {/* Row 2 — the usual */}
        <text x="30" y="167" fill={DIM} fontSize="12" fontWeight="600">
          The usual
        </text>
        {weeks.map((w, i) => {
          const last = i === weeks.length - 1;
          return (
            <g key={`b${w}`}>
              <rect
                x={100 + i * colW}
                y="146"
                width="52"
                height="34"
                rx="4"
                fill={last ? "rgba(212,175,55,0.15)" : "transparent"}
                stroke={last ? GOLD : LINE}
                strokeWidth="1"
                strokeDasharray={last ? "0" : "3 3"}
              />
              <text
                x={100 + i * colW + 26}
                y="168"
                fill={last ? GOLD : DIM}
                fontSize="11"
                fontWeight={last ? "600" : "400"}
                textAnchor="middle"
              >
                {last ? "ship" : "status"}
              </text>
            </g>
          );
        })}

        {/* The consequence, stated once. */}
        <line x1="30" y1="208" x2="630" y2="208" stroke={LINE} strokeWidth="1" />
        <text x="30" y="232" fill={MUTED} fontSize="13">
          Six chances to correct course, against one.
        </text>
      </svg>
    </Figure>
  );
}


/**
 * The four routes in, as a shared-origin fan.
 *
 * Reads `PATHS` directly so the drawing and the copy cannot disagree. The shape
 * draws the sentence the letter already makes — "they all begin the same way,
 * with one conversation" — with every track leaving the same origin and the
 * short gold one being the free diagnosis.
 *
 * Two honesty constraints, same discipline as WeekDiagram's caption:
 *   - `weeks: null` runs to the edge with an explicit "ongoing" label. An arrow
 *     that merely stopped at the axis end would assert a duration that isn't real.
 *   - The vertical axis is an ORDERING, not a measurement, so it carries named
 *     ends and no numeric ticks. Ticks would imply a scale that doesn't exist.
 */
export function PathsDiagram() {
  const X0 = 190;
  const X1 = 630;
  const MAX_WEEKS = 14;
  const perWeek = (X1 - X0) / MAX_WEEKS;
  const rowY = (depth: number) => 236 - (depth - 1) * 52;

  return (
    <Figure caption="Typical shapes, not fixed packages — and the vertical axis is an ordering, not a measurement. Every route starts with the same conversation.">
      <svg
        viewBox="0 0 660 300"
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-labelledby="paths-t paths-d"
      >
        <title id="paths-t">The four ways of working together</title>
        {/* This desc is the entire paths section for a screen-reader user, so it
            enumerates all four routes rather than describing the picture. */}
        <desc id="paths-d">
          {PATHS.map(
            (p) => `${p.name}: ${p.forWho} ${p.timeline}. ${p.commitment}`
          ).join(" ")}
        </desc>

        <text x="30" y="28" fill={TEXT} fontSize="16" fontWeight="600">
          Four ways in, one starting point
        </text>

        {/* Depth axis — named ends only, deliberately no numeric ticks. */}
        <text x="30" y={rowY(4) - 16} fill={DIM} fontSize="10.5" letterSpacing="0.5">
          THE WHOLE OPERATION
        </text>
        <text x="30" y={rowY(1) + 30} fill={DIM} fontSize="10.5" letterSpacing="0.5">
          ONE CONVERSATION
        </text>
        <line
          x1="34" y1={rowY(4) - 8} x2="34" y2={rowY(1) + 16}
          stroke={LINE} strokeWidth="1"
        />

        {/* Week scale — every label names a value a track actually reaches. */}
        {[0, 4, 8, 12].map((w) => (
          <g key={w}>
            <line
              x1={X0 + w * perWeek} y1="46" x2={X0 + w * perWeek} y2="262"
              stroke={LINE} strokeWidth="1" strokeDasharray="2 5"
            />
            {/* week 0 is labelled by the origin marker below — don't draw it twice */}
            {w > 0 && (
              <text
                x={X0 + w * perWeek} y="282"
                fill={DIM} fontSize="11" textAnchor="middle"
              >
                week {w}
              </text>
            )}
          </g>
        ))}

        {PATHS.map((path) => {
          const y = rowY(path.plot.depth);
          const ongoing = path.plot.weeks === null;
          const endX = ongoing
            ? X1
            : X0 + Math.min(path.plot.weeks ?? 0, MAX_WEEKS) * perWeek;
          const stroke = path.highlight ? GOLD : GOLD_DIM;

          return (
            <g key={path.key}>
              <text x="30" y={y - 6} fill={TEXT} fontSize="13" fontWeight="600">
                {path.name}
              </text>
              <text x="30" y={y + 11} fill={DIM} fontSize="11">
                {path.plot.shortTimeline}
              </text>

              {/* Leader line: without it the left-hand label and the curve that
                  lands at its height read as unrelated. */}
              <line
                x1="176" y1={y} x2={endX} y2={y}
                stroke={LINE} strokeWidth="1" strokeDasharray="1 4"
              />

              {/* Every track leaves the same origin. */}
              <path
                d={`M ${X0} 250 C ${X0 + 40} 250, ${X0 + 20} ${y}, ${endX} ${y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={path.highlight ? 3 : 1.5}
                opacity={path.highlight ? 1 : 0.7}
                markerEnd={ongoing ? "url(#pathArrow)" : undefined}
              />
              {!ongoing && <circle cx={endX} cy={y} r="4" fill={stroke} />}
              {ongoing && (
                <text
                  x={X1 - 10} y={y - 12}
                  fill={GOLD_DIM} fontSize="10.5" textAnchor="end"
                >
                  ongoing
                </text>
              )}

              {/* The free diagnosis is genuinely the shortest track — one call —
                  so on a true week scale it is a stub. That brevity is the
                  selling point, but unannotated it reads as the least important
                  thing on the chart, which is the opposite of the intent. */}
              {path.highlight && (
                <text
                  x={endX + 12} y={y + 4}
                  fill={GOLD} fontSize="11.5" fontWeight="600"
                >
                  start here — it&#8217;s free
                </text>
              )}
            </g>
          );
        })}

        {/* The shared origin, drawn last so it sits above the tracks. */}
        <circle cx={X0} cy="250" r="5" fill={GOLD} />
        <text x={X0} y="282" fill={GOLD} fontSize="11" textAnchor="middle">
          start
        </text>

        <defs>
          <marker
            id="pathArrow" markerWidth="7" markerHeight="7"
            refX="6" refY="3.5" orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 z" fill={GOLD_DIM} />
          </marker>
        </defs>
      </svg>
    </Figure>
  );
}
