import {load, token} from "./gcp.ts";
const sa = await load("vendor/corepox/firebase/accounts/compute-admin.json");
console.log(await token(sa, "https://www.googleapis.com/auth/devstorage.read_only"));
