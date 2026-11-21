// must fail: no performer for reject
import type { Performers } from "../runner.ts";
import type { PoolEffect, PoolEvent } from "../../../lite/runtime-ss.ts";
const t: Performers<PoolEffect, PoolEvent> = { post: () => {}, resolve: () => {} };
export default t;
