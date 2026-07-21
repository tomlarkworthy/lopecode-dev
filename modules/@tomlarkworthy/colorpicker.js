const _o43d74 = function _1(md){return(
md`# Color Picker (with alpha) and optional pickrOptions, see **Code**
<i>\`<input type=color>\` doesn't support [alpha](https://github.com/w3c/html/issues/1422), so here's [Pickr](https://github.com/Simonwep/pickr) trimmed down for Observable.</i>
`
)};
const _rq25pz = function _2(md){return(
md`
\`\`\`js
import {colorPicker} from "@tomlarkworthy/colorpicker"
\`\`\`
`
)};
const _1ou66zo = function _nameExample(colorPicker){return(
colorPicker("steelblue")
)};
const _q8u3c9 = (G, _) => G.input(_);
const _1aex1vz = function _hexExample(colorPicker){return(
colorPicker("#eee")
)};
const _1gxll7x = (G, _) => G.input(_);
const _5rda53 = function _rgbExample(colorPicker){return(
colorPicker("rgb(219, 44, 44)")
)};
const _la6c6v = (G, _) => G.input(_);
const _17jjty4 = function _rgbaExample(colorPicker){return(
colorPicker("rgba(64, 161, 0, 0.77)")
)};
const _v8rday = (G, _) => G.input(_);
const _11lukrm = function _hslExample(colorPicker){return(
colorPicker("hsl(220, 53%, 43%)")
)};
const _1922m8b = (G, _) => G.input(_);
const _1tsitu3 = function _hsvaExample(colorPicker){return(
colorPicker("hsva(240, 69%, 66%, 0.4)")
)};
const _1oy67mw = (G, _) => G.input(_);
const _165394k = function _9(md){return(
md`## Formatting
- Color string is formatted according to the initial value (first arg).
- Optionally pass an explicit [TinyColor format string](https://github.com/bgrins/TinyColor#tostring) as second arg.
  - e.g. \`"hex", "rgb", "hsl", "hsv", "name"\`

## Known issues
- Pickr seems to be lossy
  - i.e. moving the knobs to original position may not return original value
- Pickr modal is occluded by expanded cells.
- Trying to adjust Pickr modal size (width,height,padding) throws off the knob positions, so we're stuck with the default.
`
)};
const _pv2fgj = function _10(md){return(
md`## Code`
)};
const _w15cok = function _colorPicker(tinycolor,html,styles,Pickr){return(
function colorPicker(defaultValue, format, pickrOptions = {}) {
  // Set desired color format.
  format = format || tinycolor(defaultValue).getFormat();

  // Build container element.
  const container = html`
  <div style="height:2.4em;">
    ${styles}
    <div id="picker"></div>
    <code id="label" style="margin-left: 0.5em;"></code>
  </div>`;
  const picker = container.querySelector("#picker");
  const label = container.querySelector("#label");

  // Set color value.
  const setValue = colorStr => {
    // Create color object from string.
    const color = tinycolor(colorStr);

    // Hex doesn't support alpha (but will in CSS4), so force RGB if alpha is < 1.
    const actualFormat = tinycolor(color.toString(format)).getFormat();
    const forceRGB = actualFormat === "hex" && color.getAlpha() < 1;

    // Create desired output color string and display it.
    const finalColorStr = color.toString(forceRGB ? "rgb" : format);
    label.innerHTML = finalColorStr;

    // Notify Observable about change in value.
    container.value = finalColorStr;
    container.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  setValue(defaultValue);

  // Setup Pickr.
  const setupPickr = () => {
    new Pickr({
      el: picker,
      default: tinycolor(defaultValue).toString("rgb"),
      onChange: c => setValue(c.toRGBA().toString()),
      comparison: false,
      components: {
        preview: false,
        opacity: true,
        hue: true
      },
      ...pickrOptions
    });
  };

  // For some reason, Pickr doesn't want to set the default color unless the element is mounted,
  // so we wait for it to mount here.
  const interval = setInterval(() => {
    if (document.body.contains(container)) {
      clearInterval(interval);
      setupPickr();
    }
  }, 100);

  return container;
}
)};
const _1snyyq8 = function _styles(html){return(
html`
<link rel="stylesheet" href="https://unpkg.com/pickr-widget@0.2.0/dist/pickr.min.css"/>
<style>
  /* Make sure picker stays above other Observable elements. */
  .pcr-app.visible {
    z-index: 10000000;
  }
  /* Allow our value label to be appended with good alignment. */
  .pickr {
    display: inline-block;
    vertical-align: middle;
  }
</style>
`
)};
const _1stqz4s = function _13(md){return(
md`## Dependencies`
)};
const _2ioh8g = function _tinycolor(require){return(
require("tinycolor2@1.4.1")
)};
const _u2eg55 = function _Pickr(require){return(
require("pickr-widget@0.2.0")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_o43d74", null, ["md"], _o43d74);  
  $def("_rq25pz", null, ["md"], _rq25pz);  
  $def("_1ou66zo", "viewof nameExample", ["colorPicker"], _1ou66zo);  
  $def("_q8u3c9", "nameExample", ["Generators","viewof nameExample"], _q8u3c9);  
  $def("_1aex1vz", "viewof hexExample", ["colorPicker"], _1aex1vz);  
  $def("_1gxll7x", "hexExample", ["Generators","viewof hexExample"], _1gxll7x);  
  $def("_5rda53", "viewof rgbExample", ["colorPicker"], _5rda53);  
  $def("_la6c6v", "rgbExample", ["Generators","viewof rgbExample"], _la6c6v);  
  $def("_17jjty4", "viewof rgbaExample", ["colorPicker"], _17jjty4);  
  $def("_v8rday", "rgbaExample", ["Generators","viewof rgbaExample"], _v8rday);  
  $def("_11lukrm", "viewof hslExample", ["colorPicker"], _11lukrm);  
  $def("_1922m8b", "hslExample", ["Generators","viewof hslExample"], _1922m8b);  
  $def("_1tsitu3", "viewof hsvaExample", ["colorPicker"], _1tsitu3);  
  $def("_1oy67mw", "hsvaExample", ["Generators","viewof hsvaExample"], _1oy67mw);  
  $def("_165394k", null, ["md"], _165394k);  
  $def("_pv2fgj", null, ["md"], _pv2fgj);  
  $def("_w15cok", "colorPicker", ["tinycolor","html","styles","Pickr"], _w15cok);  
  $def("_1snyyq8", "styles", ["html"], _1snyyq8);  
  $def("_1stqz4s", null, ["md"], _1stqz4s);  
  $def("_2ioh8g", "tinycolor", ["require"], _2ioh8g);  
  $def("_u2eg55", "Pickr", ["require"], _u2eg55);
  return main;
}