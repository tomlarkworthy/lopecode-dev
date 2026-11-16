// viewof-style widget: takes the State, builds DOM, writes through set inside an action.
export function count_view(count: State<number>, Inputs) {
  const input = Inputs.range([0, 10], { value: 0 });
  input.addEventListener("input", action(() => count.set(input.value)));
  return input;
}
