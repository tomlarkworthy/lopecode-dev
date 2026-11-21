// must fail: a performer for an effect step never returns
import type { Performers } from "../runner.ts";
import type { PoolEffect, PoolEvent } from "../../../lite/runtime-ss.ts";
const t: Performers<PoolEffect, PoolEvent> = { post: () => {}, resolve: () => {}, reject: () => {}, retry: () => {} };
export default t;
