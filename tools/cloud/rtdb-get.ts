import {load, token} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
const t = await token(sa, "https://www.googleapis.com/auth/firebase.database.readonly " +
                          "https://www.googleapis.com/auth/userinfo.email");
const path = process.argv[2], lim = Number(process.argv[3] ?? 3000);
const r = await fetch(`https://corepox-staging.firebaseio.com/${path}.json?access_token=${t}`);
const txt = await r.text();
console.log(`${path}  ${r.status}  ${(txt.length / 1024).toFixed(1)} KB`);
console.log(txt.slice(0, lim));
if (process.argv[4]) await Bun.write(process.argv[4], txt);
