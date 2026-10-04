// Recompute scores for saved attempts — never trust what a member's artifact stores.
//   node bin/rescore.mjs <built quiz page.html> <attempts.json>
// attempts.json: the rows an ArtifactData `list` of "attempts" returned — an array of {id, data} or of
// plain attempt bodies. Scoring code and items both come from the built page, so they match what the
// member answered.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const [pagePath, attemptsPath] = process.argv.slice(2);
if (!pagePath || !attemptsPath) { console.error("usage: node bin/rescore.mjs <page.html> <attempts.json>"); process.exit(2); }
const page = readFileSync(pagePath, "utf8");
const ctx = { module: { exports: {} } };
vm.runInNewContext(page.split("<script>")[1].split("</script>")[0], ctx);
const Score = ctx.module.exports;
const Q = JSON.parse(page.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0]);
let rows = JSON.parse(readFileSync(attemptsPath, "utf8"));
rows = Array.isArray(rows) ? rows : rows.documents || rows.docs || Object.values(rows);
for (const row of rows) {
  const a = row.data ?? row;
  const sc = Score.quiz(Q.items, a.answers || {});
  const wrong = Q.items.filter((it) => sc.results[it.id]?.scored && !sc.results[it.id].correct).map((it) => it.id);
  const open = Object.keys(a.open || {});
  console.log(`${row.id ?? "?"}  ${a.submittedAt ?? ""}  quiz ${a.quizId}@v${a.quizVersion}${a.quizId !== Q.id || a.quizVersion !== Q.version ? "  ⚠ page is " + Q.id + "@v" + Q.version : ""}`
    + `  score ${sc.correct}/${sc.total}  not-yet: ${wrong.join(",") || "none"}  open: ${open.join(",") || "none"}`);
}
