// A cell is an exported function. Its parameters are its inputs, matched by name.
const width = () => 640;
const height = () => 400;
const area = (width: number, height: number) => width * height;

// A parameter's type may be left out: it is then the named cell's value type.
const aspect = (width, height) => (width / height).toFixed(2);

// A cell whose value is a function is two arrows.
const scale = () => (n: number, by: number): number => n * by;
const half = (area, scale) => scale(area, 0.5);

// A test is a cell named test_*; it passes if it does not throw.
const test_half = (half: number) => {
  if (half !== 128000) throw new Error(`half is ${half}`);
  return "ok";
};
