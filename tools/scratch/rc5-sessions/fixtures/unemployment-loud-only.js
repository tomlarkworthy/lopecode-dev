const _dyx6jd = function _1(md){return(
md`# Highlight color w/ dropdown`
)};
const _k3data = function _rows(d3){return(
d3.csvParse(`date,industry,count
2000-01-01,Manufacturing,734
2000-01-01,Leisure and hospitality,782
2000-01-01,Construction,745
2000-01-01,Finance,228
2001-01-01,Manufacturing,911
2001-01-01,Leisure and hospitality,806
2001-01-01,Construction,836
2001-01-01,Finance,232
2002-01-01,Manufacturing,1377
2002-01-01,Leisure and hospitality,947
2002-01-01,Construction,1211
2002-01-01,Finance,267
2003-01-01,Manufacturing,1302
2003-01-01,Leisure and hospitality,1049
2003-01-01,Construction,1196
2003-01-01,Finance,327
2004-01-01,Manufacturing,1110
2004-01-01,Leisure and hospitality,1097
2004-01-01,Construction,994
2004-01-01,Finance,403
2005-01-01,Manufacturing,889
2005-01-01,Leisure and hospitality,993
2005-01-01,Construction,1079
2005-01-01,Finance,252
2006-01-01,Manufacturing,778
2006-01-01,Leisure and hospitality,910
2006-01-01,Construction,868
2006-01-01,Finance,233
2007-01-01,Manufacturing,752
2007-01-01,Leisure and hospitality,911
2007-01-01,Construction,922
2007-01-01,Finance,233
2008-01-01,Manufacturing,837
2008-01-01,Leisure and hospitality,1176
2008-01-01,Construction,1099
2008-01-01,Finance,285
2009-01-01,Manufacturing,1711
2009-01-01,Leisure and hospitality,1487
2009-01-01,Construction,1744
2009-01-01,Finance,571
2010-01-01,Manufacturing,1918
2010-01-01,Leisure and hospitality,1804
2010-01-01,Construction,2194
2010-01-01,Finance,623`, d3.autoType)
)};
const _ul2e99 = function _2(rows){return(
rows
)};
const _a5mmom = function _selectedIndustry(Inputs,rows){return(
Inputs.select(
  [...new Set(rows.map((d) => d.industry))].concat("none"),
  {
    label: "selected Industry to highlight"
  }
)
)};
const _1mckfzj = (G, _) => G.input(_);
const _zkuc7f = function _4(Plot,rows){return(
Plot.plot({
  y: {
    label: "↑ Unemployed (thousands)"
  },
  marks: [
    Plot.areaY(
      rows,
      Plot.stackY({
        x: "date",
        y: "count",
        fill: "industry",
        z: "industry",
        title: "industry",
        order: "max",
        reverse: true,
        stroke: "#ddd"
      })
    ),
    Plot.ruleY([0])
  ]
})
)};
const _1xh2kjf = function _5(Inputs,rows){return(
Inputs.table(rows)
)};
const _eof5ms = function _6(Plot,rows,selectedIndustry,color){return(
Plot.plot({
  y: {
    label: "↑ Unemployed (thousands)"
  },
  marks: [
    Plot.areaY(
      rows,
      Plot.stackY({
        x: "date",
        y: "count",
        fill: (d) => d.industry === selectedIndustry,
        z: "industry",
        title: "industry",
        order: "sum",
        reverse: true,
        stroke: "#ddd"
      })
    ),
    Plot.ruleY([0])
  ],
  color
})
)};
const _e75lck = function _7(Plot,selectedIndustry,rows,highlightColor){return(
Plot.plot({
  y: {
    grid: true,
    label: "↑ Unemployed in " + selectedIndustry + " (thousands)"
  },
  marks: [
    Plot.areaY(
      rows.filter((d) => d.industry == selectedIndustry),
      Plot.stackY({
        x: "date",
        y: "unemployed",
        title: "industry",
        fill: highlightColor
      })
    ),
    Plot.ruleY([0])
  ],
  height: 200
})
)};
const _1mwreea = function _8(Plot,rows,selectedIndustry,color){return(
Plot.plot({
  y: {
    label: "↑ Unemployed (thousands)"
  },
  marks: [
    Plot.line(rows, {
      x: "date",
      y: "count",
      stroke: (d) => d.industry === selectedIndustry,
      strokeWidth: (d) => (d.industry === selectedIndustry ? 3 : 1),
      z: "industry",
      title: "industry"
    }),
    Plot.ruleY([0])
  ],
  color
})
)};
const _psr1tn = function _9(Plot,rows,selectedIndustry,color){return(
Plot.plot({
  y: {
    grid: true,
    label: "↑ Unemployed (thousands)"
  },
  marks: [
    Plot.areaY(rows, {
      x: "date",
      y: "count",
      fill: (d) => d.industry === selectedIndustry,
      title: "industry",
      reverse: true
    }),
    Plot.ruleY([0])
  ],
  facet: {
    data: rows,
    y: "industry"
    // can I order facets by sum?
  },
  width: 400,
  color
})
)};
const _y6zfi6 = function _highlightColor(Inputs){return(
Inputs.color({
  value: "#478eff",
  label: "Highlight Color"
})
)};
const _5ja4bn = (G, _) => G.input(_);
const _52iopg = function _11(md){return(
md`---------------`
)};
const _1jhuj32 = function _13(md){return(
md`### Supporting Code`
)};
const _oh6crs = function _color(highlightColor){return(
{ domain: [true, false], range: [highlightColor, "#aaa"] }
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_dyx6jd", null, ["md"], _dyx6jd);
  $def("_k3data", "rows", ["d3"], _k3data);
  $def("_ul2e99", null, ["rows"], _ul2e99);
  $def("_a5mmom", "viewof selectedIndustry", ["Inputs","rows"], _a5mmom);
  $def("_1mckfzj", "selectedIndustry", ["Generators","viewof selectedIndustry"], _1mckfzj);
  $def("_zkuc7f", null, ["Plot","rows"], _zkuc7f);
  $def("_1xh2kjf", null, ["Inputs","rows"], _1xh2kjf);
  $def("_eof5ms", null, ["Plot","rows","selectedIndustry","color"], _eof5ms);
  $def("_e75lck", null, ["Plot","selectedIndustry","rows","highlightColor"], _e75lck);
  $def("_1mwreea", null, ["Plot","rows","selectedIndustry","color"], _1mwreea);
  $def("_psr1tn", null, ["Plot","rows","selectedIndustry","color"], _psr1tn);
  $def("_y6zfi6", "viewof highlightColor", ["Inputs"], _y6zfi6);
  $def("_5ja4bn", "highlightColor", ["Generators","viewof highlightColor"], _5ja4bn);
  $def("_52iopg", null, ["md"], _52iopg);
  $def("_1jhuj32", null, ["md"], _1jhuj32);
  $def("_oh6crs", "color", ["highlightColor"], _oh6crs);
  return main;
}
