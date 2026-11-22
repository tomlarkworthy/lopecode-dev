// compile = erase types into /*ss:...*/ comments (still runnable JS), decompile = unwrap them. The work is the cells
// of the section "The toolchain over typed trees" (tc-cuts.ss.ts, tc-text.ss.ts), through ss-toolchain.ts, which
// remembers langOf per text.
import { TOOLCHAIN } from "./ss-toolchain.ts";
export { LANG, langOf } from "./ss-toolchain.ts";

export const esc = (s: string): string => TOOLCHAIN.esc(s);
export const unesc = (s: string): string => TOOLCHAIN.unesc(s);
export const commentTypes = (src: string): string => TOOLCHAIN.commentTypes(src);
export const uncommentTypes = (js: string): string => TOOLCHAIN.uncommentTypes(js);
export const compile = (src: string): string => TOOLCHAIN.compile(src);
export const decompile = (js: string): string => TOOLCHAIN.decompile(js);
