// Manual e2e for the QA session model in tools/channel/lopecode-channel.ts.
// Launches real headless Chromium via the MCP stdio interface; not part of the
// default `bun test` sweep. Run with:  bun tests/channel/qa-sessions-e2e.mjs
//
// Covers the three 2026-07-02 fixes:
//   1. re-open of a same-#hash URL is a full document reload (was a
//      same-document navigation serving the stale first render)
//   2. named sessions are independent parallel browsers with their own logs
//   3. concurrent opens on one session serialize instead of orphaning a
//      browser / aborting each other's goto
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const channelDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "tools", "channel");
// The MCP SDK is a dependency of tools/channel, not of the repo root.
const req = createRequire(join(channelDir, "package.json"));
const { Client } = await import(req.resolve("@modelcontextprotocol/sdk/client/index.js"));
const { StdioClientTransport } = await import(req.resolve("@modelcontextprotocol/sdk/client/stdio.js"));
const dir = mkdtempSync(join(tmpdir(), "qa-sessions-e2e-"));
const fA = join(dir, "a.html");
const fB = join(dir, "b.html");
const mk = (label) => `<html><body><h1>${label}</h1><script>console.log("MARKER-" + document.querySelector("h1").textContent)</script></body></html>`;

writeFileSync(fA, mk("VERSION-1"));
writeFileSync(fB, mk("NOTEBOOK-B"));

const transport = new StdioClientTransport({ command: "bun", args: ["lopecode-channel.ts"], cwd: channelDir });
const client = new Client({ name: "qa-sessions-e2e", version: "0.0.0" });
await client.connect(transport);

const call = (name, args) => client.callTool({ name, arguments: args });
const text = (r) => r.content.map((c) => c.text ?? "").join(" ");
const logs = async (session) => text(await call("qa_console_logs", { session, include_noise: true }));
const settle = () => new Promise((r) => setTimeout(r, 300));

let failures = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "PASS" : "FAIL"}: ${label}${cond ? "" : " — " + detail}`);
  if (!cond) failures++;
};

// 1. stale-render fix: open, rewrite file, re-open same URL (same hash) → fresh content
const urlA = `file://${fA}#view=x&cc=T`;
await call("qa_open_notebook", { url: urlA, headless: true });
await settle();
const l1 = await logs(undefined);
check("first open renders VERSION-1", l1.includes("MARKER-VERSION-1"), l1);

writeFileSync(fA, mk("VERSION-2"));
await call("qa_open_notebook", { url: urlA, headless: true });
await settle();
const l2 = await logs(undefined);
check("re-open same URL renders VERSION-2 (stale bug fixed)", l2.includes("MARKER-VERSION-2"), l2);

// 2. parallel sessions: second browser under session "b", independent logs
const rb = await call("qa_open_notebook", { url: `file://${fB}#view=y&cc=T`, headless: true, session: "b" });
check("session 'b' opens", text(rb).includes("session 'b'"), text(rb));
await settle();
const lb = await logs("b");
check("session 'b' has its own logs", lb.includes("MARKER-NOTEBOOK-B") && !lb.includes("VERSION-2"), lb);
const ld = await logs(undefined);
check("default session logs not polluted by 'b'", !ld.includes("NOTEBOOK-B"), ld);

// 3. concurrent open on the SAME session serializes (shared launch, chained goto)
const [c1, c2] = await Promise.all([
  call("qa_open_notebook", { url: urlA, headless: true, session: "race" }),
  call("qa_open_notebook", { url: urlA, headless: true, session: "race" }),
]);
check("concurrent same-session opens both succeed", !c1.isError && !c2.isError, text(c1) + text(c2));

// 4. qa_close single session, then close-all
const closeB = await call("qa_close", { session: "b" });
check("close session 'b'", text(closeB).includes("closed 'b'"), text(closeB));
const shotB = await call("qa_screenshot", { session: "b" });
check("session 'b' gone after close", shotB.isError === true, text(shotB));
const closeAll = await call("qa_close", {});
check("close-all closes remaining sessions", text(closeAll).includes("closed 'default'") && text(closeAll).includes("closed 'race'"), text(closeAll));

await client.close();
console.log(failures ? `${failures} FAILURES` : "ALL PASS");
process.exit(failures ? 1 : 0);
