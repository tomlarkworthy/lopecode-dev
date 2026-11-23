import { C, D, Dbase, driveD, G, Gbase, driveG } from "./lib.ts";
export const cands = [
  C("t0-D-arrow", D("const F = () => c.length;"), { drive: driveD, base: Dbase("const F = () => c.length;") }),
  C("t0-G-arrow", G("const F = () => c.length;"), { drive: driveG, base: Gbase("const F = () => c.length;") }),
];
