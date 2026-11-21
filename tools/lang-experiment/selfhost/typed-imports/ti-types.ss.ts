// The data of a check of several modules (prefix ti): what one module imports, what it exports, and the
// program's result. Checked with the md, ix and ow sections and the sections they take.

// a value import, `import {imported as local} from "from"` in the module (an Observable import variable)
export type TiImport = { readonly local: string; readonly imported: string; readonly from: string; readonly view: boolean };
// one module of the program: its SoundScript source (`import type` statements included), its cells in other
// languages, and its value imports
export type TiModule = { readonly name: string; readonly cells: string; readonly outside: MdOutside[]; readonly imports: TiImport[] };
// a type declaration a module makes visible: where it is declared, and the type names its declaration names
export type TiTypeDecl = { readonly name: string; readonly origin: string; readonly refs: string[] };
// a checked export: its value type when the cell is accepted (null otherwise), how it is taken (by reference only
// when "value"), and what the importer's taint rules need: why it depends on state, and how it is fed a function
// from another language
export type TiExportKind = "value" | "handle" | "listener";
export type TiExport = {
  readonly name: string; readonly t: Ty | null; readonly kind: TiExportKind; readonly why: string;
  readonly stateful: string | null; readonly fnFed: string | null;
};
// an import given to the importer's check by reference: the exporter's type and taint, seeded as a cell's
// home: the module that declares the cell (the import may name it through a module that imports it)
export type TiSeed = { readonly local: string; readonly from: string; readonly imported: string; readonly home: string; readonly t: Ty | null; readonly stateful: string | null; readonly fnFed: string | null };
// an `import type` statement's names
export type TiTypeImport = { readonly local: string; readonly imported: string; readonly from: string; readonly at: AstNode };
// what one module's check is given beyond MdSources
export type TiSources = {
  readonly cells: string; readonly tsx: boolean; readonly foreign: string | null; readonly shell: string | null;
  readonly name: string | null; readonly outside: MdOutside[]; readonly probe: IxProbeAsk | null;
  readonly seeds: TiSeed[]; readonly types: TiTypeDecl[]; readonly extra: MdErr[];
};
// one module's check, with what it exports; ss: false when the module is another language (no export is offered)
export type TiModResult = {
  readonly name: string; readonly result: MdResult; readonly exports: TiExport[]; readonly types: TiTypeDecl[];
  readonly ss: boolean; readonly why: string | null;
};
// the program: each module's result in the order they were checked, and the import edges inside a cycle
export type TiProgram = { readonly order: string[]; readonly modules: Map<string, TiModResult>; readonly cyclic: string[] };
// what a module's check knows of the modules checked before it: their results, the type declarations each makes
// visible, and their sources
export type TiKnown = { readonly P: Map<string, TiModResult>; readonly vis: Map<string, Map<string, TiTypeDecl>>; readonly mods: Map<string, TiModule> };
export type TiHead = { readonly typeImports: TiTypeImport[]; readonly ownTypes: Set<string> };
// the glue: one module's check on a registry given the named declarations of the modules checked before it
export type TiGlue = { readonly checkOne: (S: TiSources) => TiModResult };
