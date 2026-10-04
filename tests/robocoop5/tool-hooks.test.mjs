// beforeTool and afterTool through the real makeSession (spec step 9, R10, R12): the one wrapper round a tool.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { engine, call, done, ping } from "./lib/engine.mjs";

const echo = { id: "echo", description: "echo", parameters: { type: "object", properties: {} }, execute: async (a, ctx) => ({ title: "echo", output: "ran echo " + JSON.stringify(a) + (ctx.sessionState ? "" : " NO STATE") }) };
const toolResults = (s) => s.messages.filter((m) => m.role === "tool").map((m) => m.content);
const turn = async (opts, script, rules = []) => {
  const e = await engine({ script, tools: [ping, echo] });
  for (const r of rules) e.tools.registerRule(r);
  const s = e.makeSession(opts);
  await s.send("go");
  return toolResults(s);
};

describe("tool hooks", () => {
  it("an agent's beforeTool refuses with the guardrail text and the tool does not run", async () => {
    const got = await turn({ hooks: { beforeTool: ({ name, args }) => name === "echo" && args.secret ? "no secrets" : null } }, [call("echo", { secret: 1 }), call("echo", { a: 1 }), done("ok")]);
    assert.deepEqual(got, ["Refused by guardrail: no secrets", 'ran echo {"a":1}', "ok"]);
  });
  it("an agent's afterTool rewrites the result, after the page's afterTool rules", async () => {
    const page = { id: "tag", hook: "afterTool", order: 10, check: ({ result }) => ({ ...result, output: result.output + " +page" }) };
    const got = await turn({ hooks: { afterTool: ({ result }) => ({ ...result, output: result.output.toUpperCase() }) } }, [call("echo", {}), done("ok")], [page]);
    assert.deepEqual(got, ["RAN ECHO {} +PAGE", "ok"]);
  });
  it("a registered beforeTool rule at order 0 answers before the agent's own", async () => {
    let asked = 0;
    const page = { id: "self_edit", hook: "beforeTool", order: 0, check: ({ name }) => name === "echo" ? "page says no" : null };
    const got = await turn({ hooks: { beforeTool: () => { asked++; return "agent says no"; } } }, [call("echo", {}), call("ping"), done("ok")], [page]);
    assert.deepEqual(got, ["Refused by guardrail: page says no", "Refused by guardrail: agent says no", "ok"]);
    assert.equal(asked, 1);
  });
  it("a beforeTool rule that throws refuses the call; an afterTool rule that throws is skipped", async () => {
    const before = await turn({ rules: [{ id: "boom", hook: "beforeTool", order: 5, check: () => { throw new Error("boom"); } }] }, [call("echo", {}), done("ok")]);
    assert.deepEqual(before, ["Refused by guardrail: REFUSED: rule boom failed: boom", "ok"]);
    const after = await turn({ rules: [{ id: "boom", hook: "afterTool", order: 5, check: () => { throw new Error("boom"); } }] }, [call("echo", {}), done("ok")]);
    assert.deepEqual(after, ["ran echo {}", "ok"]);
  });
  it("with no rule on either hook a tool result is unchanged", async () => assert.deepEqual(await turn({}, [call("echo", { a: 1 }), done("ok")]), ['ran echo {"a":1}', "ok"]));
});
