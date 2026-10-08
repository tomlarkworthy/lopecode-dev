// Is observability on for the cb4 Workers? Read-only.
import { api, account, save } from "./lib.ts";
const a = await account();
const scripts = (await api(`/accounts/${a}/workers/scripts`)).result.filter((s: any) => /^(cb4|brain-|cbx)/.test(s.id));
const out: any = {};
for (const s of scripts) {
  const r = await api(`/accounts/${a}/workers/scripts/${s.id}/script-settings`);
  out[s.id] = r.ok ? r.result : { error: r.status, errors: r.errors };
  console.log(s.id.padEnd(22), "observability", JSON.stringify(r.result?.observability ?? null), "logpush", r.result?.logpush, "tail", JSON.stringify(r.result?.tail_consumers ?? null));
}
save("settings", out);
