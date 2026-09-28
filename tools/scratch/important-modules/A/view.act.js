const s = v("viewof settings")._value;
s.value = { size: 7, name: "Lin" };
s.dispatchEvent(new Event("input", { bubbles: true }));
const a = v("viewof sliders")._value;
a.value = { values: [0.1, 0.5, 0.9] };
a.dispatchEvent(new Event("input", { bubbles: true }));
await new Promise(r => setTimeout(r, 300));
return { settingsValue: s.value, sizeInputValue: s.size.value, slidersValue: a.value, rangeCount: a.querySelectorAll("input[type=range]").length };
