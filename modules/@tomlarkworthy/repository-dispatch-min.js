const _144fsbc = function _1(md){return(
md`# Starting [Github Action](https://docs.github.com/en/actions) Workflows From [Observable](https://observablehq.com/)`
)};
const _11evd71 = async function _Octokit() {
    return await import('https://cdn.skypack.dev/@octokit/core@2.1.0');
};
const _1f75gvx = function _dispatch(Octokit){return(
async function dispatch(
  token,
  { owner, repo, event_type = "event_type", client_payload = undefined } = {}
) {
  return await new Octokit.Octokit({
    auth: token
  }).request("POST /repos/{owner}/{repo}/dispatches", {
    owner,
    repo,
    event_type,
    ...(client_payload && { client_payload })
  });
}
)};
const _2sberg = function _dispatchProxyName(){return(
({ owner, repo, event_type }) =>
  "dispatch_" + owner + "_" + repo + "_" + event_type
)};
const _x121te = function _createDispatchProxy(endpoint,dispatchProxyName,dispatch,subdomain,html){return(
function createDispatchProxy({
  owner,
  repo,
  event_type = "event_type",
  client_payload = "NOT USED", // If set to null, the client can set it dynamically when dispatching
  secretName = "github_token", // Name of the secret containing a Github access token
  beforeDispatch = (args, ctx) => {}, // Custom hook for mutating args before dispatch evaluated serverside
  debug = false
} = {}) {
  const ep = endpoint(
    dispatchProxyName({ owner, repo, event_type }),
    async (req, res, ctx) => {
      if (debug) debugger;
      if (req.method !== "POST")
        return res.status(400).send("Use POST to trigger a dispatch");
      if (!ctx.secrets[secretName])
        return res
          .status(500)
          .send(`Cannot find a secret value under ${secretName}`);
      const payload =
        client_payload === null && req.body
          ? JSON.parse(req.body)
          : client_payload;
      const args = {
        ...arguments[0],
        ...(payload !== "NOT USED" && { client_payload: payload }),
        event_type
      };
      try {
        await beforeDispatch(args, ctx);
        const result = await dispatch(ctx.secrets[secretName], args);
        res.json(result);
      } catch (err) {
        res.json({
          error: true,
          name: err.name,
          status: err.status,
          message: err.message
        });
      }
    },
    {
      secrets: [subdomain() + "_" + secretName]
    }
  );
  const url = ep.href;

  const view = html`<div>${ep}`;
  view.value = async (user_client_payload) => {
    if (user_client_payload && client_payload !== null) {
      throw new Error(
        "Client cannot set client_payload if proxy has a client_payload configured"
      );
    }
    const proxyCall = await fetch(url, {
      method: "POST",
      body: JSON.stringify(user_client_payload)
    });
    const result = await proxyCall.json();
    if (result.error) {
      const err = new Error(result.message);
      (err.name = result.name), (err.status = result.status);
      throw err;
    } else {
      return result;
    }
  };
  return view;
}
)};
const _pvf7uj = function _8(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @endpointservices/webcode", async () => runtime.module((await import("/@endpointservices/webcode.js?v=4")).default));  
  main.define("module @endpointservices/footer", async () => runtime.module((await import("/@endpointservices/footer.js?v=4")).default));  
  $def("_144fsbc", null, ["md"], _144fsbc);  
  $def("_11evd71", "Octokit", [], _11evd71);  
  $def("_1f75gvx", "dispatch", ["Octokit"], _1f75gvx);  
  main.define("endpoint", ["module @endpointservices/webcode", "@variable"], (_, v) => v.import("endpoint", _));  
  main.define("subdomain", ["module @endpointservices/webcode", "@variable"], (_, v) => v.import("subdomain", _));  
  $def("_2sberg", "dispatchProxyName", [], _2sberg);  
  $def("_x121te", "createDispatchProxy", ["endpoint","dispatchProxyName","dispatch","subdomain","html"], _x121te);  
  main.define("footer", ["module @endpointservices/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_pvf7uj", null, ["footer"], _pvf7uj);
  return main;
}