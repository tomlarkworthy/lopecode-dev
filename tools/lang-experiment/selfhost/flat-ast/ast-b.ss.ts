// Layout B: one generic row for every node type (adapter.ts flattenB). Children in kids, the field of each in keys (a
// list field gives one entry per element, a hole is null); every other field in props, a record-valued field spread
// as key.subkey. Rows are in pre-order: the subtree of node i is the rows i .. after-1.
export type Prop = { key: string; value: string | number | boolean | null };
export type Row = { type: string; start: number; end: number; line: number; parent: number; field: string; after: number; kids: (number | null)[]; keys: string[]; props: Prop[] };
export type Comment = { block: boolean; text: string; start: number; end: number; line: number };
export type FlatAstB = { nodes: Row[]; comments: Comment[]; src: string; lineStarts: number[] };
export type ParseB = { ok: true; ast: FlatAstB } | { ok: false; message: string; pos: number; line: number; column: number };
