// What is in the corepox cloud projects, and is any of it newer than the 1.49 APK?
import {load, get} from "./gcp.ts";
const ACC = "vendor/corepox/firebase/accounts";
const KEYS = [`${ACC}/corepox-dev-firebase-adminsdk-sv6at-e92c912bec.json`,
              `${ACC}/compute-admin.json`,
              `${ACC}/matchmaker-worker.json`];

for (const f of KEYS) {
  const sa = await load(f);
  console.log(`\n================ ${sa.project_id}  (${sa.client_email.split("@")[0]})`);
  const P = sa.project_id;

  const buckets = await get(sa, `https://storage.googleapis.com/storage/v1/b?project=${P}`);
  if (buckets.__error) console.log(`  buckets: ${buckets.__error} ${buckets.__msg}`);
  else {
    const names = (buckets.items ?? []).map((b: any) => b.name);
    console.log(`  buckets (${names.length}): ${names.join(", ") || "none"}`);
    for (const b of names) {
      const o = await get(sa, `https://storage.googleapis.com/storage/v1/b/${b}/o?maxResults=1000`);
      if (o.__error) { console.log(`    ${b}: ${o.__error} ${o.__msg}`); continue; }
      const items = o.items ?? [];
      const tot = items.reduce((a: number, i: any) => a + Number(i.size || 0), 0);
      console.log(`    ${b}: ${items.length} objects, ${(tot / 1e6).toFixed(1)} MB` +
                  (o.nextPageToken ? " (truncated)" : ""));
      for (const i of items.slice(0, 40))
        console.log(`       ${(Number(i.size) / 1e3).toFixed(0).padStart(9)} kB  ${i.updated?.slice(0, 10)}  ${i.name}`);
      if (items.length > 40) console.log(`       ... ${items.length - 40} more`);
    }
  }

  const cols = await get(sa,
    `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents:listCollectionIds`);
  console.log(`  firestore: ${cols.__error ? cols.__error + " " + cols.__msg
                            : JSON.stringify(cols.collectionIds ?? [])}`);

  for (const host of [`https://${P}.firebaseio.com/.json?shallow=true`,
                      `https://${P}-default-rtdb.firebaseio.com/.json?shallow=true`]) {
    const r = await get(sa, host, "https://www.googleapis.com/auth/firebase.database.readonly " +
                                 "https://www.googleapis.com/auth/userinfo.email");
    if (!r.__error) console.log(`  rtdb ${host.split("/")[2]}: ${JSON.stringify(r).slice(0, 300)}`);
  }
}
