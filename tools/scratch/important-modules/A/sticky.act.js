const el = v("viewof cutoff")._value;
el.value = 1234;
el.dispatchEvent(new Event("input", { bubbles: true }));
await new Promise(r => setTimeout(r, 300));
return { definitionNow: v("viewof cutoff")._definition.toString().replace(/\s+/g, " ").slice(0, 160) };
