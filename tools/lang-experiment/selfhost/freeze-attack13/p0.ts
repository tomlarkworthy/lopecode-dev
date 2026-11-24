export const srcs: [string, string][] = [
 ["ev", `const count = () => state(0);\nconst bump = (count: State<number>) => action((n: number) => count.update((c) => c + n));\nconst ticks = function* () {\n  yield 1;\n};\nconst on1 = (ticks: Events<number>, bump: Action<[number]>) => on(ticks, bump);\nconst slow = async () => { await null; await null; return 1; };`],
 ["catch", `const g = async () => { const r = await Promise.reject(new Error("x")).catch((e) => 2); return r; };`],
];
