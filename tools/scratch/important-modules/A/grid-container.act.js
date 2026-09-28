await new Promise(r => setTimeout(r, 1500));
const w = v("widget")._value;
const atoms = [...w.querySelectorAll("*")].filter(e => /sg-atom/.test(e.className)).map(e => e.textContent.trim().slice(0, 40));
return { frameClass: w.className, api: Object.keys(w.grid || {}), atoms, rect: [w.getBoundingClientRect().width|0, w.getBoundingClientRect().height|0] };
