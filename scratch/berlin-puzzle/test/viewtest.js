import { frontView, sideView, isoView } from "../views.js";
import { writeFileSync } from "fs";
writeFileSync("out/front.svg", frontView());
writeFileSync("out/side.svg", sideView());
writeFileSync("out/iso.svg", isoView());
console.log("ok");
