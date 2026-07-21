const _z7191q = function _1(md){return(
md`# Observable's _'now'_ temporal spacing is 60 or 30 frames per second.

Take a __*weighted running mean*__ of subsequent _'now'_ measurements. As its so fast it should quickly converge to a stable measure. The stability comes from integrating information over hundreds of samples.

My final measurement was _16.6ms_, which is bang-on 60 _frames per second_ (Chrome M1).

[Jacob Rus](https://observablehq.com/@jrus) reports 30 FPS in Safari
`
)};
const _1yivy2f = function _mean_diff_ms(){return(
10
)};
const _11ut5a8 = (M, _) => new M(_);
const _1unv6lx = _ => _.generator;
const _y2g9xw = function _prev_now(){return(
(new Date()).getTime()
)};
const _1xwu4us = (M, _) => new M(_);
const _13uy8xd = _ => _.generator;
const _13uo8qo = function _iteration($0,mean_diff_ms,now,prev_now,$1)
{
  // Take a weighted average between the latest measurement and the history, strongly bias towards
  // history (0.99 unit weight)
  $0.value = 0.99 * mean_diff_ms + 0.01 * (now - prev_now)
  $1.value = now;
};
const _10p3zqk = function _5(md){return(
md`## Decimating 'now'

'now' runs a bit fast, can we trigger every 10th?
`
)};
const _mem89m = function _slow_now(now)
{
  const latest = now; // Will update at 30 or 60 fps
  if (Math.random() < 0.1) return now
  else return new Promise(() => {}) // Mask update by returning unresolved promise
};
const _10dp204 = function _slow_updates(){return(
0
)};
const _1jzrcuy = (M, _) => new M(_);
const _q9rhoz = _ => _.generator;
const _7ynr6i = function _updates(){return(
0
)};
const _1m43mwe = (M, _) => new M(_);
const _1rw5n1v = _ => _.generator;
const _18lzluw = function _9(slow_now,$0)
{
  slow_now
  $0.value++
};
const _1k96kf0 = function _10(now,$0)
{
  now
  $0.value++
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_z7191q", null, ["md"], _z7191q);  
  $def("_1yivy2f", "initial mean_diff_ms", [], _1yivy2f);  
  $def("_11ut5a8", "mutable mean_diff_ms", ["Mutable","initial mean_diff_ms"], _11ut5a8);  
  $def("_1unv6lx", "mean_diff_ms", ["mutable mean_diff_ms"], _1unv6lx);  
  $def("_y2g9xw", "initial prev_now", [], _y2g9xw);  
  $def("_1xwu4us", "mutable prev_now", ["Mutable","initial prev_now"], _1xwu4us);  
  $def("_13uy8xd", "prev_now", ["mutable prev_now"], _13uy8xd);  
  $def("_13uo8qo", "iteration", ["mutable mean_diff_ms","mean_diff_ms","now","prev_now","mutable prev_now"], _13uo8qo);  
  $def("_10p3zqk", null, ["md"], _10p3zqk);  
  $def("_mem89m", "slow_now", ["now"], _mem89m);  
  $def("_10dp204", "initial slow_updates", [], _10dp204);  
  $def("_1jzrcuy", "mutable slow_updates", ["Mutable","initial slow_updates"], _1jzrcuy);  
  $def("_q9rhoz", "slow_updates", ["mutable slow_updates"], _q9rhoz);  
  $def("_7ynr6i", "initial updates", [], _7ynr6i);  
  $def("_1m43mwe", "mutable updates", ["Mutable","initial updates"], _1m43mwe);  
  $def("_1rw5n1v", "updates", ["mutable updates"], _1rw5n1v);  
  $def("_18lzluw", null, ["slow_now","mutable slow_updates"], _18lzluw);  
  $def("_1k96kf0", null, ["now","mutable updates"], _1k96kf0);
  return main;
}