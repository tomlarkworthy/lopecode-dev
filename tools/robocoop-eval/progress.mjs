// Did a turn that ran out of steps (finishReason "max_steps") end while still making progress? The
// trainer grants another turn of steps only when it did: a looping or stuck agent is not extended.
//
// Judged on the turn's own messages (assistant tool_calls, then their tool results), last `window` calls:
//   progressing  a write/edit that landed ("Wrote …"/"Edited …", not FAILED TO COMPILE, not REFUSED), or — for a turn that
//                wrote nothing (a question task) — at least `minDistinct` of the calls are distinct
//   stuck        any single call (name + args) repeated `loopRepeats` times in the window, or the last
//                `errorRun` results all failed (threw, did not compile, refused)
// Self-contained (no outer references): the eval driver rebuilds it inside the page from its source.
export function judgeProgress(turnMessages, { window = 12, loopRepeats = 3, minDistinct = 0.75, errorRun = 6 } = {}) {
  const msgs = turnMessages || [];
  const calls = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (!m || m.role !== "assistant" || !Array.isArray(m.tool_calls)) continue;
    for (const tc of m.tool_calls) {
      const res = msgs.slice(i + 1).find((r) => r && r.role === "tool" && (!tc.id || r.tool_call_id === tc.id));
      calls.push({ name: tc.function && tc.function.name, args: (tc.function && tc.function.arguments) || "", out: String((res && res.content) || "") });
    }
  }
  if (!calls.length) return { progressing: false, why: "no tool calls in the turn" };
  const recent = calls.slice(-window);
  const counts = new Map();
  for (const c of recent) { const k = c.name + " " + c.args; counts.set(k, (counts.get(k) || 0) + 1); }
  const [loopKey, loopN] = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (loopN >= loopRepeats) return { progressing: false, why: "repeating: " + loopKey.slice(0, 80) + " x" + loopN };
  const failed = (c) => /FAILED TO COMPILE|^REFUSED|^Error\b|^\w*Error:|threw/.test(c.out);
  const tail = calls.slice(-errorRun);
  if (tail.length === errorRun && tail.every(failed)) return { progressing: false, why: "last " + errorRun + " calls all failed" };
  const isWrite = (c) => /^(write_file|edit_file)$/.test(c.name);
  const applied = recent.filter((c) => isWrite(c) && /^(Wrote|Edited) /.test(c.out) && !failed(c));
  if (applied.length) return { progressing: true, why: applied.length + " applied write(s) in the last " + recent.length + " calls" };
  if (!calls.some(isWrite)) {
    if (counts.size / recent.length >= minDistinct) return { progressing: true, why: "no writes; " + counts.size + "/" + recent.length + " distinct calls" };
    return { progressing: false, why: "no writes; only " + counts.size + "/" + recent.length + " distinct calls" };
  }
  return { progressing: false, why: "no applied write in the last " + recent.length + " calls" };
}

export const CONTINUE_PROMPT =
  "You ran out of steps for that turn. Continue from where you stopped and finish the task.";
