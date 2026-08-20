// How big is each subtree? `?shallow=true` returns {key: true}, so this counts
// children without reading a single value -- which matters because `users` is
// personal data and this tool must never pull it.
import {load, token} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
const t = await token(sa, "https://www.googleapis.com/auth/firebase.database.readonly " +
                          "https://www.googleapis.com/auth/userinfo.email");
for (const p of ["assets/ships", "assets/relics", "assets/metadata/ships",
                 "ratings/ships", "matches", "users", "public/news", "matchmaker"]) {
  const r = await fetch(`https://corepox-staging.firebaseio.com/${p}.json?shallow=true&access_token=${t}`);
  const txt = await r.text();
  let n: any; try { n = Object.keys(JSON.parse(txt) ?? {}).length; } catch { n = "?"; }
  console.log(`  ${p.padEnd(22)} ${String(n).padStart(7)} children   (${(txt.length / 1024).toFixed(0)} KB shallow)`);
}
