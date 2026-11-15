// One of each kind of variable the runner makes. Press the button and see which cells run again.
const count = (): RefCell<number> => ref(0);
const bump = (count: Ref<number>) => action(() => count.update((c) => c + 1));
const doubled = (count: number) => count * 2;
const stamped = (doubled: number, now) => `${doubled} at ${Math.round(now())} ms`;
const side = () => 3;
const scale = (count: number) => count + 1;
const area = (side: number, scale: number) => side * side * scale;
const areaFn = (compile: Compile) => compile({ inputs: ["side"], refs: ["scale"], outputs: ["area"] });
const areaOf4 = async (areaFn) => (await areaFn({ side: 4 })).area;
const app = (count: number, bump: Action<[]>, stamped: string) => (
  <div>
    <button onClick={bump}>bump</button> <output>count {count}, {stamped}</output>
  </div>
);
