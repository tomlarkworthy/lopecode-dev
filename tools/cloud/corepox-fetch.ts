// Download one object. Read-only scope; the SA cannot write with this token.
import {load, token} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
const [bucket, name, out] = process.argv.slice(2);
const t = await token(sa, "https://www.googleapis.com/auth/devstorage.read_only");
const r = await fetch(
  `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`,
  {headers: {authorization: "Bearer " + t}});
if (!r.ok) { console.log(`${r.status} ${(await r.text()).slice(0, 300)}`); process.exit(1); }
await Bun.write(out, r);
console.log(`${out}  ${(Bun.file(out).size / 1e6).toFixed(1)} MB`);
