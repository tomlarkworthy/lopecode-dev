import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "accept-messageOf-caught-error", src: `const m = () => { try { JSON.parse("{"); return "parsed"; } catch (e) { const s: string = messageOf(e); return s; } };`, show: ["m"] },
  { name: "accept-messageOf-thrown-error", src: `const m = () => { try { throw new RangeError("boom"); } catch (e) { return messageOf(e); } };`, show: ["m"] },
  { name: "accept-messageOf-thrown-string", src: `const m = () => { try { throw "plain"; } catch (e) { return messageOf(e); } };`, show: ["m"] },
  { name: "accept-messageOf-number", src: `const m = () => messageOf(42);`, show: ["m"] },
  { name: "accept-messageOf-record-with-message", src: `const m = () => messageOf({ message: "rec" });`, show: ["m"] },
  { name: "accept-messageOf-undefined", src: `const m = () => messageOf(undefined);`, show: ["m"] },
  { name: "reject-e-message-on-unknown", src: `const m = () => { try { throw new Error("x"); } catch (e) { return e.message; } };` },
  { name: "reject-messageOf-as-value", src: `const m = () => [1].map(messageOf);` },
];
export const srcs = toSrcs(cands);
