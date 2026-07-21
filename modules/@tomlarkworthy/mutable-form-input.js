const _rumduj = function _1(md){return(
md`# Mutable Form Input

This notebook defines a *form* function which makes it easier to use complex forms together with [Observable views](/@mbostock/introduction-to-views). To use it in your notebook:

\`\`\`js
import {form} from "@tomlarkworthy/mutable-form-input"
\`\`\`

Pass the *form* function a form element, and you’re off to the races! 🐎`
)};
const _ro7yrl = function _object(form,html){return(
form(html`<form>
  <div><label><input name="message" type="text" value="Hello, form!"> <i>message</i></label></div>
  <div><label><input name="hue" type="range" min=0 max=360> <i>hue</i></label></div>
  <div>
    <label><input name="size" type="radio" value="12"> <i>small</i></label>
    <label><input name="size" type="radio" value="24" checked> <i>medium</i></label>
    <label><input name="size" type="radio" value="48"> <i>large</i></label>
  </div>
  <div>
    <label>
      <select name="emojis" multiple size="3">
        <option value="🍎">🍎</option>
        <option value="🔥">🔥</option>
        <option value="🐙">🐙</option>
      </select>
    <i>emojis</i></label>
  </div>
</form>`)
)};
const _233h0f = (G, _) => G.input(_);
const _u4zhja = function _3(object){return(
object
)};
const _lcyqkt = function _4(md){return(
md`Now you have a reactive reference to resulting object!`
)};
const _14ghfft = function _5(html,svg,object){return(
html`<svg
  width="640"
  height="64"
  viewBox="0 0 640 64"
  style="width:100%;max-width:640px;height:auto;display:block;background:#333;"
>
  ${Object.assign(
    svg`<text
    x="50%"
    y="50%"
    text-anchor="middle" 
    dy="0.35em"
    fill="hsl(${object.hue},100%,50%)"
    font-size="${object.size}"
  >`,
    {
      textContent: `${object.message} ${object.emojis.join(" ")}`
    }
  )}
</svg>`
)};
const _1xprbei = function _6(md){return(
md`---

## Implementation`
)};
const _muu788 = function _form(html,formValue,setFormValue){return(
function form(form) {
  const container = html`<div>${form}`;
  form.addEventListener("submit", event => event.preventDefault());
  form.addEventListener("change", () => container.dispatchEvent(new CustomEvent("input")));
  form.addEventListener("input", () => value = formValue(form));
  let value = formValue(form);
  Object.defineProperty(container, 'value', {
    get: () => value,
    set: (newValue) => {
      value = newValue;
      setFormValue(form, newValue)
    }
  })
  return container
}
)};
const _79m3qe = function _formValue(){return(
function formValue(form) {
  const object = {};
  for (const input of form.elements) {
    if (input.disabled || !input.hasAttribute("name")) continue;
    let value = input.value;
    switch (input.type) {
      case "range":
      case "number": {
        value = input.valueAsNumber;
        break;
      }
      case "date": {
        value = input.valueAsDate;
        break;
      }
      case "radio": {
        if (!input.checked) continue;
        break;
      }
      case "checkbox": {
        if (input.checked) value = true;
        else if (input.name in object) continue;
        else value = false;
        break;
      }
      case "file": {
        value = input.multiple ? input.files : input.files[0];
        break;
      }
      case "select-multiple": {
        value = Array.from(input.selectedOptions, option => option.value);
        break;
      }
    }
    object[input.name] = value;
  }
  return object;
}
)};
const _1nfxvpk = function _setFormValue(){return(
function setFormValue(form, newValue) {
  for (const input of form.elements) {
    if (input.disabled || !input.hasAttribute("name")) continue;
    switch (input.type) {
      default:
      case "range":
      case "number":
      case "date":
        input.value = newValue[input.name];
        break;
      case "radio":
        input.checked = newValue[input.name] === input.value;
        break;
      case "select-multiple":
        Array.from(input.options).forEach(option => {
          option.selected = newValue[input.name].includes(option.value)
        });
        break;
        
      case "file":
        throw new Error("Not implemented")
        break;
    }
  }
}
)};
const _102awwb = function _setFormValueTest($0)
{
  $0.value = {
    ...$0.value,
    message: "hi from setFormValue test",
    size: "12",
    emojis: ["🍎", "🔥"]
  }
  $0.dispatchEvent(new CustomEvent('input'))
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_rumduj", null, ["md"], _rumduj);  
  $def("_ro7yrl", "viewof object", ["form","html"], _ro7yrl);  
  $def("_233h0f", "object", ["Generators","viewof object"], _233h0f);  
  $def("_u4zhja", null, ["object"], _u4zhja);  
  $def("_lcyqkt", null, ["md"], _lcyqkt);  
  $def("_14ghfft", null, ["html","svg","object"], _14ghfft);  
  $def("_1xprbei", null, ["md"], _1xprbei);  
  $def("_muu788", "form", ["html","formValue","setFormValue"], _muu788);  
  $def("_79m3qe", "formValue", [], _79m3qe);  
  $def("_1nfxvpk", "setFormValue", [], _1nfxvpk);  
  $def("_102awwb", "setFormValueTest", ["viewof object"], _102awwb);
  return main;
}