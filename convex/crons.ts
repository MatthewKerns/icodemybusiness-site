import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Time entries move on the scale of a work session, and the overhead panel is a
// weekly budget gauge rather than a live timer — four-hourly is plenty, and the
// "Sync now" button covers the impatient case.
crons.interval("mango snapshot", { hours: 4 }, internal.mango.syncSnapshot, {});

// Undo history horizon.
crons.cron("prune objective op batches", "0 9 * * *", internal.objectives.pruneOpBatches, {});

// Email sequences. A sweeper rather than a chain of scheduled sends: scheduled
// actions fail permanently on transient errors, so one flaky Resend call would
// silently end a five-day sequence with nothing left to retry. Re-deriving what
// is due from the database every tick self-heals instead.
crons.interval(
  "email sequence sweep",
  { minutes: 15 },
  internal.sequenceEngine.sweep,
  {}
);

export default crons;
