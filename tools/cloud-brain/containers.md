# Containers for a Cloud Brain: what the platform allows, measured

Research and one spike for `brain-x-container`, a leased-container service shaped like
`brain-browser`. Run 2026-10-09, 20:02 to 20:15 CEST, with the scratch Worker `cb4-scratch-box` and
the container application of the same name. Both were deleted at 20:15; the application list was
empty afterwards. The service is **not built**. The spike is
`tools/scratch/cloud-brain-experiments/container-spike/` (`worker.js`, `up.sh`).

## What was asked

Tom, 2026-10-09: "Like the browser service we want a high performance light wrapper around running
leased containers." Earlier, 2026-10-07: offline handling is "notebooks in Cloudflare Containers".

## The platform, from its documents (read 2026-10-09)

- A container belongs to one Durable Object. The object reaches it as `ctx.container`
  (https://developers.cloudflare.com/durable-objects/api/container/). The methods the spike saw on
  the object, by `Object.getOwnPropertyNames`:

  ```
  running images start monitor destroy signal getTcpPort setInactivityTimeout
  interceptOutboundHttp interceptAllOutboundHttp snapshotContainer interceptOutboundHttps exec inspect
  ```
- `exec(cmd[])` is part of the platform. No Sandbox SDK and no npm package is needed for it.
- Images (https://developers.cloudflare.com/containers/platform-details/image-management/): with
  scheduling policy `default`, "Containers support images from the Cloudflare managed registry at
  `registry.cloudflare.com`, Docker Hub, Amazon ECR, and Google Artifact Registry." With policy
  `durable_object`, named images must be in Cloudflare's registry. Pushing there is
  `wrangler containers push`, which needs Docker running.
- Instance types and prices (https://developers.cloudflare.com/containers/pricing/), Workers Paid
  plan required. Memory $0.0000025 per GiB-second, CPU $0.000020 per vCPU-second, disk $0.00000007
  per GB-second, after 25 GiB-hours, 375 vCPU-minutes and 200 GB-hours a month.

  | type | vCPU | memory | disk | $ per second at full use (my arithmetic) | per hour |
  |---|---|---|---|---|---|
  | lite | 1/16 | 256 MiB | 2 GB | 0.0000020 | 0.007 |
  | basic | 1/4 | 1 GiB | 4 GB | 0.0000078 | 0.028 |
  | standard-1 | 1/2 | 4 GiB | 8 GB | 0.0000206 | 0.074 |
  | standard-2 | 1 | 6 GiB | 12 GB | 0.0000358 | 0.129 |

  Egress from Europe and North America is $0.025 per GB after 1 TB a month.
- Limits (https://developers.cloudflare.com/containers/platform-details/limits/): image size up to
  the instance's disk, 50 GB of images an account. `setInactivityTimeout` takes at most 6 hours.
  This account's own limits, from `GET /accounts/<id>/containers/me`: 4 vCPU and 12 GiB a
  deployment, `durable_object_offset_instances: 2000`.
- The REST API creates an application with no wrangler
  (https://developers.cloudflare.com/api/resources/containers/subresources/applications/methods/create).

Not found in the documents: a cold start figure, and whether instances the platform keeps ready
(`healthy` in the application's health) are billed. Not read: the Sandbox SDK.

## What ran: a container from Docker Hub, with no Docker and no wrangler

Three calls with the Cloudflare token the checkout already holds. No permission was missing.

1. `PUT /accounts/<id>/workers/scripts/cb4-scratch-box`, a module with a class `Box extends
   DurableObject`, and this in `metadata`:

   ```
   "bindings":[{"type":"durable_object_namespace","name":"BOX","class_name":"Box"}],
   "migrations":{"new_tag":"v1","new_sqlite_classes":["Box"]},
   "containers":[{"class_name":"Box"}]
   ```
2. `GET …/workers/durable_objects/namespaces` for the namespace id of that class.
3. `POST …/containers/applications`:

   ```
   {"name":"cb4-scratch-box","scheduling_policy":"default","instances":0,"max_instances":2,
    "configuration":{"image":"docker.io/library/nginx:alpine","instance_type":"lite"},
    "durable_objects":{"namespace_id":"<id>"}}
   ```
   Answer: `"runtime":"firecracker"`, `"network":{"mode":"private"}`, 256 MiB, 2 GB.

Inside the object, `ctx.container.start({ enableInternet: true, entrypoint })`, then
`ctx.container.getTcpPort(80).fetch(new Request("http://box" + path, request))`.

## Measurements

All from this machine in Berlin (nearest Cloudflare site `TXL`); the container ran in `IST`
(`cdn-cgi/trace` read from inside it). One container, type lite.

| what | result |
|---|---|
| first container after the application was made | refused for about 4 minutes: `There is no container instance that can be provided to this Durable Object, try again later` (20:02:28 to past 20:06:38) |
| cold start, `start()` to the first HTTP 200 from nginx, an instance being ready | 245 ms inside the object, 0.83 s for the whole curl. One run. |
| `exec(["uname","-a"])` | 106 ms, then 72 ms for a second command |
| `destroy()` | 115 and 119 ms |
| warm request, object to container, 20 in a row | 33 to 35 ms each, the first 68 |
| the same nginx asked from inside the container | under 1 ms |
| curl on one connection: Worker alone, p50 | 37 ms (25 calls) |
| curl on one connection: Worker, object, container, p50 | 85 ms (25 calls) |
| new connection each call: Worker alone / plus object / plus container, p50 | 130 / 143 / 181 ms |

The pass-through costs about 48 ms a request here, and 34 ms of that is the way from the object to
the container. `rpc-performance.md` has a call through kernel, core and a service at 4 ms over a bare
Worker, so a container request through the Brain would be near 50 ms over a bare Worker with this
placement. Whether `constraints.regions` on the application brings the container near the object
was not tried; it is the first thing to measure next.

Inside: `Linux cloudchamber 6.18.54-cloudflare-microvm-2026.9.16 x86_64`, `MemTotal 471032 kB`,
`nproc` 1, uid 0. Outbound HTTPS worked with `enableInternet: true`.

## Dead ends

- **`nginx:alpine` exits with code 1 as the main process**, within 300 ms, with or without a start
  option: `Container exited with unexpected exit code: 1`. The image links its logs to `/dev/stdout`,
  and the main process's stdout here is a socket (`/proc/1/fd/1 -> socket:[607]`), which cannot be
  opened by path. Started as `sh -c "nginx > /tmp/out 2>&1; exec sleep 100000"` it serves. An image
  that opens `/dev/stdout` by path needs the same care.
- **`entrypoint` in `start()` seems to keep the image's command after it.** `["nginx","-g","daemon
  off;"]` also exited 1; not separated from the cause above.
- **A new upload of the Worker took 20 to 30 s to reach a Durable Object.** Three times the old
  code answered after a successful upload, and looked like a failed fix.
- **`max_instances: 2` ran out** after two containers had exited: the third start was refused as
  in the first row of the table. Raised to 6 by `PATCH …/applications/<id>`; a start worked 25 s later.
- `getTcpPort(80).fetch(request)` with the caller's own `https://` request gave error 1101. A request
  rebuilt on `http://` worked.
- `GET …/containers/applications` answered 500 once, then `[]` a minute later.
- The `cloudchamber/*` paths answer `Unauthorized: Account is not authorized`; the paths are
  `containers/*`.

## What a service needs that the deploy path does not have

`cloudflare-iac` emits a Worker with D1 or the deployer's own Durable Object. A container service
needs three additions, all in the deployer and the emit step, which only the owner's recipe reaches:

1. a Durable Object class in the emitted module, its binding and a migration;
2. `containers: [{ class_name }]` in the upload's metadata;
3. the application as a resource the deployer creates, patches and deletes
   (`containers/applications`), with image, instance type and `max_instances`.

## Decisions for Tom before the build

1. **Which image.** With policy `default` the image is fixed per application at deploy, so each
   image is a declared resource of the service. A generic Linux from Docker Hub works today. An
   image that runs a headless lopecode notebook (the stated end use) has to be built and pushed
   somewhere public or to Cloudflare's registry; that needs Docker once, on some machine or a CI.
2. **One image or many.** Policy `durable_object` lets each start pick a named image and take
   snapshots, but only from Cloudflare's registry. Policy `default` takes Docker Hub. Recommended:
   `default`, one application per image, a short list in the service's declaration.
3. **Where it runs.** 34 ms a request to Istanbul. Pin a region if the API allows, after measuring.
4. **Who may lease one.** A container has root and the open internet. Recommended: the owner and
   the Brain's Workers first; members later by a rule, with a daily credit limit.
5. **Price.** Recommended: the full-use figure in the table for the instance type, per second
   bought, no refunds, as `browser.extend` does.

## The service, as proposed (not built)

`container.extend?seconds=N&container=NAME` (priced; starts it when down), `container.status`,
`container.all`, `container.end`, `container.settings`, `container.exec { cmd }` (the platform's
own), and `/container/<name>/<port>/…` for HTTP and WebSocket, passed to `getTcpPort(port)`. The
Durable Object holds `paidUntil` in its own storage and an alarm that calls `destroy()`, so a
request on the hot path reads no row of the Brain.
