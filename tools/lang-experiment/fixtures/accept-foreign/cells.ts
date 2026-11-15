type Size = { readonly w: number; readonly h: number };

// Decoder: a checked function from Js that narrows and builds a new value.
let decodeSize = () => (x: Js): Size => {
  if (typeof x !== "object" || x === null) throw new Error("not an object");
  if (!("w" in x) || typeof x.w !== "number") throw new Error("w");
  if (!("h" in x) || typeof x.h !== "number") throw new Error("h");
  return { w: x.w, h: x.h };
};
let size = (raw, decodeSize) => decodeSize(raw);
let ratio = async (size, clamp01) => clamp01(size.h / size.w);
let test_size = (size) => {
  if (!equals(size, { w: 3, h: 1.5 })) throw new Error("size");
  return "ok";
};
let test_ratio = (ratio) => {
  if (ratio !== 0.5) throw new Error(`ratio ${ratio}`);
  return ratio;
};
