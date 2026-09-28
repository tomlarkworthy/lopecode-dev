const _intro = function intro(md){return( md`# Recipe book

Recipes are kept in the \`recipes\` cell's source by \`sticky\`, so saving the notebook saves them.` )};

const _recipeStore = function recipeStore(htl){return(
function recipeStore() {
  let recipes = [];
  const title = htl.html`<input type=text placeholder="Title">`;
  const servings = htl.html`<input type=number min=1 value=2 placeholder="Servings">`;
  const ingredients = htl.html`<textarea rows=4 placeholder="Ingredients, one per line: quantity unit name"></textarea>`;
  const steps = htl.html`<textarea rows=4 placeholder="Steps, one per line"></textarea>`;
  const add = htl.html`<button>Add recipe</button>`;
  const count = htl.html`<span></span>`;
  const el = htl.html`<div>
    <label>Title ${title}</label> <label>Servings ${servings}</label><br>
    <label>Ingredients ${ingredients}</label> <label>Steps ${steps}</label><br>
    ${add} ${count}</div>`;
  const render = () => { count.textContent = recipes.length + " recipes"; };
  const parseLine = (line) => {
    const [q, unit, ...rest] = line.trim().split(/\s+/);
    return { qty: Number(q), unit, name: rest.join(" ") };
  };
  add.onclick = () => {
    const t = title.value.trim();
    if (!t) return;
    recipes = [...recipes, {
      title: t,
      servings: Number(servings.value) || 1,
      ingredients: ingredients.value.split("\n").filter(l => l.trim()).map(parseLine),
      steps: steps.value.split("\n").filter(l => l.trim())
    }];
    title.value = ingredients.value = steps.value = "";
    render();
    el.dispatchEvent(new Event("input", {bubbles: true}));
  };
  Object.defineProperty(el, "value", { get: () => recipes, set: v => { recipes = Array.isArray(v) ? v : []; render(); } });
  render();
  return el;
}
)};

const _viewof_recipes = function viewof_recipes(sticky, recipeStore){return( sticky(recipeStore(), [{"title":"Pancakes","servings":4,"ingredients":[{"qty":200,"unit":"g","name":"flour"},{"qty":2,"unit":"pcs","name":"egg"},{"qty":300,"unit":"ml","name":"milk"}],"steps":["Whisk everything.","Fry in a hot pan."]},{"title":"Omelette","servings":1,"ingredients":[{"qty":3,"unit":"pcs","name":"egg"},{"qty":20,"unit":"ml","name":"milk"}],"steps":["Beat the eggs with the milk.","Cook gently."]}]) )};

const _viewof_query = function viewof_query(Inputs){return( Inputs.text({label: "Search", placeholder: "title or ingredient"}) )};

const _matches = function matches(recipes, query){return(
recipes.filter(r => {
  const q = query.trim().toLowerCase();
  return !q || r.title.toLowerCase().includes(q) || r.ingredients.some(i => i.name.toLowerCase().includes(q));
})
)};

const _viewof_picked = function viewof_picked(Inputs, matches){return( Inputs.select(matches, {label: "Recipe", format: r => r.title}) )};

const _viewof_scaleTo = function viewof_scaleTo(Inputs, picked){return( Inputs.number({label: "Scale to servings", value: picked ? picked.servings : 1, min: 1}) )};

const _scaled = function scaled(htl, picked, scaleTo){return(
!picked ? htl.html`<p>No recipe matches.</p>` : htl.html`<div>
  <h3>${picked.title} (${scaleTo} servings)</h3>
  <ul>${picked.ingredients.map(i => htl.html`<li>${+(i.qty * scaleTo / picked.servings).toFixed(2)} ${i.unit} ${i.name}</li>`)}</ul>
  <ol>${picked.steps.map(s => htl.html`<li>${s}</li>`)}</ol></div>`
)};

const _viewof_ticked = function viewof_ticked(Inputs, recipes){return( Inputs.checkbox(recipes, {label: "Shopping for", format: r => r.title}) )};

const _shopping = function shopping(htl, ticked){return(
(() => {
  const sum = new Map();
  for (const r of ticked) for (const i of r.ingredients) {
    const k = i.name.toLowerCase() + "|" + i.unit;
    sum.set(k, { ...i, qty: (sum.get(k)?.qty || 0) + i.qty });
  }
  return htl.html`<div><h3>Shopping list</h3><ul>${[...sum.values()].map(i => htl.html`<li>${+i.qty.toFixed(2)} ${i.unit} ${i.name}</li>`)}</ul></div>`;
})()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_recipeStore", "recipeStore", ["htl"], _recipeStore);
  $def("_viewof_recipes", "viewof recipes", ["sticky", "recipeStore"], _viewof_recipes);
  $def("_recipes", "recipes", ["Generators", "viewof recipes"], (G, v) => G.input(v));
  $def("_viewof_query", "viewof query", ["Inputs"], _viewof_query);
  $def("_query", "query", ["Generators", "viewof query"], (G, v) => G.input(v));
  $def("_matches", "matches", ["recipes", "query"], _matches);
  $def("_viewof_picked", "viewof picked", ["Inputs", "matches"], _viewof_picked);
  $def("_picked", "picked", ["Generators", "viewof picked"], (G, v) => G.input(v));
  $def("_viewof_scaleTo", "viewof scaleTo", ["Inputs", "picked"], _viewof_scaleTo);
  $def("_scaleTo", "scaleTo", ["Generators", "viewof scaleTo"], (G, v) => G.input(v));
  $def("_scaled", "scaled", ["htl", "picked", "scaleTo"], _scaled);
  $def("_viewof_ticked", "viewof ticked", ["Inputs", "recipes"], _viewof_ticked);
  $def("_ticked", "ticked", ["Generators", "viewof ticked"], (G, v) => G.input(v));
  $def("_shopping", "shopping", ["htl", "ticked"], _shopping);
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
