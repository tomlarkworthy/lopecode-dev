import { readFileSync } from "node:fs";
const D = "/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/";
const { checkSources } = await import(D + "recfix/lite/core.ts");
const { Registry } = await import(D + "recfix/lite/registry.ts");
const tally = new Map<string, number>(); let c = 0;
const ex = Registry.prototype.expand; Registry.prototype.expand = function (t: any) { if (++c % 5000 === 0) { const st = (new Error().stack ?? "").split("\n").slice(2, 14).map((l) => l.trim().replace(/\(.*\/lite\//, "(").replace(/^at /, "")).join(" < "); tally.set(st, (tally.get(st) ?? 0) + 1); } return ex.call(this, t); };
const types = readFileSync(D + "ast-n.ss.ts", "utf8");
checkSources({ cells: types + `\nexport const t4 = () => (ids: AstNode[], a: AstNode): AstNode | undefined => ids.find((x) => x.start > a.start);`, tsx: false });
for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 4)) console.log(v, k.slice(0, 900), "\n");
