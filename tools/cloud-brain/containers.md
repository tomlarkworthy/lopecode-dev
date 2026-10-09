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

## Built 2026-10-09: `brain-x-container`

The service above was built the same day as `@tomlarkworthy/brain-container`
(`tools/cloud-brain/brain-container.ojs`) and deployed on cb4 as `cb4-x-container`: `28e477317795` for the runs below, then `f2581201bd95` at
20:42 CEST (prose only, 13.2 s; after it `redistil` 17 `same`, `container.all` `[]`, application
health active 0, assigned 0, healthy 6).
Its method table is the module's first cell, served at
`/xrpc/com.lopecode.brain.getSource?worker=brain-x-container&part=reference` (10159 bytes).

### The five decisions, as taken

Tom had not answered them. The parent session took each on the recommendation above so the build
could start. **They are that session's defaults, not Tom's words, and each can be reversed.**

| Decision | Default taken | To reverse |
|---|---|---|
| Image | `node:22-alpine` from Docker Hub, kept up by `sh -c "exec tail -f /dev/null"`; a caller names `node`, never an image string | `containerImageList`, then remove the Worker and deploy again |
| Policy | `default`, one application per image | the same |
| Region | `regions: ["WEUR"]` | the image's `regions` |
| Who may lease | `who: "workers"`: the owner, what the owner grants, and Workers of the Brain that list the method in `calls`. A member gets 403 | a CEL rule on the method |
| Price | lite at full use, $0.000002 a second, charged by `container.extend` before the call; no refunds | `dollarsPerSecond` of the image |

Not asked and also defaulted: `max_instances` 6 (`maxContainers` 6, `maxPerOwner` 3), a lease of 10 s
to 6 h, internet on unless the time was bought with `internet=false`.

### How it differs from the proposal

- **The port is two methods, not a path.** `container.get` and `container.post` with `?port=&path=`
  pass the request to `getTcpPort(port)`. The proposal had `/container/<name>/<port>/…`; a token or
  a Worker of the Brain reaches only methods, so a path would have served the owner's tab alone.
- **`container.stop`** was added: destroy now, time stays bought.
- **One Durable Object class per image** (`Box_node`), id `owner/name`. The object holds `paidUntil`
  and its alarm destroys the container. `get`, `post` and `exec` read no row of the Brain; `status`
  reads two (the list of the caller's containers).

### What the deploy path gained

| File | Addition |
|---|---|
| `cloudflare-iac.ojs` | A platform cell `containers` and `Service(…, { containers: { images, object } })`. Emit adds the class `Box_<image>` and the binding `BOX_<IMAGE>` only for a Worker that declares images, so the hash of every other Worker is unchanged. `simulate` runs the object with a fake container |
| `brain-deployer.ojs` | `containers` and, on the first upload only, `migrations` in the upload metadata; the application as a resource made after the health check, patched on a later deploy, deleted before the script on remove; three refusals: only `brain-x-container` declares images, an image is `docker.io/…`, and the image list of a deployed Worker changes only by remove and deploy |

Only the owner deploys it: the approval page prints "Runs containers" with each image.

### Measured on cb4, 2026-10-09 20:29 to 20:38 CEST, caller in Berlin

```
first deploy 20:29:44, 27.4 s; application cb4-x-container-node made about 20:30:10
application at 20:30:37       instances: 6 (0 was sent), health: 5 healthy
extend seconds=60, down       0.62 s for the whole call   cold: true, up: true
exec ["node","-v"]            v22.23.3   223 ms in the object the first time, 52 to 119 ms after
inside                        Linux 6.18.54-cloudflare-microvm, uid 0, 1 CPU, MemTotal 471032 kB
placement                     colo=DUB with regions ["WEUR"]; the spike, with none, got IST

one connection, 25 calls each, ms     p50   p90   least
quota.get        kernel, core          87   122    64
container.status + service, object    120   153   102
container.get    + port 8080          102   128    88
container.post   1 KB, same port      101   156    90
container.exec   ["true"], 15 calls   127   176   118

WebSocket through container.get to port 8081   open and first frame 435 ms after the client began
113 s with no call                             same container: /proc/uptime 201 s, files in /tmp kept
lease ended 20:33:50                           20:33:56 up: false; exec and get 409 NoTime; container.all []
application health 20:34:06                    active 0, healthy 6
second lease ended 20:37:33                    20:37:43 active 0, assigned 1, healthy 5
member / no caller                             403 / 401
internet=false                                 wget: bad address (no DNS)
apply under a running container                /tmp/mark kept, uptime 350 s -> 415 s
```

`container.get` is 15 ms at p50 over a call the core answers itself. That is the cost of the
service Worker, the object and the hop to Dublin together; they were not separated. `status` is
slower than `get` because of its two row reads. Each line was run one time, except the series.

**Pinning the region was worth it:** 48 ms from the Worker to the port in Istanbul (spike) against
the whole 15 ms above with `WEUR`. It was not run both ways on the same day's application, so the
spike's figure is the only unpinned one.

The day's spend of the owner after both leases, the tests and the benchmark: $0.02166 (`quota.get`,
20:37:43). That is what the Brain charged, not Cloudflare's bill.

