type Matrix = { readonly rows: number; readonly cols: number; readonly data: Float64Array };

const A = (): Matrix => ({ rows: 2, cols: 2, data: new Float64Array([1, 2, 3, 4]) });
const I = (): Matrix => ({ rows: 2, cols: 2, data: new Float64Array([1, 0, 0, 1]) });

const mul = () => (a: Matrix, b: Matrix): Matrix => {
  if (a.cols !== b.rows) throw new Error(`cannot multiply ${a.rows}x${a.cols} by ${b.rows}x${b.cols}`);
  const data = new Float64Array(a.rows * b.cols);
  for (let i = 0; i < a.rows; i++) {
    for (let j = 0; j < b.cols; j++) {
      let s = 0;
      for (let k = 0; k < a.cols; k++) s += (a.data[i * a.cols + k] ?? 0) * (b.data[k * b.cols + j] ?? 0);
      data[i * b.cols + j] = s;
    }
  }
  return { rows: a.rows, cols: b.cols, data };
};

const AA = (A: Matrix, mul) => mul(A, A);

const AI = (A: Matrix, I: Matrix, mul) => Array.from(mul(A, I).data);
