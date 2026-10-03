// Tests the scoring block of assets/quiz.html as shipped (no copy): node bin/test_quiz.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";

const tpl = readFileSync(fileURLToPath(new URL("../assets/quiz.html", import.meta.url)), "utf8");
const block = tpl.split("<script>")[1].split("</script>")[0];
const ctx = { module: { exports: {} } };
vm.runInNewContext(block, ctx);
const Score = ctx.module.exports;
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", name); };

const choice1 = { id: "a", type: "choice", options: ["x", "y", "z"], answer: 1 };
const choiceN = { id: "b", type: "choice", options: ["x", "y", "z"], answer: [0, 2] };
const order = { id: "c", type: "order", items: ["p", "q", "r", "s"] };
const chart = { id: "d", type: "chart", answer: ["s"] };
const chartN = { id: "e", type: "chart", answer: ["s", "q"] };
const open = { id: "f", type: "open" };

t("single choice right/wrong/blank", () => {
  assert.equal(Score.item(choice1, 1).correct, true);
  assert.equal(Score.item(choice1, 0).correct, false);
  assert.equal(Score.item(choice1, null).blank, true);
});
t("multi choice needs the exact set, order-free", () => {
  assert.equal(Score.item(choiceN, [2, 0]).correct, true);
  assert.equal(Score.item(choiceN, [0]).correct, false);
  assert.equal(Score.item(choiceN, [0, 1, 2]).correct, false);
  assert.equal(Score.item(choiceN, []).blank, true);
});
t("order: solved, partly placed, reversed", () => {
  assert.deepEqual({ ...Score.item(order, [0, 1, 2, 3]) }, { scored: true, correct: true, placed: 4, of: 4 });
  const r = Score.item(order, [1, 0, 2, 3]); assert.equal(r.correct, false); assert.equal(r.placed, 2);
  assert.equal(Score.item(order, [3, 2, 1, 0]).placed, 0);
});
t("order: untouched (null) and wrong-length answers are blank, not partial credit", () => {
  assert.equal(Score.item(order, null).blank, true);
  assert.equal(Score.item(order, [0, 1]).blank, true);
});
t("chart single and multi", () => {
  assert.equal(Score.item(chart, ["s"]).correct, true);
  assert.equal(Score.item(chart, ["q"]).correct, false);
  assert.equal(Score.item(chartN, ["q", "s"]).correct, true);
  assert.equal(Score.item(chartN, ["q"]).correct, false);
  assert.equal(Score.item(chart, []).blank, true);
});
t("open is never scored", () => {
  assert.equal(Score.item(open, "anything").scored, false);
  const q = Score.quiz([choice1, open], { a: 1, f: "text" });
  assert.equal(q.total, 1); assert.equal(q.correct, 1);
});
t("shuffle is deterministic, a permutation, never the solved order", () => {
  for (const n of [2, 3, 4, 5, 6, 8]) for (const seed of ["m2:q2", "x", "quiz:c", "abc:def"]) {
    const s = Score.shuffle(n, seed);
    assert.deepEqual([...s].sort((a, b) => a - b), [...Array(n).keys()]);
    assert.ok(!s.every((v, i) => v === i), `solved order for n=${n} seed=${seed}`);
    assert.deepEqual(Score.shuffle(n, seed), s);
  }
});
console.log(`${n} test groups passed`);
