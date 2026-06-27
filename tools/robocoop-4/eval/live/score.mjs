// Scoring + GEPA record. Pure over a WorldSnapshot + evalDef (see CONTRACT.md).
import { CRITERIA, runCriterion } from "./criteria.mjs";

export function scoreEval(evalDef, snapshot) {
  const results = (evalDef.criteria || []).map((c) => {
    const weight = c.weight == null ? 1 : c.weight;
    let r;
    try {
      r = runCriterion(c.name, snapshot, c.args || {});
    } catch (e) {
      // A throwing criterion must not abort the run; treat as a hard fail.
      r = { score: 0, pass: false, feedback: "criterion error: " + (e && e.message ? e.message : String(e)) };
    }
    return {
      name: c.name,
      args: c.args || {},
      weight,
      score: typeof r.score === "number" ? r.score : 0,
      pass: r.pass === true,
      feedback: r.feedback == null ? "" : String(r.feedback),
    };
  });

  let weightSum = 0;
  let weighted = 0;
  for (const r of results) {
    weightSum += r.weight;
    weighted += r.weight * r.score;
  }
  const aggregate = weightSum > 0 ? weighted / weightSum : 0;
  const passed = results.filter((r) => r.pass).length;

  return {
    id: evalDef.id,
    category: evalDef.category,
    question: evalDef.question,
    ok: snapshot.ok,
    results,
    aggregate,
    passed,
    total: results.length,
  };
}

export function toGepaRecord(scored, snapshot) {
  const critFeedback = scored.results
    .filter((r) => r.score < 1 || !r.pass)
    .map((r) => `[${r.name}] ${r.feedback}`)
    .join("\n");
  // Compact action trace so the prompt optimizer can see HOW the agent worked (redundant reads, wandering,
  // re-deriving state) — essential for optimizing toward fewer steps, not only correctness. A passing-but-
  // inefficient run has no failing criteria, so without the trace + step count GEPA has no efficiency signal.
  const trace = (snapshot.toolCalls || [])
    .map((c, i) => {
      let a = c.arguments ?? c.args ?? c.function?.arguments ?? "";
      if (typeof a !== "string") a = JSON.stringify(a);
      return `${i + 1}. ${c.name || c.function?.name || "?"} ${String(a).slice(0, 140)}`;
    })
    .join("\n");
  const feedback = [
    `steps=${snapshot.steps} finishReason=${snapshot.finishReason ?? "?"}`,
    critFeedback && "FAILURES:\n" + critFeedback,
    trace && "TRACE:\n" + trace,
  ].filter(Boolean).join("\n\n");
  const perCriterion = {};
  for (const r of scored.results) perCriterion[r.name] = r.score;
  return {
    inputs: { question: scored.question },
    score: scored.aggregate,
    feedback,
    perCriterion,
    meta: {
      id: scored.id,
      category: scored.category,
      steps: snapshot.steps,
      durationMs: snapshot.durationMs,
    },
  };
}
