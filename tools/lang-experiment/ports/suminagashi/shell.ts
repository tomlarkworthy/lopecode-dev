// Port of @tomlarkworthy/suminagashi: shell cells (DOM, canvas, WebGL, widgets, the animation loop)
// and the GPU tests. See MAP.md. The markdown cells at the end were extracted mechanically.

type Contours = ReturnType<ValueOf<"createContours">>;

// ---- reading mutable state without depending on it ----
// The original's event handlers and animation loop read `mutable x` (`$0.value`) at call time
// without depending on it. A Ref has no read, and a value parameter would rebuild the canvas (and
// with it the WebGL context) or restart the loop on every change. These cells copy each committed
// value into one box that the handlers and the loop read. See GAPS.md.
export let live = () => ({
  turn: 0 as ValueOf<"turn">,
  pointer: undefined as ValueOf<"pointer">,
  finished: false as ValueOf<"finished">,
});
export let live_turn = (live, turn) => {
  live.turn = turn;
  return turn;
};
export let live_pointer = (live, pointer) => {
  live.pointer = pointer;
  return pointer;
};
export let live_finished = (live, finished) => {
  live.finished = finished;
  return finished;
};

// ---- widgets: each viewof is a ref cell in cells.ts plus a *_view cell here ----

export let tool_view = (tool: Ref<ValueOf<"tool">>, Inputs) => {
  const input = Inputs.radio(["brush", "blow", "stylus"], { value: "brush", label: "tool" });
  input.addEventListener("input", action(() => tool.set(input.value)));
  return input;
};
export let reset_view = (reset: Ref<number>, Inputs) => {
  const input = Inputs.button("empty the tray");
  input.addEventListener("input", action(() => reset.set(input.value)));
  return input;
};
export let view_view = (view: Ref<ValueOf<"view">>, Inputs) => {
  const input = Inputs.radio(["lines", "print", "surface pressure"], { value: "lines", label: "view" });
  input.addEventListener("input", action(() => view.set(input.value)));
  return input;
};
export let height_view = (height: Ref<number>, Inputs) => {
  const input = Inputs.range([100, 1000], { value: 570, step: 1, label: "height" });
  input.addEventListener("input", action(() => height.set(input.value)));
  return input;
};
export let cellSize_view = (cellSize: Ref<number>, Inputs) => {
  const input = Inputs.range([1, 4], { value: 1.5, step: 0.25, label: "grid cell size (px)" });
  input.addEventListener("input", action(() => cellSize.set(input.value)));
  return input;
};
export let backgroundFilm_view = (backgroundFilm: Ref<number>, Inputs) => {
  const input = Inputs.range([0.02, 1], { value: 0.1, step: 0.01, label: "film already on the water" });
  input.addEventListener("input", action(() => backgroundFilm.set(input.value)));
  return input;
};
export let runTests_view = (runTests: Ref<boolean>, Inputs) => {
  // the original starts false; see cells.ts runTests
  const input = Inputs.toggle({ label: "run the tests", value: true });
  input.addEventListener("input", action(() => runTests.set(input.value)));
  return input;
};
export let params_view = (params: Ref<ValueOf<"params">>, Inputs, defaults, html) => {
  const range = (key: keyof typeof defaults, extent: number[], step: number, label: string) =>
    Inputs.range(extent, { value: defaults[key], step, label, width: 340 });
  const form = Inputs.form(
    {
      brushLoad: range("brushLoad", [0.1, 4], 0.05, "brush load"),
      brushFeed: range("brushFeed", [0.05, 1], 0.05, "brush feed"),
      brushRadius: range("brushRadius", [2, 20], 0.5, "brush radius (px)"),
      stiffness: range("stiffness", [0.05, 1], 0.05, "film stiffness"),
      touchTransportSteps: range("touchTransportSteps", [1, 32], 1, "flux steps, touching"),
      transportSteps: range("transportSteps", [1, 32], 1, "flux steps, idle"),
      curl: range("curl", [0, 1], 0.01, "curl"),
      viscosity: range("viscosity", [0, 0.24], 0.005, "viscosity"),
      drag: range("drag", [0, 0.2], 0.001, "water drag"),
      strokeRadius: range("strokeRadius", [5, 150], 1, "blow radius (px)"),
      solvesPerSecond: range("solvesPerSecond", [30, 240], 10, "solves per second"),
      dt: range("dt", [0.25, 2], 0.05, "time step"),
      cycles: range("cycles", [1, 8], 1, "pressure V-cycles"),
      inkStrength: range("inkStrength", [0.1, 20], 0.1, "ink darkness"),
      sharpness: range("sharpness", [0, 4], 0.05, "boundary sharpness"),
      finishAtMs: range("finishAtMs", [17, 50], 1, "finish at (ms of work a frame)"),
      wash: range("wash", [0, 1], 0.05, "beads (0) or wash (1)"),
      compress: Inputs.toggle({ label: "keep fluids apart", value: defaults.compress }),
      autoDrops: Inputs.toggle({ label: "demo drops", value: defaults.autoDrops }),
    },
    {
      template: (inputs: Record<string, unknown>) => html`<div class="sumi-params" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 0 1.5em">
        <style>
          .sumi-params > form { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; --label-width: 140px; }
          .sumi-params > form > div { min-width: 0; }
          .sumi-params > form input[type="number"] { width: 5.5em; flex: none; }
          .sumi-params > form input[type="range"] { min-width: 0; flex: 1 1 0; width: 0; }
        </style>
        ${Object.values(inputs)}
      </div>`,
    },
  );
  form.addEventListener("input", action(() => params.set(form.value)));
  return form;
};

// ---- the canvas and its pointer events ----

export let canvas = (DOM, width, height, sequence, tool_view: any, reset_view: any, live, pointerDown, pointerMove, pointerUp) => {
  const canvas = DOM.canvas(width * devicePixelRatio, height * devicePixelRatio);
  canvas.style.border = "solid";
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style["touch-action"] = "none";

  canvas.addEventListener("pointerdown", (evt: PointerEvent) => {
    const finished = live.finished;
    if (finished) {
      // A finished picture: this touch only empties the tray. Not in the first
      // two seconds, or the stroke that was meant to follow the last one does it.
      if (performance.now() - finished.at > 2000) reset_view.querySelector("button").click();
      return;
    }
    canvas.setPointerCapture(evt.pointerId);
    const tool = tool_view.value;
    // the original increments turn, then reads it back; the write is queued, so compute it here
    const turn = tool === "brush" ? live.turn + 1 : live.turn; // rotate fluids every click
    pointerDown(
      { touch: evt.timeStamp, tool, fluid: sequence[(turn - 1) % sequence.length], x: evt.offsetX, y: evt.offsetY, down: true },
      tool === "brush",
    );
  });
  canvas.addEventListener("pointermove", (evt: PointerEvent) => pointerMove(evt.offsetX, evt.offsetY));
  const release = () => pointerUp();
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  return canvas;
};

export let nextFluid = (fluids, sequence, turn, finished, html) => {
  if (finished)
    return html`<div style="font: 13px var(--sans-serif, sans-serif)"><b>The picture is finished.</b> Its lines grew past what this machine redraws smoothly (${finished.why}). Touch it to start another.</div>`;
  const next = fluids[sequence[turn % sequence.length]];
  return html`<div style="font: 13px var(--sans-serif, sans-serif); display: flex; align-items: center; gap: 0.5em">
    <span style="display:inline-block; box-sizing: border-box; width: 1.2em; height: 1.2em; border-radius: 50%; border: 0.3em solid #f6f1e6; background: ${next.color ?? "#f6f1e6"}"></span>
    next touch: <b>${next.name}</b>
  </div>`;
};

