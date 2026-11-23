type Mat = { rows: number; cols: number; data: Float64Array };
const matmul = () => (a: Mat, b: Mat): Mat => {
  const out = new Float64Array(a.rows * b.cols);
  for (let i = 0; i < a.rows; i++)
    for (let j = 0; j < b.cols; j++) {
      let s = 0;
      for (let k = 0; k < a.cols; k++) s += (a.data[i * a.cols + k] ?? 0) * (b.data[k * b.cols + j] ?? 0);
      out[i * b.cols + j] = s;
    }
  return { rows: a.rows, cols: b.cols, data: out };
};
const A = (): Mat => ({ rows: 2, cols: 2, data: new Float64Array([1, 2, 3, 4]) });
const I = (): Mat => ({ rows: 2, cols: 2, data: new Float64Array([1, 0, 0, 1]) });
const AA = (matmul, A: Mat) => matmul(A, A);
const AI = (matmul, A: Mat, I: Mat) => Array.from(matmul(A, I).data);
