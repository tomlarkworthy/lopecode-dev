const _12bm16l = function _1(md){return(
md`# TikTok

~~~js
import {tiktok} from '@tomlarkworthy/tiktok'
~~~

Issues
- if you refresh the cell again the embed will fail the 2nd time :/
`
)};
const _k96fwm = function _2(tiktok){return(
tiktok('https://www.tiktok.com/@olddemongod/video/6944000387296873733')
)};
const _1jw6q2g = function _tiktok(tiktokLib,parse,enrich,html){return(
async function tiktok(link, { maxWidth = "605px", minWidth = "325px" } = {}) {
  tiktokLib;
  const data = parse(link);

  const embed = await enrich(data);

  return html`${embed.html}`;
}
)};
const _11ocbz3 = function _parse(){return(
function parse(link) {
  let match = null;
  if ((match = link.match(/@(?<artist>[^/]*)\/video\/(?<video>[^?/#]*)/))) {
    return {
      artist: match.groups.artist,
      video: match.groups.video
    };
  } else {
    throw new Error("Cannot parse link");
  }
}
)};
const _cpmwtq = function _enrich(){return(
async function enrich(data) {
  const result = await (await fetch(
    `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${data.artist}/video/${data.video}`
  )).json();

  result.html = result.html.replace(
    '<script async src="https://www.tiktok.com/embed.js"></scr\ipt>',
    ''
  );
  return result;
}
)};
const _1f5x01d = function _tests(createSuite){return(
createSuite({
  name: 'Tests'
})
)};
const _nspk7b = (G, _) => G.input(_);
const _1g9ohb2 = function _7(tests,expect,parse){return(
tests.test(
  "Parse https://www.tiktok.com/@olddemongod/video/6944000387296873733",
  () => {
    expect(
      parse("https://www.tiktok.com/@olddemongod/video/6944000387296873733")
    ).toEqual({
      artist: "olddemongod",
      video: "6944000387296873733"
    });
  }
)
)};
const _1os4fxp = function _8(tests,expect,parse){return(
tests.test(
  "Parse https://www.tiktok.com/@olddemongod/video/6944000387296873733?sender_device=pc&sender_web_id=6935878758234670598&is_from_webapp=v2&is_copy_url=0",
  () => {
    expect(
      parse(
        "https://www.tiktok.com/@olddemongod/video/6944000387296873733?sender_device=pc&sender_web_id=6935878758234670598&is_from_webapp=v2&is_copy_url=0"
      )
    ).toEqual({
      artist: "olddemongod",
      video: "6944000387296873733"
    });
  }
)
)};
const _1a35x84 = function _9(tests,enrich,expect){return(
tests.test(
  "Enrich olddemongod, 6944000387296873733 has html property",
  async () => {
    const enrichResult = await enrich({
      video: "6944000387296873733",
      artist: 'olddemongod'
    });

    expect(enrichResult).toHaveProperty("author_name");
    expect(enrichResult).toHaveProperty("author_url");
    expect(enrichResult).toHaveProperty("title");
    expect(enrichResult).toHaveProperty("html");
  }
)
)};
const _1t9wb73 = function _tiktokLib(require){return(
require('https://www.tiktok.com/embed.js').catch(() => {})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  $def("_12bm16l", null, ["md"], _12bm16l);  
  $def("_k96fwm", null, ["tiktok"], _k96fwm);  
  $def("_1jw6q2g", "tiktok", ["tiktokLib","parse","enrich","html"], _1jw6q2g);  
  $def("_11ocbz3", "parse", [], _11ocbz3);  
  $def("_cpmwtq", "enrich", [], _cpmwtq);  
  $def("_1f5x01d", "viewof tests", ["createSuite"], _1f5x01d);  
  $def("_nspk7b", "tests", ["Generators","viewof tests"], _nspk7b);  
  $def("_1g9ohb2", null, ["tests","expect","parse"], _1g9ohb2);  
  $def("_1os4fxp", null, ["tests","expect","parse"], _1os4fxp);  
  $def("_1a35x84", null, ["tests","enrich","expect"], _1a35x84);  
  $def("_1t9wb73", "tiktokLib", ["require"], _1t9wb73);  
  main.define("createSuite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("createSuite", _));  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));
  return main;
}