export let download = (tray, canvas: any, html) => {
  const button = html`<button>download png</button>`;
  button.onclick = () => {
    // WebGL keeps its pixels only for the task that drew them: draw, then read
    if (tray.repaint) tray.repaint();
    canvas.toBlob((blob: Blob) => {
      const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      const link = html`<a download="suminagashi-${stamp}.png" href=${URL.createObjectURL(blob)}>`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
  };
  return button;
};

// ---- WebGL ----

export let ctx = (canvas: any, invalidation) => {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    depth: false,
    stencil: true, // the lines view fills its polygons through the stencil
    antialias: true,
  });
  if (!gl) throw new Error("This notebook needs WebGL2");
  invalidation.then(() => {
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  });

  // The film needs a float texture it can render into. 32 bit keeps the
  // mass balance to rounding; 16 bit is the fallback and drifts.
  const renderable = (internal: number) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, 4, 4);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(tex);
    return ok;
  };
  let format: { internal: number; bits: number };
  if (gl.getExtension("EXT_color_buffer_float") && renderable(gl.RGBA32F)) format = { internal: gl.RGBA32F, bits: 32 };
  else if ((gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float")) && renderable(gl.RGBA16F))
    format = { internal: gl.RGBA16F, bits: 16 };
  else throw new Error("This GPU cannot render to float textures");
  return { gl, format };
};

export let gl = (ctx) => ctx.gl;

export let programs = (
  gl: any, vertexShader, confinementShader, velocityShader, reduceShader, divergenceShader, shiftShader,
  pressureShader, restrictShader, prolongShader, projectShader, transportShader, brushShader, displayShader,
) => {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexShader);
  const link = (source: string) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, source));
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const uniforms: Record<string, { type: number; location: unknown }> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = { type: info.type, location: gl.getUniformLocation(program, info.name) };
    }
    return { program, uniforms };
  };

  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // run(program, framebuffer, [w, h], {uniform: value}); textures are passed as {tex}
  const run = ({ program, uniforms }: ReturnType<typeof link>, framebuffer: unknown, size: number[], values: Record<string, any>) => {
    gl.useProgram(program);
    let unit = 0;
    for (const [name, value] of Object.entries(values)) {
      const uniform = uniforms[name];
      if (!uniform) continue;
      const at = uniform.location;
      if (uniform.type === gl.SAMPLER_2D) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, value.tex);
        gl.uniform1i(at, unit++);
      } else if (uniform.type === gl.FLOAT) gl.uniform1f(at, value);
      else if (uniform.type === gl.INT) gl.uniform1i(at, value);
      else if (uniform.type === gl.FLOAT_VEC2) gl.uniform2fv(at, value);
      else if (uniform.type === gl.FLOAT_VEC3) gl.uniform3fv(at, value);
      else if (uniform.type === gl.FLOAT_VEC4) gl.uniform4fv(at, value);
      else if (uniform.type === gl.INT_VEC2) gl.uniform2iv(at, value);
      else if (uniform.type === gl.FLOAT_MAT4) gl.uniformMatrix4fv(at, false, value);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, size[0], size[1]);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return {
    run,
    confinement: link(confinementShader),
    velocity: link(velocityShader),
    reduce: link(reduceShader),
    divergence: link(divergenceShader),
    shift: link(shiftShader),
    pressure: link(pressureShader),
    restrict: link(restrictShader),
    prolong: link(prolongShader),
    project: link(projectShader),
    transport: link(transportShader),
    brush: link(brushShader),
    display: link(displayShader),
  };
};

export let createTray = (gl: any, ctx, programs, defaults) =>
  function createTray(width: number, height: number) {
    const target = (w = width, h = height) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, ctx.format.internal, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
      return { tex, fbo, size: [w, h] };
    };
    type Target = ReturnType<typeof target>;
    // a film is two textures, four fluids in each, written together
    const filmTarget = () => {
      const a = target();
      const b = target();
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      [a, b].forEach(({ tex }, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0));
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      return { a, b, fbo, size: [width, height] };
    };
    const film = [filmTarget(), filmTarget()];
    const velocity = [target(), target()];
    const force = target();
    const scratch = target();
    // Multigrid: level 0 is the tray, each level after it has cells twice as
    // wide. Halving an odd size leaves a last cell covering one finer cell, so
    // `last` is the width of each level's last column and row in its own cells.
    // Treated as full cells they amplify the error, about 1.26 a level: five
    // odd levels (450x380) blew the pressure up 3.16x per V-cycle, 2026-09-18.
    type Level = { size: number[]; h2: number; last: number[]; p: Target[]; rhs: Target };
    const levels: Level[] = [];
    for (let w = width, h = height, h2 = 1, last = [1, 1]; ; h2 *= 4) {
      levels.push({ size: [w, h], h2, last, p: [target(w, h), target(w, h)], rhs: target(w, h) });
      if (Math.min(w, h) <= 4) break;
      last = [w % 2 ? last[0] / 2 : (1 + last[0]) / 2, h % 2 ? last[1] / 2 : (1 + last[1]) / 2];
      w = Math.ceil(w / 2);
      h = Math.ceil(h / 2);
    }
    // the 1x1 texture holding the sum of a whole texture
    const total = (source: any, isFilm = false) => {
      means.forEach((level, i) => {
        const both = isFilm && i === 0;
        run(programs.reduce, level.fbo, level.size, {
          uSource: both ? source.a : source,
          uSourceB: both ? source.b : source,
          uSourceSize: source.size,
          uFilm: both ? 1 : 0,
        });
        source = level;
      });
      return source;
    };
    const smooth = (level: Level, times: number) => {
      for (let i = 0; i < times; i++) {
        run(programs.pressure, level.p[1].fbo, level.size, {
          uPressure: level.p[0],
          uRhs: level.rhs,
          uSize: level.size,
          uLast: level.last,
          uH2: level.h2,
        });
        level.p.reverse();
      }
    };
    const vCycle = (l: number): void => {
      const level = levels[l];
      const coarse = levels[l + 1];
      if (!coarse) return smooth(level, 8);
      smooth(level, 2);
      run(programs.restrict, coarse.rhs.fbo, coarse.size, {
        uPressure: level.p[0],
        uRhs: level.rhs,
        uSize: level.size,
        uLast: level.last,
        uH2: level.h2,
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, coarse.p[0].fbo);
      gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
      vCycle(l + 1);
      run(programs.prolong, level.p[1].fbo, level.size, {
        uPressure: level.p[0],
        uCoarse: coarse.p[0],
      });
      level.p.reverse();
      smooth(level, 2);
    };
    // each level sums 8x8 blocks of the one before, down to a single texel
    const means: Target[] = [];
    for (let w = width, h = height; w > 1 || h > 1; ) {
      w = Math.ceil(w / 8);
      h = Math.ceil(h / 8);
      means.push(target(w, h));
    }
    const size = [width, height];
    const { run } = programs;

    return {
      width,
      height,
      demo: undefined as undefined | { drops: number; wait: number },
      contours: undefined as undefined | Contours,
      repaint: undefined as undefined | (() => void),
      // cover the whole tray with `amount` of fluid number `fluid`
      fill(fluid: number, amount: number) {
        const value = [0, 0, 0, 0, 0, 0, 0, 0];
        value[fluid] = amount;
        gl.bindFramebuffer(gl.FRAMEBUFFER, film[0].fbo);
        gl.clearBufferfv(gl.COLOR, 0, value.slice(0, 4));
        gl.clearBufferfv(gl.COLOR, 1, value.slice(4));
      },
      // touch the surface at cell (x, y) with a loaded brush
      brush({ x, y, fluid, pressure, radius = 3, rate = 0.5 }: { x: number; y: number; fluid: number; pressure: number; radius?: number; rate?: number }) {
        const oneHot = [0, 0, 0, 0, 0, 0, 0, 0];
        oneHot[fluid] = 1;
        run(programs.brush, film[1].fbo, size, {
          uFilm: film[0].a,
          uFilmB: film[0].b,
          uPoint: [x, y],
          uRadius: radius,
          uFluid: oneHot.slice(0, 4),
          uFluidB: oneHot.slice(4),
          uPressure: pressure,
          uRate: rate,
        });
        film.reverse();
      },
      step(options: Record<string, any> = {}) {
        const { dt, drag, viscosity, curl, stiffness, cycles, compress, sharpness, wash, stroke } = {
          ...defaults,
          stroke: undefined as any,
          ...options,
        };
        const transportSteps = options.transportSteps || defaults.transportSteps;
        run(programs.confinement, force.fbo, size, {
          uVelocity: velocity[0],
          uSize: size,
        });
        run(programs.velocity, velocity[1].fbo, size, {
          uVelocity: velocity[0],
          uForce: force,
          uSize: size,
          uDt: dt,
          uDrag: drag,
          uViscosity: viscosity,
          uCurl: curl,
          uStrokeFrom: stroke ? stroke.from : [0, 0],
          uStrokeTo: stroke ? stroke.to : [0, 0],
          uStrokeVelocity: stroke ? stroke.velocity : [0, 0],
          uStrokeRadius: stroke ? stroke.radius : 1,
          uStrokeStrength: stroke ? stroke.strength : 0,
        });
        velocity.reverse();

        run(programs.divergence, scratch.fbo, size, {
          uVelocity: velocity[0],
          uFilm: film[0].a,
          uFilmB: film[0].b,
          uTotal: total(film[0], true),
          uSize: size,
          uStiffness: stiffness / dt,
        });
        run(programs.shift, levels[0].rhs.fbo, size, {
          uSource: scratch,
          uTotal: total(scratch),
          uSize: size,
        });
        run(programs.shift, levels[0].p[1].fbo, size, {
          uSource: levels[0].p[0],
          uTotal: total(levels[0].p[0]),
          uSize: size,
        });
        levels[0].p.reverse();
        // warm started from the previous solve
        for (let i = 0; i < cycles; i++) vCycle(0);
        run(programs.project, velocity[1].fbo, size, {
          uVelocity: velocity[0],
          uPressure: levels[0].p[0],
          uSize: size,
          uMaxSpeed: (0.4 * transportSteps) / dt,
        });
        velocity.reverse();

        for (let n = 0; n < transportSteps; n++) {
          run(programs.transport, film[1].fbo, size, {
            uVelocity: velocity[0],
            uFilm: film[0].a,
            uFilmB: film[0].b,
            uSize: size,
            uDt: dt / transportSteps,
            uCompress: compress ? 1 : 0,
            uSharpness: sharpness,
            uWash: wash,
            uWidth: 0.6,
          });
          film.reverse();
        }
      },
      render({ absorb, paper, strength = defaults.inkStrength, edge = 0.2, view = 0 }: { absorb: Float32Array; paper: number[]; strength?: number; edge?: number; view?: number }) {
        run(programs.display, null, [gl.drawingBufferWidth, gl.drawingBufferHeight], {
          uFilm: film[0].a,
          uFilmB: film[0].b,
          uSize: size,
          uAbsorb: absorb.subarray(0, 16),
          uAbsorbB: absorb.subarray(16),
          uPaper: paper,
          uEdge: edge,
          uStrength: strength,
          uView: view,
        });
      },
      // Float32Array of the film, 8 fluids per cell, row 0 at the bottom
      // "velocity" and "pressure" read those instead, 4 numbers per cell
      // `into` is reused when given, which matters at 60 reads a second
      read(what = "film", into?: Float32Array) {
        const pixels = ({ fbo }: { fbo: unknown }) => {
          const data = into || new Float32Array(width * height * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, data);
          return data;
        };
        if (what === "velocity") return pixels(velocity[0]);
        if (what === "pressure") return pixels(levels[0].p[0]);
        const a = pixels(film[0].a);
        const b = pixels(film[0].b);
        const data = new Float32Array(width * height * 8);
        for (let i = 0; i < width * height; i++) {
          data.set(a.subarray(4 * i, 4 * i + 4), 8 * i);
          data.set(b.subarray(4 * i, 4 * i + 4), 8 * i + 4);
        }
        return data;
      },
      // the water's velocity, as the texture the transport step reads
      get velocity() {
        return velocity[0];
      },
      dispose() {
        for (const { fbo } of film) gl.deleteFramebuffer(fbo);
        for (const { tex, fbo } of [
          ...film.flatMap(({ a, b }) => [a, b]),
          ...velocity,
          force,
          scratch,
          ...means,
          ...levels.flatMap((level) => [...level.p, level.rhs]),
        ]) {
          gl.deleteTexture(tex);
          gl.deleteFramebuffer(fbo);
        }
      },
    };
  };

