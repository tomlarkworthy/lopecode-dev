// rc5-train eval (20260928-0847-m30): a maintenance data swap. The user has attached a newer CSV with
// renamed columns and asks for the notebook to read it.
// setup.files seeds @user/iowa-energy: the Iowa section of @observablehq/plot-stack (embedded in
// lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html, lopebooks f7c4ae35): `iowa` =
// FileAttachment("iowa-energy.csv").csv({typed: true}), the stacked Plot.areaY chart `energy`, and its
// legend cell. Two display cells are added: an md summary of the latest year's total (d3.max/d3.sum over
// the columns) and Inputs.table(iowa) (the idiom of @observablehq/plot-exploration-penguins cell _8).
// setup.init attaches iowa-energy.csv (171 rows, the original attachment) and data-2026.csv to the module
// with setFileAttachment. data-2026.csv = the same rows plus 2020-2025 (225 rows); net_generation ->
// generation, year -> period, a `state` column added, column order changed.
// Provenance: tools/scratch/rc5-train/20260928-0847/m30/fixtures/PROVENANCE.txt.
//
// setup.collect, keys (expected values are computed here from the CSV, not in the page):
//   source  — a cell of the module reads FileAttachment("data-2026.csv"), and no cell carries the data inline.
//   live    — every cell re-run as an observed mirror (anonymous ones mounted in a connected node): a Plot
//             chart whose x domain ends in 2025, whose y domain top is the largest stacked positive year
//             total of data-2026.csv, and whose colour domain holds every source with a value; a table
//             whose value is 225 rows; the summary text names 2025 and that year's rounded total; no
//             displayed text holds NaN or undefined.
//   errors  — no cell errors, anonymous included.
//   saved   — exportToHTML (as a save does), the file carries @user/iowa-energy/data-2026.csv, and booted
//             in a srcdoc frame (own IndexedDB, no network) the `live` checks pass there too.
// M30_NEG=unchanged|nameonly|inline swaps the oracle for a negative control (must score low).
const FIXTURE = "const _1ik2h0q = function _1(md){return(\nmd`# Iowa electricity\n\nOne last example, perhaps slightly more upbeat, is this stacked area chart showing the rise of renewable energy generation in Iowa paired with the decline of coal.`\n)};\nconst _19ta1cx = function _iowa(FileAttachment){return(\nFileAttachment(\"iowa-energy.csv\").csv({typed: true})\n)};\nconst _1f30udn = function _3(energy){return(\nenergy.legend(\"color\")\n)};\nconst _bmm74q = function _energy(Plot,iowa){return(\nPlot.plot({\n  y: {\n    grid: true,\n    label: \"↑ Net generation (million MWh)\",\n    transform: d => d / 1000\n  },\n  marks: [\n    Plot.areaY(iowa, Plot.stackY({x: \"year\", y: \"net_generation\", fill: \"source\", title: \"source\"})),\n    Plot.ruleY([0])\n  ]\n})\n)};\nconst _k3v8qa = function _5(md,d3,iowa)\n{\n  const latest = d3.max(iowa, d => d.year);\n  const rows = iowa.filter(d => +d.year === +latest);\n  const total = d3.sum(rows, d => d.net_generation);\n  return md`In ${latest.getUTCFullYear()} Iowa generated ${Math.round(total).toLocaleString(\"en-US\")} thousand MWh from ${rows.length} sources.`;\n};\nconst _1anzgx4 = function _6(Inputs,iowa){return(\nInputs.table(iowa)\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_1ik2h0q\", null, [\"md\"], _1ik2h0q);\n  $def(\"_19ta1cx\", \"iowa\", [\"FileAttachment\"], _19ta1cx);\n  $def(\"_1f30udn\", null, [\"energy\"], _1f30udn);\n  $def(\"_bmm74q\", \"energy\", [\"Plot\",\"iowa\"], _bmm74q);\n  $def(\"_k3v8qa\", null, [\"md\",\"d3\",\"iowa\"], _k3v8qa);\n  $def(\"_1anzgx4\", null, [\"Inputs\",\"iowa\"], _1anzgx4);\n  return main;\n}\n";
const OLD_CSV = "source,net_generation,year\nhydro-electric pumped storage,,2019-01-01\nother renewables,25560.00679,2019-01-01\nconventional hydroelectric,796.268,2019-01-01\nnuclear,5235.716,2019-01-01\nnatural gas,7684.25267,2019-01-01\npetroleum coke,77.42834,2019-01-01\npetroleum liquids,160.76343,2019-01-01\ncoal,22159.20264,2019-01-01\nother,-0.094,2019-01-01\nhydro-electric pumped storage,,2018-01-01\nother renewables,21556.67517,2018-01-01\nconventional hydroelectric,924.861,2018-01-01\nnuclear,4895.399,2018-01-01\nnatural gas,7340.0697,2018-01-01\npetroleum coke,43.60635,2018-01-01\npetroleum liquids,66.95896,2018-01-01\ncoal,28552.99859,2018-01-01\nother,0,2018-01-01\nhydro-electric pumped storage,,2017-01-01\nother renewables,21587.33885,2017-01-01\nconventional hydroelectric,1033.94,2017-01-01\nnuclear,5213.509,2017-01-01\nnatural gas,4567.44701,2017-01-01\npetroleum coke,42.85974,2017-01-01\npetroleum liquids,103.85958,2017-01-01\ncoal,25358.22958,2017-01-01\nother,2.38239,2017-01-01\nhydro-electric pumped storage,,2016-01-01\nother renewables,20323.86455,2016-01-01\nconventional hydroelectric,916.789,2016-01-01\nnuclear,4702.665,2016-01-01\nnatural gas,2960.94697,2016-01-01\npetroleum coke,38.94751,2016-01-01\npetroleum liquids,238.82519,2016-01-01\ncoal,25198.34695,2016-01-01\nother,12.12133,2016-01-01\nhydro-electric pumped storage,,2015-01-01\nother renewables,18130.77493,2015-01-01\nconventional hydroelectric,960.145,2015-01-01\nnuclear,5243.446,2015-01-01\nnatural gas,2398.13456,2015-01-01\npetroleum coke,46.05657,2015-01-01\npetroleum liquids,64.23549,2015-01-01\ncoal,29811.07488,2015-01-01\nother,5.05103,2015-01-01\nhydro-electric pumped storage,,2014-01-01\nother renewables,16572.99992,2014-01-01\nconventional hydroelectric,878.605,2014-01-01\nnuclear,4152.468,2014-01-01\nnatural gas,1372.51528,2014-01-01\npetroleum coke,84.73765,2014-01-01\npetroleum liquids,59.19126,2014-01-01\ncoal,33732.76536,2014-01-01\nother,0,2014-01-01\nhydro-electric pumped storage,,2013-01-01\nother renewables,15727.03687,2013-01-01\nconventional hydroelectric,749.122,2013-01-01\nnuclear,5320.785,2013-01-01\nnatural gas,1430.01171,2013-01-01\npetroleum coke,72.48763,2013-01-01\npetroleum liquids,68.9686,2013-01-01\ncoal,33302.34512,2013-01-01\nother,0,2013-01-01\nhydro-electric pumped storage,,2012-01-01\nother renewables,14183.42578,2012-01-01\nconventional hydroelectric,766.191,2012-01-01\nnuclear,4346.995,2012-01-01\nnatural gas,1940.88561,2012-01-01\npetroleum coke,17.55517,2012-01-01\npetroleum liquids,89.00189,2012-01-01\ncoal,35331.35111,2012-01-01\nother,,2012-01-01\nhydro-electric pumped storage,,2011-01-01\nother renewables,10869.76862,2011-01-01\nconventional hydroelectric,925.352,2011-01-01\nnuclear,5215.229,2011-01-01\nnatural gas,991.18261,2011-01-01\npetroleum coke,72.23712,2011-01-01\npetroleum liquids,68.78332,2011-01-01\ncoal,38229.35998,2011-01-01\nother,,2011-01-01\nhydro-electric pumped storage,,2010-01-01\nother renewables,9360.48289,2010-01-01\nconventional hydroelectric,948.168,2010-01-01\nnuclear,4450.64,2010-01-01\nnatural gas,1312.19525,2010-01-01\npetroleum coke,74.72224,2010-01-01\npetroleum liquids,79.57509,2010-01-01\ncoal,41282.93732,2010-01-01\nother,,2010-01-01\nhydro-electric pumped storage,,2009-01-01\nother renewables,7588.60074,2009-01-01\nconventional hydroelectric,971.165,2009-01-01\nnuclear,4678.931,2009-01-01\nnatural gas,1184.21725,2009-01-01\npetroleum coke,29.78171,2009-01-01\npetroleum liquids,55.46904,2009-01-01\ncoal,37351.43569,2009-01-01\nother,0.46271,2009-01-01\nhydro-electric pumped storage,,2008-01-01\nother renewables,4251.09909,2008-01-01\nconventional hydroelectric,819.047,2008-01-01\nnuclear,5282.202,2008-01-01\nnatural gas,2163.19133,2008-01-01\npetroleum coke,80.73637,2008-01-01\npetroleum liquids,80.39063,2008-01-01\ncoal,40410.1071,2008-01-01\nother,0.01286,2008-01-01\nhydro-electric pumped storage,,2007-01-01\nother renewables,2907.77529,2007-01-01\nconventional hydroelectric,962.346,2007-01-01\nnuclear,4518.875,2007-01-01\nnatural gas,3090.8786,2007-01-01\npetroleum coke,132.90986,2007-01-01\npetroleum liquids,179.00482,2007-01-01\ncoal,37985.56642,2007-01-01\nother,11.86097,2007-01-01\nhydro-electric pumped storage,,2006-01-01\nother renewables,2454.71716,2006-01-01\nconventional hydroelectric,909.348,2006-01-01\nnuclear,5095.442,2006-01-01\nnatural gas,2400.01438,2006-01-01\npetroleum coke,101.651,2006-01-01\npetroleum liquids,106.66978,2006-01-01\ncoal,34405.19425,2006-01-01\nother,10.4258,2006-01-01\nhydro-electric pumped storage,,2005-01-01\nother renewables,1763.97638,2005-01-01\nconventional hydroelectric,959.526,2005-01-01\nnuclear,4538.313,2005-01-01\nnatural gas,2480.86957,2005-01-01\npetroleum coke,6.75712,2005-01-01\npetroleum liquids,142.81076,2005-01-01\ncoal,34252.33377,2005-01-01\nother,11.57332,2005-01-01\nhydro-electric pumped storage,,2004-01-01\nother renewables,1155.87707,2004-01-01\nconventional hydroelectric,945.959,2004-01-01\nnuclear,4928.948,2004-01-01\nnatural gas,824.70584,2004-01-01\npetroleum coke,33.28656,2004-01-01\npetroleum liquids,75.33304,2004-01-01\ncoal,35272.19635,2004-01-01\nother,11.88315,2004-01-01\nhydro-electric pumped storage,,2003-01-01\nother renewables,1096.14095,2003-01-01\nconventional hydroelectric,788.593,2003-01-01\nnuclear,3987.657,2003-01-01\nnatural gas,312.896,2003-01-01\npetroleum coke,7.878,2003-01-01\npetroleum liquids,93.457,2003-01-01\ncoal,35819.945,2003-01-01\nother,9.62505,2003-01-01\nhydro-electric pumped storage,,2002-01-01\nother renewables,1017.168,2002-01-01\nconventional hydroelectric,946.383,2002-01-01\nnuclear,4573.958,2002-01-01\nnatural gas,554.719,2002-01-01\npetroleum coke,5.807,2002-01-01\npetroleum liquids,58.057,2002-01-01\ncoal,35372.058,2002-01-01\nother,0.234,2002-01-01\nhydro-electric pumped storage,,2001-01-01\nother renewables,591.61225,2001-01-01\nconventional hydroelectric,845.154,2001-01-01\nnuclear,3852.722,2001-01-01\nnatural gas,592.852,2001-01-01\npetroleum coke,3.865,2001-01-01\npetroleum liquids,98.763,2001-01-01\ncoal,34665.095,2001-01-01\nother,8.44875,2001-01-01\n";
const NEW_CSV = "period,state,source,generation\n2019-01-01,IA,hydro-electric pumped storage,\n2019-01-01,IA,other renewables,25560.00679\n2019-01-01,IA,conventional hydroelectric,796.268\n2019-01-01,IA,nuclear,5235.716\n2019-01-01,IA,natural gas,7684.25267\n2019-01-01,IA,petroleum coke,77.42834\n2019-01-01,IA,petroleum liquids,160.76343\n2019-01-01,IA,coal,22159.20264\n2019-01-01,IA,other,-0.094\n2018-01-01,IA,hydro-electric pumped storage,\n2018-01-01,IA,other renewables,21556.67517\n2018-01-01,IA,conventional hydroelectric,924.861\n2018-01-01,IA,nuclear,4895.399\n2018-01-01,IA,natural gas,7340.0697\n2018-01-01,IA,petroleum coke,43.60635\n2018-01-01,IA,petroleum liquids,66.95896\n2018-01-01,IA,coal,28552.99859\n2018-01-01,IA,other,0\n2017-01-01,IA,hydro-electric pumped storage,\n2017-01-01,IA,other renewables,21587.33885\n2017-01-01,IA,conventional hydroelectric,1033.94\n2017-01-01,IA,nuclear,5213.509\n2017-01-01,IA,natural gas,4567.44701\n2017-01-01,IA,petroleum coke,42.85974\n2017-01-01,IA,petroleum liquids,103.85958\n2017-01-01,IA,coal,25358.22958\n2017-01-01,IA,other,2.38239\n2016-01-01,IA,hydro-electric pumped storage,\n2016-01-01,IA,other renewables,20323.86455\n2016-01-01,IA,conventional hydroelectric,916.789\n2016-01-01,IA,nuclear,4702.665\n2016-01-01,IA,natural gas,2960.94697\n2016-01-01,IA,petroleum coke,38.94751\n2016-01-01,IA,petroleum liquids,238.82519\n2016-01-01,IA,coal,25198.34695\n2016-01-01,IA,other,12.12133\n2015-01-01,IA,hydro-electric pumped storage,\n2015-01-01,IA,other renewables,18130.77493\n2015-01-01,IA,conventional hydroelectric,960.145\n2015-01-01,IA,nuclear,5243.446\n2015-01-01,IA,natural gas,2398.13456\n2015-01-01,IA,petroleum coke,46.05657\n2015-01-01,IA,petroleum liquids,64.23549\n2015-01-01,IA,coal,29811.07488\n2015-01-01,IA,other,5.05103\n2014-01-01,IA,hydro-electric pumped storage,\n2014-01-01,IA,other renewables,16572.99992\n2014-01-01,IA,conventional hydroelectric,878.605\n2014-01-01,IA,nuclear,4152.468\n2014-01-01,IA,natural gas,1372.51528\n2014-01-01,IA,petroleum coke,84.73765\n2014-01-01,IA,petroleum liquids,59.19126\n2014-01-01,IA,coal,33732.76536\n2014-01-01,IA,other,0\n2013-01-01,IA,hydro-electric pumped storage,\n2013-01-01,IA,other renewables,15727.03687\n2013-01-01,IA,conventional hydroelectric,749.122\n2013-01-01,IA,nuclear,5320.785\n2013-01-01,IA,natural gas,1430.01171\n2013-01-01,IA,petroleum coke,72.48763\n2013-01-01,IA,petroleum liquids,68.9686\n2013-01-01,IA,coal,33302.34512\n2013-01-01,IA,other,0\n2012-01-01,IA,hydro-electric pumped storage,\n2012-01-01,IA,other renewables,14183.42578\n2012-01-01,IA,conventional hydroelectric,766.191\n2012-01-01,IA,nuclear,4346.995\n2012-01-01,IA,natural gas,1940.88561\n2012-01-01,IA,petroleum coke,17.55517\n2012-01-01,IA,petroleum liquids,89.00189\n2012-01-01,IA,coal,35331.35111\n2012-01-01,IA,other,\n2011-01-01,IA,hydro-electric pumped storage,\n2011-01-01,IA,other renewables,10869.76862\n2011-01-01,IA,conventional hydroelectric,925.352\n2011-01-01,IA,nuclear,5215.229\n2011-01-01,IA,natural gas,991.18261\n2011-01-01,IA,petroleum coke,72.23712\n2011-01-01,IA,petroleum liquids,68.78332\n2011-01-01,IA,coal,38229.35998\n2011-01-01,IA,other,\n2010-01-01,IA,hydro-electric pumped storage,\n2010-01-01,IA,other renewables,9360.48289\n2010-01-01,IA,conventional hydroelectric,948.168\n2010-01-01,IA,nuclear,4450.64\n2010-01-01,IA,natural gas,1312.19525\n2010-01-01,IA,petroleum coke,74.72224\n2010-01-01,IA,petroleum liquids,79.57509\n2010-01-01,IA,coal,41282.93732\n2010-01-01,IA,other,\n2009-01-01,IA,hydro-electric pumped storage,\n2009-01-01,IA,other renewables,7588.60074\n2009-01-01,IA,conventional hydroelectric,971.165\n2009-01-01,IA,nuclear,4678.931\n2009-01-01,IA,natural gas,1184.21725\n2009-01-01,IA,petroleum coke,29.78171\n2009-01-01,IA,petroleum liquids,55.46904\n2009-01-01,IA,coal,37351.43569\n2009-01-01,IA,other,0.46271\n2008-01-01,IA,hydro-electric pumped storage,\n2008-01-01,IA,other renewables,4251.09909\n2008-01-01,IA,conventional hydroelectric,819.047\n2008-01-01,IA,nuclear,5282.202\n2008-01-01,IA,natural gas,2163.19133\n2008-01-01,IA,petroleum coke,80.73637\n2008-01-01,IA,petroleum liquids,80.39063\n2008-01-01,IA,coal,40410.1071\n2008-01-01,IA,other,0.01286\n2007-01-01,IA,hydro-electric pumped storage,\n2007-01-01,IA,other renewables,2907.77529\n2007-01-01,IA,conventional hydroelectric,962.346\n2007-01-01,IA,nuclear,4518.875\n2007-01-01,IA,natural gas,3090.8786\n2007-01-01,IA,petroleum coke,132.90986\n2007-01-01,IA,petroleum liquids,179.00482\n2007-01-01,IA,coal,37985.56642\n2007-01-01,IA,other,11.86097\n2006-01-01,IA,hydro-electric pumped storage,\n2006-01-01,IA,other renewables,2454.71716\n2006-01-01,IA,conventional hydroelectric,909.348\n2006-01-01,IA,nuclear,5095.442\n2006-01-01,IA,natural gas,2400.01438\n2006-01-01,IA,petroleum coke,101.651\n2006-01-01,IA,petroleum liquids,106.66978\n2006-01-01,IA,coal,34405.19425\n2006-01-01,IA,other,10.4258\n2005-01-01,IA,hydro-electric pumped storage,\n2005-01-01,IA,other renewables,1763.97638\n2005-01-01,IA,conventional hydroelectric,959.526\n2005-01-01,IA,nuclear,4538.313\n2005-01-01,IA,natural gas,2480.86957\n2005-01-01,IA,petroleum coke,6.75712\n2005-01-01,IA,petroleum liquids,142.81076\n2005-01-01,IA,coal,34252.33377\n2005-01-01,IA,other,11.57332\n2004-01-01,IA,hydro-electric pumped storage,\n2004-01-01,IA,other renewables,1155.87707\n2004-01-01,IA,conventional hydroelectric,945.959\n2004-01-01,IA,nuclear,4928.948\n2004-01-01,IA,natural gas,824.70584\n2004-01-01,IA,petroleum coke,33.28656\n2004-01-01,IA,petroleum liquids,75.33304\n2004-01-01,IA,coal,35272.19635\n2004-01-01,IA,other,11.88315\n2003-01-01,IA,hydro-electric pumped storage,\n2003-01-01,IA,other renewables,1096.14095\n2003-01-01,IA,conventional hydroelectric,788.593\n2003-01-01,IA,nuclear,3987.657\n2003-01-01,IA,natural gas,312.896\n2003-01-01,IA,petroleum coke,7.878\n2003-01-01,IA,petroleum liquids,93.457\n2003-01-01,IA,coal,35819.945\n2003-01-01,IA,other,9.62505\n2002-01-01,IA,hydro-electric pumped storage,\n2002-01-01,IA,other renewables,1017.168\n2002-01-01,IA,conventional hydroelectric,946.383\n2002-01-01,IA,nuclear,4573.958\n2002-01-01,IA,natural gas,554.719\n2002-01-01,IA,petroleum coke,5.807\n2002-01-01,IA,petroleum liquids,58.057\n2002-01-01,IA,coal,35372.058\n2002-01-01,IA,other,0.234\n2001-01-01,IA,hydro-electric pumped storage,\n2001-01-01,IA,other renewables,591.61225\n2001-01-01,IA,conventional hydroelectric,845.154\n2001-01-01,IA,nuclear,3852.722\n2001-01-01,IA,natural gas,592.852\n2001-01-01,IA,petroleum coke,3.865\n2001-01-01,IA,petroleum liquids,98.763\n2001-01-01,IA,coal,34665.095\n2001-01-01,IA,other,8.44875\n2020-01-01,IA,hydro-electric pumped storage,\n2020-01-01,IA,other renewables,27349.20727\n2020-01-01,IA,conventional hydroelectric,780.34264\n2020-01-01,IA,nuclear,3181.402\n2020-01-01,IA,natural gas,7991.62278\n2020-01-01,IA,petroleum coke,61.94267\n2020-01-01,IA,petroleum liquids,144.68709\n2020-01-01,IA,coal,19500.09832\n2020-01-01,IA,other,-0.084\n2021-01-01,IA,hydro-electric pumped storage,\n2021-01-01,IA,other renewables,29263.65177\n2021-01-01,IA,conventional hydroelectric,764.41728\n2021-01-01,IA,nuclear,0\n2021-01-01,IA,natural gas,8311.28769\n2021-01-01,IA,petroleum coke,49.55414\n2021-01-01,IA,petroleum liquids,130.21838\n2021-01-01,IA,coal,17160.08652\n2021-01-01,IA,other,-0.074\n2022-01-01,IA,hydro-electric pumped storage,\n2022-01-01,IA,other renewables,31312.1074\n2022-01-01,IA,conventional hydroelectric,748.49192\n2022-01-01,IA,nuclear,0\n2022-01-01,IA,natural gas,8643.7392\n2022-01-01,IA,petroleum coke,39.64331\n2022-01-01,IA,petroleum liquids,117.19654\n2022-01-01,IA,coal,15100.87614\n2022-01-01,IA,other,-0.064\n2023-01-01,IA,hydro-electric pumped storage,\n2023-01-01,IA,other renewables,33503.95492\n2023-01-01,IA,conventional hydroelectric,732.56656\n2023-01-01,IA,nuclear,0\n2023-01-01,IA,natural gas,8989.48876\n2023-01-01,IA,petroleum coke,31.71465\n2023-01-01,IA,petroleum liquids,105.47689\n2023-01-01,IA,coal,13288.771\n2023-01-01,IA,other,-0.054\n2024-01-01,IA,hydro-electric pumped storage,\n2024-01-01,IA,other renewables,35849.23176\n2024-01-01,IA,conventional hydroelectric,716.6412\n2024-01-01,IA,nuclear,0\n2024-01-01,IA,natural gas,9349.06831\n2024-01-01,IA,petroleum coke,25.37172\n2024-01-01,IA,petroleum liquids,94.9292\n2024-01-01,IA,coal,11694.11848\n2024-01-01,IA,other,-0.044\n2025-01-01,IA,hydro-electric pumped storage,\n2025-01-01,IA,other renewables,38358.67798\n2025-01-01,IA,conventional hydroelectric,700.71584\n2025-01-01,IA,nuclear,0\n2025-01-01,IA,natural gas,9723.03105\n2025-01-01,IA,petroleum coke,20.29737\n2025-01-01,IA,petroleum liquids,85.43628\n2025-01-01,IA,coal,10290.82427\n2025-01-01,IA,other,-0.034\n";

