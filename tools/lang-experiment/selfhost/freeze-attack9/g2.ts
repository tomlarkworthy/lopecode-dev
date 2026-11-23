// target 4: prelude names as cell names (accepted by the checker; each run alone since a compile crash may leave state)
const errDrive = async (p: any) => { await p.settle(300); const bad = [...p.recs.values()].filter((r: any) => r.status === "rejected"); return bad.length ? `DIFF accepted cell in error: ${bad.map((r: any) => `${r.name}: ${String(r.error?.message ?? r.error).slice(0, 80)}`).join("; ")}` : "same: no cell in error"; };
export const cands = [
  { name: "cell-cast", src: "const cast = () => 1;\nconst a = (cast: number) => cast + 1;", drive: errDrive, show: ["a"] },
  { name: "cell-cast-with-user", src: "const cast = () => 1;\nconst v = () => 5;\nconst a = (v: number) => { const r = cast<string>(v); return r.ok ? typeof r.value : \"refused\"; };", drive: errDrive, show: ["a"] },
  { name: "cell-state", src: "const state = () => 1;\nconst a = (state: number) => state + 1;", drive: errDrive, show: ["a"] },
  { name: "cell-h-esc", src: "const \\u0068 = () => 1;\nconst a = () => <div />;", drive: errDrive },
];