// The GPU side of the lines. The original keys what the GPU holds by the contours object and by
// each curve object, both mutated in place. Contours values are immutable here, so it keys by
// contours.lineage and by curve index (curves are only ever appended), and respace returns the
// next contours value.
export let contourPainter = (gl: any, contourVertexShader, contourFragmentShader, contourAdvectShader, invalidation) => {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const link = (vertex: string, fragment: string, captured?: string[]) => {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    if (captured) gl.transformFeedbackVaryings(program, captured, gl.SEPARATE_ATTRIBS);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  };
  const locate = (program: unknown, names: string[]) =>
    Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  const paintProgram = link(contourVertexShader, contourFragmentShader);
  const paintAt = locate(paintProgram, ["uSize", "uBox", "uCover", "uColor"]);
  const advectProgram = link(contourAdvectShader, contourFragmentShader, ["vPosition"]);
  const advectAt = locate(advectProgram, ["uVelocity", "uSize", "uDt"]);
  const feedback = gl.createTransformFeedback();
  const multi = gl.getExtension("WEBGL_multi_draw");

  // A curve is filled as fans of CHUNK vertices, each about its own first
  // vertex, plus one fan over the chunks' first vertices. The windings add up
  // to the curve's and the triangles stay small. On 1.3 million vertices
  // (Apple M5 Max, 2026-09-17, solver off): one fan per curve 25 fps,
  // chunks of 256 38 fps, of 32 73 fps, of 8 28 fps.
  // The fan over the chunk starts reads them straight from the vertex buffer
  // with a stride of one chunk, which WebGL caps at 255 bytes: 31 vertices.
  // It was an index buffer until a Mali-G77 phone drew stale indices from it.
  const CHUNK = 31;
  type State = {
    sides: { buffer: unknown; vao: unknown; coarse: unknown }[];
    capacity: number;
    n: number;
    box: readonly number[];
    since: number;
    ahead: boolean;
    firsts: Int32Array;
    counts: Int32Array;
  };
  const tended = new Map<object, Map<number, State>>(); // lineage -> curve index -> what the GPU holds of it
  let states: Map<number, State>;
  const free = (state: State) => {
    for (const { buffer, vao, coarse } of state.sides) {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteVertexArray(coarse);
    }
  };
  const tend = (contours: Contours) => {
    if (!tended.has(contours.lineage)) tended.set(contours.lineage, new Map());
    states = tended.get(contours.lineage)!;
  };
  const forgetLineage = (lineage: object) => {
    if (!tended.has(lineage)) return;
    tended.get(lineage)!.forEach(free);
    tended.delete(lineage);
  };
  const forget = (contours: Contours) => forgetLineage(contours.lineage);
  invalidation.then(() => {
    [...tended.keys()].forEach(forgetLineage);
    gl.deleteTransformFeedback(feedback);
    gl.deleteProgram(paintProgram);
    gl.deleteProgram(advectProgram);
  });

  // put curve k's CPU vertices on the GPU
  const upload = (contours: Contours, k: number, state: State) => {
    const { packed, n, box } = contours.pack(k);
    if (state.capacity < packed.length) {
      state.capacity = 2 * packed.length;
      for (const { buffer } of state.sides) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, 4 * state.capacity, gl.DYNAMIC_COPY);
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, state.sides[0].buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, packed);
    const chunks = Math.ceil(n / CHUNK);
    state.firsts = Int32Array.from({ length: chunks }, (_, c) => c * CHUNK);
    state.counts = Int32Array.from({ length: chunks }, (_, c) => Math.min(CHUNK, n - c * CHUNK) + 1);
    Object.assign(state, { n, box, since: 0, ahead: false });
  };
  const stateOf = (contours: Contours, k: number) => {
    let state = states.get(k);
    if (!state) {
      const sides = [0, 1].map(() => {
        const buffer = gl.createBuffer();
        const bind = (stride: number) => {
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.enableVertexAttribArray(0);
          gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
          return vao;
        };
        return { buffer, vao: bind(0), coarse: bind(8 * CHUNK) };
      });
      gl.bindVertexArray(null);
      state = { sides, capacity: 0 } as State;
      states.set(k, state);
      upload(contours, k, state);
    }
    return state;
  };

  return {
    forget,
    // free what the GPU holds of every contours but this one
    retain(contours: Contours) {
      [...tended.keys()].filter((other) => other !== contours.lineage).forEach(forgetLineage);
    },
    // carry every vertex along with the tray's water for dt
    advect(contours: Contours, tray: { velocity: { tex: unknown }; width: number; height: number }, dt: number) {
      tend(contours);
      if (!contours.curves.length) return;
      gl.useProgram(advectProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tray.velocity.tex);
      gl.uniform1i(advectAt.uVelocity, 0);
      gl.uniform2i(advectAt.uSize, tray.width, tray.height);
      gl.uniform1f(advectAt.uDt, dt);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
      gl.enable(gl.RASTERIZER_DISCARD);
      contours.curves.forEach((_, k) => {
        const state = stateOf(contours, k);
        gl.bindVertexArray(state.sides[0].vao);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, state.sides[1].buffer);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, state.n + 1);
        gl.endTransformFeedback();
        state.sides.reverse();
        state.since++;
        state.ahead = true;
      });
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
    },
    // Only the CPU can insert a vertex. Each call brings back about `share` of
    // all the vertices and re-spaces them: the curves that have waited longest,
    // and the two youngest drops ahead of their turn, because a drop that is
    // still opening stretches fastest. Returns the re-spaced contours.
    respace(contours: Contours, share = 0.12): Contours {
      tend(contours);
      let budget = share * contours.count();
      const last = contours.curves.length - 1;
      const start = contours;
      const due = (k: number) => stateOf(start, k).since * (k >= last - 1 ? 8 : 1);
      const order = contours.curves.map((_, k) => k).sort((p, q) => due(q) - due(p));
      for (const k of order) {
        const state = stateOf(contours, k);
        if (!state.ahead || budget <= 0) break;
        budget -= state.n;
        const packed = new Float32Array(2 * state.n + 2);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.sides[0].buffer);
        gl.getBufferSubData(gl.ARRAY_BUFFER, 0, packed);
        contours = contours.unpack(k, packed).resample(k);
        upload(contours, k, state);
      }
      return contours;
    },
    // paper, then every drop in the order it was born
    paint(contours: Contours, paper: number[]) {
      tend(contours);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(paper[0], paper[1], paper[2], 1);
      gl.clearStencil(0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.useProgram(paintProgram);
      gl.uniform2f(paintAt.uSize, contours.width, contours.height);
      gl.enable(gl.STENCIL_TEST);
      contours.curves.forEach((curve, k) => {
        const state = stateOf(contours, k);
        const { n, box, firsts, counts } = state;
        gl.bindVertexArray(state.sides[0].vao);
        // count how many times the curve winds round each pixel
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.ALWAYS, 0, 0xff);
        gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
        gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
        gl.uniform1i(paintAt.uCover, 0);
        if (multi) multi.multiDrawArraysWEBGL(gl.TRIANGLE_FAN, firsts, 0, counts, 0, firsts.length);
        else firsts.forEach((first, c) => gl.drawArrays(gl.TRIANGLE_FAN, first, counts[c]));
        if (firsts.length > 2) {
          gl.bindVertexArray(state.sides[0].coarse);
          gl.drawArrays(gl.TRIANGLE_FAN, 0, firsts.length);
          gl.bindVertexArray(state.sides[0].vao);
        }
        // colour the pixels it winds round, and wipe the count.
        // The box dates from the last re-spacing; the water moves at most 7 cells a solve
        const slack = 2 + 7 * state.since;
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
        gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
        gl.uniform3fv(paintAt.uColor, curve.color);
        gl.uniform4f(paintAt.uBox, box[0] - slack, box[1] - slack, box[2] + slack, box[3] + slack);
        gl.uniform1i(paintAt.uCover, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // a band thinner than a pixel has no pixels to fill: keep its edge
        if (curve.outline) {
          gl.disable(gl.STENCIL_TEST);
          gl.uniform1i(paintAt.uCover, 0);
          gl.drawArrays(gl.LINE_LOOP, 0, n);
          gl.enable(gl.STENCIL_TEST);
        }
      });
      gl.disable(gl.STENCIL_TEST);
      gl.bindVertexArray(null);
    },
  };
};

