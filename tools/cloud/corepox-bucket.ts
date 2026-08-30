// One bucket, fully paginated, newest last. Listing the whole project truncates at
// 1000 and the backups bucket alone has more than that, so the interesting buckets
// have to be asked for by name.
import {load, get} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
const bucket = process.argv[2];
const filter = process.argv[3] ? new RegExp(process.argv[3], "i") : null;
const tail = Number(process.argv[4] ?? 40);
let page: string | undefined, all: any[] = [];
do {
  const u = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?maxResults=1000` +
            (page ? `&pageToken=${page}` : "");
  const r: any = await get(sa, u);
  if (r.__error) { console.log(`${r.__error} ${r.__msg}`); process.exit(1); }
  all.push(...(r.items ?? [])); page = r.nextPageToken;
} while (page);
const hit = filter ? all.filter(i => filter.test(i.name)) : all;
hit.sort((a, b) => String(a.updated).localeCompare(String(b.updated)));
const tot = all.reduce((a, i) => a + Number(i.size || 0), 0);
console.log(`${bucket}: ${all.length} objects, ${(tot / 1e9).toFixed(2)} GB` +
            (filter ? `  |  ${hit.length} match /${filter.source}/` : ""));
for (const i of hit.slice(-tail))
  console.log(`  ${(Number(i.size) / 1e6).toFixed(2).padStart(9)} MB  ${i.updated?.slice(0, 10)}  ${i.name}`);
