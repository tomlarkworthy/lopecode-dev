#!/bin/zsh
# M2 run-time: rebuild treeconv/ (shipped SoundScript sections with the conversions of mode $1's rules), then run the
# converted checker (main rules, boundary freeze off) over the 10 attack sets and compare its verdicts with tree/ main.
cd "$(dirname "$0")"
RULES=${1:-"SS_H=1 SS_V=1 SS_R3X=1 SS_U=1 SS_F=1 SS_T=1 SS_N=1"}
rm -rf treeconv && cp -R tree treeconv
python3 - <<'PY'
p='treeconv/lite/core.ts'; s=open(p).read(); s=s.replace('import "./proto-flags.ts";','import "./proto-flags.ts";\nimport "./freeze.ts";',1); open(p,'w').write(s)
p='treeconv/lite/freeze.ts'; s=open(p).read()
s=s.replace('export function ss_f<T>(v: T): T {','const FROZE_AT = new WeakMap<object, string>();\nexport function ss_f<T>(v: T, label?: string): T {',1)
s=s.replace('FROZEN.add(o); Object.freeze(o); SSF.add(o); }','FROZEN.add(o); Object.freeze(o); SSF.add(o); if (label) FROZE_AT.set(o, label); }',1)
s=s.replace('throw new TypeError(`${op} on a frozen ${what}: a value cannot change after its cell returns`); };','throw new TypeError(`${op} on a frozen ${what}: a value cannot change after its cell returns [frozen at ${FROZE_AT.get(o) ?? "?"}]`); };',1)
s=s.replace('(globalThis as any).__ssF = ss_f;','(globalThis as any).__ssF = ss_f;\n(globalThis as any).ss_f = ss_f;',1)
open(p,'w').write(s)
PY
env SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=1 SS_HYP=1 ${=RULES} bun m2-conv.ts > out/m2-conv-build.txt 2>&1
python3 - <<'PY'
p='treeconv/lite/infer/md-run.ss.ts'; s=open(p).read()
a='''    const msg = messageOf(e);'''
s=s.replace(a, a+'''\n    { const G = globalThis as any; const k = msg.slice(0, 200); (G.__ssCrash ??= new Map()).set(k, (G.__ssCrash.get(k) ?? 0) + 1); }''',1); open(p,'w').write(s)
p='treeconv/lite/infer/attack/run-sets.ts'; s=open(p).read()
s=s.replace('  console.log(`-- all: ${n} programs, silent ${s}`);','  console.log(`-- all: ${n} programs, silent ${s}`);\n  for (const [k, v] of [...((globalThis as any).__ssCrash ?? new Map())].sort((a: any, b: any) => b[1] - a[1])) console.log(`CRASH ${v} ${k}`);',1); open(p,'w').write(s)
PY
env SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=0 SS_HYP=0 bun treeconv/lite/infer/attack/run-sets.ts > out/m2rt.txt 2>&1
tail -1 out/m2-conv-build.txt
echo "verdicts changed vs main: $(diff <(grep '^==' out/main-m1.txt | sed 's/ (dropped.*//') <(grep '^==' out/m2rt.txt | sed 's/ (dropped.*//') | grep -c '^>') of $(grep -c '^==' out/m2rt.txt)"
grep "^CRASH" out/m2rt.txt
