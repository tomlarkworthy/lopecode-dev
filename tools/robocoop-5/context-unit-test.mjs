// Unit test for situational context: composeContext (robocoop-5-core) and the contextProvider seam
// in createAgentSession. Headless runtime via notebook-import — no browser, no model.
import { importNotebookModule } from "../notebook-import.ts";

const m = await importNotebookModule(new URL("../../modules/@tomlarkworthy/robocoop-5-core.js", import.meta.url).pathname);
const composeContext = await m.value("composeContext");
const createAgentSession = await m.value("createAgentSession");

let failures = 0;
const check = (name, ok, detail) => {
  console.log((ok ? "ok  " : "FAIL") + " " + name + (ok || detail == null ? "" : " — " + detail));
  if (!ok) failures++;
};

// ── composeContext ──────────────────────────────────────────────────────────
{
  const now = new Date(2026, 7, 8, 14, 3, 22);
  const P = (id, over = {}) => ({ id, label: id, scope: "turn", render: () => id + "-body", ...over });

  // scope filter + priority order + header
  const block = await composeContext(
    [P("b", { priority: 20 }), P("a", { priority: 10 }), P("s", { scope: "session" })],
    { scope: "turn", turn: 3, now }
  );
  check("scope filter drops session provider", !block.includes("s-body"));
  check("priority orders sections", block.indexOf("## a") < block.indexOf("## b"));
  check("header carries scope/turn/time", /<environment scope="turn" turn="3" time="2026-08-08 14:03:22">/.test(block), block.split("\n")[0]);
  check("turn attr omitted when falsy", !(await composeContext([P("x")], { scope: "turn", now })).includes('turn='));

  // isolation: throwing provider drops only its section
  const iso = await composeContext([P("bad", { render: () => { throw new Error("boom"); } }), P("good")], { scope: "turn", now });
  check("throwing provider dropped, others kept", iso.includes("good-body") && !iso.includes("boom"));

  // timeout: slow provider dropped
  const slow = await composeContext(
    [P("slow", { render: () => new Promise((r) => setTimeout(() => r("late"), 500)) }), P("fast")],
    { scope: "turn", now, sectionTimeout: 50 }
  );
  check("slow provider times out", slow.includes("fast-body") && !slow.includes("late"));

  // null render → section omitted; all-null → null
  const quiet = await composeContext([P("q", { render: () => null })], { scope: "turn", now });
  check("all-null renders → null block", quiet === null);

  // per-section budget truncates
  const big = await composeContext([P("big", { budget: 60, render: () => "x".repeat(500) })], { scope: "turn", now });
  check("section truncated to budget", big.includes("truncated") && big.length < 400, "len=" + big.length);

  // total budget drops lowest-priority overflow with a note
  const tot = await composeContext(
    [P("one", { priority: 1, render: () => "y".repeat(300) }), P("two", { priority: 2, render: () => "z".repeat(300) })],
    { scope: "turn", now, totalBudget: 350 }
  );
  check("total budget drops overflow + notes it", tot.includes("y".repeat(10)) && !tot.includes("zzz") && /dropped/.test(tot));

  // weak dedupe: strong shadows weak regardless of order
  const weak = await composeContext(
    [P("layout", { weak: true, render: () => "scraped" }), P("layout", { render: () => "owner" })],
    { scope: "turn", now }
  );
  check("non-weak shadows weak (same id)", weak.includes("owner") && !weak.includes("scraped"));
}

// ── createAgentSession contextProvider seam ────────────────────────────────
function textClient() {
  const seen = [];
  return {
    seen,
    async chat({ messages }) {
      seen.push(messages.map((x) => ({ role: x.role, content: typeof x.content === "string" ? x.content : "[parts]" })));
      return { message: { role: "assistant", content: "done" }, finish_reason: "stop" };
    },
  };
}
{
  let sessionCalls = 0, turnCalls = 0;
  const provider = ({ scope, turn }) => {
    if (scope === "session") { sessionCalls++; return sessionCalls < 2 ? null : "<environment scope=\"session\">S</environment>"; }
    turnCalls++;
    return "<environment scope=\"turn\">T" + turn + "</environment>";
  };
  const client = textClient();
  const s = createAgentSession({ client, tools: [], model: "mock", systemPrompt: "SYS", contextProvider: provider });

  await s.send("hello");
  const m1 = client.seen[0];
  check("turn 1: no session ctx (provider returned null)", !m1.some((x) => x.content === "<environment scope=\"session\">S</environment>"));
  const t1 = m1.findIndex((x) => x.content.startsWith("<environment scope=\"turn\">"));
  const u1 = m1.findIndex((x) => x.role === "user");
  check("turn ctx injected before user message", t1 >= 0 && u1 === t1 + 1, "t=" + t1 + " u=" + u1);
  check("system prompt still first", m1[0].role === "system" && m1[0].content.startsWith("SYS"));

  await s.send("again");
  const m2 = client.seen[1];
  check("session ctx retried and lands at index 1", m2[1].content === "<environment scope=\"session\">S</environment>", JSON.stringify(m2[1]));
  check("turn ctx appears once per send", m2.filter((x) => x.content.startsWith("<environment scope=\"turn\">")).length === 2);
  const lastUser = m2.map((x) => x.role).lastIndexOf("user");
  check("user message stays last", lastUser === m2.length - 1);

  await s.send("third");
  check("session ctx injected exactly once", client.seen[2].filter((x) => x.content === "<environment scope=\"session\">S</environment>").length === 1);
  check("session provider not re-called after latch", sessionCalls === 2, "calls=" + sessionCalls);

  s.reset();
  await s.send("fresh");
  check("reset re-arms session scope", sessionCalls === 3, "calls=" + sessionCalls);
}
{
  // throwing provider must not kill the turn; absent provider unchanged behaviour
  const client = textClient();
  const s = createAgentSession({ client, tools: [], model: "mock", systemPrompt: "SYS", contextProvider: () => { throw new Error("ctx boom"); } });
  const r = await s.send("hi");
  check("throwing contextProvider: turn survives", r.finishReason === "stop" && !client.seen[0].some((x) => x.content.includes("boom")));

  const plain = textClient();
  const s2 = createAgentSession({ client: plain, tools: [], model: "mock", systemPrompt: "SYS" });
  await s2.send("hi");
  check("no provider: no context messages", !plain.seen[0].some((x) => String(x.content).startsWith("<environment")));
}

console.log(failures ? "CONTEXT UNIT TEST: " + failures + " FAILURE(S)" : "CONTEXT UNIT TEST: PASS");
process.exit(failures ? 1 : 0);
