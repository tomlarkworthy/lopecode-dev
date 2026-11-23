// Expected answers and drive steps for each program, written 2026-11-23 06:5x before any draft was checked.
// A drive gets the running program `p` and helpers; it returns [pass, note].
type P = any;
export type Ctx = { p: P; v: (n: string) => any; act: (n: string, ...a: unknown[]) => Promise<string | null>; pump: (n?: number) => Promise<void>; text: (e: unknown) => string; find: (e: unknown, f: (x: any) => boolean) => any[] };
type D = (c: Ctx) => Promise<[boolean, string]> | [boolean, string];
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const plain = (x: any): any => (x instanceof Map ? [...x].map(plain) : x instanceof Set ? [...x].map(plain) : ArrayBuffer.isView(x) ? Array.from(x as any) : Array.isArray(x) ? x.map(plain) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, plain(y)])) : x);
const want = (pairs: [string, unknown][]): D => ({ v }) => {
  const bad = pairs.filter(([n, w]) => !eq(plain(v(n)), w)).map(([n, w]) => `${n}=${JSON.stringify(plain(v(n)))} want ${JSON.stringify(w)}`);
  return [bad.length === 0, bad.length ? bad.join("; ") : pairs.map(([n]) => n).join(",") + " ok"];
};
const seq = (...ds: D[]): D => async (c) => { const notes: string[] = []; for (const d of ds) { const [ok, n] = await d(c); notes.push(n); if (!ok) return [false, notes.join(" | ")]; } return [true, notes.join(" | ")]; };
const call = (n: string, ...a: unknown[]): D => async (c) => { const e = await c.act(n, ...a); return [e === null, e ?? `${n}(${a.map((x) => JSON.stringify(x)).join(",")})`]; };
const clickText = (view: string, label: string): D => async (c) => {
  const bs = c.find(c.v(view), (x) => x.tag === "button" && c.text(x).includes(label));
  if (!bs.length) return [false, `no button '${label}' in ${view}`];
  try { bs[0].props.onClick(); } catch (e) { return [false, `click threw ${(e as Error).message}`]; }
  await c.p.settle(400);
  return [true, `clicked '${label}'`];
};
export const M: Record<string, { cat: string; expect: string; drive: D }> = {
  "01": { cat: "data", expect: "paidTotal 137.5, bigCustomers [ann, cy]", drive: want([["paidTotal", 137.5], ["bigCustomers", ["ann", "cy"]]]) },
  "02": { cat: "data", expect: "names carl,adam,bea,zoe", drive: want([["names", "carl,adam,bea,zoe"]]) },
  "03": { cat: "data", expect: "letterCounts a:2 b:2 c:1", drive: want([["letterCounts", "a:2 b:2 c:1"]]) },
  "04": { cat: "data", expect: "squares 1..36, sum 91", drive: want([["squares", [1, 4, 9, 16, 25, 36]], ["sumSquares", 91]]) },
  "05": { cat: "data", expect: "nameOfU2 Bob", drive: want([["nameOfU2", "Bob"]]) },
  "06": { cat: "data", expect: "unique, uniqueSorted, seenTwice", drive: want([["unique", ["js", "ts", "go", "rust"]], ["uniqueSorted", ["go", "js", "rust", "ts"]], ["seenTwice", ["js", "ts"]]]) },
  "07": { cat: "data", expect: "top [the=3, and=2]", drive: want([["top", ["the=3", "and=2"]]]) },
  "08": { cat: "data", expect: "two padded lines", drive: want([["report", "tea     2 x $3.50 = $7.00\ncake    1 x $12.00 = $12.00"]]) },
  "09": { cat: "data", expect: "daysBetween 50, endWeekday Sun", drive: want([["daysBetween", 50], ["endWeekday", "Sun"]]) },
  "10": { cat: "data", expect: "chunks [[1,2],[3,4],[5]], pairs [[a,1],[b,2]]", drive: want([["chunks", [[1, 2], [3, 4], [5]]], ["pairs", [["a", 1], ["b", 2]]]]) },
  "11": { cat: "algo", expect: "found [3,-1]", drive: want([["found", [3, -1]]]) },
  "12": { cat: "algo", expect: "fib50 12586269025", drive: want([["fib50", 12586269025]]) },
  "13": { cat: "algo", expect: "stats {sum 10, depth 3}, flatten [1,2,4,3]", drive: want([["stats", { sum: 10, depth: 3 }], ["flatten", [1, 2, 4, 3]]]) },
  "14": { cat: "algo", expect: "AA.data [7,10,15,22], AI [1,2,3,4]", drive: async (c) => { const a = plain(c.v("AA")); const ok = eq(a?.data, [7, 10, 15, 22]) && eq(plain(c.v("AI")), [1, 2, 3, 4]); return [ok, `AA ${JSON.stringify(a)} AI ${JSON.stringify(plain(c.v("AI")))}`]; } },
  "15": { cat: "algo", expect: 'parsed [a, "b,c", d, say "hi"]', drive: want([["parsed", ["a", "b,c", "d", 'say "hi"']]]) },
  "16": { cat: "algo", expect: "lruDemo [a, c]", drive: want([["lruDemo", ["a", "c"]]]) },
  "17": { cat: "state", expect: "0 clicks; +,+ -> 2 clicks; - -> 1 click; reset -> 0 clicks", drive: seq(want([["label", "0 clicks"]]), clickText("app", "+"), clickText("app", "+"), want([["label", "2 clicks"]]), clickText("app", "-"), want([["label", "1 click"]]), clickText("app", "reset"), want([["label", "0 clicks"]])) },
  "18": { cat: "state", expect: "add a,b; toggle 1 -> remaining 1; remove 2 -> remaining 0, 1 todo", drive: seq(call("addTodo", "a"), call("addTodo", "b"), call("toggleTodo", 1), want([["remaining", 1]]), call("removeTodo", 2), want([["remaining", 0]]), async (c) => [c.v("todos")?.length === 1, `todos ${JSON.stringify(c.v("todos"))}`]) },
  "19": { cat: "state", expect: "2 errors; email a@b age 30 -> valid; age x -> 1 error", drive: seq(async (c) => [c.v("errors")?.length === 2, `errors ${JSON.stringify(c.v("errors"))}`], call("setEmail", "a@b"), call("setAge", "30"), want([["valid", true]]), call("setAge", "x"), want([["errors", ["age must be a whole number 0-150"]]])) },
  "20": { cat: "state", expect: "1,2,undo->1,redo->2,undo,undo->0,undo->0", drive: seq(call("setValue", 1), call("setValue", 2), call("undo"), want([["current", 1]]), call("redo"), want([["current", 2]]), call("undo"), call("undo"), want([["current", 0]]), call("undo"), want([["current", 0]])) },
  "21": { cat: "state", expect: "A,A,C -> subtotal 7, tax 1.4, total 8.4", drive: seq(call("addToCart", "A"), call("addToCart", "A"), call("addToCart", "C"), want([["subtotal", 7], ["tax", 1.4], ["total", 8.4]])) },
  "22": { cat: "state", expect: "5 pages; next x5 -> page 4 with items 21-23; prev -> 3", drive: seq(want([["pageCount", 5], ["visible", ["item 1", "item 2", "item 3", "item 4", "item 5"]]]), call("nextPage"), call("nextPage"), call("nextPage"), call("nextPage"), call("nextPage"), want([["page", 4], ["visible", ["item 21", "item 22", "item 23"]]]), call("prevPage"), want([["page", 3]])) },
  "23": { cat: "state", expect: "toggle 2,4,2 -> [4]; all -> 1..5; clear -> []", drive: seq(call("toggle", 2), call("toggle", 4), call("toggle", 2), want([["selectedList", [4]]]), call("selectAll"), want([["selectedList", [1, 2, 3, 4, 5]]]), call("clearSel"), want([["selectedList", []]])) },
  "24": { cat: "state", expect: "test_reduce '+10 -3 refused'; deposit 5 -> balance 5", drive: seq(want([["test_reduce", "+10 -3 refused"]]), call("dispatch", { type: "deposit", amount: 5 }), async (c) => [c.v("acct")?.balance === 5, `acct ${JSON.stringify(c.v("acct"))}`]) },
  "25": { cat: "state", expect: "results squares; rememberPrice A 2 -> {A:2}", drive: seq(want([["results", [1000000, 4000000, 1000000, 9000000, 4000000]]]), call("rememberPrice", "A", 2), want([["priceCache", { A: 2 }]])) },
  "26": { cat: "events", expect: "elapsed grows while running, stops after stop", drive: async (c) => { await c.pump(6); const e1 = c.v("elapsed"); await c.act("stop"); await c.pump(3); const e2 = c.v("elapsed"); await c.pump(3); const e3 = c.v("elapsed"); return [e1 > 0 && e2 === e3, `elapsed ${e1} -> ${e2} -> ${e3}, seconds ${c.v("seconds")}`]; } },
  "27": { cat: "events", expect: "' APPle ' -> matches [apple, pineapple]", drive: async (c) => { const ins = c.find(c.v("searchView"), (x) => x.tag === "input"); if (!ins.length) return [false, "no input"]; ins[0].props.onInput(" APPle "); await c.p.settle(400); return want([["query", "apple"], ["matches", ["apple", "pineapple"]]])(c); } },
  "28": { cat: "events", expect: "flushed [hello, ' ', world], buffer []", drive: async (c) => { await c.pump(20); return want([["flushed", ["hello", " ", "world"]], ["buffer", []]])(c); } },
  "29": { cat: "events", expect: "3 clicks -> clickCount 3, lastGap a number", drive: seq(clickText("clickView", "clicked"), clickText("clickView", "clicked"), clickText("clickView", "clicked"), async (c) => [c.v("clickCount") === 3 && typeof c.v("lastGap") === "number", `count ${c.v("clickCount")} gap ${c.v("lastGap")}`]) },
  "30": { cat: "async", expect: "topRepo b, languages [ts, go]", drive: async (c) => [c.v("topRepo")?.name === "b" && eq(plain(c.v("languages")), ["ts", "go"]), `top ${JSON.stringify(c.v("topRepo"))} langs ${JSON.stringify(plain(c.v("languages")))}`] },
  "31": { cat: "async", expect: "cheapest B", drive: want([["cheapest", "B"]]) },
  "32": { cat: "async", expect: "theme default, problem HTTP 404", drive: want([["theme", "default"], ["problem", "HTTP 404"]]) },
  "33": { cat: "async", expect: "seen [ann]; nextUser -> [ann, bob]", drive: seq(async (c) => { await c.pump(4); return want([["seen", ["ann"]]])(c); }, call("nextUser"), async (c) => { await c.pump(4); return want([["seen", ["ann", "bob"]]])(c); }) },
  "34": { cat: "views", expect: "3 rows; remove on eggs -> [milk, flour]", drive: async (c) => { const rows = c.find(c.v("listView"), (x) => x.tag === "button"); if (rows.length !== 3) return [false, `${rows.length} buttons`]; rows[1].props.onClick(); await c.p.settle(400); const names = (c.v("items") ?? []).map((x: any) => x.name); return [eq(names, ["milk", "flour"]), `items ${names}`]; } },
  "35": { cat: "views", expect: "loading…; finish -> 2 spans; fail -> failed: timeout", drive: async (c) => { const t0 = c.text(c.v("statusView")); await c.act("finish"); const sp = c.find(c.v("statusView"), (x) => x.tag === "span").length; await c.act("fail"); const t2 = c.text(c.v("statusView")); return [t0 === "loading…" && sp === 2 && t2 === "failed: timeout", `${t0} / ${sp} spans / ${t2}`]; } },
  "36": { cat: "views", expect: "type ' hi ', send -> [hi], draft ''; empty send no-op", drive: async (c) => { const ins = c.find(c.v("chatView"), (x) => x.tag === "input"); if (!ins.length) return [false, "no input"]; ins[0].props.onInput(" hi "); await c.p.settle(400); const r = await clickText("chatView", "send")(c); if (!r[0]) return r; await c.act("send"); return want([["messages", ["hi"]], ["draft", ""]])(c); } },
  "37": { cat: "views", expect: "2 cards, first has a tag span", drive: async (c) => { const cards = c.find(c.v("board"), (x) => x.props?.class === "card"); const tags = c.find(c.v("board"), (x) => x.props?.class === "tag"); return [cards.length === 2 && tags.length === 1 && c.text(tags[0]) === "new", `${cards.length} cards, ${tags.length} tags`]; } },
  "38": { cat: "helpers", expect: "shown [50.0%, 90.0%, 100.0%, 0.0%], summary 4 scores", drive: want([["shown", ["50.0%", "90.0%", "100.0%", "0.0%"]], ["summary", "4 scores"]]) },
  "39": { cat: "helpers", expect: "northTotal 6", drive: want([["northTotal", 6]]) },
  "40": { cat: "helpers", expect: "demo {top 3, peek 2, size 2}", drive: want([["demo", { top: 3, peek: 2, size: 2 }]]) },
};
// Added in phase 2 (06:6x): the accepted repairs of 29 and 34 changed the UI element, so the drive changed; the expectations are the same.
M["29b"] = { cat: "events", expect: "3 pointer-downs -> clickCount 3, lastGap a number", drive: async (c) => { for (let i = 0; i < 3; i++) { const cv = c.find(c.v("clickView"), (x) => x.tag === "canvas"); cv[0].props.onPointerDown({ x: 1, y: 1, t: 100 + i * 250, id: 1, buttons: 1 }); await c.p.settle(300); } return [c.v("clickCount") === 3 && c.v("lastGap") === 250, `count ${c.v("clickCount")} gap ${c.v("lastGap")}`]; } };
M["34b"] = { cat: "views", expect: "3 rows; remove on eggs -> [milk, flour]", drive: async (c) => { const ins = c.find(c.v("listView"), (x) => x.tag === "input"); if (ins.length !== 3) return [false, `${ins.length} inputs`]; ins[1].props.onInput(ins[1].props.value); await c.p.settle(400); const names = (c.v("items") ?? []).map((x: any) => x.name); return [JSON.stringify(names) === JSON.stringify(["milk", "flour"]), `items ${names}`]; } };
