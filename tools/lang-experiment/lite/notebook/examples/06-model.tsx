// One of each kind of variable the runner makes. Press the button and see which cells run again.
export const count = (): RefCell<number> => ref(0);
export const bump = (count: Ref<number>) => action(() => count.update((c) => c + 1));
export const doubled = (count: number) => count * 2;
export const stamped = (doubled: number, now) => `${doubled} at ${Math.round(now())} ms`;
export const side = () => 3;
export const scale = (count: number) => count + 1;
export const area = (side: number, scale: number) => side * side * scale;
export const areaFn = (compile: Compile) => compile({ inputs: ["side"], refs: ["scale"], outputs: ["area"] });
export const areaOf4 = async (areaFn) => (await areaFn({ side: 4 })).area;
export const app = (count: number, bump: Action<[]>, stamped: string) => (
  <div>
    <button onClick={bump}>bump</button> <output>count {count}, {stamped}</output>
  </div>
);
