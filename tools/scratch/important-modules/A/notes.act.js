v("addButton")._value.querySelector("button").click();
await new Promise(r => setTimeout(r, 1000));
return { count: v("noteCount")._value };
