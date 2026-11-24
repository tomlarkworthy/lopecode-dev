export const srcs: [string, string][] = [
  ["local-read-function", "const a = () => { const read = (x: number) => x + 1; return read(1); };"],
  ["local-state-number", "const a = () => { const state = 2; return state * 2; };"],
  ["local-memo", "const a = () => { const memo = 3; return memo; };"],
  ["local-equals", "const a = () => { const equals = 3; return equals; };"],
  ["local-snapshot", "const a = () => { const snapshot = 3; return snapshot; };"],
  ["param-event-state", "const a = () => (state: number, event: string) => state + event.length;"],
  ["local-action-in-state-cell-module", "const n = (): StateCell<number> => state(0);\nconst a = (n: State<number>) => { const action = 1; return action; };"],
  ["local-mut", "const a = () => { const mut = 3; return mut; };"],
];
