// rows.addWithin(key, add, max) of cloudflare-iac.ojs: the statement a Worker sends to D1, run on a SQLite, beside
// the function the Durable Object, the test rig and the notebook's store answer with (`within.next`). The first test
// sends it as a Worker does, platform.rows through sqlCall to a binding of D1's shape; the others bind the statement here.
// The statement is read from what cb4 runs (cloud-brain-dev/deploy after `bun sync.ts`), never retyped; from the seed
// of this checkout until 2026-10-18 (sr-cloudflare-iac).
// D1 has its own SQLite and binds a number its own way: a pass here is not a pass there.
// plan/cloud-brain-day-spend-not-bounded-by-one-row.md, task 1; tools/cloud-brain/records/ds-1-rows-add-within.md.
import { expect } from "bun:test";
import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { runningNoFiles, testNeedingRunning } from "./needs.ts";

const needing = testNeedingRunning("rows-add-within-sql.test.ts", "cloudflare-iac");
const { test } = needing, module = needing.module && await runningNoFiles("cloudflare-iac");
const SPEC = resolve(import.meta.dir, "../../plan/cloud-brain-day-spend-not-bounded-by-one-row.md");

let within: any = null, runtime: any = null;
const load = async () => (within ??= (runtime = await (await importNotebookModule(module)).value("workerRuntime"))().within);

// A Worker's own rows over a SQLite: the wrapper with an SQL binding shaped as D1's (prepare, bind, first, run, all),
// so platform.rows goes through sqlCall and its statements, with what each statement was bound.
const worker = async (name = "w") => {
  const db = new Database(":memory:"), binds: any[][] = [];
  const made = (sql: string, args: any[]) => ({
    bind: (...next: any[]) => made(sql, next),
    first: async () => (binds.push(args), db.query(sql).get(...args) ?? null),
    run: async () => (binds.push(args), { meta: { changes: db.query(sql).run(...args).changes } }),
    all: async () => (binds.push(args), { results: db.query(sql).all(...args) })
  });
  const rt = runtime(), env = { SQL: { prepare: (sql: string) => made(sql, []) }, BRAIN_INFO: { name, role: "recipe" } };
  // The wrapper learns its bindings from the first request it answers.
  const health = await rt.serve(async () => ({ options: {} })).fetch(new Request("https://w.internal/xrpc/_health"), env, {});
  expect(await health.json()).toEqual({ ok: true, name });
  return { db, binds, rows: rt.platform.rows };
};

const fresh = () => {
  const db = new Database(":memory:");
  db.run("CREATE TABLE IF NOT EXISTS kv (t TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, PRIMARY KEY (t, k)) WITHOUT ROWID");
  return db;
};
// The statement alone, bound as the test above saw sqlCall bind it: the Worker's name, the key, then each number with its bound.
const sent = (db: Database, key: string, add: number[], max: number[]) => {
  const r = db.query(within.sql(add.length)).get("w", key, ...add.flatMap((a, j) => [a, max[j]])) as any;
  return r ? JSON.parse(r.v) : null;
};
const kept = (db: Database, key: string) => {
  const r = db.query("SELECT v FROM kv WHERE t = 'w' AND k = ?1").get(key) as any;
  return r ? JSON.parse(r.v) : null;
};
// Both ways at once: the statement on its table, the function on a Map. Each answer and each row must be the same.
const both = () => {
  const db = fresh(), map = new Map<string, any>();
  return {
    db,
    map,
    add(key: string, add: number[], max: number[]) {
      const a = sent(db, key, add, max);
      const b = within.next(map.get(key), add, max);
      if (b) map.set(key, b);
      expect(b).toEqual(a);
      expect(map.get(key) ?? null).toEqual(kept(db, key));
      return a;
    }
  };
};

