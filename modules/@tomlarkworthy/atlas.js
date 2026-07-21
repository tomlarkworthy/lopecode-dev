const _ssnlir = function _1(md){return(
md`# Atlas: Runtime Overview`
)};
const _d7v1r6 = function _2(atlas){return(
atlas()
)};
const _1dmkyu5 = function _3(md){return(
md`### About

Get an overview of the currently running Runtime. Shows all the notebooks/modules and their interconnections, and offers hyperlinks to them

- on [Observable.com](https://observablehq.com/@tomlarkworthy/atlas)
- on [Lopecode](https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_atlas.html)`
)};
const _fo8b49 = function _ascending(){return(
(a, b) => (a < b ? -1 : a > b ? 1 : 0)
)};
const _2l2xc3 = function _sortVarsByNameAndId(ascending){return(
(varId) => (a, b) =>
  ascending(String(a?._name ?? ""), String(b?._name ?? "")) || ascending(varId(a), varId(b))
)};
const _7v0mnv = function _makeVarId(){return(
() => {
  let next = 1;
  const wm = new WeakMap();
  return (v) => {
    if (!v || (typeof v !== "object" && typeof v !== "function")) return 0;
    let id = wm.get(v);
    if (!id) wm.set(v, (id = next++));
    return id;
  };
}
)};
const _1om7oda = function _isDisplayName(){return(
(name, { showAnonymous = false } = {}) => {
  if (name == null) return false;
  if (typeof name !== "string") return false;
  if (!showAnonymous && name.trim() === "") return false;
  if (!showAnonymous && (name.startsWith("module ") || name.startsWith("dynamic "))) return false;
  return true;
}
)};
const _sm59vx = function _isDisplayVar(){return(
(
  v,
  { includeVariable = () => true, showAnonymous = false } = {}
) => {
  try {
    if (!v) return false;
    if (!includeVariable(v)) return false;
    const name = v._name;
    if (!showAnonymous && (name == null || typeof name !== "string")) return false;
    if (typeof name === "string") {
      if (name === "@variable") return false;
      if (!showAnonymous && (name.startsWith("module ") || name.startsWith("dynamic "))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
)};
const _zavtuv = function _safeLinkTo(){return(
(linkToFn, s) => {
  if (typeof linkToFn !== "function") return undefined;
  try {
    return linkToFn(s);
  } catch {
    return undefined;
  }
}
)};
const _y22gp6 = function _safeVarHref(safeLinkTo){return(
(linkToFn, moduleName, varName) => {
  if (typeof varName !== "string" || !varName.length) return safeLinkTo(linkToFn, moduleName);
  const attempt1 = safeLinkTo(linkToFn, `${moduleName}#${varName}`);
  if (attempt1) return attempt1;
  return safeLinkTo(linkToFn, moduleName);
}
)};
const _1n6frvb = function _moduleNameOf(){return(
(moduleMapResult, m) => {
  const rec = moduleMapResult?.get?.(m);
  const name = rec?.name;
  if (typeof name === "string" && name.trim().length) return name;
  return "<unknown>";
}
)};
const _istnoy = function _kindColor(){return(
(kind) =>
  ({
    import: "#1f77b4",
    export: "#2ca02c",
    both: "#9467bd",
    empty: "#999",
    spacer: "#0000"
  }[kind] ?? "#999")
)};
const _175aecg = function _buildCSRLocal(){return(
(n, edges) => {
  const adj = Array.from({ length: n }, () => []);
  for (const [a0, b0] of edges) {
    const a = a0 | 0,
      b = b0 | 0;
    if (a === b) continue;
    if (a < 0 || b < 0 || a >= n || b >= n) continue;
    adj[a].push(b);
    adj[b].push(a);
  }

  const deg = new Float64Array(n);
  let nnz = 0;

  for (let i = 0; i < n; i++) {
    const row = adj[i];
    row.sort((x, y) => x - y);
    let w = 0;
    for (let j = 0; j < row.length; j++) if (w === 0 || row[j] !== row[w - 1]) row[w++] = row[j];
    row.length = w;
    deg[i] = w;
    nnz += w;
  }

  const rowPtr = new Int32Array(n + 1);
  const colIdx = new Int32Array(nnz);
  const val = new Float64Array(nnz);

  let p = 0;
  for (let i = 0; i < n; i++) {
    rowPtr[i] = p;
    const row = adj[i];
    for (let j = 0; j < row.length; j++) {
      colIdx[p] = row[j];
      val[p] = 1;
      p++;
    }
  }
  rowPtr[n] = p;

  return { n, rowPtr, colIdx, val, deg };
}
)};
const _1lkv1ox = function _crossingsCountLine(){return(
(n, edges, order) => {
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i] | 0] = i;

  const intervals = [];
  for (const [a0, b0] of edges) {
    const a = a0 | 0,
      b = b0 | 0;
    if (a === b) continue;
    const i = pos[a],
      j = pos[b];
    const s = Math.min(i, j),
      t = Math.max(i, j);
    if (s === t) continue;
    intervals.push([s, t]);
  }

  intervals.sort((p, q) => p[0] - q[0] || p[1] - q[1]);

  const bit = new Int32Array(n + 1);
  const add = (i) => {
    for (let x = i + 1; x <= n; x += x & -x) bit[x]++;
  };
  const sum = (i) => {
    let s = 0;
    for (let x = i + 1; x > 0; x -= x & -x) s += bit[x];
    return s;
  };
  const range = (l, r) => (r < l ? 0 : sum(r) - (l > 0 ? sum(l - 1) : 0));

  let crossings = 0;
  let k = 0;
  while (k < intervals.length) {
    const s = intervals[k][0];
    let k2 = k;
    while (k2 < intervals.length && intervals[k2][0] === s) k2++;
    for (let t = k; t < k2; t++) crossings += range(s + 1, intervals[t][1] - 1);
    for (let t = k; t < k2; t++) add(intervals[t][1]);
    k = k2;
  }
  return crossings;
}
)};
const _tm9oti = function _chooseBestCut(crossingsCountLine){return(
(circle, n, undirectedEdges) => {
  if (n <= 2 || undirectedEdges.length === 0) return circle;
  let best = null;
  let bestC = Infinity;

  for (let k = 0; k < n; k++) {
    const ord = circle.slice(k).concat(circle.slice(0, k));
    const c = crossingsCountLine(n, undirectedEdges, ord);
    if (c < bestC || (c === bestC && k < (best?.k ?? Infinity))) best = { k, ord, c }, (bestC = c);
    if (bestC === 0) break;
  }
  return best?.ord ?? circle;
}
)};
const _tpgtvd = function _tension(Inputs){return(
Inputs.range([0, 1], { value: 1, label: "tension" })
)};
const _ieuxkk = (G, _) => G.input(_);
const _p8o943 = function _atlas(width,isOnObservableCom,moduleMap,runtime_variables,makeVarId,expand_unreachable_imports,moduleNameOf,isDisplayVar,d3,spectralCircleOrder,buildCSRLocal,improveOrderSifting,bestOfRandomOrders,crossingsCountLine,chooseBestCut,sortVarsByNameAndId,safeLinkTo,linkTo,safeVarHref,Plot,foreground,tension,kindColor){return(
async ({
  useSpectral = true,
  showBuiltins = false,
  showAnonymous = false,
  includeModule = () => true,
  includeVariable = () => true,
  height: _height = undefined,
  width: _width = width ?? 960,
  boxWidth = 300,
  portLabelWidth = 280,
  arcWidth = 700,
  rowHeight = 14,
  moduleGap = 14,
  rowGap = 2,
  tubeCorner = "round"
} = {}) => {
  const target =
    typeof isOnObservableCom === "function" && isOnObservableCom()
      ? "_blank"
      : undefined;

  const moduleMapResult = await moduleMap();
  const allVars = runtime_variables;
  const varId = makeVarId();
  expand_unreachable_imports();

  const varEdgesRaw = [];
  const seenVarEdge = new Set();
  const moduleNameOfLocal = (m) => moduleNameOf(moduleMapResult, m);
  const isDisplayVarLocal = (v) =>
    isDisplayVar(v, { includeVariable, showAnonymous });

  for (const v of allVars) {
    if (!isDisplayVarLocal(v)) continue;
    const vMod = v._module;
    const inputs = Array.from(v._inputs ?? []);
    for (const u of inputs) {
      if (!u) continue;
      if (u._module === vMod) continue;
      if (!isDisplayVarLocal(u)) continue;
      const fromName = moduleNameOfLocal(u._module);
      const toName = moduleNameOfLocal(vMod);
      if (!showBuiltins && (fromName === "builtin" || toName === "builtin"))
        continue;
      const id = varId(u);
      const k = `${fromName}|${toName}|${id}`;
      if (seenVarEdge.has(k)) continue;
      seenVarEdge.add(k);
      varEdgesRaw.push({
        fromModule: u._module,
        toModule: vMod,
        fromModuleName: fromName,
        toModuleName: toName,
        exportedVar: u,
        exportedVarName: u._name,
        exportedVarId: id,
        importingVar: v
      });
    }
  }

  const moduleSet = new Set();
  for (const v of allVars) if (v?._module) moduleSet.add(v._module);
  for (const e of varEdgesRaw) {
    moduleSet.add(e.fromModule);
    moduleSet.add(e.toModule);
  }

  let modules = Array.from(moduleSet, (m) => ({
    module: m,
    name: moduleNameOfLocal(m),
    info: moduleMapResult.get(m)
  }))
    .filter((d) => d.name && d.name !== "<unknown>")
    .filter((d) => showBuiltins || d.name !== "builtin")
    .filter((d) => includeModule(d));

  const uniqByName = new Map();
  for (const m of modules)
    if (!uniqByName.has(m.name)) uniqByName.set(m.name, m);
  modules = Array.from(uniqByName.values());
  modules.sort((a, b) => d3.ascending(a.name, b.name));

  const n = modules.length;
  const indexOf = new Map(modules.map((m, i) => [m.module, i]));

  const undirectedEdges = [];
  const seenModEdge = new Set();
  for (const e of varEdgesRaw) {
    const i = indexOf.get(e.fromModule);
    const j = indexOf.get(e.toModule);
    if (i == null || j == null || i === j) continue;
    const a = Math.min(i, j),
      b = Math.max(i, j);
    const k = `${a},${b}`;
    if (seenModEdge.has(k)) continue;
    seenModEdge.add(k);
    undirectedEdges.push([a, b]);
  }

  const chosenModuleByName = new Map(modules.map((m) => [m.name, m.module]));
  const filteredEdges = varEdgesRaw.filter(
    (e) =>
      chosenModuleByName.get(e.fromModuleName) === e.fromModule &&
      chosenModuleByName.get(e.toModuleName) === e.toModule
  );

  const moduleNamesAll = modules.map((m) => m.name);
  const moduleImportsFrom = new Map(
    moduleNamesAll.map((name) => [name, new Set()])
  );
  const moduleExportsTo = new Map(
    moduleNamesAll.map((name) => [name, new Set()])
  );

  for (const e of filteredEdges) {
    moduleImportsFrom.get(e.toModuleName)?.add(e.fromModuleName);
    moduleExportsTo.get(e.fromModuleName)?.add(e.toModuleName);
  }

  const moduleClassByName = new Map();
  for (const name of moduleNamesAll) {
    const imp = moduleImportsFrom.get(name)?.size ?? 0;
    const exp = moduleExportsTo.get(name)?.size ?? 0;
    const cls =
      exp > 0 && imp === 0
        ? "exportOnly"
        : imp > 0 && exp === 0
        ? "importOnly"
        : exp > 0 && imp > 0
        ? "both"
        : "isolated";
    moduleClassByName.set(name, cls);
  }

  const orderGroup = (idxs) => {
    const idxArr = Array.from(idxs);
    if (idxArr.length <= 1) return idxArr;

    idxArr.sort((a, b) => d3.ascending(modules[a].name, modules[b].name));
    if (!useSpectral || typeof spectralCircleOrder !== "function")
      return idxArr;
    if (idxArr.length <= 2) return idxArr;

    const set = new Set(idxArr);
    const mapLocal = new Map(idxArr.map((v, i) => [v, i]));
    const subEdges = [];
    for (const [a, b] of undirectedEdges) {
      if (!set.has(a) || !set.has(b)) continue;
      subEdges.push([mapLocal.get(a), mapLocal.get(b)]);
    }
    if (!subEdges.length) return idxArr;

    try {
      const k = idxArr.length;
      const csr = buildCSRLocal(k, subEdges);
      const spectral = spectralCircleOrder(csr, {
        alpha: 0.92,
        maxIters: 80,
        tol: 0.0001,
        seed: 1,
        passesOrtho: 1
      });
      let order = spectral.order;

      if (typeof improveOrderSifting === "function") {
        const sifted = improveOrderSifting(k, subEdges, order, {
          passes: 1,
          vertexSequence: "order"
        });
        order = sifted.order ?? order;
      }

      if (typeof bestOfRandomOrders === "function") {
        const cOrder = crossingsCountLine(k, subEdges, Int32Array.from(order));
        const baseline = bestOfRandomOrders(k, subEdges, {
          R: Math.min(k, 12),
          seed: 1,
          postSiftPasses: 0
        });
        if (baseline?.order && baseline.crossings < cOrder)
          order = baseline.order;
      }

      const circle = Array.from(Int32Array.from(order));
      const linear = chooseBestCut(circle, k, subEdges);
      return linear.map((li) => idxArr[li]);
    } catch {
      return idxArr;
    }
  };

  const exporters = [];
  const both = [];
  const importers = [];
  const isolated = [];

  for (let i = 0; i < n; i++) {
    const cls = moduleClassByName.get(modules[i].name);
    if (cls === "exportOnly") exporters.push(i);
    else if (cls === "importOnly") importers.push(i);
    else if (cls === "both") both.push(i);
    else isolated.push(i);
  }

  const linearOrderIdx = [
    ...orderGroup(importers),
    ...orderGroup(both),
    ...orderGroup(exporters),
    ...orderGroup(isolated)
  ];

  const orderedModules = linearOrderIdx.map((i) => modules[i]);
  const moduleNamesOrdered = orderedModules.map((m) => m.name);

  const importsByModule = new Map(
    moduleNamesOrdered.map((name) => [name, new Map()])
  );
  const exportsByModule = new Map(
    moduleNamesOrdered.map((name) => [name, new Map()])
  );

  for (const e of filteredEdges) {
    const impMap = importsByModule.get(e.toModuleName);
    const expMap = exportsByModule.get(e.fromModuleName);
    if (impMap) impMap.set(e.exportedVarId, e.exportedVar);
    if (expMap) expMap.set(e.exportedVarId, e.exportedVar);
  }

  const rows = [];
  const moduleBoxes = [];
  const importY = new Map();
  const exportY = new Map();

  const rowIdFor = (moduleName, kind, v) => {
    const vid = v ? varId(v) : 0;
    const vn = v?._name ?? "";
    return `${moduleName}::${kind}::${vn}::${vid}`;
  };

  let y = 0;
  const sortVars = sortVarsByNameAndId(varId);

  for (let mi = 0; mi < orderedModules.length; mi++) {
    const m = orderedModules[mi];
    const mname = m.name;
    const imp = importsByModule.get(mname) ?? new Map();
    const exp = exportsByModule.get(mname) ?? new Map();
    const expIds = new Set(exp.keys());
    const impIds = new Set(imp.keys());
    const bothIds = new Set([...impIds].filter((id) => expIds.has(id)));

    const importsOnly = [...imp.entries()]
      .filter(([id]) => !bothIds.has(id))
      .map(([, v]) => v);
    const bothVars = [...bothIds]
      .map((id) => imp.get(id) ?? exp.get(id))
      .filter(Boolean);
    const exportsOnly = [...exp.entries()]
      .filter(([id]) => !bothIds.has(id))
      .map(([, v]) => v);

    importsOnly.sort(sortVars);
    bothVars.sort(sortVars);
    exportsOnly.sort(sortVars);

    const moduleHref = safeLinkTo(linkTo, mname);

    const addRow = (kind, v) => {
      const vid = v ? varId(v) : 0;
      const id = rowIdFor(mname, kind, v);
      const label =
        kind === "title" ? mname : kind === "empty" ? "" : v?._name ?? "";
      const href =
        kind === "spacer"
          ? undefined
          : kind === "title" || kind === "empty"
          ? moduleHref
          : safeVarHref(linkTo, mname, label) ?? moduleHref;

      const payload =
        kind === "spacer"
          ? { type: "spacer", moduleName: mname }
          : kind === "title" || kind === "empty"
          ? { type: "module", moduleName: mname, module: m.module }
          : { type: "port", moduleName: mname, kind, varName: label, var: v };

      const row = {
        rowId: id,
        moduleName: mname,
        moduleIndex: mi,
        kind,
        var: v,
        varName: label,
        varId: vid,
        y,
        x: 0,
        href,
        payload
      };

      rows.push(row);

      if ((kind === "import" || kind === "both") && v)
        importY.set(`${mname}|${vid}`, y);
      if ((kind === "export" || kind === "both") && v)
        exportY.set(`${mname}|${vid}`, y);

      y++;
    };

    const yStart = y;
    addRow("title", null);

    if (importsOnly.length + bothVars.length + exportsOnly.length === 0) {
      addRow("empty", null);
    } else {
      for (const v of importsOnly) addRow("import", v);
      for (const v of bothVars) addRow("both", v);
      for (const v of exportsOnly) addRow("export", v);
    }

    const yEnd = y - 1;
    const cls = moduleClassByName.get(mname) ?? "isolated";

    moduleBoxes.push({
      type: "module",
      moduleName: mname,
      module: m.module,
      moduleIndex: mi,
      moduleClass: cls,
      x1: 10,
      x2: 10 + boxWidth,
      yStartRow: yStart,
      yEndRow: yEnd,
      href: moduleHref,
      payload: { type: "module", moduleName: mname, module: m.module }
    });

    addRow("spacer", null);
  }

  if (rows.length && rows[rows.length - 1].kind === "spacer") {
    rows.pop();
    y--;
  }

  const totalRows = rows.length;
  const paddingTop = 20;
  const paddingBottom = 20;

  const topOfRow = new Float64Array(totalRows);
  const bottomOfRow = new Float64Array(totalRows);
  const centerOfRow = new Float64Array(totalRows);

  let edgeY = paddingTop;
  for (let i = 0; i < totalRows; i++) {
    const rh = rows[i].kind === "spacer" ? 0 : rowHeight;
    topOfRow[i] = edgeY;
    bottomOfRow[i] = edgeY + rh;
    centerOfRow[i] = edgeY + rh / 2;
    const gap = rows[i].kind === "spacer" ? moduleGap : rowGap;
    edgeY = bottomOfRow[i] + gap;
  }

  const contentBottom = totalRows ? bottomOfRow[totalRows - 1] : paddingTop;
  const computedHeight = Math.ceil(contentBottom + paddingBottom);
  const height = _height ?? computedHeight;

  const xBoxLeft = 10;
  const xBoxRight = xBoxLeft + boxWidth;
  const xPorts = xBoxRight;
  const xLabelsInside = xBoxRight - 10;
  const minWidth = xBoxRight + 10 + arcWidth + 30;
  const plotWidth = Math.max(_width ?? minWidth, minWidth);

  const yPx = (yIndex) => centerOfRow[yIndex] ?? paddingTop;
  const rowYpx = (row) => yPx(row.y);
  const boxY1px = (box) => topOfRow[box.yStartRow] ?? paddingTop;
  const boxY2px = (box) => bottomOfRow[box.yEndRow] ?? paddingTop;

  const titleRows = rows.filter((r) => r.kind === "title");
  const emptyRows = rows.filter((r) => r.kind === "empty");
  const portRows = rows.filter(
    (r) => r.kind === "import" || r.kind === "export" || r.kind === "both"
  );

  const portPoints = portRows.map((r) => ({ ...r, x: xPorts, yPx: rowYpx(r) }));
  const labelPoints = portPoints.map((r) => ({ ...r, x: xLabelsInside }));
  const titlePoints = titleRows.map((r) => ({
    ...r,
    x: xBoxLeft + 8,
    yPx: rowYpx(r)
  }));
  const titleHotspots = titleRows.map((r) => ({
    ...r,
    x: xBoxLeft + boxWidth / 2,
    yPx: rowYpx(r)
  }));
  const emptyPoints = emptyRows.map((r) => ({
    ...r,
    x: xBoxLeft + 8,
    yPx: rowYpx(r)
  }));

  const exportingTo = new Map();
  const importingFrom = new Map();
  const addConn = (map, key, name) => {
    let s = map.get(key);
    if (!s) map.set(key, (s = new Set()));
    s.add(name);
  };

  const links = [];
  const seenLink = new Set();
  const xOutFromDeltaY = (y1Px, y2Px) => {
    const dy = Math.abs(y2Px - y1Px);
    const denom = Math.max(1, height - paddingTop - paddingBottom);
    const minOut = xPorts + 20;
    const maxOut = Math.min(plotWidth - 20, minOut + arcWidth);
    const span = Math.max(0, maxOut - minOut);
    const t = Math.max(0, Math.min(1, dy / denom));
    return minOut + t * span;
  };

  for (const e of filteredEdges) {
    const fromName = e.fromModuleName;
    const toName = e.toModuleName;
    const id = e.exportedVarId;

    addConn(exportingTo, `${fromName}|${id}`, toName);
    addConn(importingFrom, `${toName}|${id}`, fromName);

    const y1 = exportY.get(`${fromName}|${id}`);
    const y2 = importY.get(`${toName}|${id}`);
    if (y1 == null || y2 == null) continue;
    if (y1 === y2) continue;

    const k = `${fromName}|${toName}|${id}`;
    if (seenLink.has(k)) continue;
    seenLink.add(k);

    const y1Px = yPx(y1);
    const y2Px = yPx(y2);

    links.push({
      type: "link",
      linkKey: k,
      fromModuleName: fromName,
      toModuleName: toName,
      varName: e.exportedVarName ?? "",
      var: e.exportedVar,
      y1Px,
      y2Px,
      x: xPorts,
      xOut: xOutFromDeltaY(y1Px, y2Px),
      href:
        safeVarHref(linkTo, fromName, e.exportedVarName) ??
        safeLinkTo(linkTo, fromName),
      payload: {
        type: "link",
        fromModuleName: fromName,
        toModuleName: toName,
        varName: e.exportedVarName,
        exportedVar: e.exportedVar
      }
    });
  }

  const tubePoints = links.flatMap((l) => {
    const x0 = xPorts;
    const x1 = l.xOut;
    const y1 = l.y1Px;
    const y2 = l.y2Px;
    return [
      {
        linkKey: l.linkKey,
        fromModuleName: l.fromModuleName,
        toModuleName: l.toModuleName,
        t: 0,
        x: x0,
        y: y1
      },
      {
        linkKey: l.linkKey,
        fromModuleName: l.fromModuleName,
        toModuleName: l.toModuleName,
        t: 1,
        x: x1,
        y: y1
      },
      {
        linkKey: l.linkKey,
        fromModuleName: l.fromModuleName,
        toModuleName: l.toModuleName,
        t: 2,
        x: x1,
        y: y2
      },
      {
        linkKey: l.linkKey,
        fromModuleName: l.fromModuleName,
        toModuleName: l.toModuleName,
        t: 3,
        x: x0,
        y: y2
      }
    ];
  });

  const linkHotspots = links.map((l) => ({
    ...l,
    x: l.xOut,
    yPx: (l.y1Px + l.y2Px) / 2
  }));

  const portTitle = (d) => {
    if (!d || (d.kind !== "import" && d.kind !== "export" && d.kind !== "both"))
      return "";
    const moduleName = d.moduleName ?? "<unknown>";
    const cellName =
      typeof d.varName === "string" && d.varName.length
        ? d.varName
        : "(anonymous)";
    const key = `${moduleName}|${d.varId}`;

    let connected = [];
    let verb = "";
    if (d.kind === "export") {
      connected = Array.from(exportingTo.get(key) ?? []);
      verb = "exports";
    } else if (d.kind === "import") {
      connected = Array.from(importingFrom.get(key) ?? []);
      verb = "imports";
    } else {
      const s = new Set([
        ...(exportingTo.get(key) ?? []),
        ...(importingFrom.get(key) ?? [])
      ]);
      connected = Array.from(s);
      verb = "imports/exports";
    }

    connected.sort((a, b) => d3.ascending(a, b));
    const list = connected.length ? connected.join("\n") : "(none)";

    if (verb === "exports")
      return `${moduleName} exports ${cellName} to\n${list}`;
    if (verb === "imports")
      return `${moduleName} imports ${cellName} from\n${list}`;
    return `${moduleName} imports/exports ${cellName} with\n${list}`;
  };

  const moduleTitle = (d) => {
    const m = d?.moduleName ?? "<unknown>";
    const imports = Array.from(moduleImportsFrom.get(m) ?? []);
    const exports = Array.from(moduleExportsTo.get(m) ?? []);
    imports.sort((a, b) => d3.ascending(a, b));
    exports.sort((a, b) => d3.ascending(a, b));
    const impList = imports.length ? imports.join("\n") : "(none)";
    const expList = exports.length ? exports.join("\n") : "(none)";
    return `${m}\n\nimports from:\n${impList}\n\nexports to:\n${expList}`;
  };

  const moduleFill = (d) => {
    if (d?.moduleClass === "exportOnly") return "rgba(44,160,44,0.07)";
    if (d?.moduleClass === "importOnly") return "rgba(31,119,180,0.07)";
    return "rgba(250, 228, 184,0.07)";
  };

  return Plot.plot({
    width: plotWidth,
    height,
    axis: null,
    margin: 0,
    x: { domain: [0, plotWidth] },
    y: { domain: [height, 0] },
    marks: [
      Plot.rect(moduleBoxes, {
        rx: 4,
        x1: xBoxLeft,
        x2: xBoxRight,
        y1: (d) => boxY1px(d),
        y2: (d) => boxY2px(d),
        fill: moduleFill,
        stroke: foreground
      }),
      Plot.text(titlePoints, {
        x: "x",
        y: "yPx",
        text: (d) => d.moduleName,
        textAnchor: "start",
        fontSize: 12,
        fontWeight: 650,
        href: (d) => d.href,
        ...(target ? { target } : null)
      }),
      Plot.text(emptyPoints, {
        x: "x",
        y: "yPx",
        text: () => "(no imports/exports shown)",
        textAnchor: "start",
        fontSize: 11,
        fill: "#666"
      }),
      Plot.line(tubePoints, {
        x: "x",
        y: "y",
        z: "linkKey",
        stroke: (d) => d.fromModuleName + d.toModuleName,
        strokeOpacity: 0.35,
        strokeWidth: 3,
        curve: "bundle",
        tension,
        "stroke-miterlimit": 1
      }),
      Plot.dot(portPoints, {
        x: "x",
        y: "yPx",
        r: 5,
        fill: (d) => kindColor(d.kind),
        stroke: "none",
        symbol: "square"
      }),
      Plot.text(labelPoints, {
        x: "x",
        y: "yPx",
        text: (d) => d.varName,
        textAnchor: "end",
        fontSize: 11,
        fill: (d) => kindColor(d.kind),
        href: (d) => d.href,
        ...(target ? { target } : null)
      }),
      Plot.dot(portPoints, {
        x: "x",
        y: "yPx",
        r: 9,
        fill: "#0000",
        stroke: "#0000",
        href: "href",
        ...(target ? { target } : null),
        value: (d) => d.payload
      }),
      Plot.dot(linkHotspots, {
        x: "x",
        y: "yPx",
        r: 10,
        fill: "#0000",
        stroke: "#0000",
        href: "href",
        ...(target ? { target } : null),
        value: (d) => d.payload
      }),
      Plot.tip(
        portPoints,
        Plot.pointer({
          x: "x",
          y: "yPx",
          maxRadius: 24,
          title: portTitle
        })
      ),
      Plot.dot(
        portPoints,
        Plot.pointer({
          x: "x",
          y: "yPx",
          r: 7,
          stroke: (d) => kindColor(d.kind),
          fill: "none",
          maxRadius: 24
        })
      ),
      Plot.tip(
        titleHotspots,
        Plot.pointer({
          x: "x",
          y: "yPx",
          maxRadius: 80,
          title: moduleTitle
        })
      )
    ]
  });
}
)};
const _1vo4tei = function _expand_unreachable_imports(runtime_variables,no_observer,observe){return(
() =>
  [...runtime_variables]
    .filter(
      (v) =>
        !v._reachable &&
        v._observer == no_observer &&
        v._inputs.filter((v) => v._name == "@variable").length > 0
    )
    .forEach((v) => observe(v, {}))
)};
const _z92m23 = function _foreground(getComputedStyle)
{
  const styles = getComputedStyle(document.body);
  return styles.getPropertyValue("--theme-foreground").trim() || "black";
};
const _1vyps72 = function _background(getComputedStyle)
{
  const styles = getComputedStyle(document.body);
  return styles.getPropertyValue("--theme-background").trim() || "white";
};
const _ncj4up = function _26(robocoop){return(
robocoop
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/spectral-layout", async () => runtime.module((await import("/@tomlarkworthy/spectral-layout.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  $def("_ssnlir", null, ["md"], _ssnlir);  
  $def("_d7v1r6", null, ["atlas"], _d7v1r6);  
  $def("_1dmkyu5", null, ["md"], _1dmkyu5);  
  $def("_fo8b49", "ascending", [], _fo8b49);  
  $def("_2l2xc3", "sortVarsByNameAndId", ["ascending"], _2l2xc3);  
  $def("_7v0mnv", "makeVarId", [], _7v0mnv);  
  $def("_1om7oda", "isDisplayName", [], _1om7oda);  
  $def("_sm59vx", "isDisplayVar", [], _sm59vx);  
  $def("_zavtuv", "safeLinkTo", [], _zavtuv);  
  $def("_y22gp6", "safeVarHref", ["safeLinkTo"], _y22gp6);  
  $def("_1n6frvb", "moduleNameOf", [], _1n6frvb);  
  $def("_istnoy", "kindColor", [], _istnoy);  
  $def("_175aecg", "buildCSRLocal", [], _175aecg);  
  $def("_1lkv1ox", "crossingsCountLine", [], _1lkv1ox);  
  $def("_tm9oti", "chooseBestCut", ["crossingsCountLine"], _tm9oti);  
  $def("_tpgtvd", "viewof tension", ["Inputs"], _tpgtvd);  
  $def("_ieuxkk", "tension", ["Generators","viewof tension"], _ieuxkk);  
  $def("_p8o943", "atlas", ["width","isOnObservableCom","moduleMap","runtime_variables","makeVarId","expand_unreachable_imports","moduleNameOf","isDisplayVar","d3","spectralCircleOrder","buildCSRLocal","improveOrderSifting","bestOfRandomOrders","crossingsCountLine","chooseBestCut","sortVarsByNameAndId","safeLinkTo","linkTo","safeVarHref","Plot","foreground","tension","kindColor"], _p8o943);  
  $def("_1vo4tei", "expand_unreachable_imports", ["runtime_variables","no_observer","observe"], _1vo4tei);  
  $def("_z92m23", "foreground", ["getComputedStyle"], _z92m23);  
  $def("_1vyps72", "background", ["getComputedStyle"], _1vyps72);  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("no_observer", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("no_observer", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("viewof runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("viewof runtime_variables", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("spectralCircleOrder", ["module @tomlarkworthy/spectral-layout", "@variable"], (_, v) => v.import("spectralCircleOrder", _));  
  main.define("improveOrderSifting", ["module @tomlarkworthy/spectral-layout", "@variable"], (_, v) => v.import("improveOrderSifting", _));  
  main.define("bestOfRandomOrders", ["module @tomlarkworthy/spectral-layout", "@variable"], (_, v) => v.import("bestOfRandomOrders", _));  
  main.define("robocoop", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop", _));  
  $def("_ncj4up", null, ["robocoop"], _ncj4up);
  return main;
}