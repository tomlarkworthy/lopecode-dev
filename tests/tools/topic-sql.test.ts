// The SQL of brain-x-topic, on a SQLite. The test cells of brain-topic.ojs run on topicFakeSql, whose reading of each
// WHERE was written by hand; this runs the statements themselves.
//   1. Each statement's plan, made here with EXPLAIN, is given to the check of the deployed brain-db
//      (cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js: sqlShape, sqlNeeds, sqlSignature). D1 plans with its own
//      SQLite, so a pass here is not a pass there: the first call on cb4 is that test.
//   2. One list of calls is run on a SQLite and on topicFakeSql, and each answer is compared.
// The statements are read from the built module, never retyped, as tests/tools/issue-lock-sql.test.ts reads its own.
// plan/cloud-brain-topics-service.md, task 1; tools/cloud-brain/records/tp-1-topics-append-read.md.
import { expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { BUILT, notebookOf, testNeeding } from "./needs.ts";

const ROOT = resolve(import.meta.dir, "../..");
const worktree = statSync(resolve(ROOT, ".git")).isFile();
const NOTEBOOK = resolve(ROOT, notebookOf({ named: process.env.BRAIN_NOTEBOOK, worktree, built: existsSync(resolve(ROOT, BUILT)) }));
const BRAIN_DB = resolve(ROOT, "cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js");
const test = testNeeding("topic-sql.test.ts", [NOTEBOOK, BRAIN_DB]);

let S: Record<string, string>, schema: string[], fakeSql: any, db_: any;

beforeAll(async () => {
  if (!existsSync(NOTEBOOK) || !existsSync(BRAIN_DB)) return;
  const got = Bun.spawnSync(["bun", resolve(ROOT, "tools/lope-reader.ts"), NOTEBOOK, "--get-module", "@tomlarkworthy/brain-topic"]);
  if (got.exitCode !== 0) throw new Error(`no module @tomlarkworthy/brain-topic in ${NOTEBOOK}: ${got.stderr.toString().slice(0, 300)}`);
  const file = join(mkdtempSync(join(tmpdir(), "topic-sql-")), "brain-topic.js");
  writeFileSync(file, got.stdout);
  const topic = await importNotebookModule(file);
  S = await topic.value("topicSql");
  schema = await topic.value("topicSchema");
  fakeSql = await topic.value("topicFakeSql");
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
// topic.append as the service sends it.
const append = (topic: string, key: string, at = 1000, body = '"b"') => [[S.byKey, topic, key], [S.append, topic, key, "owner", at, body, 0], [S.counted, topic], [S.byKey, topic, key]];
const entries = (db: Database) => (db.query("SELECT topic, seq, key FROM topic_entries ORDER BY topic, seq").all() as any[]).map((e) => [e.topic, e.seq, e.key]);
const last = (db: Database, topic: string) => (db.query("SELECT last FROM topic_topics WHERE topic = ?1").get(topic) as any)?.last;

test("brain-db's check passes the plan of each statement, and each opens only the Worker's own tables", async () => {
  const [sqlShape, sqlNeeds, sqlSignature, sqlMaster] = [await db_.value("sqlShape"), await db_.value("sqlNeeds"), await db_.value("sqlSignature"), await db_.value("sqlMaster")];
  const plan = (db: Database, s: string, args: any[]) => (db.query("EXPLAIN " + s).all(...args) as any[]).map((o) => [o.opcode, o.p1, o.p2, o.p3, o.p5]);
  // The schema statements, planned on a database that has none of the tables, each run before the next is planned.
  const empty = new Database(":memory:");
  expect(schema.length).toBe(4);
  for (const s of schema) {
    const shape = sqlShape(s), needs = sqlNeeds(plan(empty, s, []), empty.query(sqlMaster).all(), { schema: true });
    expect([s.slice(0, 50), shape.kind, shape.names.every((n: string) => n.startsWith("topic_")), needs.refused || null]).toEqual([s.slice(0, 50), "schema", true, null]);
    empty.run(s);
  }
  const db = fresh(), master = db.query(sqlMaster).all();
  // Every statement with as many arguments as the service gives it: a count of ?N that differs is an error here.
  const given: Record<string, any[]> = {
    one: ["t"], all: [], mine: ["owner"], owned: ["owner"], make: ["t", "owner", "true", "true", 1000], rules: ["t", "true", "true"],
    append: ["t", "k", "owner", 1000, "1", 0], counted: ["t"], byKey: ["t", "k"], read: ["t", 0, 50], dropEntries: ["t"], drop: ["t"], old: [1000], over: [10000]
  };
  expect(Object.keys(S).sort()).toEqual(Object.keys(given).sort());
  const says = Object.fromEntries(Object.keys(S).map((k) => [k, sqlShape(S[k]).kind + " " + sqlSignature(sqlNeeds(plan(db, S[k], given[k]), master))]));
  expect(says).toEqual({
    one: "data r:topic_topics",
    all: "data r:topic_topics",
    mine: "data r:topic_topics",
    owned: "data r:topic_topics",
    make: "data w:topic_topics",
    rules: "data w:topic_topics",
    append: "data r:topic_topics w:topic_entries",
    counted: "data r:topic_entries w:topic_topics",
    byKey: "data r:topic_entries",
    read: "data r:topic_entries",
    dropEntries: "data w:topic_entries",
    drop: "data w:topic_topics",
    old: "data w:topic_entries",
    over: "data r:topic_entries r:topic_topics w:topic_entries"
  });
});

test("a key is kept once for a topic, and the count moves only with an entry", () => {
  const db = fresh();
  batch(db, [[S.make, "t", "owner", "true", "true", 1000]]);
  expect(batch(db, [[S.make, "t", "other", "false", "false", 2000]])[0].changes).toBe(0);
  const first = batch(db, append("t", "a")), second = batch(db, append("t", "b")), again = batch(db, append("t", "a", 5000, '"other"'));
  expect([first[0].rows, first[3].rows, second[3].rows]).toEqual([[], [{ seq: 1 }], [{ seq: 2 }]]);
  // Sent again: the key is read as kept before the insert, the insert writes nothing, the count stays.
  expect([again[0].rows, again[1].changes, again[2].changes, again[3].rows]).toEqual([[{ seq: 1 }], 0, 0, [{ seq: 1 }]]);
  expect(last(db, "t")).toBe(2);
  expect(db.query("SELECT body, at FROM topic_entries WHERE topic = 't' AND seq = 1").get()).toEqual({ body: '"b"', at: 1000 });
  // The same key in another topic is an entry there. A topic that is not there takes none.
  batch(db, [[S.make, "u", "owner", "true", "true", 1000]]);
  expect(batch(db, append("u", "a"))[3].rows).toEqual([{ seq: 1 }]);
  expect(batch(db, append("nope", "a"))[3].rows).toEqual([]);
  expect(entries(db)).toEqual([["t", 1, "a"], ["t", 2, "b"], ["u", 1, "a"]]);
});

test("no seq is used twice: after every entry is removed the next is last + 1", () => {
  const db = fresh();
  batch(db, [[S.make, "t", "owner", "true", "true", 1000]]);
  for (const k of ["a", "b", "c"]) batch(db, append("t", k, 1000));
  expect(batch(db, [[S.old, 2000]])[0].changes).toBe(3);
  expect(entries(db)).toEqual([]);
  expect(batch(db, append("t", "a", 3000))[3].rows).toEqual([{ seq: 4 }]);
  // What MAX(seq) + 1 of the entries would have given at that point, the statement the spec first names.
  const empty = fresh();
  expect(empty.query("SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM topic_entries WHERE topic = 't'").get()).toEqual({ seq: 1 });
});

test("the clock's two removals: by age, and by how far behind the topic's last", () => {
  const db = fresh();
  for (const t of ["t", "u"]) batch(db, [[S.make, t, "owner", "true", "true", 1000]]);
  for (let i = 1; i <= 5; i++) batch(db, append("t", "k" + i, i * 1000));
  batch(db, append("u", "k1", 1000));
  // Older than 3000 goes: at 1000 and 2000 of t, and u's one.
  expect(batch(db, [[S.old, 3000]])[0].changes).toBe(3);
  expect(entries(db)).toEqual([["t", 3, "k3"], ["t", 4, "k4"], ["t", 5, "k5"]]);
  // Keep 2 to a topic: seq <= 5 - 2. u has nothing and loses nothing.
  expect(batch(db, [[S.over, 2]])[0].changes).toBe(1);
  expect(entries(db)).toEqual([["t", 4, "k4"], ["t", 5, "k5"]]);
  expect(batch(db, [[S.over, 10000]])[0].changes).toBe(0);
  // read is in seq order from a position, with a limit.
  expect((batch(db, [[S.read, "t", 4, 50]])[0].rows as any[]).map((r) => r.seq)).toEqual([5]);
  expect((batch(db, [[S.read, "t", 0, 1]])[0].rows as any[]).map((r) => r.seq)).toEqual([4]);
  // delete: the entries and the row; the other topic stays.
  expect(batch(db, [[S.dropEntries, "t"], [S.drop, "t"]]).map((r) => r.changes)).toEqual([2, 1]);
  expect((batch(db, [[S.all]])[0].rows as any[]).map((r) => [r.topic, r.last])).toEqual([["u", 1]]);
});

test("topicFakeSql answers one list of calls as the SQLite does", async () => {
  const db = fresh(), fake = fakeSql();
  const calls: any[][][] = [
    [[S.make, "t", "owner", "true", "true", 1000]],
    [[S.make, "t", "other", "false", "false", 2000]],
    [[S.make, "m.0a.x", "did:plc:a", "true", "false", 1500]],
    [[S.one, "t"]], [[S.one, "nope"]], [[S.all]], [[S.mine, "did:plc:a"]], [[S.mine, "nobody"]], [[S.owned, "owner"]], [[S.owned, "nobody"]],
    [[S.rules, "t", "false", "caller.session"]], [[S.rules, "nope", "false", "false"]], [[S.one, "t"]],
    append("t", "a", 1000), append("t", "b", 2000), append("t", "a", 3000, '"again"'), append("m.0a.x", "a", 2500), append("nope", "a", 1000),
    append("t", "c", 3000), append("t", "d", 4000), append("t", "e", 5000),
    [[S.read, "t", 0, 50]], [[S.read, "t", 2, 2]], [[S.read, "t", 9, 50]], [[S.read, "nope", 0, 50]], [[S.all]],
    [[S.old, 2000], [S.over, 2]], [[S.read, "t", 0, 50]], [[S.read, "m.0a.x", 0, 50]],
    [[S.old, 9000]], [[S.read, "t", 0, 50]], append("t", "a", 9500), [[S.one, "t"]],
    [[S.dropEntries, "t"], [S.drop, "t"]], [[S.dropEntries, "t"], [S.drop, "t"]], [[S.all]], [[S.read, "t", 0, 50]]
  ];
  let n = 0;
  for (const list of calls) {
    const real = batch(db, list), stood: any[] = [];
    for (const [s, ...args] of list) stood.push(await fake.run(s, args));
    // A SELECT's changes are not compared: the service reads none.
    const seen = (rs: any[]) => rs.map((r, i) => (/^\s*SELECT/i.test(list[i][0]) ? { rows: r.rows } : r));
    expect([n, seen(stood)]).toEqual([n, seen(real)]);
    n++;
  }
  expect(n).toBe(37);
});
