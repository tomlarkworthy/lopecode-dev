// What JSX in a checked cell must refuse. ok* cells must pass.
let n = (): StateCell<number> => state(0);
let inc = (n: State<number>) => action(() => n.update((x) => x + 1));
let setN = (n: State<number>) => action((v: number) => n.set(v));
let Badge = () => (p: { readonly text: string }): Elem => <span>{p.text}</span>;
let NotElem = () => (p: { readonly text: string }) => p.text.length;
let bad_attr_type = () => <canvas width="640" />;
let bad_unknown_attr = (inc) => <button onClik={inc}>+</button>;
let bad_unknown_element = () => <blink>x</blink>;
let bad_handler_not_action = () => <button onClick={() => 1}>+</button>;
let bad_handler_wrong_args = (setN) => <input type="range" onInput={setN} />;
let bad_component_props = (Badge) => <Badge text={3} />;
let bad_component_missing_prop = (Badge) => <Badge />;
let bad_component_not_elem = (NotElem) => <NotElem text="a" />;
let bad_mut_in_jsx = () => {
  const xs = mut([1, 2]);
  return <div>{xs}</div>;
};
let bad_free_component = () => <Missing />;
let bad_child_object = () => <div>{{ a: 1 }}</div>;
let ok_all = (n, inc, setN, Badge) => (
  <div class="c">
    <Badge text={`n is ${n}`} />
    <button onClick={inc}>+</button>
    <input type="range" min={0} max={10} value={n} onInput={action((s: string) => setN(Number(s)))} />
    {n > 3 ? <strong>big</strong> : null}
    {[1, 2].map((i) => <span key={i}>{i}</span>)}
    <>
      <span>fragment</span>
    </>
  </div>
);