test("a Worker's rows.addWithin on its SQL binding sends the key and each number in its place", async () => {
  await load();
  const w = await worker();
  // The stand-in is D1's shape for the operations that were there before: a put, a get, an append, a list.
  expect([await w.rows.put("p", { a: 1 }), await w.rows.get("p"), await w.rows.append("l", "x"), await w.rows.list("l")]).toEqual([true, { a: 1 }, 1, [{ key: "l", value: ["x"] }]]);
  w.binds.length = 0;
  expect(await w.rows.addWithin("spent", [900, 1], [1000, 7])).toEqual([900, 1]);
  expect(w.binds).toEqual([["w", "spent", 900, 1000, 1, 7]]);
  expect(await w.rows.get("spent")).toEqual([900, 1]);
  expect(await w.rows.addWithin("spent", [200, 1], [1000, 7])).toBe(null);
  expect(await w.rows.addWithin("spent", [200, 1], [2000, 7])).toEqual([1100, 2]);
  expect(await w.rows.addWithin("first", [2000, 1], [1000, 7])).toBe(null);
  expect(await w.rows.get("first")).toBe(null);
  expect([await w.rows.addWithin("c", [1, 1], [1000, 2]), await w.rows.addWithin("c", [1, 1], [1000, 2]), await w.rows.addWithin("c", [1, 1], [1000, 2])]).toEqual([[1, 1], [2, 2], null]);
  expect([await w.rows.addWithin("one", [4], [5]), await w.rows.addWithin("three", [1, 2, 3], [1, 2, 3])]).toEqual([[4], [1, 2, 3]]);
  // Ten at once with room for three. On this SQLite a statement runs whole before the next; that is not D1.
  const ten = await Promise.all(Array.from({ length: 10 }, () => w.rows.addWithin("ten", [1, 1], [1000, 3])));
  expect(ten.filter(Boolean).length).toBe(3);
  // A pair that is no pair is thrown at with no statement sent.
  w.binds.length = 0;
  await expect(w.rows.addWithin("bad", [1, 1], [9])).rejects.toThrow("of one length of 1 or more");
  expect(w.binds).toEqual([]);
  // The rows are under the Worker's name and each key, and another Worker's are its own.
  expect(w.db.query("SELECT t, k, v FROM kv WHERE k IN ('spent', 'c', 'ten') ORDER BY k").all()).toEqual([
    { t: "w", k: "c", v: "[2,2]" },
    { t: "w", k: "spent", v: "[1100,2]" },
    { t: "w", k: "ten", v: "[3,3]" }
  ]);
});

test("the statement for two numbers is the one the spec gives", async () => {
  await load();
  const text = await Bun.file(SPEC).text();
  const quoted = /```sql\n([\s\S]*?)\n```/.exec(text)![1].replace(/\s+/g, " ").trim();
  expect(within.sql(2)).toBe(quoted);
  expect(within.sql(1)).toBe(
    "INSERT INTO kv (t, k, v) SELECT ?1, ?2, json_array(?3) WHERE ?3 <= ?4 ON CONFLICT (t, k) DO UPDATE SET v = json_array(json_extract(v, '$[0]') + ?3) WHERE json_extract(v, '$[0]') + ?3 <= ?4 RETURNING v"
  );
  expect(within.sql(3).match(/\?\d+/g)!.map((p) => +p.slice(1)).sort((a, b) => a - b).at(-1)).toBe(8);
});

test("50 charges of 1 to 297 under an allowance of 1000 and a count of 7: 7 are taken, and the row is their sum", async () => {
  await load();
  const s = both();
  // Fixed, so a run is the same run each time: 1 + (37 i mod 297).
  const charges = Array.from({ length: 50 }, (_, i) => 1 + ((37 * i) % 297));
  const taken = charges.filter((u) => s.add("spent", [u, 1], [1000, 7]) !== null);
  expect(taken.length).toBe(7);
  expect(kept(s.db, "spent")).toEqual([taken.reduce((a, b) => a + b, 0), 7]);
  expect(kept(s.db, "spent")[0]).toBeLessThanOrEqual(1000);
});

test("a first charge above the allowance answers null and makes no row", async () => {
  await load();
  const s = both();
  expect(s.add("spent", [2000, 1], [1000, 7])).toBe(null);
  expect(s.db.query("SELECT count(*) AS n FROM kv").get()).toEqual({ n: 0 });
});

test("three charges under a count of 2: [1,1], [2,2], null", async () => {
  await load();
  const s = both();
  expect([1, 2, 3].map(() => s.add("spent", [1, 1], [1000, 2]))).toEqual([[1, 1], [2, 2], null]);
  expect(kept(s.db, "spent")).toEqual([2, 2]);
});

