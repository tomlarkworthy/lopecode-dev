const _vt53yd = function _1(htl){return(
htl.html`<h1 style="display: none;">single stroke font</h1>
<div style="height:100px"">`
)};
const _eok172 = function _2(svg,scaleAxisTransform,fontPath,text,scale){return(
svg`<svg width="100%" height=200 viewBox="0 0 1000 100">
  <path stroke="green" stroke-width=3 d="${scaleAxisTransform(fontPath(text), {
    scale: scale
  })}" />
</svg>`
)};
const _2fpzp5 = function _fontSource(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.text({
    label: "font *",
    width: 600
  }),
  localStorageView("ssf_font", {
    defaultValue:
      "http://fonts.gstatic.com/s/roboto/v15/7MygqTe2zs9YkP0adA9QQQ.ttf"
  })
)
)};
const _1z0bxwc = (G, _) => G.input(_);
const _mue6zn = function _text(Inputs){return(
Inputs.text({ label: "Text", value: "single stroke font" })
)};
const _wz6bsb = (G, _) => G.input(_);
const _1dhay2 = function _scale(Inputs){return(
Inputs.range([0, 10], { label: "scale", value: 1.5 })
)};
const _1i9h8ww = (G, _) => G.input(_);
const _153vmvi = function _6(md){return(
md`\\* A list of _.ttf_ URLs is [here](https://gist.github.com/karimnaaji/b6c9c9e819204113e9cabf290d580551)`
)};
const _u04k2r = function _7(htl){return(
htl.html`<div style="height:400px"">`
)};
const _jk4hqa = function _8(md){return(
md`## Open Type (convert .ttf to SVG)`
)};
const _8he2b3 = async function* _num()
{
  let i = 0;
  while (true) {
    i = (i + 1) % 10;
    yield i;
    await new Promise((r) => setTimeout(r, 100));
  }
};
const _bh9ss8 = function _opentype(require){return(
require("opentype.js")
)};
const _wmq2kt = function _font(opentype,fontSource){return(
new Promise((r, e) =>
  opentype.load(fontSource.replaceAll("http://", "https://"), (err, font) => {
    if (err) e(err);
    r(font);
  })
)
)};
const _1rh54lb = function _fontPath(font){return(
function fontPath(digit) {
  const path = font.getPath(digit.toString(), 0, 100, 100); // Get the path for the digit
  const svgPath = path.toSVG(); // Convert the path to an SVG path string
  return svgPath.match(/"(.*)"/)[1];
}
)};
const _koiqht = function _path(fontPath,num){return(
fontPath(num)
)};
const _1hx2pzz = function _shape(svg,fontPath,num){return(
svg`<svg width=100 height=120 viewBox="0 0 100 100"><path fill=green stroke="green" stroke-width=3 d="${fontPath(
  num
)}" >`
)};
const _neqaf3 = function _15(md){return(
md`## flow_mat (Medial/Scale Axis Transform)
### finds the skeleton of a shape`
)};
const _xsbxhf = function _flo_mat() {
    return import('https://unpkg.com/flo-mat@3.0.1/browser/index.min.js');
};
const _thfdvm = function _matsToPath(round,flo_mat)
{
  /**
   * Returns an SVG path string of a line.
   * @param ps The line endpoints.
   */
  function getLinePathStr(ps) {
    let [[x0, y0], [x1, y1]] = ps;
    return `M${round(x0)} ${round(y0)} L${round(x1)} ${round(y1)}`;
  }

  /**
   * Returns an SVG path string of a quadratic bezier curve.
   * @param ps The quadratic bezier control points.
   */
  function getQuadBezierPathStr(ps) {
    let [[x0, y0], [x1, y1], [x2, y2]] = ps;
    return `M${round(x0)} ${round(y0)} Q${round(x1)} ${round(y1)} ${round(
      x2
    )} ${round(y2)}`;
  }

  /**
   * Returns an SVG path string of a cubic bezier curve.
   * @param ps The cubic bezier control points.
   */
  function getCubicBezierPathStr(ps) {
    let [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = ps;
    return `M${round(x0)} ${round(y0)} C${round(x1)} ${round(y1)} ${round(
      x2
    )} ${round(y2)} ${round(x3)} ${round(y3)}`;
  }

  /**
   * Returns a function that draws an array of MAT curves on an SVG element.
   * @param mats An array of MATs to draw.
   * @param svg The SVG element on which to draw.
   * @param type The type of MAT to draw. This simply affects the class on the
   * path element.
   */
  function drawMats(mats) {
    const paths = [];
    mats.forEach(f);

    /**
     * Draws a MAT curve on an SVG element.
     */
    function f(mat) {
      let cpNode = mat.cpNode;

      if (!cpNode) {
        return;
      }

      let fs = [
        ,
        ,
        getLinePathStr,
        getQuadBezierPathStr,
        getCubicBezierPathStr
      ];

      flo_mat.traverseEdges(cpNode, function (cpNode) {
        if (flo_mat.isTerminating(cpNode)) {
          return;
        }
        let bezier = flo_mat.getCurveToNext(cpNode);
        if (!bezier) {
          return;
        }
        paths.push(fs[bezier.length](bezier));
      });
    }
    return paths.join();
  }

  return drawMats;
};
const _oczc1y = function _18(svg,scaleAxisTransform,path){return(
svg`<svg width=100 height=100 viewBox="0 0 100 100">
  <path stroke="green" stroke-width=3 d="${scaleAxisTransform(path)}" />
</svg>`
)};
const _clqyb2 = function _scaleAxisTransform(flo_mat,matsToPath){return(
(path, { scale = 1.5 } = {}) => {
  const paths = flo_mat.getPathsFromStr(path);
  const mats = flo_mat.findMats(paths);
  const sats = mats.map((mat) => flo_mat.toScaleAxis(mat, scale));
  return matsToPath(sats);
}
)};
const _1x612yd = function _DecimalPrecision2(){return(
(function () {
  if (Number.EPSILON === undefined) {
    Number.EPSILON = Math.pow(2, -52);
  }
  if (Math.sign === undefined) {
    Math.sign = function (x) {
      return (x > 0) - (x < 0) || +x;
    };
  }
  return {
    // Decimal round (half away from zero)
    round: function (num, decimalPlaces) {
      var p = Math.pow(10, decimalPlaces || 0);
      var n = num * p * (1 + Number.EPSILON);
      return Math.round(n) / p;
    },
    // Decimal ceil
    ceil: function (num, decimalPlaces) {
      var p = Math.pow(10, decimalPlaces || 0);
      var n = num * p * (1 - Math.sign(num) * Number.EPSILON);
      return Math.ceil(n) / p;
    },
    // Decimal floor
    floor: function (num, decimalPlaces) {
      var p = Math.pow(10, decimalPlaces || 0);
      var n = num * p * (1 + Math.sign(num) * Number.EPSILON);
      return Math.floor(n) / p;
    },
    // Decimal trunc
    trunc: function (num, decimalPlaces) {
      return (num < 0 ? this.ceil : this.floor)(num, decimalPlaces);
    },
    // Format using fixed-point notation
    toFixed: function (num, decimalPlaces) {
      return this.round(num, decimalPlaces).toFixed(decimalPlaces);
    }
  };
})()
)};
const _6ohx14 = function _21(DecimalPrecision2){return(
DecimalPrecision2.trunc(3.321321321, 2)
)};
const _afnd4j = function _round(DecimalPrecision2){return(
(n) => DecimalPrecision2.trunc(n, 2)
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  $def("_vt53yd", null, ["htl"], _vt53yd);  
  $def("_eok172", null, ["svg","scaleAxisTransform","fontPath","text","scale"], _eok172);  
  $def("_2fpzp5", "viewof fontSource", ["Inputs","localStorageView"], _2fpzp5);  
  $def("_1z0bxwc", "fontSource", ["Generators","viewof fontSource"], _1z0bxwc);  
  $def("_mue6zn", "viewof text", ["Inputs"], _mue6zn);  
  $def("_wz6bsb", "text", ["Generators","viewof text"], _wz6bsb);  
  $def("_1dhay2", "viewof scale", ["Inputs"], _1dhay2);  
  $def("_1i9h8ww", "scale", ["Generators","viewof scale"], _1i9h8ww);  
  $def("_153vmvi", null, ["md"], _153vmvi);  
  $def("_u04k2r", null, ["htl"], _u04k2r);  
  $def("_jk4hqa", null, ["md"], _jk4hqa);  
  $def("_8he2b3", "num", [], _8he2b3);  
  $def("_bh9ss8", "opentype", ["require"], _bh9ss8);  
  $def("_wmq2kt", "font", ["opentype","fontSource"], _wmq2kt);  
  $def("_1rh54lb", "fontPath", ["font"], _1rh54lb);  
  $def("_koiqht", "path", ["fontPath","num"], _koiqht);  
  $def("_1hx2pzz", "shape", ["svg","fontPath","num"], _1hx2pzz);  
  $def("_neqaf3", null, ["md"], _neqaf3);  
  $def("_xsbxhf", "flo_mat", [], _xsbxhf);  
  $def("_thfdvm", "matsToPath", ["round","flo_mat"], _thfdvm);  
  $def("_oczc1y", null, ["svg","scaleAxisTransform","path"], _oczc1y);  
  $def("_clqyb2", "scaleAxisTransform", ["flo_mat","matsToPath"], _clqyb2);  
  $def("_1x612yd", "DecimalPrecision2", [], _1x612yd);  
  $def("_6ohx14", null, ["DecimalPrecision2"], _6ohx14);  
  $def("_afnd4j", "round", ["DecimalPrecision2"], _afnd4j);  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  return main;
}