import { parseVariableGroups } from "../lope-push-ws.js";
import * as acorn from "acorn";
const [mod, name] = process.argv.slice(2);
const src = await (await fetch(`https://api.observablehq.com/${mod}.js?v=4`)).text();
for (const g of parseVariableGroups(src, acorn).groups ?? [])
  for (const v of g ?? []) if (v?._name === name) { console.log(JSON.stringify(v._inputs)); console.log(v._definition); }