export let tray = (createTray, createContours, width, height, cellSize, fluids, backgroundFilm, reset, resetPicture, invalidation) => {
  const tray = createTray(Math.max(8, Math.floor(width / cellSize)), Math.max(8, Math.floor(height / cellSize)));
  // the water is never clean: a faint film of surfactant is already there
  tray.fill(
    fluids.findIndex((fluid) => !fluid.color),
    backgroundFilm,
  );
  void reset; // pressing the button rebuilds the tray
  tray.demo = { drops: 0, wait: 0.5 };
  tray.contours = createContours(tray.width, tray.height);
  // an empty tray is a new picture, and starts from the first ink. The original writes both
  // mutables here; an action may not run during a cell evaluation, so it runs right after.
  queueMicrotask(() => resetPicture());
  invalidation.then(() => tray.dispose());
  return tray;
};

export let mainLoop = function* (
  tray, live, finishPicture, fluids, sequence, absorbance, contourPainter, cellSize, height, params, view,
) {
  const emitters = new Map<unknown, any>();
  let lastTouch = live.pointer && live.pointer.touch;
  let stroked: { touch: number; at: number[] } | undefined; // where the last stroke ended, in cells
  let busy = 0; // seconds of extra flux steps still owed after a touch
  let i = 0;
  let last = performance.now();
  let owed = 0; // solves not yet taken
  const toCell = (p: { x: number; y: number }) => [p.x / cellSize, (height - p.y) / cellSize];
  const paper = [0.965, 0.945, 0.9];
  const flat = (fluid: number) => {
    const hex = (fluids[fluid].color || "#ffffff").replace("#", "");
    return paper.map((p, k) => (p * parseInt(hex.slice(2 * k, 2 * k + 2), 16)) / 255);
  };
  // The original mutates tray.contours in place. Contours values are immutable here: the loop holds
  // the current one and writes it back, so a restarted loop (view or params changed) resumes it.
  let contours: Contours = tray.contours!;
  contourPainter.retain(contours);
  let painted: number | undefined; // the contours version on the canvas
  const show = () => {
    if (view === "lines") {
      contourPainter.paint(contours, paper);
      painted = contours.version;
    } else tray.render({ absorb: absorbance, strength: params.inkStrength, paper, view: view === "print" ? 0 : 1 });
  };
  tray.repaint = show; // the download button draws before it reads
  // finishPicture is queued and commits after this step; until then the loop keeps its own copy, so
  // the frame that finishes the picture sees it finished, as in the original
  let finishing: ValueOf<"finished"> = false;
  let lag = 0; // smoothed milliseconds of work in a frame that solved
  while (true) {
    const now = performance.now();
    const elapsed = Math.min((now - last) / 1000, 0.05);
    // Stirring folds the lines without limit and nothing here thins them out.
    // Once they cost more than a frame the picture is finished: the water
    // stops, and the next touch empties the tray.
    const vertices = contours.count();
    if (!(live.finished || finishing) && view === "lines" && ((vertices > 200000 && lag > params.finishAtMs) || vertices > 3000000)) {
      const done = { at: now, why: `${(vertices / 1e6).toFixed(1)} million vertices, ${lag.toFixed(0)} ms of work a frame` };
      finishing = done;
      queueMicrotask(() => finishPicture(done.at, done.why));
      contours = contourPainter.respace(contours, 1);
      painted = undefined;
    }
    if (live.finished || finishing) {
      last = now;
      if (view !== "lines" || painted !== contours.version) show();
      tray.contours = contours;
      yield ++i;
      continue;
    }
    last = now;
    const pointer = live.pointer;
    if (pointer && pointer.down && pointer.tool === "brush") {
      if (pointer.touch !== lastTouch) emitters.set(pointer.touch, { fluid: pointer.fluid, seconds: 0 });
      const emitter = emitters.get(pointer.touch);
      if (emitter) Object.assign(emitter, { at: toCell(pointer), down: true });
    } else if (pointer) {
      const emitter = emitters.get(pointer.touch);
      if (emitter) emitter.down = false;
    }
    if (pointer && pointer.down) lastTouch = pointer.touch;

    // until somebody touches the tray, drop the fluids in turn
    const demo = tray.demo!;
    if (params.autoDrops && !pointer && demo.drops < Math.min(6, sequence.length)) {
      demo.wait -= elapsed;
      if (demo.wait <= 0) {
        const k = demo.drops++;
        demo.wait = 1.2;
        emitters.set(`demo${k}`, {
          fluid: sequence[k % sequence.length],
          seconds: 0.4,
          at: [tray.width / 2 + 1.5 * Math.cos(2.4 * k), tray.height / 2 + 1.5 * Math.sin(2.4 * k)],
        });
      }
    }

    const stroking = pointer && pointer.down && pointer.tool !== "brush";
    if (emitters.size || stroking) busy = 0.3;
    else busy -= elapsed;

    // A machine that cannot solve inside a frame gets one solve a frame and
    // the water runs slow, rather than three solves and a frozen picture: a
    // phone's Mali-G77 took 47 ms a solve and drew 7 frames a second this way.
    owed = Math.min(owed + elapsed * params.solvesPerSecond, lag > 20 ? 1 : 3);
    const solves = Math.floor(owed);
    // the pointer's travel since the last solve, shared between this frame's solves
    const target = stroking && toCell(pointer);
    const from = stroking && stroked && stroked.touch === pointer.touch ? stroked.at : target;
    for (let n = 1; n <= solves; n++, owed--) {
      for (const emitter of emitters.values()) {
        emitter.fed = true;
        // the drop's outline starts as a circle round the brush. A brush
        // dragged out of its own circle starts another in the same colour.
        const tip = (1.3 * params.brushRadius) / cellSize;
        if (!emitter.stamp || Math.hypot(emitter.at[0] - emitter.stamp[0], emitter.at[1] - emitter.stamp[1]) > 0.5 * tip) {
          emitter.stamp = emitter.at;
          contours = contours.birth({
            x: emitter.at[0],
            y: emitter.at[1],
            radius: tip,
            color: flat(emitter.fluid),
            outline: !!fluids[emitter.fluid].color,
          });
        }
        tray.brush({
          x: emitter.at[0],
          y: emitter.at[1],
          fluid: emitter.fluid,
          pressure: params.brushLoad * fluids[emitter.fluid].pressure,
          radius: params.brushRadius / cellSize,
          rate: params.brushFeed,
        });
      }
      let stroke;
      if (stroking && from && target) {
        const a = from.map((v, k) => v + ((target[k] - v) * (n - 1)) / solves);
        const b = from.map((v, k) => v + ((target[k] - v) * n) / solves);
        const velocity = [(b[0] - a[0]) / params.dt, (b[1] - a[1]) / params.dt];
        if (Math.hypot(...velocity) > 1e-3)
          stroke = {
            from: a,
            to: b,
            velocity,
            radius: (pointer.tool === "stylus" ? 5 : params.strokeRadius) / cellSize,
            strength: pointer.tool === "stylus" ? 1 : 0.6,
          };
      }
      // A GPU that cannot solve inside a frame gets fewer flux steps. On a
      // Mali-G77 phone a solve was 47 ms, 5.4 of them each transport step and
      // 13 each V-cycle; touching, 110 ms. The V-cycles stay: with one, a
      // 208x380 tray's water swung between 0.5 and the speed clamp for good.
      // Past the finish rule's floor the lines are the cost, not the solve.
      const economy = lag > 24 && vertices <= 200000;
      const steps = busy > 0 ? params.touchTransportSteps : params.transportSteps;
      tray.step({
        ...params,
        transportSteps: economy ? Math.min(steps, busy > 0 ? 4 : 2) : steps,
        stroke,
      });
      contourPainter.advect(contours, tray, params.dt);
      contours = contourPainter.respace(contours);
    }
    if (solves && stroking && target) stroked = { touch: pointer.touch, at: target };
    if (!stroking) stroked = undefined;
    for (const [key, emitter] of emitters) if (!emitter.down && (emitter.seconds -= elapsed) <= 0 && emitter.fed) emitters.delete(key);

    // lines: nothing moved, nothing to repaint, the canvas keeps its last frame
    if (view !== "lines" || solves || painted !== contours.version) show();
    // Work, not the time between frames: a tab held to 30 frames a second is
    // not a costly picture. Re-spacing reads the vertices back, which waits for
    // everything the GPU still owed, the last paint included.
    if (solves) lag = 0.9 * lag + 0.1 * Math.min(performance.now() - now, 50);
    tray.contours = contours;
    yield ++i;
  }
};

