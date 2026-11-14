// What JSX in a checked cell must refuse. ok* cells must pass.
export let n = (): RefCell<number> => ref(0);
export let inc = (n: Ref<number>) => action(() => n.update((x) => x + 1));
export let setN = (n: Ref<number>) => action((v: number) => n.set(v));
export let Badge = () => (p: { readonly text: string }): Elem => <span>{p.text}</span>;
export let NotElem = () => (p: { readonly text: string }) => p.text.length;
export let bad_attr_type = () => <canvas width="640" />;
export let bad_unknown_attr = (inc) => <button onClik={inc}>+</button>;
export let bad_unknown_element = () => <blink>x</blink>;
export let bad_handler_not_action = () => <button onClick={() => 1}>+</button>;
export let bad_handler_wrong_args = (setN) => <input type="range" onInput={setN} />;
export let bad_component_props = (Badge) => <Badge text={3} />;
export let bad_component_missing_prop = (Badge) => <Badge />;
export let bad_component_not_elem = (NotElem) => <NotElem text="a" />;
export let bad_mut_in_jsx = () => {
  const xs = mut([1, 2]);
  return <div>{xs}</div>;
};
export let bad_free_component = () => <Missing />;
export let bad_child_object = () => <div>{{ a: 1 }}</div>;
export let ok_all = (n, inc, setN, Badge) => (
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
