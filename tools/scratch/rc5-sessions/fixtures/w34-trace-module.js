const _intro = function intro(md){return( md`# Binary Search — An Interactive Tutorial

Binary search is a fast algorithm for finding an element in a **sorted** array. Instead of scanning
every element from left to right (which takes *n* steps), it repeatedly halves the search range:

1. **Pick the middle element.** Is it the target? If so, done!
2. If the middle element is **too small**, discard the left half — the target must be to the right.
3. If it's **too big**, discard the right half.
4. Repeat until the range is empty or the target is found.

Because the search space halves each time, binary search needs at most **⌈log₂ n⌉** steps — for our
20-element array, that is at most **5 steps**, compared to up to 20 for a linear scan.

Below is a sorted array of 20 numbers. Pick a target, then press **Step** to walk through the search
one comparison at a time. Watch the **low**, **mid**, and **high** pointers move!`
)};

const _array = function array(){return(
  [2, 5, 8, 12, 16, 21, 25, 30, 37, 41, 45, 50, 56, 62, 68, 73, 79, 84, 90, 97]
)};

const _viewof_target = function _viewof_target(Inputs){return(
  Inputs.number({label: "Target number", value: 41, min: 0, max: 100, step: 1})
)};
const _target = function target(G, v){return( G.input(v) )};

// --- mutable step state (0 = not started, odd steps = comparing, -1 = found, -2 = not found) ---
const _initialState = function initialState(){return( {step: 0, low: 0, mid: 0, high: 19, done: false, found: false} )};
const _mutableState = function mutableState(M, s){return( new M(s) )};
const _state = function state($){return( $.generator )};

const _maxSteps = function maxSteps(array){return( Math.ceil(Math.log2(array.length)) )};

// --- Step button: advance one comparison ---
const _viewof_step = function step(htl, $state, array, target){
  return htl.html`<button onclick=${() => {
    const s = $state.value;
    if (s.done) return; // already finished
    if (s.step === 0) {
      // initial setup
      const lo = 0, hi = array.length - 1, mid = Math.floor((lo + hi) / 2);
      if (array[mid] === target) {
        $state.value = {step: 1, low: lo, mid: mid, high: hi, done: true, found: true};
      } else {
        $state.value = {step: 1, low: lo, mid: mid, high: hi, done: false, found: false};
      }
    } else {
      // advance: narrow the range
      let lo = s.low, hi = s.high, mid = Math.floor((lo + hi) / 2);
      if (array[mid] < target) lo = mid + 1;
      else hi = mid - 1;
      const newMid = Math.floor((lo + hi) / 2);
      if (lo > hi) {
        $state.value = {step: s.step + 1, low: lo, mid: newMid, high: hi, done: true, found: false};
      } else if (array[newMid] === target) {
        $state.value = {step: s.step + 1, low: lo, mid: newMid, high: hi, done: true, found: true};
      } else {
        $state.value = {step: s.step + 1, low: lo, mid: newMid, high: hi, done: false, found: false};
      }
    }
  }}>▶ Step</button>`
)};
const _step = function step(G, v){return( G.input(v) )};

// --- Reset button ---
const _viewof_reset = function reset(htl, $state){
  return htl.html`<button onclick=${() => {
    $state.value = {step: 0, low: 0, mid: 0, high: 19, done: false, found: false};
  }}>↺ Reset</button>`
)};
const _reset = function reset(G, v){return( G.input(v) )};

