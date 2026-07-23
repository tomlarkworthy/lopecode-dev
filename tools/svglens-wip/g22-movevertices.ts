import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const moveVertices = await V("moveVertices"), shapeLookup = await V("shapeLookup"),
      svgShapes = await V("svgShapes"), vertexAddress = await V("vertexAddress"),
      pathHandles = await V("pathHandles"), parsePath = await V("parsePath"),
      attrVal = await V("attrVal"), pathSegments = await V("pathSegments");

const wrap = (inner:string) => `<svg viewBox="0 0 200 200">${inner}</svg>`;
const A = (path:number[],kind:string,n:number)=>vertexAddress.of(path,kind,n);

// polygon: move points 0 and 2 by (10, 5)
{
  const src = wrap(`<polygon points="0,0 50,0 50,50 0,50"/>`);
  const e = shapeLookup.forTag(svgShapes, "polygon", src, 1);
  const edits = moveVertices(e, src, 1, [A([1],"anchor",0), A([1],"anchor",2)], 10, 5);
  console.log("polygon move pts 0,2:", edits[0].value, "(expect 10,5 ... 60,55 ...)");
}
// path abs: move anchor 1 by (10,0). Its incident controls should ride.
{
  const src = wrap(`<path d="M 10 10 C 20 0 40 0 50 10 L 90 10"/>`);
  const e = shapeLookup.forTag(svgShapes, "path", src, 1);
  const before = pathSegments(parsePath(attrVal(src,1,"d")));
  const edits = moveVertices(e, src, 1, [A([1],"anchor",1)], 10, 0);   // anchor at (50,10)
  console.log("path abs move anchor@(50,10) +x10:", edits[0].value);
  // the C endpoint moves 50->60, its c2 (40 0)->(50 0), and the L target 90->? (anchor2 not selected → stays)
}
// path rel: M then rel c and rel l; move the first rel anchor and check no double count
{
  const src = wrap(`<path d="M 10 10 l 40 0 l 40 0"/>`);
  const e = shapeLookup.forTag(svgShapes, "path", src, 1);
  const hs = pathHandles(src,1).filter((h:any)=>h.kind==="anchor").map((h:any)=>[h.x,h.y]);
  console.log("rel anchors before:", JSON.stringify(hs));
  // move middle anchor (n=1, at 50,10) by (0,20); the third anchor must NOT move
  const edits = moveVertices(e, src, 1, [A([1],"anchor",1)], 0, 20);
  const src2 = wrap(`<path d="${edits[0].value}"/>`);
  const hs2 = pathHandles(src2,1).filter((h:any)=>h.kind==="anchor").map((h:any)=>[h.x,h.y]);
  console.log("rel value:", edits[0].value);
  console.log("rel anchors after :", JSON.stringify(hs2), "(expect [10,10],[50,30],[90,10])");
}
// T1: zero delta writes identical bytes
{
  const src = wrap(`<path d="M 10 10 C 20 0 40 0 50 10"/>`);
  const e = shapeLookup.forTag(svgShapes, "path", src, 1);
  const d0 = attrVal(src,1,"d");
  const edits = moveVertices(e, src, 1, [A([1],"anchor",0),A([1],"anchor",1)], 0, 0);
  console.log("T1 zero-delta byte-exact:", edits[0].value === d0, JSON.stringify(edits[0].value));
}
