import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPatchSource } from "../../tools/robocoop-5/eval/tbs/page-init.mjs";

test("the fetch wrapper merges the patch into OpenRouter chat bodies only", async () => {
  const seen = [];
  const g = { fetch: async (url, init) => { seen.push({ url, body: init && init.body }); return "resp"; } };
  const fn = new Function("globalThis", fetchPatchSource({ reasoning: { enabled: false }, max_tokens: 20000 }));
  fn(g);
  const r = await g.fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", body: JSON.stringify({ model: "m", max_tokens: 32000, messages: [] }) });
  assert.equal(r, "resp");
  const body = JSON.parse(seen[0].body);
  assert.deepEqual(body.reasoning, { enabled: false });
  assert.equal(body.max_tokens, 20000);
  assert.deepEqual(g.__rc5LastBody, body);
  await g.fetch("https://openrouter.ai/api/v1/models", { method: "GET" });
  assert.equal(seen[1].body, undefined);
  await g.fetch("https://example.com/chat/completions", { method: "POST", body: "not json" });
  assert.equal(seen[2].body, "not json");
});
