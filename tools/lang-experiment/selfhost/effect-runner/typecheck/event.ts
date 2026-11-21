// must fail: a follow-up that is not a PoolEvent
import type { Performers } from "../runner.ts";
import type { PoolEffect, PoolEvent } from "../../../lite/runtime-ss.ts";
const t: Performers<PoolEffect, PoolEvent> = { post: (e) => ({ t: "postedd", slot: e.slot, id: e.id, resend: false, dead: [] }), resolve: () => {}, reject: () => {} };
export default t;
