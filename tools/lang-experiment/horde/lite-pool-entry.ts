import { pagePool, makePool, runHere } from "../lite/browser/workers.ts";
(globalThis as any).LITE = { pagePool, makePool, runHere };
