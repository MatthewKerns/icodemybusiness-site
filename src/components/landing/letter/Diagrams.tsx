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
import { DISCOVERY_QUESTIONS } from "@/content/discovery-questions";

const GOLD = "#D4AF37";
const GOLD_DIM = "#A08628";
const TEXT = "#E6ECF1";
const MUTED = "#9AA7B2";
const DIM = "#6B7885";
const LINE = "#2A3441";

function Figure({
  caption,
  legend,
  children,
}: {
  caption: string;
  /**
   * Key rendered as HTML rather than inside the SVG. A legend is the widest
   * thing on most of these charts, and keeping it in the drawing forced a
   * minimum width that pushed the chart itself off a phone screen. Out here it
   * wraps.
   */
  legend?: { label: string; fill: string }[];
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0">
      <div className="overflow-x-auto">{children}</div>
      {legend && (
        <ul className="mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 flex-none rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm text-text-muted">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
      <figcaption className="mt-4 text-sm leading-relaxed text-text-dim">
        {caption}
      </figcaption>
    </figure>
  );
}

/**
 * Beat 1 — the problem, as a month of weeks against a 48-hour threshold.
 *
 * Matthew's shape: weeks run 50-60 hours, and growth work doesn't begin until
 * hour 48 in any of them. So the bar is mostly grind and the gold slice at the
 * end is whatever was left — the visual argument is that the valuable work is
 * not squeezed, it is *last in the queue*.
 *
 * Colour does the arguing: three greys for the three time-sinks, gold only for
 * growth. Gold is the brand's premium colour and there is almost none of it on
 * the chart, which is the point.
 *
 * Illustrative, and captioned as such. The weekly totals are Matthew's; the
 * split of the first 48 hours between the three sinks is a placeholder shape,
 * not a measurement.
 */
export function WeekDiagram() {
  const MAX_HOURS = 60;
  const GROWTH_STARTS = 48;
  const X0 = 104;
  const X1 = 624;
  const perHour = (X1 - X0) / MAX_HOURS;

  // The first 48 hours: the same three things every week.
  const SINKS = [
    { label: "Repeating the same work", hours: 20, fill: "#4A5766" },
    { label: "Chasing information", hours: 16, fill: "#3A4654" },
    { label: "Fixing broken handoffs", hours: 12, fill: "#2A3441" },
  ];
  // Total hours per week. Everything past 48 is growth.
  const WEEKS = [
    { name: "Week 1", total: 52 },
    { name: "Week 2", total: 58 },
    { name: "Week 3", total: 50 },
    { name: "Week 4", total: 56 },
  ];

  const rowY = (i: number) => 74 + i * 46;
  const BAR_H = 26;
  const monthTotal = WEEKS.reduce((n, w) => n + w.total, 0);
  const growthTotal = WEEKS.reduce((n, w) => n + (w.total - GROWTH_STARTS), 0);
  const growthX = X0 + GROWTH_STARTS * perHour;

  return (
    <Figure
      caption={`Illustrative, not measured. Four weeks at 50-60 hours each — ${monthTotal} hours in the month, of which ${growthTotal} went to growing the business. The other ${monthTotal - growthTotal} went to the same three things every week.`}
      legend={[
        ...SINKS.map((s) => ({ label: s.label, fill: s.fill })),
        { label: "Growing the business", fill: GOLD },
      ]}
    >
      <svg
        viewBox="0 0 660 300"
        className="mx-auto h-auto w-full max-w-[560px]"
        role="img"
        aria-labelledby="week-t week-d"
      >
        <title id="week-t">A month of weeks against the hour that growth starts</title>
        <desc id="week-d">
          {`Four stacked bars, one per week, each 50 to 60 hours long. In every week the first 48 hours go to repeating the same work, chasing information and fixing broken handoffs. Only the hours after 48 go to growing the business: ${WEEKS.map((w) => `${w.name} ${w.total - GROWTH_STARTS}`).join(", ")}. Across the month that is ${growthTotal} hours out of ${monthTotal}.`}
        </desc>

        <text x="30" y="28" fill={TEXT} fontSize="24" fontWeight="600">
          Your typical week might look like this
        </text>

        {/* The threshold is the argument, so it is drawn before the bars and
            labelled above them rather than tucked into the axis. */}
        <line
          x1={growthX} y1="68" x2={growthX} y2={rowY(3) + BAR_H + 10}
          stroke={GOLD} strokeWidth="1" strokeDasharray="3 3" opacity="0.7"
        />
        {/* Sits just above the first bar. At the top of the chart it collided
            with the title once the type was scaled up for phones. */}
        <text x={growthX - 8} y="64" fill={GOLD} fontSize="17" fontWeight="600" textAnchor="end">
          growth starts here
        </text>

        {WEEKS.map((week, i) => {
          const y = rowY(i);
          const growth = week.total - GROWTH_STARTS;
          let x = X0;
          return (
            <g key={week.name}>
              <text x="30" y={y + 17} fill={MUTED} fontSize="19">
                {week.name}
              </text>
              {SINKS.map((sink) => {
                const w = sink.hours * perHour;
                const seg = (
                  <rect
                    key={sink.label}
                    x={x} y={y} width={w - 1.5} height={BAR_H}
                    fill={sink.fill}
                  />
                );
                x += w;
                return seg;
              })}
              <rect
                x={growthX} y={y} width={growth * perHour} height={BAR_H}
                fill={GOLD}
              />
              <text
                x={growthX + growth * perHour + 8} y={y + 17}
                fill={GOLD} fontSize="18" fontWeight="600"
              >
                {growth}h
              </text>
            </g>
          );
        })}

        {/* Hour scale */}
        <line x1={X0} y1={rowY(3) + BAR_H + 10} x2={X1} y2={rowY(3) + BAR_H + 10} stroke={LINE} strokeWidth="1" />
        {[0, 12, 24, 36, 48, 60].map((h) => (
          <g key={h}>
            <line
              x1={X0 + h * perHour} y1={rowY(3) + BAR_H + 10}
              x2={X0 + h * perHour} y2={rowY(3) + BAR_H + 16}
              stroke={LINE} strokeWidth="1"
            />
            <text
              x={X0 + h * perHour} y={rowY(3) + BAR_H + 30}
              fill={DIM} fontSize="17" textAnchor="middle"
            >
              {h}h
            </text>
          </g>
        ))}

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

/**
 * What the assessment actually asks, before anyone starts it.
 *
 * Deliberately NOT an SVG. This is a list, not a drawing — there is no geometry
 * to preserve — and the first version was an SVG, which meant hand-wrapping the
 * question text and forcing a 520px minimum width. On a 375px phone that pushed
 * a third of every question off-screen behind a sideways scroll: the page-level
 * overflow check passed while the reader saw "in dollars or in" and nothing
 * more. Real text in real elements wraps on its own and needs no minimum width.
 *
 * Reads DISCOVERY_QUESTIONS directly, so it shows the real five questions and
 * cannot drift from the flow if they are reworded — the same discipline as
 * PathsDiagram reading PATHS.
 *
 * Makes no claim about outcomes. It states what happens, which the reader can
 * verify by doing it — the one kind of assertion this page can make without
 * Matthew having to stand behind a number (docs/copy-principles.md §2).
 */
export function AssessmentDiagram() {
  return (
    <figure className="m-0">
      <p className="text-base font-semibold text-text-primary">
        Five questions, in your own words
      </p>

      <ol className="mt-6 list-none space-y-0 p-0">
        {DISCOVERY_QUESTIONS.map((q, i) => (
          <li key={q.key} className="relative flex gap-4 pb-7 last:pb-0">
            {/* The spine. Stops at the last item rather than trailing into space. */}
            {i < DISCOVERY_QUESTIONS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[11px] top-6 h-full w-px bg-border"
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-gold-dim bg-bg-primary text-[11px] font-semibold text-gold"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {q.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                {q.anchor}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* What comes out — the only filled marker, because it is the point. */}
      <div className="mt-2 flex gap-4">
        <span
          aria-hidden="true"
          className="h-[22px] w-[22px] flex-none rounded-full bg-gold"
        />
        <p className="pt-0.5 text-sm font-semibold leading-relaxed text-gold">
          Your write-up — the one thing to fix first, and where to start
        </p>
      </div>

      <figcaption className="mt-6 text-sm leading-relaxed text-text-dim">
        No forms and no multiple choice — you answer in your own words, and the
        write-up comes back in the same language you used.
      </figcaption>
    </figure>
  );
}
