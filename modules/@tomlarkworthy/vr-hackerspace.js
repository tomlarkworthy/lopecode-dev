const _utb5qn = function _app(html){return(
html`<div id="app">
  <canvas id="renderCanvas"></canvas>
  <h1 class="overlay">VR Hackerspace</h1>
</div>`
)};
const _yrpk1v = function _enterVR(Inputs,scene,alert,ground){return(
Inputs.button("Enter VR", {
  reduce: async () => {
    let xrExp;
    if (!scene.createDefaultXRExperienceAsync) {
      alert("WebXR helpers not available in this Babylon build.");
      return;
    }
    if (
      xrExp &&
      xrExp.baseExperience &&
      xrExp.baseExperience.sessionManager &&
      xrExp.baseExperience.sessionManager.session
    ) {
      try {
        await xrExp.baseExperience.exitXRAsync();
      } catch (e) {}
      return;
    }
    try {
      xrExp = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground]
      });
      await xrExp.baseExperience.enterXRAsync("immersive-vr", "local-floor");
    } catch (err) {
      console.error(err);
      alert("Failed to enter VR: " + (err && err.message ? err.message : err));
    }
  }
})
)};
const _1x0f1aw = (G, _) => G.input(_);
const _fbkvuj = function _3(md){return(
md`Hosted Observable Notebooks do not have the required permissions to go into VR directly. But you can click exporter's preview and then export to open a copy of the page without VR restrictions.`
)};
const _u89zim = function _4(exporter){return(
exporter()
)};
const _dsjf4f = function _5(md){return(
md`## Project Overview

Goals

  -  Create a web-based collaborative maker space in VR/AR.
  -  Support direct manipulation metaphors (easel with paint brushes, lathe with rotating stock, etc.).
  -  Allow multiple users to co-create geometry and media in real time.
  -  Keep implementation simple, using widely documented and AI-accessible stacks.
  -  Target browser-based delivery for ease of access and sharing.
`
)};
const _cn2qav = function _6(md){return(
md`Stack
- ECS: miniplex.
- Renderer + XR: Babylon.js (WebGL/WebGPU, WebXR input and cameras).
- Physics: Rapier 3D (via @dimforge/rapier3d-compat).
- Dataflow: Observable cells for dev UX; production bundles can use the same module graph.
- Goals: real-time co-creation, tool-based editing, deterministic ops log, browser-first XR.`
)};
const _5aa6ji = function _babylon() {
    return import('https://cdn.jsdelivr.net/npm/@babylonjs/core@6.0.0/+esm');
};
const _1l2j19t = function _rapier() {
    return import('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.0/+esm');
};
const _q46uy2 = function _miniplex() {
    return import('https://cdn.jsdelivr.net/npm/miniplex@2.0.0/+esm');
};
const _b3pr41 = function _10(md){return(
md`## Architecture

Core components
- Transform { position: Vector3, rotation: Quaternion, scale: Vector3, version: number }
- RenderHandle { meshRef: Babylon.Mesh, materialRef?: Babylon.Material }
- PhysicsBody { bodyRef: Rapier.RigidBody, colliderRef?: Rapier.Collider, type: "dynamic" | "kinematic" | "fixed", awake: boolean, lastSyncVersion: number }
- GeometryRep { kind: "parametricLathe" | "extrusion" | "csgMesh" | "sdf" | "canvas2d", dataRef: any, dirty: boolean, colliderDirty: boolean, geomVersion: number }
- Tool { kind: string, params: any }  // brushes, chisels, boolean ops, paint, etc.
- NetworkSync { lastSentVersion: number, entityId?: string }
- XRInput { handedness: "left" | "right", pose: {position, rotation}, buttons/axes: … }

Frame pipeline (per render frame)
1) InputSystem
   - Read Babylon’s XR/session/gamepad/mouse events → write intents into ECS (Tool, XRInput).
2) ToolSystem
   - Apply tools to GeometryRep and/or Transform.
   - Set GeometryRep.dirty = true and bump geomVersion (authoritative geometry only).
3) GeometryBuildSystem (off-thread where possible)
   - If GeometryRep.dirty: build/patch geometry buffers in a worker/job queue.
   - Write results back to GeometryRep.dataRef; set colliderDirty = true.
   - Do not touch Babylon Mesh or Rapier here.
4) PhysicsSyncSystem (Rapier)
   - If PhysicsBody.type === "kinematic": push Transform → bodyRef setNextKinematic{Translation,Rotation}.
   - If "dynamic": step Rapier, then read bodyRef pose → write to Transform and bump version if changed.
   - If GeometryRep.colliderDirty: cook/update Rapier collider, swap colliderRef, clear flag.
5) GraphicsSyncSystem (Babylon)
   - If geomVersion changed: update mesh vertex buffers via updateVerticesData/setIndices or replace Geometry; avoid replacing Mesh.
   - Always apply Transform to Babylon nodes (position, rotationQuaternion, scaling).
6) NetworkSystem (future)
   - Send operation or component deltas keyed by geomVersion; avoid sending whole meshes.
   - Reconcile remote ops into ECS; resolve conflicts via op ordering or CRDT if needed.

Geometry pipeline
- Authoritative source: GeometryRep (not Babylon meshes).
- Double-buffer mesh data (A/B) to avoid stalls; swap on geomVersion change.
- Worker jobs for heavy builds: lathe/extrusion, CSG evaluation, SDF meshing, texture synthesis.
- For large edits, support chunked updates (patch vertex subranges/texture subrects).
- Deterministic seeds for stochastic tools to ensure replay consistency.

Physics collider strategy (Rapier)
- Prefer primitives (cuboid, sphere, capsule) or compounds during live editing.
- Lathe stock: cylinder or compound of thin convex slices; update only affected slices.
- Dynamic meshes: convex decomposition/polyhedron where feasible; trimesh only for static.
- Gate recooks with hysteresis: recalc collider only when surface delta exceeds a threshold.
- Keep colliderDirty separate from visual geomVersion to decouple graphics and physics rates.

Transform authority
- Dynamic body: Rapier owns pose; ECS Transform mirrors after step.
- Kinematic/animated: ECS Transform owns pose; push to Rapier kinematic target.
- Fixed: ECS Transform is single source; collider on fixed body.

Graphics details (Babylon.js)
- Meshes are views; store only references in RenderHandle.
- Update transforms after physics sync; cache last applied version to avoid redundant writes.
- Prefer updateVerticesData for stable attributes; replace Geometry for topology changes.
- Materials and dynamic textures (e.g., canvas2d) live outside GeometryRep, but texture content changes can be versioned similarly for networking.

XR and input
- Use Babylon WebXR to acquire controller poses, grip/aim, and button/axis states.
- Map XRInput → Tool intents (e.g., draw stroke, grab/teleport, sculpt).
- Non-XR: mouse/keyboard/gamepad adapters produce the same intent schema.

Networking and sync (future)
- Transport: WebSocket server; optional WebRTC for P2P media.
- Data model: op-log per GeometryRep (e.g., “add profile point”, “apply stroke chunk”, “boolean op”).
- Server applies ops, increments geomVersion, and rebroadcasts; clients reconcile with local predictions.
- Optional CRDT/OT for shared canvases and text; ops remain primary for geometry.

Undo/redo and determinism
- Maintain operation log for each editable artifact; snapshots for fast loads.
- Seeded randomness in tools; rebuild from ops for replay, test, and conflict resolution.
- Persist ops and periodic snapshots to storage (IndexedDB locally; server DB remotely).

Performance and threading
- Rate-limit geometry builds to N/sec; coalesce rapid edits.
- Use workers for CPU-heavy tasks; pass transferable buffers where possible.
- Throttle collider recooks; prioritize user-facing latency (tools, transform) over background meshing.
- Consider WebGPU path (Babylon) when broadly available.

Testing and diagnostics
- Unit-test tool ops deterministically.
- Visual golden images for geometry builds.
- Physics/graphics sync assertions (e.g., drift thresholds).
- On-screen stats: build queue depth, geomVersion, collider recook counts.

Open questions
- Convex decomposition approach and thresholds for Rapier.
- Granularity of chunked updates for very large meshes.
- Reconciliation strategy under high latency: pure op-log vs. CRDT hybrid.

This plan reflects the current stack: Babylon.js for graphics/XR, Rapier for physics, and miniplex for ECS, while keeping the original principles of operation-logged, off-thread geometry, and decoupled graphics/physics pipelines.`
)};
const _5dybj8 = function _11(htl){return(
htl.html`<style>
      html, body { height: 100%; margin: 0; }
      #app { height: 100%; }
      #renderCanvas { width: 100%; height: 100%; display: block; touch-action: none; }
      .overlay {
        position: absolute; left: 10px; top: 10px; 
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; 
        color: white;
      }
      a, a:visited { color: #7fd; }
    </style>`
)};
const _n24oun = function _canvas(app){return(
app.querySelector("#renderCanvas")
)};
const _1mw6ci9 = function _engine(babylon,canvas){return(
new babylon.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true
})
)};
const _oj44b7 = function _scene(babylon,engine){return(
new babylon.Scene(engine)
)};
const _8ukxa5 = function _render_scene(engine,scene){return(
engine.runRenderLoop(() => scene.render())
)};
const _bacoee = function _camera(babylon,scene,canvas)
{
  const camera = new babylon.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 3,
    6,
    new babylon.Vector3(0, 1, 0),
    scene
  );
  camera.attachControl(canvas, true);
  return camera;
};
const _1n0vjlz = function _init_rapier(rapier){return(
rapier.init()
)};
const _uwd8y7 = function _world(miniplex){return(
new miniplex.World()
)};
const _zc15kr = function _ecs(world){return(
(() => {
  function create() {
    return world.add({});
  }
  function addComponent(entity, name, data) {
    if (typeof name === "object" && data === undefined) {
      world.addComponent(entity, name);
      return entity;
    } else {
      world.addComponent(entity, name, data);
      return entity;
    }
  }
  function removeComponent(entity, name) {
    world.removeComponent(entity, name);
  }
  function query(all = []) {
    if (!Array.isArray(all)) all = [all];
    const out = [];
    for (const e of world) {
      let ok = true;
      for (const c of all) {
        if (!(c in e)) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(e);
    }
    return out;
  }
  return {
    world,
    create,
    addComponent,
    removeComponent,
    query
  };
})()
)};
const _1biqtmz = function _makeColliderFromMesh(rapier){return(
function makeColliderFromMesh(mesh) {
  const bi = mesh.getBoundingInfo().boundingBox;
  const min = bi.minimumWorld;
  const max = bi.maximumWorld;
  const hx = Math.max(0.001, (max.x - min.x) * 0.5);
  const hy = Math.max(0.001, (max.y - min.y) * 0.5);
  const hz = Math.max(0.001, (max.z - min.z) * 0.5);
  return rapier.ColliderDesc.cuboid(hx, hy, hz);
}
)};
const _1yqo4rh = function _physicsToEcsSync(ecs,EPS_POS,EPS_ROT){return(
function physicsToEcsSync() {
  const ents = ecs.query(["PhysicsBody", "Transform", "RenderHandle"]);
  for (const e of ents) {
    const pb = e.PhysicsBody;
    const t = e.Transform;
    if (pb.type === "dynamic") {
      const b = pb.bodyRef;
      const p = b.translation();
      const r = b.rotation();
      const dx = t.position.x - p.x;
      const dy = t.position.y - p.y;
      const dz = t.position.z - p.z;
      const posDiff2 = dx * dx + dy * dy + dz * dz;
      const rq = { x: r.x, y: r.y, z: r.z, w: r.w };
      const drot =
        Math.abs(t.rotation.x - rq.x) +
        Math.abs(t.rotation.y - rq.y) +
        Math.abs(t.rotation.z - rq.z) +
        Math.abs(t.rotation.w - rq.w);
      if (posDiff2 > EPS_POS * EPS_POS || drot > EPS_ROT) {
        t.position.set(p.x, p.y, p.z);
        t.rotation.set(rq.x, rq.y, rq.z, rq.w);
        t.version = (t.version || 0) + 1;
      }
    } else if (pb.type === "kinematic") {
      const b = pb.bodyRef;
      b.setNextKinematicTranslation({
        x: t.position.x,
        y: t.position.y,
        z: t.position.z
      });
      b.setNextKinematicRotation({
        x: t.rotation.x,
        y: t.rotation.y,
        z: t.rotation.z,
        w: t.rotation.w
      });
    }
  }
}
)};
const _1mbnqkl = function _createEntityForMesh(ecs,babylon,makeRigidBodyDescFromType,physicsWorld,makeColliderFromMesh){return(
function createEntityForMesh(mesh, opts = {}) {
  const type = opts.type ?? "dynamic";
  const e = ecs.create();
  const pos = mesh.position;
  const rotq =
    mesh.rotationQuaternion ??
    babylon.Quaternion.RotationYawPitchRoll(
      mesh.rotation.y,
      mesh.rotation.x,
      mesh.rotation.z
    );
  const scale = mesh.scaling;
  ecs.addComponent(e, "Transform", {
    position: new babylon.Vector3(pos.x, pos.y, pos.z),
    rotation: rotq.clone(),
    scale: scale.clone(),
    version: 1
  });
  ecs.addComponent(e, "RenderHandle", { meshRef: mesh });
  const rbDesc = makeRigidBodyDescFromType(type);
  rbDesc.setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
  const rb = physicsWorld.createRigidBody(rbDesc);
  const colDesc = makeColliderFromMesh(mesh);
  const col = physicsWorld.createCollider(colDesc, rb);
  ecs.addComponent(e, "PhysicsBody", {
    bodyRef: rb,
    colliderRef: col,
    type,
    awake: true,
    lastSyncVersion: 0
  });
  return e;
}
)};
const _1jdd18q = function _EPS_POS(){return(
1e-3
)};
const _19vq31s = function _EPS_ROT(){return(
1e-3
)};
const _psbttd = function _makeRigidBodyDescFromType(rapier){return(
function makeRigidBodyDescFromType(type) {
  if (type === "dynamic") return rapier.RigidBodyDesc.dynamic();
  if (type === "kinematic")
    return rapier.RigidBodyDesc.kinematicPositionBased();
  return rapier.RigidBodyDesc.fixed();
}
)};
const _12jetsq = function _physicsWorld(init_rapier,rapier)
{
  init_rapier;
  return new rapier.World({ x: 0, y: -9.81, z: 0 });
};
const _1ry3mte = function _sphereEntity(createEntityForMesh,sphere){return(
createEntityForMesh(sphere, { type: "dynamic" })
)};
const _1mmccyf = function _groundEntity(createEntityForMesh,ground){return(
createEntityForMesh(ground, { type: "fixed" })
)};
const _14dsvfe = function _hemiEntity(createLightEntity){return(
createLightEntity("hemi", {
  name: "hemiLight",
  intensity: 0.6,
  position: [0, 1, 0],
  direction: [0, -1, 0]
})
)};
const _1i41vxg = function _sunEntity(createLightEntity){return(
createLightEntity("dir", {
  name: "sunLight",
  intensity: 0.95,
  position: [6, 8, -6],
  direction: [-0.6, -1, -0.4],
  target: [0, 0, 0]
})
)};
const _zbmjpv = function _graphicsApplyTransforms(ecs,babylon){return(
function graphicsApplyTransforms() {
  const ents = ecs.query(["Transform"]);
  for (const e of ents) {
    const t = e.Transform;
    if (e.RenderHandle) {
      const mh = e.RenderHandle;
      const mesh = mh.meshRef;
      if (!mesh) continue;
      if (mesh.__lastTransformVersion === t.version) continue;
      mesh.position.copyFrom(t.position);
      if (mesh.rotationQuaternion) mesh.rotationQuaternion.copyFrom(t.rotation);
      else
        mesh.rotation.copyFrom(
          typeof t.rotation.toEulerAngles === "function"
            ? t.rotation.toEulerAngles()
            : t.rotation
        );
      mesh.scaling.copyFrom(t.scale);
      mesh.__lastTransformVersion = t.version;
    }
    if (e.LightHandle) {
      const lh = e.LightHandle;
      const light = lh.lightRef;
      if (!light) continue;
      if (light.__lastTransformVersion === t.version) continue;
      if (lh.kind === "hemi") {
        const dir = new babylon.Vector3(
          -t.position.x,
          -t.position.y,
          -t.position.z
        );
        dir.normalize();
        if (light.direction) light.direction.copyFrom(dir);
      } else if (lh.kind === "dir") {
        if (light.position) light.position.copyFrom(t.position);
        if (lh.target) {
          const dirv = new babylon.Vector3(
            lh.target.x - t.position.x,
            lh.target.y - t.position.y,
            lh.target.z - t.position.z
          );
          dirv.normalize();
          if (light.direction) light.direction.copyFrom(dirv);
        }
      } else if (lh.kind === "point") {
        if (light.position) light.position.copyFrom(t.position);
      }
      light.__lastTransformVersion = t.version;
    }
  }
}
)};
const _1fvj03g = function _createLightEntity(babylon,scene,ecs){return(
function createLightEntity(type, opts = {}) {
  const name = opts.name ?? `light-${Math.random().toString(36).slice(2, 8)}`;
  if (type === "hemi") {
    const dir = opts.direction
      ? new babylon.Vector3(
          opts.direction[0],
          opts.direction[1],
          opts.direction[2]
        )
      : new babylon.Vector3(0, -1, 0);
    const light = new babylon.HemisphericLight(name, dir, scene);
    light.intensity = opts.intensity ?? 0.8;
    const e = ecs.create();
    ecs.addComponent(e, "Transform", {
      position: new babylon.Vector3(
        opts.position?.[0] ?? 0,
        opts.position?.[1] ?? 1,
        opts.position?.[2] ?? 0
      ),
      rotation: new babylon.Quaternion(0, 0, 0, 1),
      scale: new babylon.Vector3(1, 1, 1),
      version: 1
    });
    ecs.addComponent(e, "LightHandle", { lightRef: light, kind: "hemi" });
    return e;
  } else if (type === "dir") {
    const dir = opts.direction
      ? new babylon.Vector3(
          opts.direction[0],
          opts.direction[1],
          opts.direction[2]
        )
      : new babylon.Vector3(-1, -2, -1);
    dir.normalize();
    const light = new babylon.DirectionalLight(name, dir, scene);
    light.intensity = opts.intensity ?? 0.9;
    const pos = new babylon.Vector3(
      opts.position?.[0] ?? 6,
      opts.position?.[1] ?? 8,
      opts.position?.[2] ?? -6
    );
    if (light.position) light.position.copyFrom(pos);
    const e = ecs.create();
    ecs.addComponent(e, "Transform", {
      position: pos,
      rotation: new babylon.Quaternion(0, 0, 0, 1),
      scale: new babylon.Vector3(1, 1, 1),
      version: 1
    });
    const target = opts.target
      ? new babylon.Vector3(opts.target[0], opts.target[1], opts.target[2])
      : new babylon.Vector3(0, 0, 0);
    ecs.addComponent(e, "LightHandle", {
      lightRef: light,
      kind: "dir",
      target
    });
    return e;
  } else if (type === "point") {
    const pos = opts.position
      ? new babylon.Vector3(
          opts.position[0],
          opts.position[1],
          opts.position[2]
        )
      : new babylon.Vector3(0, 2, 0);
    const light = new babylon.PointLight(name, pos, scene);
    light.intensity = opts.intensity ?? 1;
    const e = ecs.create();
    ecs.addComponent(e, "Transform", {
      position: pos.clone(),
      rotation: new babylon.Quaternion(0, 0, 0, 1),
      scale: new babylon.Vector3(1, 1, 1),
      version: 1
    });
    ecs.addComponent(e, "LightHandle", { lightRef: light, kind: "point" });
    return e;
  }
  return null;
}
)};
const _14wcah6 = function _recookColliderIfNeeded(ecs,physicsWorld,makeColliderFromMesh){return(
function recookColliderIfNeeded() {
  const ents = ecs.query(["PhysicsBody", "RenderHandle", "GeometryRep"]);
  for (const e of ents) {
    const gr = e.GeometryRep;
    if (!gr || !gr.colliderDirty) continue;
    const mh = e.RenderHandle;
    const mesh = mh.meshRef;
    const pb = e.PhysicsBody;
    const oldCol = pb.colliderRef;
    try {
      physicsWorld.removeCollider(oldCol);
    } catch (err) {}
    const newDesc = makeColliderFromMesh(mesh);
    const newCol = physicsWorld.createCollider(newDesc, pb.bodyRef);
    pb.colliderRef = newCol;
    gr.colliderDirty = false;
  }
}
)};
const _1aav7zw = function _loop(physicsWorld,scene,physicsToEcsSync,recookColliderIfNeeded,graphicsApplyTransforms)
{
  let lastTime = performance.now();
  function physicsStep(dt) {
    physicsWorld.timestep = dt;
    physicsWorld.step();
  }
  return scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.05) dt = 0.05;
    physicsStep(dt);
    physicsToEcsSync();
    recookColliderIfNeeded();
    graphicsApplyTransforms();
  });
};
const _2fjyzt = function _sphere(scene,babylon){return(
scene.getMeshByName("sphere") ??
  (() => {
    const s = babylon.MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 1.2 },
      scene
    );
    s.position.y = 1;
    const m = new babylon.StandardMaterial("sphereMat", scene);
    m.diffuseColor = new babylon.Color3(0.2, 0.6, 0.9);
    s.material = m;
    return s;
  })()
)};
const _cu5ngc = function _ground(scene,babylon){return(
scene.getMeshByName("ground") ??
  (() => {
    return babylon.MeshBuilder.CreateGround(
      "ground",
      { width: 10, height: 10 },
      scene
    );
  })()
)};
const _1yjz30w = async function _gui() {
    return await import('https://cdn.jsdelivr.net/npm/@babylonjs/gui@6.0.0/+esm');
};
const _xfdmyy = function _vrconsole(app,scene,babylon,gui,engine){return(
(() => {
  const MAX_LINES = 60;
  const origLog = console.log.bind(console);
  const origError = console.error.bind(console);
  const buffer = [];
  function push(level, parts) {
    const text = parts
      .map((p) => {
        try {
          if (typeof p === "string") return p;
          return JSON.stringify(p);
        } catch (e) {
          return String(p);
        }
      })
      .join(" ");
    buffer.push({ level, text, t: new Date() });
    while (buffer.length > MAX_LINES) buffer.shift();
    renderHTML();
    renderVR();
  }
  const overlay = document.createElement("div");
  overlay.className = "vr-shadow-console";
  overlay.style.cssText =
    "position:absolute;left:10px;bottom:10px;max-width:40vw;max-height:40vh;overflow:auto;background:rgba(0,0,0,0.5);color:#e6f7ff;font-family:monospace;font-size:12px;padding:8px;border-radius:6px;z-index:9999;pointer-events:none;";
  app.appendChild(overlay);
  function renderHTML() {
    overlay.innerHTML = buffer
      .map((m) => {
        const ts = m.t.toLocaleTimeString();
        const cls = m.level === "error" ? "color:#ffb3b3" : "color:#cfefff";
        return `<div style="white-space:pre-wrap;${cls}">[${ts}] ${m.level.toUpperCase()}: ${escapeHtml(
          m.text
        )}</div>`;
      })
      .join("");
    overlay.scrollTop = overlay.scrollHeight;
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  let plane = null;
  let adt = null;
  let textBlock = null;
  function makeVRPanel() {
    if (plane && !plane.isDisposed()) return;
    if (plane && plane.isDisposed && !plane.isDisposed()) return;
    if (plane && plane.getScene && plane.getScene() !== scene) {
      try {
        plane.dispose();
      } catch {}
      plane = null;
    }
    plane = babylon.MeshBuilder.CreatePlane(
      "vr-console-plane",
      { width: 1.4, height: 0.6 },
      scene
    );
    plane.isPickable = false;
    plane.alwaysSelectAsActiveMesh = false;
    plane.layerMask = 0x0fffffff;
    adt = gui.GUI.AdvancedDynamicTexture.CreateForMesh(plane, 1024, true);
    textBlock = new gui.GUI.TextBlock();
    textBlock.text = "";
    textBlock.color = "white";
    textBlock.fontFamily = "monospace";
    textBlock.fontSize = 36;
    textBlock.textWrapping = true;
    textBlock.textHorizontalAlignment =
      gui.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    textBlock.textVerticalAlignment = gui.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    textBlock.paddingTop = "8px";
    textBlock.paddingLeft = "12px";
    adt.addControl(textBlock);
    reparentToActiveCamera();
    plane.renderingGroupId = 2;
    plane.receiveShadows = false;
    plane.checkCollisions = false;
  }
  function reparentToActiveCamera() {
    if (!plane) return;
    const cam = scene.activeCamera;
    if (!cam) return;
    try {
      plane.setParent(cam);
      plane.position = new babylon.Vector3(0, -0.25, 1);
      plane.rotationQuaternion = new babylon.Quaternion(0, 0, 0, 1);
      plane.scaling = new babylon.Vector3(1, 1, 1);
    } catch (e) {}
  }
  function renderVR() {
    if (!scene || scene.isDisposed) return;
    try {
      if (!plane || plane.isDisposed()) makeVRPanel();
      const lines = buffer
        .map((m) => {
          const ts = m.t.toLocaleTimeString();
          const prefix = m.level === "error" ? "[ERR]" : "[LOG]";
          return `${ts} ${prefix} ${m.text}`;
        })
        .join("\n");
      if (textBlock) textBlock.text = lines;
    } catch (e) {}
  }
  scene.onActiveCameraChanged.add(() => {
    reparentToActiveCamera();
  });
  engine.onResizeObservable.add(() => {
    if (adt && !adt.isDisposed)
      try {
        adt.scaleTo(1);
      } catch (e) {}
  });
  function clear() {
    buffer.length = 0;
    renderHTML();
    renderVR();
  }
  console.log = function (...args) {
    origLog(...args);
    push("log", args);
  };
  console.error = function (...args) {
    origError(...args);
    push("error", args);
  };
  window.addEventListener("error", (e) => {
    try {
      push("error", [
        e.message + (e.filename ? ` (${e.filename}:${e.lineno || "?"})` : "")
      ]);
    } catch {}
  });
  window.addEventListener("unhandledrejection", (e) => {
    try {
      push("error", [String(e.reason)]);
    } catch {}
  });
  return {
    pushLog: (...parts) => push("log", parts),
    pushError: (...parts) => push("error", parts),
    clear,
    buffer,
    makeVRPanel
  };
})()
)};
const _ttsrvz = function _39(scene){return(
scene.onActiveCameraChanged
)};
const _cohrht = function _40(robocoop){return(
robocoop
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter", async () => runtime.module((await import("/@tomlarkworthy/exporter.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  $def("_utb5qn", "app", ["html"], _utb5qn);  
  $def("_yrpk1v", "viewof enterVR", ["Inputs","scene","alert","ground"], _yrpk1v);  
  $def("_1x0f1aw", "enterVR", ["Generators","viewof enterVR"], _1x0f1aw);  
  $def("_fbkvuj", null, ["md"], _fbkvuj);  
  $def("_u89zim", null, ["exporter"], _u89zim);  
  $def("_dsjf4f", null, ["md"], _dsjf4f);  
  $def("_cn2qav", null, ["md"], _cn2qav);  
  $def("_5aa6ji", "babylon", [], _5aa6ji);  
  $def("_1l2j19t", "rapier", [], _1l2j19t);  
  $def("_q46uy2", "miniplex", [], _q46uy2);  
  $def("_b3pr41", null, ["md"], _b3pr41);  
  $def("_5dybj8", null, ["htl"], _5dybj8);  
  $def("_n24oun", "canvas", ["app"], _n24oun);  
  $def("_1mw6ci9", "engine", ["babylon","canvas"], _1mw6ci9);  
  $def("_oj44b7", "scene", ["babylon","engine"], _oj44b7);  
  $def("_8ukxa5", "render_scene", ["engine","scene"], _8ukxa5);  
  $def("_bacoee", "camera", ["babylon","scene","canvas"], _bacoee);  
  $def("_1n0vjlz", "init_rapier", ["rapier"], _1n0vjlz);  
  $def("_uwd8y7", "world", ["miniplex"], _uwd8y7);  
  $def("_zc15kr", "ecs", ["world"], _zc15kr);  
  $def("_1biqtmz", "makeColliderFromMesh", ["rapier"], _1biqtmz);  
  $def("_1yqo4rh", "physicsToEcsSync", ["ecs","EPS_POS","EPS_ROT"], _1yqo4rh);  
  $def("_1mbnqkl", "createEntityForMesh", ["ecs","babylon","makeRigidBodyDescFromType","physicsWorld","makeColliderFromMesh"], _1mbnqkl);  
  $def("_1jdd18q", "EPS_POS", [], _1jdd18q);  
  $def("_19vq31s", "EPS_ROT", [], _19vq31s);  
  $def("_psbttd", "makeRigidBodyDescFromType", ["rapier"], _psbttd);  
  $def("_12jetsq", "physicsWorld", ["init_rapier","rapier"], _12jetsq);  
  $def("_1ry3mte", "sphereEntity", ["createEntityForMesh","sphere"], _1ry3mte);  
  $def("_1mmccyf", "groundEntity", ["createEntityForMesh","ground"], _1mmccyf);  
  $def("_14dsvfe", "hemiEntity", ["createLightEntity"], _14dsvfe);  
  $def("_1i41vxg", "sunEntity", ["createLightEntity"], _1i41vxg);  
  $def("_zbmjpv", "graphicsApplyTransforms", ["ecs","babylon"], _zbmjpv);  
  $def("_1fvj03g", "createLightEntity", ["babylon","scene","ecs"], _1fvj03g);  
  $def("_14wcah6", "recookColliderIfNeeded", ["ecs","physicsWorld","makeColliderFromMesh"], _14wcah6);  
  $def("_1aav7zw", "loop", ["physicsWorld","scene","physicsToEcsSync","recookColliderIfNeeded","graphicsApplyTransforms"], _1aav7zw);  
  $def("_2fjyzt", "sphere", ["scene","babylon"], _2fjyzt);  
  $def("_cu5ngc", "ground", ["scene","babylon"], _cu5ngc);  
  $def("_1yjz30w", "gui", [], _1yjz30w);  
  $def("_xfdmyy", "vrconsole", ["app","scene","babylon","gui","engine"], _xfdmyy);  
  $def("_ttsrvz", null, ["scene"], _ttsrvz);  
  $def("_cohrht", null, ["robocoop"], _cohrht);  
  main.define("exporter", ["module @tomlarkworthy/exporter", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("robocoop", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop", _));
  return main;
}