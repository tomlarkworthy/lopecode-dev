// must fail: a frame effect has no lid
import type { Performers } from "../runner.ts";
import type { Effect, DeliveryEvent } from "../../../lite/runtime-ss.ts";
const t: Performers<Effect, DeliveryEvent> = {
  frame: (e) => void e.lid, next: () => {}, return: () => {}, make: () => {}, forgetHandle: () => {}, call: () => {},
  place: () => {}, fail: () => {}, then: (e) => e.ev, forgetListener: () => {},
};
export default t;
