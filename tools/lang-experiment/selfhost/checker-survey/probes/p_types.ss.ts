// uses: ast, astlib, types
// The five sampled types other than Context, as in p_small.ss.ts, used without Context.
export type Variable = { name: string; inputs: string[]; definition: string };
export type Completion = { label: string; type: string; detail?: string; apply?: string };
export type Completions = { from: number; to: number; options: Completion[]; mode: "member" | "name" | "param" | "type" | "jsx" | "none" };
export type Origin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
export type Outside = { name: string; view?: boolean };
export type Rule = { node: Node; rule: string; msg: string };
export const useTypes5 = () => (v: Variable, c: Completions, o: Origin, x: Outside, r: Rule): string => v.name + c.mode + o + x.name + r.rule;