test("each call brings its own bound: 900, then 200 under 1000 is null, then 200 under 2000 is [1100,2]", async () => {
  await load();
  const s = both();
  expect(s.add("spent", [900, 1], [1000, 7])).toEqual([900, 1]);
  expect(s.add("spent", [200, 1], [1000, 7])).toBe(null);
  expect(kept(s.db, "spent")).toEqual([900, 1]);
  expect(s.add("spent", [200, 1], [2000, 7])).toEqual([1100, 2]);
});

test("the sum may equal the bound and not pass it; a refusal on one number leaves the other as it was", async () => {
  await load();
  const s = both();
  expect(s.add("k", [1000, 1], [1000, 1])).toEqual([1000, 1]);
  expect(s.add("k", [0, 0], [1000, 1])).toEqual([1000, 1]);
  expect(s.add("k", [1, 0], [1000, 9])).toBe(null);
  expect(s.add("k", [0, 1], [9999, 1])).toBe(null);
  expect(kept(s.db, "k")).toEqual([1000, 1]);
  // Another key and another Worker's row of the same key are not touched.
  s.db.query(within.sql(1)).get("other", "k", 5, 9);
  expect(s.add("k2", [3], [9])).toEqual([3]);
  expect(kept(s.db, "k")).toEqual([1000, 1]);
  expect(s.db.query("SELECT v FROM kv WHERE t = 'other' AND k = 'k'").get()).toEqual({ v: "[5]" });
});

test("no bound is the largest whole number a caller can send, and one number or three work as two do", async () => {
  await load();
  const s = both(), M = Number.MAX_SAFE_INTEGER;
  expect(s.add("d", [250000, 1], [M, M])).toEqual([250000, 1]);
  expect(s.add("d", [750001, 1], [M, M])).toEqual([1000001, 2]);
  expect(s.add("one", [4], [5])).toEqual([4]);
  expect(s.add("one", [2], [5])).toBe(null);
  expect(s.add("three", [1, 2, 3], [1, 2, 3])).toEqual([1, 2, 3]);
  expect(s.add("three", [0, 0, 1], [9, 9, 3])).toBe(null);
});

test("a row that is no list of numbers is refused and left as it was, by the statement and by the function", async () => {
  await load();
  for (const [name, value] of [["a counter", 5], ["an object", { u: 1 }], ["a shorter list", [1]], ["a list with a null", [1, null]], ["text", "x"]] as [string, any][]) {
    const db = fresh();
    db.query("INSERT INTO kv (t, k, v) VALUES ('w', 'k', ?1)").run(JSON.stringify(value));
    expect([name, sent(db, "k", [1, 1], [9, 9])]).toEqual([name, null]);
    expect([name, kept(db, "k")]).toEqual([name, value]);
    expect([name, within.next(value, [1, 1], [9, 9])]).toEqual([name, null]);
  }
});

test("a longer list is cut to the numbers added, and a number that is not whole is added to as it is", async () => {
  await load();
  const s = both();
  s.db.query("INSERT INTO kv (t, k, v) VALUES ('w', 'long', '[1,2,3]'), ('w', 'half', '[1.5,1]')").run();
  s.map.set("long", [1, 2, 3]).set("half", [1.5, 1]);
  expect(s.add("long", [1, 1], [9, 9])).toEqual([2, 3]);
  expect(s.add("half", [1, 1], [9, 9])).toEqual([2.5, 2]);
});

test("add and max that are not lists of whole numbers of one length are thrown at, before any statement", async () => {
  await load();
  const bad: [any, any][] = [
    [[1, 1], [9]], [[], []], [[1], undefined], [undefined, [1]], [1, 1], [["1"], [9]], [[1.5], [9]], [[-1], [9]], [[1], [-1]],
    [[1], [null]], [[1], [Infinity]], [[NaN], [9]], [[1], [Number.MAX_SAFE_INTEGER + 1]]
  ];
  for (const [add, max] of bad) expect(() => within.check(add, max)).toThrow("rows.addWithin: add and max are lists of whole numbers, of one length of 1 or more");
  expect(within.check([0, 1], [0, 1])).toBe(true);
});
