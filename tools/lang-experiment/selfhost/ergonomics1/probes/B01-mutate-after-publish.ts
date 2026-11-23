const list = (): StateCell<number[]> => state<number[]>([]);
const load = (list: State<number[]>) =>
  action(() => {
    const arr = [1, 2];
    list.set(arr);
    arr.push(3);
  });
const size = (list: number[]) => list.length;