// --- Visualisation: the array as coloured boxes ---
const _viz = function viz(htl, array, state, target){
  const {step, low, mid, high, done, found} = state;
  const started = step > 0;

  const boxes = array.map((val, i) => {
    let bg = "#f0f0f0", border = "2px solid #ccc", fontWeight = "normal";
    if (started && i >= low && i <= high) {
      bg = "#e8f4fd"; border = "2px solid #90caf9"; // in-range
    }
    if (started && i === mid && !done) {
      bg = "#fff3e0"; border = "3px solid #ff9800"; fontWeight = "bold"; // mid
    }
    if (started && done && found && i === mid) {
      bg = "#c8e6c9"; border = "3px solid #4caf50"; fontWeight = "bold"; // found
    }
    if (started && i === low && !done) {
      // low pointer
    }
    if (started && done && !found) {
      bg = "#f5f5f5"; border = "2px solid #e0e0e0"; // all greyed out
    }
    return htl.html`<div style=${{
      display: "inline-flex", flexDirection: "column", alignItems: "center", margin: "0 2px"
    }}>
      ${started && (i === low && !done) ? htl.html`<span style=${{color: "#1976d2", fontSize: "11px", fontWeight: "bold"}}>low</span>` : ""}
      ${started && (i === mid && !done) ? htl.html`<span style=${{color: "#e65100", fontSize: "11px", fontWeight: "bold"}}>mid</span>` : ""}
      ${started && (i === high && !done) ? htl.html`<span style=${{color: "#7b1fa2", fontSize: "11px", fontWeight: "bold"}}>high</span>` : ""}
      ${started && done && found && i === mid ? htl.html`<span style=${{color: "#2e7d32", fontSize: "11px", fontWeight: "bold"}}>✓ found</span>` : ""}
      <div style=${{
        width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center",
        background: bg, border: border, borderRadius: "4px", fontFamily: "monospace", fontSize: "13px", fontWeight
      }}>${val}</div>
      <span style=${{fontSize: "10px", color: "#999", marginTop: "2px"}}>${i}</span>
    </div>`;
  });

  // excluded ranges dimmed
  const message = !started ? "" :
    done && found ? `✅ Found **${target}** in **${step}** step${step > 1 ? "s" : ""}!` :
    done && !found ? `❌ **${target}** is not in the array (searched in ${step} step${step > 1 ? "s" : ""}).` :
    `Step ${step}: checking index ${mid} → value **${array[mid]}** ${array[mid] < target ? "<" : array[mid] > target ? ">" : "="} ${target}`;

  return htl.html`<div style=${{fontFamily: "system-ui, sans-serif", marginTop: "12px"}}>
    <div style=${{
      display: "flex", alignItems: "flex-end", flexWrap: "wrap",
      padding: "16px 8px", background: "#fafafa", borderRadius: "8px", border: "1px solid #e0e0e0"
    }}>${boxes}</div>
    <div style=${{marginTop: "10px", fontSize: "14px", minHeight: "24px"}}>${md`${message}`}</div>
  </div>`
};

const _statusBar = function statusBar(state, step, reset){
  return htl.html`<div style=${{
    display: "flex", gap: "8px", alignItems: "center", marginTop: "8px", marginBottom: "4px"
  }}>${step} ${reset} <span style=${{fontSize: "13px", color: "#666"}}> Step ${state.step} of max ${5}</span></div>`
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_array", "array", [], _array);
  $def("_viewof_target", "viewof target", ["Inputs"], _viewof_target);
  $def("_target", "target", ["Generators", "viewof target"], _target);
  $def("_initialState", "initialState", [], _initialState);
  $def("_mutableState", "mutableState", ["Mutable", "initialState"], _mutableState);
  $def("_state", "state", ["mutable state"], _state);
  $def("_maxSteps", "maxSteps", ["array"], _maxSteps);
  $def("_viewof_step", "viewof step", ["htl", "mutable state", "array", "target"], _viewof_step);
  $def("_step", "step", ["Generators", "viewof step"], _step);
  $def("_viewof_reset", "viewof reset", ["htl", "mutable state"], _viewof_reset);
  $def("_reset", "reset", ["Generators", "viewof reset"], _reset);
  $def("_viz", "viz", ["htl", "array", "state", "target"], _viz);
  $def("_statusBar", "statusBar", ["state", "viewof step", "viewof reset"], _statusBar);
  return main;
}