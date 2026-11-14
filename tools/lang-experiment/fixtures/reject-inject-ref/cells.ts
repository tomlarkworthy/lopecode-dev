export let a = () => 1;
export let b = (a: Ref<number>) => action(() => a.set(2));
export let e = (now: Ref<number>) => 1;
export let g = (lib: Ref<number>) => 1;