// ---- GPU experiments and tests (bodies unchanged except the contours calls) ----

export let ringExperiment = (createTray) =>
  function ringExperiment({ compress = true, size = 128, steps = 300 } = {}) {
    // ink, then surfactant on the same spot, on a small private tray.
    // The two are in different film textures, so both are exercised.
    const INK = 4;
    const CLEAR = 3;
    const tray = createTray(size, size);
    const params = { compress };
    const at = { x: size / 2, y: size / 2, radius: 4 };
    tray.fill(CLEAR, 0.1);
    for (let i = 0; i < 25; i++) {
      tray.brush({ ...at, fluid: INK, pressure: 5, rate: 0.8 });
      tray.step(params);
    }
    for (let n = 0; n < steps / 3; n++) tray.step(params);
    for (let i = 0; i < 25; i++) {
      tray.brush({ ...at, fluid: CLEAR, pressure: 8, rate: 0.8 });
      tray.step(params);
    }
    const before = tray.read();
    for (let n = 0; n < steps; n++) tray.step(params);
    const after = tray.read();
    const pressure = tray.read("pressure");
    tray.dispose();

    const sum = (data: Float32Array) => data.reduce((a, b) => a + b, 0);
    let ink = 0;
    let mixedInk = 0;
    let least = Infinity;
    let most = 0;
    for (let i = 0; i < after.length; i += 8) {
      const total = after[i + INK] + after[i + CLEAR];
      const share = total > 0 ? after[i + INK] / total : 0;
      ink += after[i + INK];
      if (share > 0.1 && share < 0.9) mixedInk += after[i + INK];
      least = Math.min(least, total);
      most = Math.max(most, total);
    }
    const share = (x: number, y: number) => {
      const i = 8 * (y * size + x);
      return after[i + INK] / (after[i + INK] + after[i + CLEAR]);
    };
    const row = Array.from({ length: size / 2 }, (_, x) => share(size / 2 + x, size / 2));
    return {
      drift: Math.abs(sum(after) - sum(before)) / sum(before),
      mixedInk: mixedInk / ink,
      centre: row[0],
      ring: Math.max(...row),
      unevenness: most / least,
      // pressure is in the first channel
      pressureMean: sum(pressure.filter((_, i) => i % 4 === 0)) / (size * size),
    };
  };

export let test_film_is_conserved = (runTests, ctx, ringExperiment) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  if (ctx.format.bits < 32) return "skipped: 16 bit film drifts";
  const { drift } = ringExperiment();
  if (!(drift < 1e-4)) throw new Error(`film changed by ${drift}`);
  return `film changed by ${drift.toExponential(1)} over 300 solves`;
};

export let test_ink_becomes_a_ring = (runTests, ringExperiment) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  const { centre, ring } = ringExperiment();
  if (!(centre < 0.05)) throw new Error(`ink share at the centre ${centre}`);
  if (!(ring > 0.95)) throw new Error(`ink share in the ring only ${ring}`);
  return `ink share: centre ${centre.toFixed(3)}, ring ${ring.toFixed(3)}`;
};

export let test_fluids_stay_apart = (runTests, ringExperiment) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  const sharp = ringExperiment().mixedInk;
  const upwind = ringExperiment({ compress: false }).mixedInk;
  if (!(sharp < 0.6 * upwind)) throw new Error(`mixed ink ${sharp} against ${upwind} uncompressed`);
  return `ink in mixed cells: ${sharp.toFixed(3)}, against ${upwind.toFixed(3)} with first order upwind`;
};

export let test_pressure_stays_centred = (runTests, ringExperiment) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  // a mean that drifts eats float32 precision until the water vibrates
  const { pressureMean } = ringExperiment();
  if (!(Math.abs(pressureMean) < 1e-3)) throw new Error(`mean pressure ${pressureMean}`);
  return `mean pressure ${pressureMean.toExponential(1)}`;
};

export let test_film_settles_flat = (runTests, ringExperiment) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  const { unevenness } = ringExperiment();
  if (!(unevenness < 1.01)) throw new Error(`most film / least film = ${unevenness}`);
  return `most film / least film = ${unevenness.toFixed(3)} after 300 solves`;
};

