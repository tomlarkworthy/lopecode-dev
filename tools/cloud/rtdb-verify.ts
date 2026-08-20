// Is the local extract the same as what the live database serves? The counts
// matching is not enough -- it says nothing about the contents of a design.
import {load, token} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
const t = await token(sa, "https://www.googleapis.com/auth/firebase.database.readonly " +
                          "https://www.googleapis.com/auth/userinfo.email");
const a: any = await Bun.file("vendor/corepox_cloud/assets.json").json();
const r: any = await Bun.file("vendor/corepox_cloud/ratings.json").json();
const ids = Object.keys(a.ships);
// a deterministic spread, not the first N: the head of a key-ordered dump is not
// representative of designs added years later
const pick = [0, 1, 7, 137, 499, 1000, 1500, 2000, ids.length - 2, ids.length - 1].map(i => ids[i]);
let ok = 0, bad: string[] = [];
for (const id of pick) {
  const q = await fetch(`https://corepox-staging.firebaseio.com/assets/ships/${id}.json?access_token=${t}`);
  const live = await q.text();
  const same = JSON.stringify(JSON.parse(live), Object.keys(JSON.parse(live)).sort()) ===
               JSON.stringify(a.ships[id], Object.keys(a.ships[id]).sort());
  if (same) ok++; else bad.push(id);
  console.log(`  ${id.padEnd(34)} ${same ? "same" : "DIFFERS"}  ${(a.ships[id].components ?? []).length} parts` +
              `  rating ${JSON.stringify(r.ships[id] ?? null).slice(0, 60)}`);
}
console.log(`\n${ok}/${pick.length} sampled designs identical to live` + (bad.length ? `  DIFFER: ${bad}` : ""));
