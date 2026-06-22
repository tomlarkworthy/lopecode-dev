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
  const feedback = scored.results
    .filter((r) => r.score < 1 || !r.pass)
    .map((r) => `[${r.name}] ${r.feedback}`)
    .join("\n");
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
