import {chromium} from "playwright";
const stamp=process.argv[2]||"v";
const ids=process.argv[3]?process.argv[3].split(","):["deep","poly","ring","field","scene"];
const url="file:///private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/20c96e6c-0370-42fa-ac76-48ad38d562c6/scratchpad/sky-plates.html";
const b=await chromium.launch();const p=await b.newPage({viewportSize:{width:1280,height:900}});
await p.goto(url);await p.waitForTimeout(1600);
for(const id of ids) await p.locator("#"+id).screenshot({path:`tools/screenshots/sky-${id}-${stamp}.png`});
await b.close();console.log("shot",ids.join(","),stamp);