// expected values, from data-2026.csv
const ROWS = NEW_CSV.trim().split("\n").slice(1).map(l => { const [period, state, source, g] = l.split(","); return { year: +period.slice(0, 4), source, g: g === "" ? null : +g }; });
const YEARS = [...new Set(ROWS.map(r => r.year))];
const LATEST = Math.max(...YEARS);
const LATEST_TOTAL = ROWS.filter(r => r.year === LATEST).reduce((s, r) => s + (r.g ?? 0), 0);
const MAX_STACK = Math.max(...YEARS.map(y => ROWS.filter(r => r.year === y && r.g > 0).reduce((s, r) => s + r.g, 0)));
const SOURCES = [...new Set(ROWS.filter(r => r.g != null).map(r => r.source))];
if (ROWS.length !== 225 || LATEST !== 2025) throw new Error("m30 eval: fixture changed");
const EXPECT = { rows: ROWS.length, latest: LATEST, latestTotal: Math.round(LATEST_TOTAL), maxStack: MAX_STACK, sources: SOURCES };

const MOD = "@user/iowa-energy";
const INIT = String.raw`(async () => {
  const reg = globalThis.__ojs_runtime;
  globalThis.__rc5tBaseMods = [...reg.mains.keys()].filter(k => k !== ${JSON.stringify(MOD)});
  const rt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const v = [...rt._variables].find(v => v._name === "setFileAttachment" && typeof v._value === "function");
  if (!v) throw new Error("init: no setFileAttachment");
  const mod = reg.mains.get(${JSON.stringify(MOD)});
  if (!mod) throw new Error("init: no " + ${JSON.stringify(MOD)});
  await v._value(new File([${JSON.stringify(OLD_CSV)}], "iowa-energy.csv", { type: "text/csv" }), mod);
  await v._value(new File([${JSON.stringify(NEW_CSV)}], "data-2026.csv", { type: "text/csv" }), mod);
  // the user attached the file before asking: wait until the attachment inventory (which re-fetches every
  // file) lists it and the file tools have re-registered, so the first glob does not race the attach
  const listed = () => [...rt._variables].some(x => x._name === "all_module_files" && Array.isArray(x._value) && x._value.some(f => f.name === "data-2026.csv"));
  for (let i = 0; i < 60 && !listed(); i++) await new Promise(r => setTimeout(r, 250));
  await new Promise(r => setTimeout(r, 2000));
})()`;

