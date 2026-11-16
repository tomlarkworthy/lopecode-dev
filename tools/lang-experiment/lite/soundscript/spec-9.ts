type S9Size = { readonly w: number; readonly h: number };

const s9_decodeSize = () => (x: unknown): S9Size => {
  if (typeof x !== "object" || x === null) throw new Error("not an object");
  if (!("w" in x) || typeof x.w !== "number") throw new Error("w");
  if (!("h" in x) || typeof x.h !== "number") throw new Error("h");
  return { w: x.w, h: x.h };
};

const s9_size = (s9_raw: unknown, s9_decodeSize: (x: unknown) => S9Size) => s9_decodeSize(s9_raw);