export let test_water_settles_on_an_odd_tray = (runTests, createTray, defaults) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  // 450 wide halves to 225, 113, 57, 29, 15: five levels whose last column is
  // a partial cell. With those treated as full cells the pressure grew 3.16x
  // a V-cycle and the water sat at the speed clamp.
  const tray = createTray(450, 380);
  tray.fill(3, 0.1);
  for (let n = 0; n < 60; n++) {
    if (n < 4) tray.brush({ x: 225, y: 190, fluid: 0, pressure: 5, radius: 6, rate: 0.8 });
    tray.step(defaults);
  }
  const v = tray.read("velocity");
  let fastest = 0;
  for (let i = 0; i < v.length; i += 4) fastest = Math.max(fastest, Math.hypot(v[i], v[i + 1]));
  tray.dispose();
  if (!(fastest < 0.5)) throw new Error(`fastest water ${fastest} cells a solve, 56 solves after the brush left`);
  return `fastest water ${fastest.toFixed(3)} cells a solve, 56 solves after the brush left`;
};

export let test_gpu_and_cpu_carry_lines_alike = (runTests, createTray, createContours, contourPainter) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  // one drop opening on a private tray, its outline carried both ways
  const size = 128;
  const tray = createTray(size, size);
  tray.fill(3, 0.1);
  let onGpu = createContours(size, size);
  let onCpu = createContours(size, size);
  const drop = { x: 64, y: 64, radius: 5.2, color: [0, 0, 0] };
  onGpu = onGpu.birth(drop);
  onCpu = onCpu.birth(drop);
  for (let n = 0; n < 60; n++) {
    if (n < 25) tray.brush({ x: 64, y: 64, fluid: 0, pressure: 5, radius: 4, rate: 0.8 });
    tray.step();
    contourPainter.advect(onGpu, tray, 1);
    onGpu = contourPainter.respace(onGpu, 1);
    onCpu = onCpu.advect(tray.read("velocity"), 1);
  }
  contourPainter.forget(onGpu);
  tray.dispose();
  const gpu = onGpu.area(0);
  const cpu = onCpu.area(0);
  const grew = cpu / (Math.PI * 5.2 * 5.2);
  if (!(grew > 5)) throw new Error(`the drop only grew ${grew} times`);
  if (!(Math.abs(gpu / cpu - 1) < 0.005)) throw new Error(`GPU area ${gpu}, CPU area ${cpu}`);
  return `the drop grew ${grew.toFixed(1)} times; GPU and CPU areas differ by ${(gpu / cpu - 1).toExponential(1)}`;
};

// the page footer, an import from @tomlarkworthy/footer
export let _43 = (footer) => footer;

// ---- prose (extracted verbatim) ----

export let _1 = (md) =>
  md`# Suminagashi`;

export let _m_intro = (md) =>
  md`Touch the water. Each touch leaves the next fluid in turn: an ink, then surfactant, then the next ink. The inks are sumi, indigo, vermilion, viridian and ochre. Film flows from the brush for exactly as long as it is held down. A touch pushes the films already on the water outward, so touching one spot repeatedly builds rings.

The *lines* view draws every drop's outline as a curve carried by the water, so a band keeps its edge however thin it is pulled. *print* draws the same tray from the grid. Stirring folds the lines without limit. Once they cost more than *finish at* milliseconds of work a frame the picture is finished: the water stops, and the next touch empties the tray. *download png* saves whichever view is showing, at the canvas's device pixels.

*blow* and *stylus* make the water near the pointer move with the pointer; blow is wide and loose, the stylus narrow and firm.

This is how [suminagashi](https://en.wikipedia.org/wiki/Paper_marbling#Suminagashi) is made: ink and a surfactant are floated in turn on still water and the pattern is lifted off with paper.`;

export let _m_position = (md) =>
  md`## What is different here

This notebook started as a copy of [Ink in water](https://observablehq.com/@tomlarkworthy/ink). That solver carries colour through an incompressible flow. Its colours blur into each other, and a drop spreads only because pressure is painted in by hand.

[Mathematical Marbling](https://people.csail.mit.edu/jaffer/Marbling/) (Lu, Jaffer et al.) gets sharp rings from a closed form: a drop displaces every point radially so that area is kept. It has no dynamics. [Amanda Ghassaei](https://blog.amandaghassaei.com/2022/10/25/digital-marbling/) keeps a fluid solver and swaps the advection scheme for BiMocq2 to cut the blur.

Here the film on the surface is tracked as a conserved amount per fluid. The same pressure solve that keeps the old solver incompressible is asked for something else: expand wherever there is more film than average. Rings, spreading and stopping follow from that, and the swirling water of the old solver is kept.`;

export let _m_marangoni = (md) =>
  md`## Films push outward

A film lowers the surface tension of the water under it, by an amount called its surface pressure. Where that is uneven the surface is pulled toward the cleaner side ([Marangoni effect](https://en.wikipedia.org/wiki/Marangoni_effect)). Surface pressure is taken here to be the amount of film per area, the same for every fluid.

The film is treated as stiff: surface pressure evens out at once across the tray. Each solve, a cell holding more film than the tray average is told to expand, and one holding less to contract, by *film stiffness* times its relative excess. At 1 a cell is asked to shed all of its excess in one solve. The tray average comes from \`reduceShader\`, which sums 8×8 blocks repeatedly down to one texel.`;

export let _m_transport = (md) =>
  md`## Films do not mix

Every film rides on the same surface velocity, so in the equations they never interpenetrate. On a grid they do: every advection step averages neighbouring cells. The transport step therefore does three things per cell face. How much film crosses is a van Leer limited upwind flux. Which fluid that film is made of comes from ULTIMATE-QUICKEST (Leonard 1991), which is third order, bounded, and does not sharpen. Then each fluid is pushed up its own gradient along the boundary normal, against a little diffusion ([Olsson & Kreiss 2005](https://doi.org/10.1016/j.jcp.2005.04.007)). The push and the diffusion balance at a boundary about two and a half cells wide, whichever way the boundary faces. The rate follows the local water speed times *boundary sharpness*, so a pattern at rest is left alone.

Everything is written as fluxes through faces, so what leaves one cell arrives in its neighbour and film is conserved to rounding.`;

export let _m_transport_evidence = (md) =>
  md`Measured 2026-09-17 with \`ringExperiment\` below (an ink then surfactant on one spot of a 128×128 tray, 300 further solves; Chrome on an Apple M5 Max, 32 bit film, boundary sharpness 0.4):

\`\`\`
                      ink sitting in mixed cells   peak ink share in the ring
sharpened             0.208                         1.00
first order upwind    0.462                         0.97
total film drift      7.3e-9
\`\`\`

A mixed cell is one where ink is between 10% and 90% of the film. Untick *keep fluids apart* to watch the upwind arm on the tray.

The first scheme here was [CICSAM](https://doi.org/10.1006/jcph.1999.6276) (Ubbink & Issa 1999), which chooses what crosses each face from the cells either side of it. It held a boundary in one to two cells (0.151 on the measure above), but it works face by face, and after stirring the pattern showed it: boundaries stepped along the grid and thin bands broke into beads lined up in rows. Tom's report: "I see artifacts of gridding after mixing things a little." The normal based sharpening costs a wider boundary and has no favourite direction.

Bands stretched thinner than the boundary width still cannot be held. Sharpening squeezes them into round droplets, in strings. It is switched off where a wider difference says the two sides of a band cancel, which leaves more of them as pale lines. At sharpness 1 the droplets dominate a stirred pattern, at 0.4 they are occasional; both were judged by eye on one scripted stir. A finer grid moves the problem, it does not remove it.

Tom's next report was of those droplets: "I still see rectangual pixel drops though?" Three things were tried on 2026-09-17, each judged by eye on one scripted stir (12 rings on one spot, then 4 hard strokes with blow).

- Sharpening only where nearly pure fluid sits close by on one side and nearly none of it on the other. No droplets form, and stirred ink is left as a pale wash. Tom: "I prefered the way it was before we got rid of the bead lattice, now it makes muddy mixes whcih is aethetically worse." It is kept as the *beads or wash* slider, at 0.
- Mixing a Sobel difference across the face into the difference that gives the boundary normal its direction. The droplets got smaller and more numerous.
- Leaving the simulation alone and drawing it differently, after "The beads would be ok if they were round". This is the one in use, see Printing.

The speed limit in \`projectShader\` exists for this step. With 4 flux steps per solve it capped the opening of a drop: radius 17 cells after 0.1 s against 38 with 16 steps, 27 against 61 after 0.2 s. During a touch, and for 0.3 s after, the loop takes *flux steps, touching*; 32 steps gave the same radii as 16, so at 16 the cap no longer binds.`;

