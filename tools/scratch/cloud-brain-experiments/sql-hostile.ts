// 2026-10-07: statements sent to cb4's db.sql as the Worker brain-x-sqlprobe (through its sql cell), and as the owner.
import { readFileSync } from "node:fs";
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const B = "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.";
const post = async (nsid: string, body: any) => { const r = await fetch(B + nsid, { method: "POST", headers: { "content-type": "application/json", cookie: "brain_session=" + st.cookie }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) as any }; };
const probe = async (statements: any[], times = 1) => (await post("sqlprobe.run", { statements, times })).data?.out ?? [{ message: "probe unreachable" }];
const show = (o: any) => o.results ? "ok " + o.results.map((r: any) => `rows ${r.rows} changes ${r.changes}`).join("; ") : `${o.status} ${o.error}: ${o.message}`;
const mode = process.argv[2];
if (mode === "hostile") {
  const rows: [string, any[]][] = [
    ["make its own table", [["CREATE TABLE IF NOT EXISTS sqlprobe_a (k TEXT PRIMARY KEY, n INTEGER)"]]],
    ["upsert into its own", [["INSERT INTO sqlprobe_a (k, n) VALUES (?1, ?2) ON CONFLICT (k) DO UPDATE SET n = n + excluded.n", "a", 2]]],
    ["read its own", [["SELECT k, n FROM sqlprobe_a WHERE k = ?1", "a"]]],
    ["read another Worker's table", [["SELECT COUNT(*) AS n FROM metrics_calls"]]],
    ["read it through a subquery", [["SELECT k FROM sqlprobe_a WHERE n IN (SELECT n FROM metrics_calls)"]]],
    ["read it through a CTE", [["WITH x AS (SELECT worker FROM metrics_calls) SELECT * FROM x"]]],
    ["write to it", [["INSERT INTO metrics_faults (t, worker, version, method, caller, status, ms) VALUES (1, 'x', '', 'm', 'c', 500, 1)"]]],
    ["update it", [["UPDATE metrics_calls SET n = 0"]]],
    ["insert-select: its own from another's", [["INSERT INTO sqlprobe_a SELECT worker, n FROM metrics_calls"]]],
    ["insert-select: another's from its own", [["INSERT INTO metrics_faults (t, worker, version, method, caller, status, ms) SELECT n, k, '', '', '', 1, 1 FROM sqlprobe_a"]]],
    ["upsert into another's", [["INSERT INTO metrics_calls (t, worker, version, method, caller, status, n, ms, max) VALUES (1,'a','b','c','d',2,3,4,5) ON CONFLICT (t, worker, version, method, caller, status) DO UPDATE SET n = n + excluded.n"]]],
    ["bare DELETE of another's", [["DELETE FROM metrics_faults"]]],
    ["DROP another's", [["DROP TABLE metrics_faults"]]],
    ["index on another's", [["CREATE INDEX sqlprobe_i ON metrics_calls (n)"]]],
    ["ALTER another's", [["ALTER TABLE metrics_calls ADD COLUMN x TEXT"]]],
    ["sqlite_master", [["SELECT name, sql FROM sqlite_master"]]],
    ["sqlite_schema", [["SELECT name FROM sqlite_schema"]]],
    ["PRAGMA", [["PRAGMA table_info(metrics_calls)"]]],
    ["pragma function", [["SELECT * FROM pragma_table_info('metrics_calls')"]]],
    ["two statements", [["SELECT 1; DELETE FROM metrics_faults"]]],
    ["EXPLAIN then a write", [["EXPLAIN SELECT 1; DELETE FROM metrics_faults"]]],
    ["a good statement then a bad one, one batch", [["INSERT INTO sqlprobe_a (k, n) VALUES ('batch', 1)"], ["SELECT COUNT(*) FROM metrics_calls"]]],
    ["  …and the good one did not run", [["SELECT COUNT(*) AS n FROM sqlprobe_a WHERE k = 'batch'"]]],
    ["create outside its prefix", [["CREATE TABLE stolen (a TEXT)"]]],
    ["create with another's prefix", [["CREATE TABLE metrics_extra (a TEXT)"]]],
    ["create table as select", [["CREATE TABLE sqlprobe_copy AS SELECT * FROM metrics_calls"]]],
    ["a view over another's", [["CREATE VIEW sqlprobe_v AS SELECT * FROM metrics_calls"]]],
    ["a trigger", [["CREATE TRIGGER sqlprobe_t AFTER INSERT ON sqlprobe_a BEGIN DELETE FROM metrics_faults WHERE t < 0 END"]]],
    ["rename", [["ALTER TABLE sqlprobe_a RENAME TO metrics_calls2"]]],
    ["attach", [["ATTACH DATABASE 'x' AS y"]]],
    ["json_each (a virtual table)", [["SELECT * FROM json_each('[1]')"]]],
    ["D1's own table", [["SELECT * FROM _cf_KV"]]],
    ["brain-db's own table", [["SELECT * FROM db_selftest_a"]]],
    ["a syntax error", [["SELEC 1"]]],
    ["wrong number of arguments", [["SELECT k FROM sqlprobe_a WHERE k = ?1"]]],
    ["add a column to its own", [["ALTER TABLE sqlprobe_a ADD COLUMN note TEXT"]]],
    ["index its own", [["CREATE INDEX IF NOT EXISTS sqlprobe_a_n ON sqlprobe_a (n)"]]],
    ["bare DELETE of its own", [["DELETE FROM sqlprobe_a"]]],
  ];
  for (const [label, statements] of rows) console.log(label.padEnd(44), "|", show((await probe(statements))[0]).slice(0, 150));
  console.log("-- owner grants read on metrics_calls to the probe");
  console.log("grant".padEnd(44), "|", JSON.stringify((await post("db.sqlGrant", { table: "metrics_calls", allow: 'resource.op == "read" && caller.worker == "brain-x-sqlprobe"' })).data));
  await new Promise((r) => setTimeout(r, 6000));
  for (const [label, statements] of [["read another's, granted", [["SELECT COUNT(*) AS n FROM metrics_calls"]]], ["write another's, read grant only", [["UPDATE metrics_calls SET n = 0"]]], ["index another's, read grant only", [["CREATE INDEX sqlprobe_i ON metrics_calls (n)"]]]] as any) console.log(label.padEnd(44), "|", show((await probe(statements))[0]).slice(0, 150));
  console.log("revoke".padEnd(44), "|", JSON.stringify((await post("db.sqlGrant", { table: "metrics_calls", allow: null })).data));
  await new Promise((r) => setTimeout(r, 6000));
  console.log("read another's, after the rule is removed".padEnd(44), "|", show((await probe([["SELECT COUNT(*) AS n FROM metrics_calls"]]))[0]).slice(0, 150));
  console.log("drop its own".padEnd(44), "|", show((await probe([["DROP TABLE sqlprobe_a"]]))[0]));
  const o = await post("db.sql", { statements: [["SELECT name, type FROM sqlite_master WHERE name NOT LIKE '\\_cf%' ESCAPE '\\'"], ["SELECT COUNT(*) AS n, SUM(n) AS calls FROM metrics_calls"], ["SELECT COUNT(*) AS n FROM metrics_faults"]] });
  console.log("owner:", o.status, JSON.stringify(o.data.results ? o.data.results.map((r: any) => r.rows) : o.data).slice(0, 700), JSON.stringify(o.data.ms));
} else if (mode === "time") {
  await probe([["CREATE TABLE IF NOT EXISTS sqlprobe_t (k TEXT PRIMARY KEY, n INTEGER)"]]);
  const one = [["INSERT INTO sqlprobe_t (k, n) VALUES (?1, 1) ON CONFLICT (k) DO UPDATE SET n = n + 1", "a"]];
  const direct = async (statements: any[]) => { const t = performance.now(); const r = await post("db.sql", { statements }); return { wall: Math.round(performance.now() - t), ms: r.data.ms, explained: r.data.explained }; };
  console.log("probe, 12 times in one Worker request (ms seen by the Worker for sql.batch):", (await probe(one, 12)).map((o: any) => o.ms).join(" "));
  const fresh = (i: number) => [[`SELECT n, ${i} AS i FROM sqlprobe_t WHERE k = ?1`, "a"]];
  console.log("probe, 8 new statement texts (each explained once):", (await Promise.all([0]).then(async () => { const out = []; for (let i = 0; i < 8; i++) out.push((await probe(fresh(Date.now() % 100000 + i)))[0].ms); return out; })).join(" "));
  console.log("owner direct (unchecked), 5:", JSON.stringify(await Promise.all([1, 2, 3, 4, 5].map(() => direct(one)))));
  await probe([["DROP TABLE sqlprobe_t"]]);
}
if (mode === "views") {
  const o = async (statements: any[]) => { const r = await post("db.sql", { statements }); return r.status + " " + JSON.stringify(r.data.results ? r.data.results.map((x: any) => x.rows.slice(0, 2)) : r.data).slice(0, 160); };
  const p = async (label: string, statements: any[]) => { const x = (await probe(statements))[0]; console.log(label.padEnd(52), "|", x.results ? "ok " + JSON.stringify(x.results.map((r: any) => r.first ?? { changes: r.changes })) : `${x.status} ${x.error}: ${x.message}`); };
  await p("make its own table", [["CREATE TABLE IF NOT EXISTS sqlprobe_b (k TEXT PRIMARY KEY, n INTEGER)"]]);
  await p("a good statement then a refused one, one batch", [["INSERT INTO sqlprobe_b (k, n) VALUES ('batch', 1)"], ["SELECT COUNT(*) FROM metrics_calls"]]);
  await p("  rows the good one left", [["SELECT COUNT(*) AS n FROM sqlprobe_b WHERE k = 'batch'"]]);
  console.log("owner: a view of metrics_calls named sqlprobe_v".padEnd(52), "|", await o([["CREATE VIEW sqlprobe_v AS SELECT worker, n FROM metrics_calls"]]));
  console.log("owner: a trigger on sqlprobe_b that writes metrics_faults".padEnd(52), "|", await o([["CREATE TRIGGER sqlprobe_tr AFTER INSERT ON sqlprobe_b BEGIN INSERT INTO metrics_faults (t, worker, version, method, caller, status, ms) VALUES (0, new.k, '', '', '', 0, 0); END"]]));
  await new Promise((r) => setTimeout(r, 6000));
  await p("read the view with its own prefix", [["SELECT COUNT(*) AS n FROM sqlprobe_v"]]);
  await p("insert into its own table, firing the trigger", [["INSERT INTO sqlprobe_b (k, n) VALUES ('t', 1)"]]);
  await p("  rows that insert left", [["SELECT COUNT(*) AS n FROM sqlprobe_b WHERE k = 't'"]]);
  console.log("owner: drop them".padEnd(52), "|", await o([["DROP TRIGGER sqlprobe_tr"], ["DROP VIEW sqlprobe_v"]]));
  await new Promise((r) => setTimeout(r, 6000));
  await p("insert again, no trigger", [["INSERT INTO sqlprobe_b (k, n) VALUES ('t', 1)"]]);
  await p("drop its own", [["DROP TABLE sqlprobe_b"]]);
  console.log("owner: what is left".padEnd(52), "|", await o([["SELECT COUNT(*) AS faults FROM metrics_faults"], ["SELECT name FROM sqlite_master WHERE name LIKE 'sqlprobe%'"]]));
}