### Dead ends and things seen once

- **`apply` was put back on a 504.** `POST /workers/scripts/cb4-x-container/versions 504 []` after
  60 s, on the second deploy. The same recipe deployed on the next try in 57 s. Cause not found.
- **502 `NoListener` on the first `get`.** A `get` 0.5 s after `nohup node server.js &` found nothing
  listening: node takes 1.4 s to start on 1/16 vCPU. The service waits 15 s for a port only on the
  call that started the container, not after a caller's own `exec`.
- **`instances: 0` in the application is not honoured.** Cloudflare reported 6, the `max`, and kept
  that many ready, each already running the entrypoint (the first leased container had been up 34 s
  when its time was bought).

### Not known

- What "assigned 1" means 10 s after a lease ended with `active 0`.
- Whether a token with only Workers Scripts permission can make an application. The temporary
  token has every group.
- The limit of `exec` output, and what a container does at its memory limit.

### After the review, 2026-10-09 20:59

`container.get|post?path=/_extend` reached the object's own call and bought 40 s at no price on cb4 (20:55). The
object now tells its own calls from a port by host name (`op.internal`, `port-N.internal`), and the same five
paths reach the container's server. The record is in `spec-as-built.md` under the same time.

Cloudflare's [architecture page](https://developers.cloudflare.com/containers/platform-details/architecture/)
(read 2026-10-09): "You are only charged for actively running instances, not for prepared images that are not
running." The ready instances seen here were running the entrypoint, so this does not answer the question above.

### The ready instances are not billed (dashboard, 2026-10-09, screenshot received 22:41 CEST)

Tom's screenshot of the account's Containers page; it shows the application "1 hour ago" modified:

```
cb4-x-container-node   Ready   Default   Live Instances 0
Usage, September 19 - October 19:  Memory 100 GiB-sec   Disk 800.01 GB-sec   CPU 7.7 sec   Egress 0 GB
Billable usage (current period): $0.00
```

A lite instance is 0.25 GiB of memory and 2 GB of disk, so both figures come to 400 instance-seconds:
100 / 0.25 = 400 and 800 / 2 = 400. That is the size of the leases and the spike that were run. Six
ready instances for one hour would be 6 x 3600 = 21 600 instance-seconds, 5400 GiB-sec of memory.
So the instances Cloudflare keeps ready (`healthy 6`) are not metered; only leased time is. The
`$0.00` is the plan's included amount, not read further.

### Not built

An image that runs a headless lopecode notebook. It is the next step of the offline workstream and
needs Docker one time, on a machine or in CI, and a push to Docker Hub or to Cloudflare's registry.
Nothing on this machine was installed for it.
