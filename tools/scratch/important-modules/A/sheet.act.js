await new Promise(r => setTimeout(r, 1500));
const w = v("grid")._value;
const r = w.getBoundingClientRect();
return { rect: [r.width | 0, r.height | 0], has460: w.textContent.includes("460.00"), has340: w.textContent.includes("340"), bar: (w.querySelector(".sh-bar")?.textContent || "").trim().slice(0, 40) };
