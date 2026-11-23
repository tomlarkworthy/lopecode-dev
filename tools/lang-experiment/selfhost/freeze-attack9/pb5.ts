export const srcs: [string, string][] = [
  ["cell-state", "const state = () => 1;\nconst a = (state: number) => state + 1;"],
  ["cell-memo", "const memo = () => 1;\nconst a = (memo: number) => memo + 1;"],
  ["cell-cast", "const cast = () => 1;\nconst a = (cast: number) => cast + 1;"],
  ["cell-cast-alone", "const cast = () => 1;"],
  ["cell-messageOf", "const messageOf = () => 1;"],
  ["cell-equals", "const equals = () => 1;"],
];
