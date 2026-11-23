// Bug probes: what each would do if it ran. A drive records values before and after the bug fires.
const show = (x: any): string => { try { return JSON.stringify(x instanceof Map ? [...x] : x); } catch { return String(x); } };
const obs = (names: string[], acts: [string, unknown[]][] = [], pumps = 0) => async (c: any): Promise<[boolean, string]> => {
  const out: string[] = [];
  out.push("before " + names.map((n) => `${n}=${show(c.v(n))}(${c.p.status(n)}${c.p.error(n) ? " " + c.p.error(n) : ""})`).join(" "));
  for (const [a, args] of acts) { const e = await c.act(a, ...args); out.push(`${a}(${args.map(show).join(",")}) -> ${e ?? "ok"}`); }
  if (pumps) await c.pump(pumps);
  out.push("after " + names.map((n) => `${n}=${show(c.v(n))}(${c.p.status(n)}${c.p.error(n) ? " " + c.p.error(n) : ""})`).join(" "));
  return [true, out.join(" | ")];
};
export const M: Record<string, any> = {
  B01: { cat: "probe", drive: obs(["list", "size"], [["load", []]]) },
  B02: { cat: "probe", drive: obs(["xs", "smallest", "first"]) },
  B03: { cat: "probe", drive: obs(["before", "after"]) },
  B04: { cat: "probe", drive: obs(["winner"]) },
  B05: { cat: "probe", drive: obs(["clamp", "seen"]) },
  B06: { cat: "probe", drive: obs(["total"], [], 6) },
  B07: { cat: "probe", drive: obs(["a", "b"]) },
  B08: { cat: "probe", drive: obs(["scores", "n"], [["score", ["ann"]], ["score", ["ann"]], ["score", ["bob"]]]) },
  B09: { cat: "probe", drive: obs(["count", "auto"]) },
  B10: { cat: "probe", drive: obs(["name"], [["load", []]], 2) },
  B11: { cat: "probe", drive: obs(["read5"]) },
  B12: { cat: "probe", drive: obs(["xs", "len"], [["push", [1]], ["push", [2]]]) },
  B13: { cat: "probe", drive: obs(["v"], [["later", []]], 2) },
  B14: { cat: "probe", drive: obs(["label"]) },
  B15: { cat: "probe", drive: obs(["got"], [], 6) },
};
M["B04b"] = { cat: "probe", drive: obs(["last"], [], 6) };
