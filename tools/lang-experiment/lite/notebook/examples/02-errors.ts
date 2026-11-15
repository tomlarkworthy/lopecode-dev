const width = () => 640;
const label = () => "px";

// 1. A type error: label is a string.
const doubled = (label: number) => label * 2;

// 2. A free name: Math.random is not an allowed intrinsic; take the random capability instead.
const jitter = (width: number) => width + Math.random();

// 3. A member write: values are immutable by default.
const moved = (width: number) => {
  const p = { x: 0, y: 0 };
  p.x = width;
  return p;
};

// 4. === on two objects compares identity; use equals(a, b).
const same = () => [1, 2] === [1, 2];

// 5. Calling another cell by its module-level name instead of taking it as a parameter.
const area = () => width() * 400;

// This one is fine: the random capability is a parameter, so the dependency is declared.
const jittered = (width: number, random) => width + random();
