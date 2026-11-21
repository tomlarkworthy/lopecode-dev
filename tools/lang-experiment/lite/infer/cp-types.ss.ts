// The data of the completion port (lite/complete.ts and lite/facts.ts as cells, prefix cp): an option, the answer,
// the registry and the module check as the cells call them. Checked with the ix and md sections and those they take.

export type CpOption = { readonly label: string; readonly type: string; readonly detail?: string; readonly apply?: string };
export type CpMode = "member" | "name" | "param" | "type" | "jsx" | "none";
export type CpResult = { readonly from: number; readonly to: number; readonly options: CpOption[]; readonly mode: CpMode };
// lite/registry.ts as completion reads it; ifaceKeys: the property names of a declared interface, null when none is declared
export type CpReg = {
  readonly expand: (t: Ty) => Ty;
  readonly member: (t: Ty, k: string) => Prop | undefined;
  readonly callSigs: (t: Ty) => Fn[];
  readonly ifaceKeys: (n: string) => string[] | null;
};
export type CpFound = { readonly found: IxProbe; readonly reg: CpReg };
// the module checks a completion runs, and the value a cell in another language suggests; each is null where
// complete.ts catches a throw or finds no probe
export type CpHost = {
  readonly probe: (cells: string, member: boolean) => CpFound | null;
  readonly cellTypes: (cells: string) => [string, string][] | null;
  readonly annotate: (name: string) => string | null;
  readonly fresh: () => CpReg;
};
// the capabilities by name with their types, and the type names a cell may write
export type CpConst = { readonly caps: Map<string, string>; readonly typeNames: string[] };
export type CpOutside = { readonly name: string; readonly view?: boolean };
export type CpScan = { readonly quoted: boolean; readonly closers: string[] };
export type CpEdit = { readonly from: number; readonly to: number; readonly insert: string };
// facts.ts cellsOf: the cells' facts, or the parse error's message
export type CpCells = { readonly ok: true; readonly cells: MdInfo[] } | { readonly ok: false; readonly message: string };
