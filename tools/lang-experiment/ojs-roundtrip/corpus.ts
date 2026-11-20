// One SoundScript module covering every compiled shape. [label, cell text]. Taken from
// lite/notebook/examples/*, lite/soundscript/tutorial-*.tsx and fixtures/accept-owner.
export const CORPUS: [string, string][] = [
  ["type alias", "type Line = { item: string; qty: number };"],
  ["interface", "interface Pt { x: number; y: number }"],
  ["plain value", "// A cell is an exported function.\nconst width = () => 640;"],
  ["plain value (function decl)", "function height(): number {\n  return 400;\n}"],
  ["with deps", "const area = (width: number, height: number) => width * height;"],
  ["function-valued", "const scale = () => (n: number, by: number): number => n * by;"],
  ["function-valued + dep", "const half = (area, scale) => scale(area, 0.5);"],
  ["state", "function count(): StateCell<number> {\n  return state(0);\n}"],
  ["state (arrow)", "const saved = (): StateCell<number> => state(0);"],
  ["action", "const increment = (count: State<number>) => action(() => count.update((c) => c + 1));"],
  ["action read", "const save = (count: State<number>, saved: State<number>) => action(() => saved.set(read(count)));"],
  ["async source", "const measure = () => (w: string): Promise<number> => Promise.resolve(w.length);"],
  ["action storing an answer", "const measureCount = (count: State<number>) => action((n: number) => count.set(n));"],
  ["generator/events", "const ticks = function* () {\n  yield 1;\n  yield 2;\n};"],
  ["action(n)", "const tick = (count: State<number>) => action((n: number) => count.update((c) => c + n));"],
  ["listener", "const onTick = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);"],
  ["owner generator", "let frames = function* () {\n  const buf = mut(new Float32Array(3));\n  for (let k = 1; k <= 3; k++) {\n    for (let i = 0; i < buf.length; i++) buf[i] = k * (i + 1);\n    yield borrow(buf);\n  }\n};"],
  ["owner reader", "let kept = (frames) => snapshot(frames);"],
  ["cap now", "const stamped = (count: number, now: Clock) => count + now() * 0;"],
  ["cap random", "const jittered = (random: Random) => Math.floor(random() * 0);"],
  ["cap log", "const logged = (count: number, log: Log) => {\n  log(\"count\", count);\n  return count;\n};"],
  ["cap fetch", "const getter = (fetch: Fetch) => (url: string) => fetch(url).then((r) => r.status);"],
  ["cap invalidation", "const inv = (count: number, invalidation: Promise<void>) => count + 1;"],
  ["JSX view", "const app = (count: number, saved: number, increment: Action<[]>, save: Action<[]>) => (\n  <div>\n    <button onClick={increment}>add one</button> <output>{count}</output>{\" \"}\n    <button onClick={save}>save</button> <span>saved {saved}</span>\n  </div>\n);"],
  ["rejected", "const bad = () => Math.random();"],
  ["rejected state", "const badState = (): StateCell<number> => state(\"no\" as any as number) + 1;"],
  ["duplicate", "const width = () => 641;"],
  ["test", "const test_area = (area: number) => {\n  if (area !== 256000) throw new Error(`area is ${area}`);\n  return \"ok\";\n};"],
  ["boundary typed", "const shopTotal = (shop_basket: Line[], shop_price: number) => shop_basket.reduce((n, l) => n + l.qty, 0) * shop_price;"],
  ["boundary State<viewof>", "const cheaper = (shop_price: State<number>) => action(() => shop_price.update((p) => p - 0.5));"],
];
// Observable JavaScript cells the corpus reads across the boundary
export const OUTSIDE = [{ name: "shop_basket", view: false }, { name: "shop_price", view: true }];
// cells that probe the OJS parser's rules on embedded user text, and the remaining compiled shapes
export const EXTRA: [string, string][] = [
  ["undefined state", "const maybe = (): StateCell<number | undefined> => state(undefined);"],
  ["undefined reader", "const maybeShown = (maybe: number | undefined) => (maybe === undefined ? \"none\" : \"some\");"],
  ["local named mutable", "const mloc = () => {\n  const mutable = 1;\n  return mutable;\n};"],
  ["local named viewof", "const vloc = () => {\n  const viewof = 2;\n  return viewof;\n};"],
  ["user $0, viewof input", "const dollar = (count: State<number>) => action(() => {\n  const $0 = 1;\n  count.set($0);\n});"],
  ["JSX after return", "const v2 = (count: number) => {\n  return <div>\n    <span>{count}</span>\n  </div>;\n};"],
  ["compile refs", "const onMain = (compile: Compile) => compile({ inputs: [], refs: [\"width\", \"height\"], outputs: [\"area\"] });"],
];
