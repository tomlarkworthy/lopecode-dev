// The SQL of issue.lock (brain-x-issues), on a SQLite. The test cells of brain-x-issues run on issuesFakeSql,
// whose reading of each WHERE was written by hand; this runs the statements themselves.
//   1. Each statement's plan, made here with EXPLAIN, is given to the check of the deployed brain-db
//      (cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js: sqlShape, sqlNeeds, sqlSignature). D1 plans with its own
//      SQLite, so a pass here is not a pass there: the first call on cb4 is that test.
//   2. The batches of issueLocking are run as one transaction each, as brain-db runs a batch.
// The statements are read from what cb4 runs (cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js after `bun sync.ts`),
// never retyped, and from no notebook; until 2026-10-14 from the seed tools/cloud-brain/brain-issues.ojs, deleted that day
// behind what ran. With no brain-issues.js or brain-db.js the tests are skipped, and a line says for want of what. Until view-isolated-from-main-notebook (2026-10-12) the module was taken from a notebook, in a
// worktree with no build the main checkout's through the lopebooks link, and BRAIN_NOTEBOOK named another.
// plan/cloud-brain-locks-held-in-the-cluster.md, task 1; tools/cloud-brain/records/lk-1-issue-lock-methods.md.
import { expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { testNeedingRunning } from "./needs.ts";

const ROOT = resolve(import.meta.dir, "../..");
const BRAIN_DB = resolve(ROOT, "cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js");
const { test, module } = testNeedingRunning("issue-lock-sql.test.ts", "brain-issues", [BRAIN_DB]);

let S: Record<string, string>, schema: string[], locking: any, limits: any, db_: any;

beforeAll(async () => {
  if (!module) return;
  const issues = await importNotebookModule(module);
  S = await issues.value("issuesSql");
  limits = await issues.value("issuesLimits");
  // A module from before the change has neither cell: the tests then fail, each on what it reads.
  schema = await issues.value("issuesLockSchema").catch(() => []);
  locking = await issues.value("issueLocking").catch(() => null);
  db_ = await importNotebookModule(BRAIN_DB);
});

const fresh = () => {
  const db = new Database(":memory:");
  for (const s of schema) db.run(s);
  return db;
};
// A batch as brain-db answers it: one transaction, { rows, changes } a statement.
const batch = (db: Database, list: any[][]) =>
  db.transaction(() =>
    list.map(([s, ...args]) => {
      const q = db.query(s);
      return /^\s*SELECT/i.test(s) ? { rows: q.all(...args) as any[], changes: 0 } : { rows: [], changes: q.run(...args).changes };
    })
  )();
const call = (db: Database, plan: any) => plan.read(batch(db, plan.batch));
const row = (db: Database, name: string) => db.query("SELECT * FROM issues_locks WHERE name = ?1").get(name) as any;
const history = (db: Database) => db.query("SELECT name, who, n, taken, ended, how FROM issues_lock_history ORDER BY h").all() as any[];
const ask = (who: string, now: number, more = {}) => ({ name: "land", who, actor: "delegation:" + who, now, until: now + 600000, ...more });

test("the module has the lock's statements, and each is one of a batch issueLocking makes", () => {
  const names = Object.keys(S).filter((k) => k.startsWith("lock")).sort();
  expect(names).toEqual(["lockAll", "lockExpired", "lockForce", "lockForced", "lockHistory", "lockOne", "lockRelease", "lockReleased", "lockRenew", "lockTakeNew", "lockTakeOver", "lockTrim"]);
  expect(schema.length).toBe(2);
  const a = ask("a", 1000);
  const used = new Set([locking.take(a), locking.renew(a), locking.release(a), locking.force(a)].flatMap((p: any) => p.batch.map((s: any[]) => s[0])));
  // issue.locks reads with the two that are in no batch of issueLocking.
  expect(names.filter((n) => !used.has(S[n]))).toEqual(["lockAll", "lockHistory"]);
});

test("brain-db's check passes the plan of each statement, and each opens only the Worker's own tables", async () => {
  const [sqlShape, sqlNeeds, sqlSignature, sqlMaster] = [await db_.value("sqlShape"), await db_.value("sqlNeeds"), await db_.value("sqlSignature"), await db_.value("sqlMaster")];
  const plan = (db: Database, s: string, args: any[]) => (db.query("EXPLAIN " + s).all(...args) as any[]).map((o) => [o.opcode, o.p1, o.p2, o.p3, o.p5]);
  // The control: the upsert brain-db's own test names (brain-db.ojs, test_sql_needs_are_read_from_real_plans).
  const control = new Database(":memory:");
  control.run("CREATE TABLE metrics_calls (t INTEGER, worker TEXT, n INTEGER, PRIMARY KEY (t, worker))");
  const upsert = "INSERT INTO metrics_calls (t, worker, n) VALUES (?1, ?2, ?3) ON CONFLICT (t, worker) DO UPDATE SET n = n + excluded.n";
  expect(sqlSignature(sqlNeeds(plan(control, upsert, [1, "w", 1]), control.query(sqlMaster).all()))).toBe("w:metrics_calls");
  // The two schema statements, planned on a database that has neither table.
  const empty = new Database(":memory:");
  for (const s of schema) {
    const shape = sqlShape(s), needs = sqlNeeds(plan(empty, s, []), empty.query(sqlMaster).all(), { schema: true });
    expect([s.slice(0, 50), shape.kind, shape.names.every((n: string) => n.startsWith("issues_")), needs.refused || null]).toEqual([s.slice(0, 50), "schema", true, null]);
    empty.run(s);
  }
  const db = fresh(), master = db.query(sqlMaster).all();
  // Every statement with the arguments a call gives it, so that a count of ?N that differs from the arguments is an error here.
  const a = ask("a", 1000), given = new Map<string, any[]>();
  for (const p of [locking.take(a), locking.renew(a), locking.release(a), locking.force(a)]) for (const [s, ...args] of p.batch) given.set(s, args);
  given.set(S.lockAll, []);
  given.set(S.lockHistory, [50]);
  const says = Object.fromEntries(Object.keys(S).filter((k) => k.startsWith("lock")).map((k) => [k, sqlShape(S[k]).kind + " " + sqlSignature(sqlNeeds(plan(db, S[k], given.get(S[k])!), master))]));
  expect(says).toEqual({
    lockOne: "data r:issues_locks",
    lockAll: "data r:issues_locks",
    lockExpired: "data r:issues_locks w:issues_lock_history",
    lockTakeOver: "data w:issues_locks",
    lockTakeNew: "data w:issues_locks",
    lockRenew: "data w:issues_locks",
    lockReleased: "data r:issues_locks w:issues_lock_history",
    lockRelease: "data w:issues_locks",
    lockForced: "data r:issues_locks w:issues_lock_history",
    lockForce: "data w:issues_locks",
    lockHistory: "data r:issues_lock_history",
    lockTrim: "data r:issues_lock_history w:issues_lock_history"
  });
});

test("two holders of one name: one row after, the first's", () => {
  const db = fresh();
  const first = call(db, locking.take(ask("a", 1000))), second = call(db, locking.take(ask("b", 2000))), again = call(db, locking.take(ask("a", 3000)));
  expect(first).toEqual({ ok: { held: true, name: "land", who: "a", n: 1, taken: 1000, until: 601000 } });
  expect(second.refuse.slice(0, 2).concat([second.refuse[3]])).toEqual([409, "Held", { held: false, holder: { who: "a", taken: 1000, until: 601000 } }]);
  // The holder's own second take is refused as anyone's.
  expect(again.refuse[3]).toEqual(second.refuse[3]);
  expect(db.query("SELECT * FROM issues_locks").all()).toEqual([{ name: "land", who: "a", actor: "delegation:a", n: 1, taken: 1000, until: 601000 }]);
  expect(history(db)).toEqual([]);
});

test("a lock that has ended: the second holder's after, n up by one, one history row", () => {
  const db = fresh();
  call(db, locking.take(ask("a", 1000)));
  // until is 601000. At 601000 it is still held; one millisecond later it is not.
  expect(call(db, locking.take(ask("b", 601000))).refuse[0]).toBe(409);
  const took = call(db, locking.take(ask("b", 601001)));
  expect(took).toEqual({ ok: { held: true, name: "land", who: "b", n: 2, taken: 601001, until: 1201001, over: { who: "a", until: 601000 } } });
  expect(row(db, "land")).toEqual({ name: "land", who: "b", actor: "delegation:b", n: 2, taken: 601001, until: 1201001 });
  expect(history(db)).toEqual([{ name: "land", who: "a", n: 1, taken: 1000, ended: 601000, how: "expired" }]);
  // issue.locks sorts by the same comparison.
  const all = batch(db, [[S.lockAll]])[0].rows;
  expect([locking.sort(all, 1201001).locks.length, locking.sort(all, 1201002).ended]).toEqual([1, [{ name: "land", who: "b", n: 2, taken: 601001, until: 1201001 }]]);
});

test("20 takers of one free name: one holds it", () => {
  const db = fresh();
  const all = Array.from({ length: 20 }, (_, i) => call(db, locking.take(ask("w" + (i + 1), 1000 + i))));
  expect([all.filter((r) => r.ok).length, all.filter((r) => r.refuse && r.refuse[0] === 409).length, row(db, "land").who, row(db, "land").n]).toEqual([1, 19, "w1", 1]);
});

test("renew and release are the holder's; a release empties the row and keeps n", () => {
  const db = fresh();
  call(db, locking.take(ask("a", 1000)));
  // The same who under another actor is another's, for a renew and for a release.
  const other = { ...ask("a", 2000), actor: "delegation:reviewer" };
  expect([call(db, locking.renew(other)).refuse.slice(0, 2), call(db, locking.release(other)).refuse.slice(0, 2), call(db, locking.release(other)).refuse[3]]).toEqual([[409, "Held"], [403, "Refused"], { holder: { who: "a", taken: 1000, until: 601000 } }]);
  expect(call(db, locking.renew(ask("a", 2000))).ok).toEqual({ held: true, name: "land", who: "a", n: 1, taken: 1000, until: 602000 });
  // Its own lock, ended and not taken since: renewed, with over, and no history row.
  expect(call(db, locking.renew(ask("a", 700000))).ok).toEqual({ held: true, name: "land", who: "a", n: 1, taken: 1000, until: 1300000, over: { who: "a", until: 602000 } });
  expect(history(db)).toEqual([]);
  expect(call(db, locking.release(ask("a", 800000))).ok).toEqual({ held: false, name: "land", who: "a", n: 1, taken: 1000, ended: 800000, how: "released" });
  expect(row(db, "land")).toEqual({ name: "land", who: "", actor: "", n: 1, taken: 1000, until: 0 });
  // The emptied row: no renew takes it, a second release finds nothing, and a take of it has no over and no history row.
  expect([call(db, locking.renew(ask("a", 800001))).refuse, call(db, locking.release(ask("a", 800001))).refuse].map((r) => [r[0], r[1], r[3]])).toEqual(Array(2).fill([409, "NotHeld", { held: false, holder: null }]));
  expect(call(db, locking.renew({ ...ask("a", 800001), name: "never" })).refuse[1]).toBe("NotHeld");
  expect(db.query("SELECT COUNT(*) AS c FROM issues_locks").get()).toEqual({ c: 1 });
  expect(call(db, locking.take(ask("b", 800002))).ok).toEqual({ held: true, name: "land", who: "b", n: 2, taken: 800002, until: 1400002 });
  expect(history(db).map((h) => h.how)).toEqual(["released"]);
  // force ends whoever holds it; with nobody it writes nothing.
  expect(call(db, locking.force({ name: "land", now: 900000 })).ok).toEqual({ held: false, name: "land", who: "b", n: 2, taken: 800002, ended: 900000, how: "forced" });
  expect(call(db, locking.force({ name: "land", now: 900001 })).refuse[1]).toBe("NotHeld");
  expect(history(db).map((h) => [h.who, h.how, h.ended])).toEqual([["a", "released", 800000], ["b", "forced", 900000]]);
});

test("the history keeps its newest rows, and is read the last written first", () => {
  const db = fresh(), keep = limits.lockHistory;
  expect(keep).toBe(500);
  for (let i = 0; i < keep + 3; i++) {
    call(db, locking.take(ask("w" + i, 10 * i)));
    call(db, locking.release(ask("w" + i, 10 * i + 5)));
  }
  expect(db.query("SELECT COUNT(*) AS c, MIN(n) AS first, MAX(n) AS last FROM issues_lock_history").get()).toEqual({ c: keep, first: 4, last: keep + 3 });
  expect(batch(db, [[S.lockHistory, 2]])[0].rows.map((h: any) => h.who)).toEqual(["w" + (keep + 2), "w" + (keep + 1)]);
  expect(batch(db, [[S.lockHistory, 0]])[0].rows).toEqual([]);
});