export let _m_brush = (md) =>
  md`## The brush holds a pressure

A touch does not add a fixed amount. The brush tip holds a surface pressure, and film leaves it only while the surface around it is lower. *brush load* scales that pressure for every fluid. The surfactant is given the higher pressure.

A drop opens fast and slows, as the same flow spreads over a longer edge. Radius of a sumi drop held for 0.4 s on a 256×256 tray with 0.1 film on the water (measured 2026-09-17, defaults):

\`\`\`
seconds          0.05   0.1    0.2    0.4    1.0
radius, cells    20     38     61     83     87
\`\`\`

A crowded tray takes less ink. Same touch, 192×192 tray, film already on the water varied:

\`\`\`
film on the water    0.1    0.5    1      2
ink delivered        3700   3450   3187   2584
drop radius, cells   77     43     31     20
\`\`\`

Rings also darken as the tray fills, because every film on it is compressed together. When the whole tray reaches the brush pressure no more film will go in. *empty the tray* starts again.`;

export let _m_display = (md) =>
  md`## Printing

The fluid shares are read through a cubic B-spline over the 4×4 cells around each pixel, and a fluid is drawn where its share passes one half, over a ramp from 0.3 to 0.7. The first version interpolated bilinearly between cells and ramped from 0 to 1. A droplet two cells across is a 2×2 block of cells, and bilinear interpolation draws the half level of one as a square with softened corners; in a stirred pattern they read as "rectangual pixel drops" (Tom, 2026-09-17). Through the B-spline the same cells draw as round and oval drops. Compared at 3× zoom on the scripted stir described under *Films do not mix*, by eye.

Ink darkness saturates. A film of amount g shows 1 − exp(−*ink darkness* · g) of the fluid's absorbance, so a thick film is the fluid's named colour and never darker. The first version let the density grow with g without limit, and on a heavily inked tray "the blue is *very dark* and looks black" (Tom, 2026-09-17).`;

export let _m_lines = (md) =>
  md`## Lines

Tom, on the beads: "I do wish ring bands would just stay as really thin lines instead of becoming beads." On a grid a band thinner than two cells is a blur or a bead, and the sections above only choose between them. The lines view keeps no bands on the grid.

It can, because which fluid is where never feeds back into the motion. The pressure solve reads the total film in a cell, the brush feeds against the total, and the sharpening moves fluids past each other without moving any total. So a drop is a closed curve carried by the same water, and the print is those curves filled in the order the drops were made. A later drop pushes the earlier ones aside and never overlaps them, which is why painting in birth order is enough.

A drop's curve starts as a circle of 1.3 brush radii round the tip. The brush feeds film as exp(−d²), so exp(−1.69) = 18% of it lands outside that circle and is credited to whatever the drop was made in; a smaller circle credits more. A brush dragged more than 0.65 radii from its last circle starts another in the same colour.

Curves never merge or break. A band has no width to lose, and there are no droplets, including where real ink would make them.`;

export let _m_lines_gpu = (md) =>
  md`The vertices are carried on the GPU by transform feedback: midpoint steps of at most half a cell through the staggered velocity, in \`contourAdvectShader\`. \`createContours.advect\` is the same arithmetic in JavaScript, and \`test_gpu_and_cpu_carry_lines_alike\` holds the two together.

Only the CPU can insert a vertex. Each solve it reads back about an eighth of the vertices, the curves that have waited longest first and the two youngest drops ahead of their turn, and re-spaces them: a segment is split where a Catmull-Rom curve through its neighbours leaves the chord by more than 0.08 cells or when it is longer than 3 cells, and a vertex is dropped when the curve is as straight without it.

A polygon this folded is filled through the stencil buffer: triangle fans count how many times the curve winds round each sample, then the curve's box is coloured wherever the count is not zero. A band thinner than a pixel covers no sample, so each ink's outline is also drawn as a line one pixel wide.`;

export let _m_lines_evidence = (md) =>
  md`Measured 2026-09-17 in headless Chromium on an Apple M5 Max, 866×380 cells, canvas 2600×1140 with 4× multisampling.

The first version kept vertices at most a cell apart and carried them in JavaScript, from a velocity read back every solve. Six drops and two strokes of blow:

\`\`\`
                                   vertices   a solve                      frames a second
a cell apart, carried by the CPU   378,230    22.7 ms carry, 5.2 ms read   8
spaced by bend, carried by GPU     119,940    0.7 ms                       120
\`\`\`

The two runs are not like for like. At 8 frames a second the first took a fraction of the solves the second did, so its water had turned less.

Twelve drops and four hard strokes make 1.3 million vertices, and then the fill is the cost, not the carrying. With the solver switched off, frames a second against how the fans are cut:

\`\`\`
one fan per curve, about one pivot     25
fans of 256 vertices                   38
fans of 32                             73
fans of 8                              28
\`\`\`

Every triangle of a fan reaches from its pivot to a segment, so one pivot per curve redraws the whole tray for every few thousand vertices. Short fans about their own first vertex stay local; too short, and the fan over the fans' first vertices becomes the long one.

The fans are 31 vertices now, not 32. The fan over the fans' first vertices was drawn from an index buffer, and on an Android phone (OPPO CPH2399, Mali-G77, Chrome 153, 2026-09-18) that fan drew from stale indices: every disc came out as crescents between its curve and the polygon of its chunk starts, though \`getBufferSubData\` returned the right indices and writing them again just before the draw fixed the picture. The fan now reads the chunk starts straight from the vertex buffer through a second vertex array whose stride is one chunk, and WebGL caps a stride at 255 bytes. Same fill to the pixel on the phone (513,266 against 513,266 with the indices rewritten).

The same phone also showed two more things a Mac hides. \`int\` in a fragment shader is \`mediump\` unless declared, which on Mali is 16 bits, so \`uSize.x * uSize.y\` wrapped at 32,768 cells: the mean film came out wrong at 200×200, the pressure grew to 2×10⁹ in one V-cycle, and at 256×256 the product wrapped to zero and everything was NaN. Every shader now declares \`precision highp int\`. And a solve there took 47 ms (13 per V-cycle, 5.4 per transport step, on a 208×380 tray) against about 4 on the Mac, so a frame that ran long now takes one solve rather than three, and while it runs long the solve is cheaper too, one V-cycle and 2 transport steps (4 touching). The phone went from 11 frames a second idle and 4 touching to 19 to 21 idle and 13.5 to 14 touching, with the water slower and the rings a little less crisp; not compared side by side.

Nothing thins the lines out, and a spiral that winds for five seconds is that long. The first answer was a vertex budget that widened the spacing when it was hit. At 400,000 it widened the spacing to 8.9 cells, still held 361,397 vertices because a curved line needs vertices as the square root of the tolerance, and drew every curve in facets and zigzags. Tom: "the pictures are beautiful, it ok if it only survives a single stir, maybe we jsut pause the simulation when it get laggy, thats the end of the picture, next click empties it". That is what it does: past 200,000 vertices, once the smoothed work in a frame takes longer than *finish at* (28 ms), the water stops. A touch in the first two seconds after that does nothing. A scripted stir finished mid stroke, and the stroke that followed emptied the tray before the picture had been seen.

The rule first timed the gap between frames. Tom, 2026-09-17, on a laptop running from its battery: "it was doing 3M vertices but now much less". His note read *0.2 million vertices, 33 ms a frame*. 33 ms is a page held to 30 frames a second, which is over *finish at* before a line is drawn, so the picture finished at the 200,000 floor. Holding \`requestAnimationFrame\` to one frame every 33 ms in the probe gave the same note on the same scripted stir:

\`\`\`
                      page at 120 Hz              page held to 30 Hz
time between frames   0.8 million, 28 ms          0.2 million, 33 ms
work in the frame     1.0 million, 28 ms          not finished at 0.93 million
\`\`\`

It now times the work: from the top of a frame that solved to the end of its paint. Re-spacing reads the vertices back, and that read waits for everything the GPU still owed, so the figure includes the GPU. What held Tom's page to 30 Hz was not established; Chrome's energy saver on battery is the guess.

Tom also reported "subsequent drawing get slower, like resources are not released between pictures", and then "maybe not, its not doing it now, maybe an earlier version". Four pictures of about 350,000 vertices in a row, each emptied and started again, held 120 frames a second through every stroke with the JavaScript heap flat at 72 MB. Not reproduced; which build showed it is not known.

Lines show what the grid print blurred away. Two things in the water were found this way and are recorded where they were fixed: the sawtooth that *curl* put on every band (The water keeps moving), and steps in the pressure from the multigrid (Finding the flow that does it).`;

