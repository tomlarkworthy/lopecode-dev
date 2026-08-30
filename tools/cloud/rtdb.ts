// Is the live database still up, and what is at the top of it? Shallow only --
// `?shallow=true` returns keys with `true` for values, so this reads structure
// without pulling 119 MB or any player's data.
import {load, token} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
const t = await token(sa, "https://www.googleapis.com/auth/firebase.database.readonly " +
                          "https://www.googleapis.com/auth/userinfo.email");
const path = process.argv[2] ?? "";
for (const host of ["corepox-staging.firebaseio.com", "corepox-staging-default-rtdb.firebaseio.com"]) {
  const r = await fetch(`https://${host}/${path}.json?shallow=true&access_token=${t}`);
  const txt = (await r.text()).slice(0, 1500);
  console.log(`${host}/${path}  ->  ${r.status}  ${txt}`);
}
