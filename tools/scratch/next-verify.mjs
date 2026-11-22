import { fetchNextNotebook, loadNextCookies } from "../observable-next.js";
const nb = await fetchNextNotebook("cbd790eb6be703ee", loadNextCookies("tools/.observable-next-cookies.json"));
const nodes = nb.nodes || [];
console.log("version", nb.version, "nodes", nodes.length, "xrpc has fix", nodes.filter((n) => /adoptStored/.test(n.value)).map((n) => n.id));