export let _m_limits = (md) =>
  md`## Not modelled, not tried

- The depth of the water. The flow is two dimensional and the only trace of the water below is a drag term.
- Different surface activity per fluid. Every fluid contributes equally to surface pressure; unequal values were not tried.
- Thinning the lines out. Nothing removes a fold once it is thinner than a pixel; contour surgery (Dritschel 1988, for vortex patches) is the known way and was not tried. A hard stir reaches a million vertices in seconds and the picture finishes there.
- In the lines view the grid still carries eight fluids that nothing reads. Carrying the total alone would be cheaper; both are kept so the two prints can be compared on one tray.
- More than eight fluids. The film is two RGBA textures written together; until 2026-09-17 it was one, which left room for three inks and no green.
- Truly clean water. The expansion rule divides by the amount of film, so the tray starts with at least 0.02 of surfactant on it.
- The 16 bit fallback was not exercised. The film test skips itself there.
- Timing was measured on one machine, on an empty tray: 3.6 to 4.3 ms per solve over three runs on a 640×380 grid (Apple M5 Max, 2026-09-17), which at 60 solves per second is about a quarter of the time available. With 16 flux steps it was 5.4 to 6.4 ms. Earlier the same day single runs gave 3.4 and 4.9 ms, and 2.7 and 3.4 ms with one film texture; the spread between runs was not known then, so those differences are not all the second texture's. A solve issues about 130 draw calls, most of them on small multigrid and summing levels. Sharpening is skipped on faces that lie inside one fluid, so a busy tray costs more than an empty one; by how much was not measured. When a machine cannot keep up the simulation slows down rather than dropping solves.`;

export let _m_settings = (md) =>
  md`## Settings

The sliders under the tray start from these values. \`createTray\` falls back to them too, which is what the tests run with.`;

export let _m_plumbing = (md) =>
  md`## WebGL plumbing`;

export let _m_tests = (md) =>
  md`## Tests

Each test is a physics run of hundreds of solves. They took 64 of the 78 seconds a phone (Mali-G77) spent booting this page, 2026-09-18, so they run only when switched on.`;

export let _m_solve = (md) =>
  md`## Finding the flow that does it

The wanted expansion goes on the right hand side of the pressure equation that an incompressible solver already has. A drop therefore pushes the whole tray in the same solve it is fed in, and the push is recomputed from the film every solve, so it has no momentum of its own to coast or spring back with.

The equation is solved by multigrid V-cycles, warm started from the previous solve: smooth with damped Jacobi, hand what is still wrong to a grid of half the resolution, add its answer back.

The coarse grid's answer is added back by bilinear interpolation between coarse cell centres. It used to be copied into the four cells above each coarse cell. In the lines view a fast stroke then left a patch of checks about four cells across in the bands it crossed, the size of a coarse cell two levels down. 6 V-cycles in place of 2 removed the patch, and so did bilinear interpolation at 2 cycles, which costs four fetches in place of one (2026-09-17, one scripted stir each, by eye).

Each level is half the size of the one before, rounded up, so halving an odd size leaves a last column (or row) whose coarse cell covers one finer cell, not two. Those cells were given a full cell's equation. Tom, 2026-09-18: "the latest version has vibrating fluid". On a private tray, one drop then 400 solves, the fastest water by width at 380 tall:

\`\`\`
width   odd levels   after 400 solves
350     2            decays to 0.04
400     2            swings between 0.4 and the 1.6 speed clamp
450     5            NaN inside 33 solves; the pressure grew 3.16x every V-cycle, 10x a solve
500     2            decays
568     3            decays (the Mac's usual tray)
650     5            NaN
866     4            NaN
\`\`\`

With two V-cycles off the multigrid it did not grow; with the depth limited to five levels it grew to 160, with six to 6×10²⁰. Rounding down instead (no partial cells, one finer column uncovered) was worse at every width, and so was giving the coarsest level 64 sweeps instead of 8: a smoother that diverges when run longer is an inconsistent operator, not an unconverged one. Each level now carries the width of its last column and row, and \`pressureShader\` and \`restrictShader\` are finite volume: flow across a face over the distance between centres, divided by the cell's own area. Every width above decays to 0.05 or under; \`test_water_settles_on_an_odd_tray\` holds 450×380 to that and returns NaN on the build before. The solve is 2.4 ms on the Mac's tray (was 3.6 to 4.3 on 2026-09-17, a different day and a wider tray, not the same measurement).

One V-cycle is still not enough on a narrow tray: at 192 to 240 wide (380 tall) the water swings between 0.4 and the clamp; at 200×200, 300×300 and 400×300 it settles. The economy solve keeps both cycles for that reason.

Two earlier versions are recorded because both failed in ways that looked like physics (2026-09-17):

- **Explicit elastic film.** Surface pressure acted as a force on the velocity and the film was compressible. A push travelled through the film as a wave, at a finite speed. Tom's report: "the circles rebound a little after releasing ink. It feels sluggish even after reducing viscosity and drag."
- **The solve above with 40 Jacobi iterations in place of multigrid.** The long wavelengths never converged, the stale part of the pressure behaved like inertia, and the ink sloshed. Ink covered cells on a 128×128 tray, sampled every 50 solves after one touch:

\`\`\`
40 Jacobi iterations    4324   1448   6260   6824   5102
2 V-cycles              3900   4444   4436   4444   4446
\`\`\`

A third failure took longer to show. Tom's report: "the simulation seems to start to degrade into vibrating over time." With walls all round, pressure is only defined up to a constant, and nothing was holding that constant. Six drops on a 256×160 tray, then left alone (2026-09-17):

\`\`\`
solves                  360        1000       3000       8000       20000
mean pressure, before   -57310     -57920     -59800     -64450     -97310
fastest water, before   0.126      0.0415     0.0391     0.036      0.0741
mean pressure, after    1.4e-6     1.2e-7     1.0e-7     7.8e-8     1.4e-7
fastest water, after    0.138      0.0236     6.3e-7     3.8e-7     3.8e-7
\`\`\`

The part of the pressure that moves anything spanned about 1.3. Next to a mean of 60000, float32 resolves steps of about 0.004, so the pressure gradient was rounding noise and the water never came to rest. \`shiftShader\` now takes the exact mean out of the right hand side and out of the warm start, every solve. The same fix removed a 4% cell scale unevenness in the film that had been recorded here as unexplained; most film over least film is now 1.000 after 300 solves.`;

export let _m_swirl = (md) =>
  md`## The water keeps moving

Apart from the push, the velocity is the old solver's: it carries itself along, loses a little to drag and viscosity, and *curl* ([vorticity confinement](https://en.wikipedia.org/wiki/Vorticity_confinement)) feeds the small vortices that numerical smoothing would otherwise kill.

A stroke with *blow* or *stylus* blends the velocity toward the pointer's own velocity, along the segment the pointer covered since the last solve. The first version of blow added a force scaled by the pointer's movement in the current frame. Frames in which no solve ran lost their movement, and Tom's report was that it "feels like a fixed velocity applied rather than a fluid tool fitted to my mouse movement" (2026-09-17).

Curl is fed only where it is large next to the local speed (|curl| / speed between 0.05 and 0.2 per cell). Fed everywhere, it crinkled the rings: nine rings dropped on one spot came out with wavy edges and a notch at each of the four compass points, mirrored left to right and top to bottom. A drop's flow is radial and has no eddies, but its grid noise has curl. Setting *curl* to 0 gave smooth rings; 8 V-cycles instead of 2, and boundary sharpness 0, each left the crinkles where they were (2026-09-17). With the test in place the rings are smooth and a stir still rolls up into eddies.

*curl* was 0.12 until the lines view existed. Drawn as lines, every band of a stirred tray carried a sawtooth three to four cells long. At curl 0 the same stir drew smooth bands, so the sawtooth is the small vortices this term feeds, which the grid print had blurred away. The default is now 0.05, by eye on one scripted stir (2026-09-17).

Sharp boundaries show velocity noise that a blurred dye hides. At curl 0.25 with viscosity 0.02 rings broke into cell sized curds without any stirring.`;
