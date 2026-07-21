const _4etmfb = function _1(md){return(
md`# Ego graph

Ego graph with selection, used in https://observablehq.com/@tomlarkworthy/google-vs-trick
`
)};
const _ddml71 = function _2(visualization){return(
visualization
)};
const _1lm0tqe = function _visualization(data,d3,width,height,maxDepthInv,linkWidth,nodeSize,color,drag,labeldY,labelSize,Event,invalidation)
{
  const links = data.links;
  const nodes = data.nodes;

  const forceLink = d3
    .forceLink(links)
    .id((d) => d.id)
    .distance((link) => {
      const scale = d3.scaleSqrt().domain([0, 1]).range([30, 70]);
      return scale(link.distance);
    })
    .strength((link) => 1 / Math.min(link.source.count, link.target.count));

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .call(
      d3
        .zoom()
        .scaleExtent([1 / 2, 4])
        .on("zoom", zoomed)
    );

  const container = svg.append("g");

  svg.on("click", (e) => {
    if (e.target === svg.node()) {
      link.style("stroke-opacity", 0.6);
      node.style("opacity", 0.8);
      text.attr("display", "block");
    }
  });

  function zoomed({ transform }) {
    container.attr("transform", transform);
  }

  const defs = svg.append("defs");

  const gradients = defs
    .selectAll("line")
    .data(links)
    .join("linearGradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("id", (d) => "l-" + d.index)
    .attr("x1", (d) => d.source.x)
    .attr("x2", (d) => d.target.x)
    .attr("y1", (d) => d.source.y)
    .attr("y2", (d) => d.target.y);

  function addStop(w) {
    gradients
      .append("stop")
      .attr("offset", `${w * 100}%`)
      .attr("stop-color", (d) =>
        d3.interpolateTurbo(
          ((1 - w) * d.source.depth + w * d.target.depth) * maxDepthInv
        )
      );
  }
  addStop(0);
  addStop(0.5);
  addStop(1);

  // links
  const link = container
    .append("g")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", (d) => `url(#${"l-" + d.index}`)
    .attr("stroke-width", linkWidth);

  const node = container
    .append("g")
    .attr("opacity", 0.8)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", nodeSize)
    .attr("fill", color)
    .call(drag(simulation));

  node.append("title").text((d) => d.id);

  const text = container
    .append("g")
    .attr("class", "labels")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g");

  text
    .append("text")
    .attr("fill", "black")
    .attr("stroke", "#fff")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke fill")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .attr("dy", labeldY)
    .style("font-family", "sans-serif")
    .style("font-size", labelSize)
    .text(function (d) {
      return d.id;
    });

  node.on("click", (_, d) => {
    var _nodes = [d];
    link.style("stroke-opacity", function (l) {
      if (d === l.source) {
        _nodes.push(l.target);
        return 1.0;
      } else if (d === l.target) {
        _nodes.push(l.source);
        return 1.0;
      } else return 0.3;
    });

    node.style("opacity", function (n) {
      return _nodes.indexOf(n) !== -1 ? 0.8 : 0.3;
    });

    text.attr("display", function (t) {
      return _nodes.indexOf(t) !== -1 ? "block" : "none";
    });

    svg.node().value = {
      selected: d,
      neighbourhood: _nodes
    };
    svg.node().dispatchEvent(new Event("input", { bubbles: true }));
  });

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    gradients
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    text.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
  });

  invalidation.then(() => simulation.stop());

  return svg.node();
};
const _1i5qxm = (G, _) => G.input(_);
const _1luwdw9 = function _4(Inputs,data){return(
Inputs.table(
  data.links.map((l) => ({ ...l, source: l.source.id, target: l.target.id }))
)
)};
const _1abxlrl = function _maxDepth(data){return(
data.nodes.reduce((m, n) => Math.max(m, n.depth), Number.MIN_VALUE)
)};
const _6pzzz0 = function _maxDepthInv(maxDepth){return(
1 / maxDepth
)};
const _9v2a2w = function _7(Inputs,data){return(
Inputs.table(data.nodes)
)};
const _1vyir8y = function _drag(d3){return(
simulation => {
  
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event,d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event,d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}
)};
const _yw2i7p = function _nodeSize(d3)
{
  const scale = d3.scaleSqrt()
    .domain([1, 50])
    .range([5, 15]);
  return d => scale(d.count);
};
const _uceo5q = function _labelSize(d3)
{
  const scale = d3.scaleSqrt()
    .domain([1, 50])
    .range([10, 18]);
  return d => scale(d.count);
};
const _njchu6 = function _labeldY(nodeSize)
{
  return d => 2*nodeSize(d)+2.0
};
const _12ff6db = function _linkWidth(d3)
{
  const scale = d3.scaleSqrt().domain([1, 11]).range([2, 20]);
  return (d) => scale(d.weight);
};
const _1258i8q = function _nodesById(data){return(
new Map(data.nodes.map((n) => [n.id, n]))
)};
const _nzly3p = function _color(d3)
{
  const scale = d3.scaleOrdinal(d3.schemeCategory10);
  return d => scale(d.depth);
};
const _40e7l1 = function _data(FileAttachment){return(
FileAttachment("poodle (3).json").json()
)};
const _njaqei = function _height(){return(
600
)};
const _rautam = function _d3(require){return(
require("d3@6")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["poodle.json","poodle (3).json"].map((name) => {
    const module_name = "@tomlarkworthy/ego-graph";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_4etmfb", null, ["md"], _4etmfb);  
  $def("_ddml71", null, ["visualization"], _ddml71);  
  $def("_1lm0tqe", "viewof visualization", ["data","d3","width","height","maxDepthInv","linkWidth","nodeSize","color","drag","labeldY","labelSize","Event","invalidation"], _1lm0tqe);  
  $def("_1i5qxm", "visualization", ["Generators","viewof visualization"], _1i5qxm);  
  $def("_1luwdw9", null, ["Inputs","data"], _1luwdw9);  
  $def("_1abxlrl", "maxDepth", ["data"], _1abxlrl);  
  $def("_6pzzz0", "maxDepthInv", ["maxDepth"], _6pzzz0);  
  $def("_9v2a2w", null, ["Inputs","data"], _9v2a2w);  
  $def("_1vyir8y", "drag", ["d3"], _1vyir8y);  
  $def("_yw2i7p", "nodeSize", ["d3"], _yw2i7p);  
  $def("_uceo5q", "labelSize", ["d3"], _uceo5q);  
  $def("_njchu6", "labeldY", ["nodeSize"], _njchu6);  
  $def("_12ff6db", "linkWidth", ["d3"], _12ff6db);  
  $def("_1258i8q", "nodesById", ["data"], _1258i8q);  
  $def("_nzly3p", "color", ["d3"], _nzly3p);  
  $def("_40e7l1", "data", ["FileAttachment"], _40e7l1);  
  $def("_njaqei", "height", [], _njaqei);  
  $def("_rautam", "d3", ["require"], _rautam);
  return main;
}