const COLLECT = String.raw`(async () => {
  const MOD = ${JSON.stringify(MOD)}, EXPECT = ${JSON.stringify(EXPECT)};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  const out = { source: "not run", live: "not run", errors: "not run", saved: "not run", ms: {} };
  const rtOf = reg => [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const own = (mod) => [...mod._runtime._variables].filter(v => v._module === mod && v._definition &&
    !String(v._name ?? "").startsWith("module ") && v._name !== "@variable" && !v.__m30);
  // source: which file the cells read, and whether the data was pasted in
  const sourceCheck = (defs) => {
    const reads = defs.some(s => /FileAttachment\s*\(\s*["'\x60]data-2026\.csv["'\x60]\s*\)/.test(s));
    const inline = defs.some(s => /38358\.67798|10290\.82427|2025-01-01,IA/.test(s));
    return inline ? "the new data is pasted into a cell" : reads ? "ok" : "no cell reads FileAttachment(\"data-2026.csv\")";
  };
  const hosts = [];
  // an observer that records the outcome (runtime 6 keeps no error on the variable) and mounts elements
  // of anonymous cells in a connected .observablehq node, as a page shows them
  const recorder = (doc, x, mount) => ({ pending() {}, rejected(e) { x.err = e; x.done = true; }, fulfilled(v) {
    x.err = null; x.done = true;
    if (mount && v && v.nodeType === 1 && !v.isConnected) {
      let host = hosts.find(h => h.ownerDocument === doc);
      if (!host) { host = doc.createElement("div"); host.style.cssText = "position:fixed;left:-20000px;top:0;width:900px"; doc.body.appendChild(host); hosts.push(host); }
      const w = doc.createElement("div"); w.className = "observablehq"; w.appendChild(v); host.appendChild(w);
    }
  } });
  // re-run every cell as an observed mirror; anon (optional) = anonymous cells to use instead of the module's own
  const render = async (mod, doc, deadline, anon) => {
    const cells = own(mod).filter(v => !(anon && !v._name)).map(v => ({ name: v._name, inputs: (v._inputs || []).map(i => i._name), fn: v._definition }))
      .concat((anon || []).map(c => ({ name: null, inputs: c.inputs, fn: c.fn })));
    const mirrors = cells.map(c => {
      const x = { name: c.name, inputs: c.inputs, done: false, err: null };
      x.m = mod.variable(recorder(doc, x, !c.name)); x.m.__m30 = true;
      try { c.name ? x.m.define([c.name], v => v) : x.m.define(c.inputs, c.fn); } catch (e) { x.err = e; x.done = true; }
      return x;
    });
    try { mod._runtime._computeSoon?.(); } catch {}
    while (!mirrors.every(x => x.done) && Date.now() < deadline) await sleep(200);
    await sleep(600);
    for (const x of mirrors) if (!x.done) x.err = new Error("did not settle");
    return mirrors;
  };
  const yearOf = x => typeof x?.getUTCFullYear === "function" ? x.getUTCFullYear() : typeof x === "number" && x > 1000 && x < 3000 ? x : typeof x === "string" ? +x.slice(0, 4) : NaN;
  const near = (a, b) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 0.01);
  const display = (mirrors) => {
    const errs = mirrors.filter(x => x.err != null).map(x => (x.name || "<anon " + (x.inputs || []).join(",") + ">") + ": " + String(x.err?.message ?? x.err).slice(0, 120));
    const vals = mirrors.map(x => x.m._value);
    const els = vals.filter(v => v && v.nodeType === 1);
    const bad = [];
    // chart: a Plot figure with scales
    const plots = els.flatMap(e => [e, ...e.querySelectorAll("svg, figure")]).filter(e => typeof e.scale === "function" && (() => { try { return e.scale("x") && e.scale("y"); } catch { return false; } })());
    const chartFacts = plots.map(p => {
      const x = p.scale("x").domain, y = p.scale("y").domain; let c = []; try { c = p.scale("color")?.domain || []; } catch {}
      return { xmax: Math.max(...x.map(yearOf)), ymax: Math.max(...y.map(Number)), colors: c.map(String) };
    });
    const chartOk = chartFacts.some(f => f.xmax === EXPECT.latest && (near(f.ymax, EXPECT.maxStack / 1000) || near(f.ymax, EXPECT.maxStack)) && EXPECT.sources.every(s => f.colors.includes(s)));
    if (!chartFacts.length) bad.push("no Plot chart"); else if (!chartOk) bad.push("chart does not show data-2026.csv: " + JSON.stringify(chartFacts).slice(0, 240) + " want xmax " + EXPECT.latest + " ymax " + (EXPECT.maxStack / 1000).toFixed(3));
    // table
    const tables = els.flatMap(e => [e, ...e.querySelectorAll("form")]).filter(e => e.querySelector?.("table") && Array.isArray(e.value));
    const tableFacts = tables.map(t => t.value.length);
    if (!tables.length) bad.push("no table"); else if (!tableFacts.includes(EXPECT.rows)) bad.push("table rows " + tableFacts.join(",") + ", want " + EXPECT.rows);
    // summary text + NaN/undefined anywhere
    const texts = els.filter(e => !e.querySelector("table")).map(e => e.textContent);
    const all = texts.join(" | ");
    const nums = (all.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(s => +s.replace(/,/g, ""));
    const summaryOk = /\b2025\b/.test(all) && nums.some(n => Math.abs(n - EXPECT.latestTotal) <= 1);
    if (!summaryOk) bad.push("no text names 2025 and its total " + EXPECT.latestTotal + ": " + texts.filter(t => /generat/i.test(t)).map(t => t.slice(0, 160)).join(" / "));
    const tableText = els.flatMap(e => [...e.querySelectorAll("table")]).map(t => t.textContent).join(" ");
    if (/\bNaN\b|\bundefined\b/.test(all + " " + tableText)) bad.push("a display shows NaN or undefined");
    return { verdict: bad.length ? bad.join("; ") : "ok", errors: errs, charts: chartFacts, tables: tableFacts };
  };
  const reg = globalThis.__ojs_runtime;
  const mod = reg.mains.get(MOD);
  if (!mod) { out.source = out.live = out.saved = "no " + MOD; return out; }
  out.source = sourceCheck(own(mod).map(v => String(v._definition)));
  // 1. export before anything below touches the page
  let html = null;
  try {
    const rt = rtOf(reg);
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const r = await f({ mains: reg.mains });
    html = typeof r === "string" ? r : r.source;
    out.exportBytes = html.length;
  } catch (e) { out.saved = "export threw: " + (e?.message ?? e); }
  out.ms.export = Date.now() - t0;
  // 2. live
  let ms = [];
  try {
    ms = await render(mod, document, Date.now() + 8000);
    const d = display(ms);
    out.live = d.verdict; out.errors = d.errors.length ? d.errors.join("; ") : "none"; out.liveFacts = { charts: d.charts, tables: d.tables };
  } finally { for (const x of ms) { try { x.m.delete(); } catch {} } }
  out.ms.live = Date.now() - t0;
  // 3. saved file, reopened
  if (html) {
    let frame;
    try {
      const doc0 = new DOMParser().parseFromString(html, "text/html");
      const att = doc0.getElementById(MOD + "/data-2026.csv");
      const block = doc0.getElementById(MOD);
      if (!att) out.saved = "the saved file has no " + MOD + "/data-2026.csv";
      else if (!block) out.saved = "the saved file has no " + MOD + " module";
      else {
        // anonymous cells read from the saved block (a headless reopen may not keep them as variables)
        const url = URL.createObjectURL(new Blob([block.textContent], { type: "text/javascript" }));
        const define = (await import(url)).default;
        const anon = [];
        const rec = { define(...a) { const [name, inputs, fn] = a.length >= 3 ? a : a.length === 2 ? (typeof a[0] === "string" ? [a[0], [], a[1]] : [null, a[0], a[1]]) : [null, [], a[0]]; if (name == null) anon.push({ inputs, fn }); return this; } };
        const fakeMod = { variable: () => Object.create(rec), define: (...a) => Object.create(rec).define(...a), builtin() {}, import() { return this; } };
        try { define({ module: () => fakeMod, fileAttachments: () => null }, () => undefined); } catch {}
        const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
        // own IndexedDB per frame: a srcdoc frame shares the parent's origin (see rc5t-extract-helpers)
        const freshIdb = "<script>{const o=IDBFactory.prototype.open;const s='-rc5t-'+Math.random().toString(36).slice(2);IDBFactory.prototype.open=function(n,...a){return o.call(this,n+s,...a)}}<\/script>";
        const h2 = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp + freshIdb) : csp + freshIdb + html;
        frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;left:0;top:0;width:900px;height:700px;z-index:2147483647;background:#fff";
        frame.srcdoc = h2;
        document.body.appendChild(frame);
        const deadline = t0 + 27000;
        while (Date.now() < deadline && !(frame.contentWindow?.__ojs_runtime?.mains?.get?.(MOD))) await sleep(250);
        const r2 = frame.contentWindow?.__ojs_runtime;
        const m2 = r2?.mains?.get?.(MOD);
        if (!m2) out.saved = "saved notebook did not boot " + MOD;
        else {
          await sleep(1500);
          const src2 = sourceCheck([block.textContent]);
          let ms2 = [];
          try {
            ms2 = await render(m2, frame.contentDocument, Math.min(deadline, Date.now() + 8000), anon);
            const d2 = display(ms2);
            out.savedFacts = { charts: d2.charts, tables: d2.tables };
            out.saved = src2 !== "ok" ? "saved source: " + src2 : d2.errors.length ? "errors: " + d2.errors.join("; ").slice(0, 300) : d2.verdict;
          } finally { for (const x of ms2) { try { x.m.delete(); } catch {} } }
        }
      }
    } catch (e) { out.saved = "saved check threw: " + (e?.message ?? e); }
    finally { frame?.remove(); }
  }
  for (const h of hosts) { try { h.remove(); } catch {} }
  out.ms.total = Date.now() - t0;
  return out;
})()`;

