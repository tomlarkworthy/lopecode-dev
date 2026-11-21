// must type-check: the member tagged "frame" | "next" is the parameter of both performers, with its epoch
import type { Performers } from "../runner.ts";
import type { Effect, DeliveryEvent } from "../../../lite/runtime-ss.ts";
const t: Performers<Effect, DeliveryEvent> = {
  frame: (e) => ({ t: "pull", hid: e.hid, epoch: e.epoch }), next: (e) => ({ t: "pull", hid: e.hid, epoch: e.epoch }),
  return: () => {}, make: () => {}, forgetHandle: () => {}, call: (e) => void e.lid, place: () => {}, fail: () => {},
  then: (e) => e.ev, forgetListener: () => {},
};
export default t;
