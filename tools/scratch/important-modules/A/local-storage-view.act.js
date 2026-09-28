const el = v("viewof volume")._value;
el.value = 42;
el.dispatchEvent(new Event("input", { bubbles: true }));
const p = v("viewof prefs")._value;
p.value = { theme: "dark" };
p.dispatchEvent(new Event("input", { bubbles: true }));
await new Promise(r => setTimeout(r, 300));
return { stored: [localStorage.getItem("demo-volume"), localStorage.getItem("demo-prefs")] };
