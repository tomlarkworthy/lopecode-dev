const _intro = function intro(md){return( md`# Orders` )};
const _orders = function orders(d3){
  const rand = d3.randomLcg(42);
  const pick = a => a[Math.floor(rand() * a.length)];
  const customers = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark", "Wayne", "Tyrell"];
  const products = ["Widget", "Gadget", "Doohickey", "Sprocket", "Gizmo"];
  const regions = ["North", "South", "East", "West", "Central"];
  const t0 = Date.UTC(2025, 0, 1);
  return Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    date: new Date(t0 + Math.floor(rand() * 365) * 864e5),
    customer: pick(customers),
    product: pick(products),
    region: regions[Math.floor(Math.pow(rand(), 1.5) * regions.length)],
    quantity: 1 + Math.floor(rand() * 20),
    unitPrice: Math.round((5 + rand() * 95) * 100) / 100
  }));
};
const _viewof_region = function viewof_region(Inputs, orders){return( Inputs.select(["All", ...new Set(orders.map(d => d.region))], { label: "Region" }) )};
const _region = function region(Generators, $0){return( Generators.input($0) )};
const _viewof_minTotal = function viewof_minTotal(Inputs){return( Inputs.range([0, 2000], { label: "Minimum total", step: 1, value: 0 }) )};
const _minTotal = function minTotal(Generators, $0){return( Generators.input($0) )};
// the filter-then-table shape of @tomlarkworthy/atlas: filteredMap = runtimeMap.filter(filter); Inputs.table(filteredMap)
const _filtered = function filtered(orders, region, minTotal){return( orders.filter(d => (region === "All" || d.region === region) && d.quantity * d.unitPrice >= minTotal) )};
const _count = function count(md, filtered){return( md`**${filtered.length}** matching orders` )};
const _table = function table(Inputs, filtered){return( Inputs.table(filtered, { format: { date: d => d.toISOString().slice(0, 10) } }) )};
const _totals = function totals(htl, filtered, d3){return( htl.html`<div>Totals: quantity ${d3.sum(filtered, d => d.quantity)}, revenue ${d3.sum(filtered, d => d.quantity * d.unitPrice).toFixed(2)}</div>` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_orders", "orders", ["d3"], _orders);
  $def("_viewof_region", "viewof region", ["Inputs", "orders"], _viewof_region);
  $def("_region", "region", ["Generators", "viewof region"], _region);
  $def("_viewof_minTotal", "viewof minTotal", ["Inputs"], _viewof_minTotal);
  $def("_minTotal", "minTotal", ["Generators", "viewof minTotal"], _minTotal);
  $def("_filtered", "filtered", ["orders", "region", "minTotal"], _filtered);
  $def("_count", "count", ["md", "filtered"], _count);
  $def("_table", "table", ["Inputs", "filtered"], _table);
  $def("_totals", "totals", ["htl", "filtered", "d3"], _totals);
  return main;
}