// --- oracle: the chart and summary read the new column names; the data cell reads data-2026.csv
const FIXED = FIXTURE
  .replace(`FileAttachment("iowa-energy.csv")`, `FileAttachment("data-2026.csv")`)
  .replace(`Plot.stackY({x: "year", y: "net_generation", fill: "source", title: "source"})`, `Plot.stackY({x: "period", y: "generation", fill: "source", title: "source"})`)
  .replace(`d3.max(iowa, d => d.year)`, `d3.max(iowa, d => d.period)`)
  .replace(`+d.year === +latest`, `+d.period === +latest`)
  .replace(`d3.sum(rows, d => d.net_generation)`, `d3.sum(rows, d => d.generation)`);
if (FIXED.split("\n").filter((l, i) => l !== FIXTURE.split("\n")[i]).length !== 5) throw new Error("m30 eval: FIXED did not apply 5 edits");
const NAME_ONLY = FIXTURE.replace(`FileAttachment("iowa-energy.csv")`, `FileAttachment("data-2026.csv")`);
const INLINE = FIXED.replace(`FileAttachment("data-2026.csv").csv({typed: true})`, "d3.csvParse(" + JSON.stringify(NEW_CSV) + ", d3.autoType)")
  .replace(`function _iowa(FileAttachment)`, `function _iowa(d3)`).replace(`"iowa", ["FileAttachment"]`, `"iowa", ["d3"]`);
const FILE = "/src/" + MOD + ".js";
const NEG = process.env.M30_NEG || "";
const oracle =
  NEG === "unchanged" ? []
  : NEG === "nameonly" ? [{ tool: "write_file", args: { file_path: FILE, content: NAME_ONLY }, settleMs: 3000 }]
  : NEG === "inline" ? [{ tool: "write_file", args: { file_path: FILE, content: INLINE }, settleMs: 3000 }]
  : [{ tool: "write_file", args: { file_path: FILE, content: FIXED }, settleMs: 3000 }];

export default {
  id: "rc5t-data-file-swap",
  category: "rc5-train",
  question: "I've attached a newer version of my data file (data-2026.csv). Switch the notebook over to it. Some of the columns were renamed.",
  setup: { files: { [FILE]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "live", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "saved", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "source", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
    // the harness defect: the module's attachments were listed under /content/main/ (all_module_files names
    // a page-created module "main"), so glob /content/@user/iowa-energy/* found nothing and the agent
    // spent 4 of 12 steps on the path (20260928-0847-m30 base run)
    { name: "no_tool_result_matches", args: { pattern: "/content/main/" }, weight: 1 },
  ],
  oracle,
};
