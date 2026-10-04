// test_two_sessions_isolated (spec R18): two agents built by the real makeSession, on one page, each see
// a monitor's verdict. The real engine, tools and core cells run headless against a scripted client.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { engine, call, ping } from "./lib/engine.mjs";

const turn = [call("ping"), call("ping"), call("task_complete", { summary: "done" })];
const notices = (s) => s.messages.filter((m) => m.role === "system" && /\[monitor:/.test(m.content)).map((m) => m.content);

describe("test_two_sessions_isolated", () => {
  it("a monitor verdict reaches each session, not only the first to drain", async () => {
    const { makeSession, rewind } = await engine({ script: turn, tools: [ping], monitors: [{ id: "t", check: () => "red" }] });
    const a = makeSession(), b = makeSession();
    await a.send("go"); rewind(); await b.send("go");
    assert.equal(notices(a).length, 1, "session a: " + JSON.stringify(notices(a)));
    assert.equal(notices(b).length, 1, "session b: " + JSON.stringify(notices(b)));
  });
  it("the page lists each live session's watch bus, and drops it on dispose", async () => {
    const { makeSession, tools } = await engine({ script: turn, tools: [ping] });
    const a = makeSession(), b = makeSession();
    assert.deepEqual([...tools.rc5_watchBuses], [a.watchBus, b.watchBus]);
    a.dispose();
    assert.deepEqual([...tools.rc5_watchBuses], [b.watchBus]);
  });
});
