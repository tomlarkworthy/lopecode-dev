class Vec { constructor(public x: f64, public y: f64) {}
  add(o: Vec): Vec { return new Vec(this.x + o.x, this.y + o.y); }
  get len(): f64 { return Math.sqrt(this.x * this.x + this.y * this.y); } }
export function run(n: i32): f64 {
  let a = new Vec(1, 2); let s = 0.0;
  for (let i = 0; i < n; i++) { a = a.add(new Vec(<f64>i, 1.5)); s += a.len; }
  return s;
}
export function strs(n: i32): i32 {
  let parts = new Array<string>();
  for (let i = 0; i < n; i++) parts.push("x" + i.toString());
  return parts.join(",").length;
}
