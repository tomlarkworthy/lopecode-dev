const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const body = (b: string) => `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; ${b} }) });`;
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
export const srcs: [string, string][] = [
  ["ls-only", ST + body(`${SP} ls(f()); xs.push(1);`)],
  ["set-before", ST + body(`const st = s.set; ${SP} st(f); ls(f()); xs.push(1);`)],
  ["update-before", ST + body(`const up = s.update; ${SP} up(() => f); ls(f()); xs.push(1);`)],
  ["destr-set", ST + body(`${SP} const { set } = s; set(f); ls(f()); xs.push(1);`)],
  ["computed-set", ST + body(`${SP} s['set'](f); ls(f()); xs.push(1);`)],
  ["set-arr-before", ST + body(`const sts = [s.set]; ${SP} sts[0]?.(f); ls(f()); xs.push(1);`)],
  ["set-rec-before", ST + body(`const o = { st: s.set }; ${SP} o.st(f); ls(f()); xs.push(1);`)],
  ["set-ternary-before", ST + body(`const st = true ? s.set : s.set; ${SP} st(f); ls(f()); xs.push(1);`)],
  ["set-direct-ctl", ST + body(`${SP} s.set(f); ls(f()); xs.push(1);`)],
];
