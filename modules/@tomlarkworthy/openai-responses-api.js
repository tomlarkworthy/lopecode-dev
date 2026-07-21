const _1x9wfs2 = function _1(md){return(
md`# 👋 Hello, OpenAI [Responses API](https://platform.openai.com/docs/api-reference/responses/create)

\`\`\`js
import { responses } from "@tomlarkworthy/openai-responses-api"
\`\`\``
)};
const _1txbblt = function _OPENAI_API_KEY(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.password({
    label: "OPENAI_API_KEY",
    placeholder: "paste openAI key here"
  }),
  localStorageView("OPENAI_API_KEY")
)
)};
const _13dv669 = (G, _) => G.input(_);
const _zfgiqe = function _3(md){return(
md`# Examples`
)};
const _1q5ws6j = function _4(md){return(
md`### Simple text prompt`
)};
const _19vv38l = function _text_response(responses){return(
responses({
  input: "how are you?"
})
)};
const _jhdoea = function _6(text_response){return(
text_response.output.at(-1).content.at(-1).text
)};
const _vtxaam = function _7(md){return(
md`### Image Prompt`
)};
const _7ej6a9 = function _disk(FileAttachment){return(
FileAttachment("image.png").image()
)};
const _1wmq4kd = function _getDataUrl(){return(
async function getDataUrl(img, format = "image/png") {
  if (img.image) {
    img = await img.image();
  }
  // Create canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // Set width and height
  canvas.width = img.width;
  canvas.height = img.height;
  // Draw the image
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL(format);
}
)};
const _70igjt = function _10(img_response){return(
img_response.output.at(-1).content.at(-1).text
)};
const _1tuwwgw = function _img_response(responses,getDataUrl,disk){return(
responses({
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "what's in this image?"
        },
        {
          type: "input_image",
          image_url: getDataUrl(disk, "image/png")
        }
      ]
    }
  ]
})
)};
const _pdj752 = function _12(md){return(
md`### Tools: Web search

*not that many models support websearch*`
)};
const _1kihuqs = function _13(websearch_response){return(
websearch_response.output.at(-1).content.at(-1).text
)};
const _1st8udb = function _14(websearch_response){return(
websearch_response.tools.at(-1)
)};
const _oui0pr = function _websearch_response(responses){return(
responses({
  model: "gpt-4o",
  input: "Whats the weather in Berlin today?",
  tools: [{ type: "web_search_preview" }]
})
)};
const _1qsfjgy = function _16(md){return(
md`### Tools: Image generation

The tool auto-converts the images to a blob inside the image_call output element`
)};
const _12srvk = function _17(image_response){return(
image_response.output.at(-1).content.at(-1).text
)};
const _g1xvu0 = function _18(image_response,htl){return(
htl.html`<img
  width="400"
  src=${URL.createObjectURL(image_response.output[0].blob)}
  img.onload= ${() => URL.revokeObjectURL(this.url)}
></img>`
)};
const _fze3qa = function _image_response(responses){return(
responses({
  model: "gpt-4o",
  input: "Draw a pelican riding a bike",
  tools: [{ type: "image_generation" }]
})
)};
const _15flzht = function _20(md){return(
md`### Tools: [function calling](https://platform.openai.com/docs/guides/function-calling?api-mode=responses)`
)};
const _1k2k381 = function _21(resolved_function_response){return(
resolved_function_response.output.at(-1).content.at(-1).text
)};
const _ligkuv = function _function_response(responses,evalJavaScriptTool){return(
responses({
  model: "o4-mini",
  input: "You are executing in a browser. What is the current baseURL?",
  tools: [evalJavaScriptTool],
  reasoning: {
    effort: "high",
    summary: "detailed"
  },
  parallel_tool_calls: false
})
)};
const _6kdzb1 = function _resolved_function_response(runTools,function_response){return(
runTools(function_response)
)};
const _1ld6ly1 = function _evalJavaScriptTool(){return(
{
  type: "function",
  name: "evalJavaScript",
  strict: true,
  description:
    "Evaluate a javascript expression and return the serialized result and the contents of the terminal in logs and errors ",
  parameters: {
    type: "object", // Does not support scalars
    properties: {
      code: { type: "string" }
    },
    required: ["code"],
    additionalProperties: false
  },
  // Not part of OpenAI API. This is where we define execution
  execute: async ({ code } = {}) => {
    const log = console.log.bind(console);
    const error = console.error.bind(console);
    const response = {
      logs: [],
      errors: []
    };
    console.log = (...args) => {
      response.logs.push(args);
      log(...args);
    };
    console.error = (...args) => {
      response.errors.push(args);
      error(...args);
    };
    try {
      response.result = await eval(code);
    } catch (err) {
      debugger;
      console.error(err);
    } finally {
      console.log = log;
      console.error = error;
    }
    return response;
  }
}
)};
const _zdqx3f = function _25(md){return(
md`## [Responses API](https://platform.openai.com/docs/api-reference/responses/create)`
)};
const _c952r0 = function _responses($0,deepResolve){return(
async function responses({
  url = "https://api.openai.com/v1/responses",
  model = "o4-mini",
  input,
  background,
  include,
  instructions,
  max_output_tokens,
  metadata,
  parallel_tool_calls,
  previous_response_id,
  reasoning,
  service_tier,
  store,
  temperature,
  text,
  tool_choice,
  tools,
  top_p,
  truncation,
  user
} = {}) {
  if (typeof input === "string") {
    input = [
      {
        role: "user",
        content: input
      }
    ];
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${$0.value}`,
      "Content-type": "application/json"
    },
    method: "POST",
    body: JSON.stringify({
      model,
      background,
      input: await deepResolve(input),
      include,
      instructions: await (typeof instructions == "function"
        ? instructions()
        : instructions),
      max_output_tokens,
      metadata,
      parallel_tool_calls,
      previous_response_id,
      reasoning,
      service_tier,
      store,
      temperature,
      text,
      tool_choice,
      tools,
      top_p,
      truncation,
      user
    })
  });
  if (response.status == 403 || response.status == 401)
    throw "Authentication error: update OPENAI_API_KEY";
  const responseJson = {
    ...arguments[0],
    input,
    ...(await response.json()),
    tools
  };

  console.log(arguments[0], responseJson);

  // Auto decode images to a blob
  responseJson.output &&
    (await Promise.all(
      responseJson.output
        .filter((o) => o.type == "image_generation_call")
        .map(async (call) => {
          call.blob = await fetch(
            `data:image/${call.format};base64,${call.result}`
          ).then((r) => r.blob());
        })
    ));

  // Auto decode arguments
  responseJson.output &&
    (await Promise.all(
      responseJson.output
        .filter((o) => o.type == "function_call")
        .map(async (call) => {
          call.arguments =
            typeof call.arguments == "string"
              ? JSON.parse(call.arguments)
              : call.arguments;
        })
    ));

  return responseJson;
}
)};
const _11m7kzz = function _runTools(responses){return(
async function runTools(response) {
  // Auto function calls
  // https://platform.openai.com/docs/guides/function-calling?api-mode=responses#handling-function-calls
  const toolCalls =
    response.output &&
    (
      await Promise.all(
        response.output.flatMap(async (call, index) => {
          if (call.type !== "function_call" && call.type !== "custom_tool_call")
            return [];
          const tool = response.tools.find((t) => t.name == call.name);
          const result = await tool.execute(call.arguments || call.input);
          return [
            {
              type:
                call.type == "function_call"
                  ? "function_call_output"
                  : "custom_tool_call_output",
              call_id: call.call_id,
              output:
                (typeof result == "string" ? result : JSON.stringify(result)) ||
                "undefined"
            }
          ];
        })
      )
    ).flat();
  const instructions = response.instructions;
  if (toolCalls?.length > 0) {
    // auto-follow up
    return await responses({
      model: response.model,
      instructions: await (typeof instructions == "function"
        ? instructions()
        : instructions),
      url: response.url,
      output: undefined,
      input: toolCalls,
      tools: response.tools,
      reasoning: response.reasoning,
      previous_response_id: response.id,
      tool_choice: response.tool_choice
    });
  }
  return undefined; // Nothing to do
}
)};
const _rmm1qx = function _deepResolve(){return(
async function deepResolve(x) {
  if (x && typeof x.then === "function") return deepResolve(await x); // promise → unwrap
  if (Array.isArray(x)) return Promise.all(x.map(deepResolve)); // array  → recurse
  if (x !== null && typeof x === "object") {
    // plain obj → recurse
    const entries = await Promise.all(
      Object.entries(x).map(async ([k, v]) => [k, await deepResolve(v)])
    );
    return Object.fromEntries(entries);
  }
  return x; // primitive → as-is
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png"].map((name) => {
    const module_name = "@tomlarkworthy/openai-responses-api";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  $def("_1x9wfs2", null, ["md"], _1x9wfs2);  
  $def("_1txbblt", "viewof OPENAI_API_KEY", ["Inputs","localStorageView"], _1txbblt);  
  $def("_13dv669", "OPENAI_API_KEY", ["Generators","viewof OPENAI_API_KEY"], _13dv669);  
  $def("_zfgiqe", null, ["md"], _zfgiqe);  
  $def("_1q5ws6j", null, ["md"], _1q5ws6j);  
  $def("_19vv38l", "text_response", ["responses"], _19vv38l);  
  $def("_jhdoea", null, ["text_response"], _jhdoea);  
  $def("_vtxaam", null, ["md"], _vtxaam);  
  $def("_7ej6a9", "disk", ["FileAttachment"], _7ej6a9);  
  $def("_1wmq4kd", "getDataUrl", [], _1wmq4kd);  
  $def("_70igjt", null, ["img_response"], _70igjt);  
  $def("_1tuwwgw", "img_response", ["responses","getDataUrl","disk"], _1tuwwgw);  
  $def("_pdj752", null, ["md"], _pdj752);  
  $def("_1kihuqs", null, ["websearch_response"], _1kihuqs);  
  $def("_1st8udb", null, ["websearch_response"], _1st8udb);  
  $def("_oui0pr", "websearch_response", ["responses"], _oui0pr);  
  $def("_1qsfjgy", null, ["md"], _1qsfjgy);  
  $def("_12srvk", null, ["image_response"], _12srvk);  
  $def("_g1xvu0", null, ["image_response","htl"], _g1xvu0);  
  $def("_fze3qa", "image_response", ["responses"], _fze3qa);  
  $def("_15flzht", null, ["md"], _15flzht);  
  $def("_1k2k381", null, ["resolved_function_response"], _1k2k381);  
  $def("_ligkuv", "function_response", ["responses","evalJavaScriptTool"], _ligkuv);  
  $def("_6kdzb1", "resolved_function_response", ["runTools","function_response"], _6kdzb1);  
  $def("_1ld6ly1", "evalJavaScriptTool", [], _1ld6ly1);  
  $def("_zdqx3f", null, ["md"], _zdqx3f);  
  $def("_c952r0", "responses", ["viewof OPENAI_API_KEY","deepResolve"], _c952r0);  
  $def("_11m7kzz", "runTools", ["responses"], _11m7kzz);  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  $def("_rmm1qx", "deepResolve", [], _rmm1qx);
  return main;
}