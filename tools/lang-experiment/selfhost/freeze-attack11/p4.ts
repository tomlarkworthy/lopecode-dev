export const srcs: [string, string][] = [
 ["z1", `const z = () => { const u: unknown = JSON.parse("[1]"); const v = cast<readonly number[]>(u); return v.ok ? v.value.length : 0; };`],
 ["this", `const this = () => 5;\nconst g = () => 6;`],
];
