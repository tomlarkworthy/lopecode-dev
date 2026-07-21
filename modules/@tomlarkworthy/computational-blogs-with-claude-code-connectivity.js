const _13r6fnd = function _anonymous(md) {return (md`# Executable Blogs with Claude Code Connectivity

Talk is cheap. ***Show me the code***'. What is a blog post anyway? I think of a blog post as a meme; a small unit of useful information you can share. But a bunch of words could be a bag of lies. How do you know the ideas presented are internally consistent?

Well to me, I get more value out of a computational model I can prod and poke.`);};
const _15ly9p0 = function _numClients(Inputs) {return (Inputs.range([
    1,
    20
], {
    label: 'number of clients',
    value: 4,
    step: 1
}));};
const _1z0y6l9 = async function* _serverSim(htl,numClients) {
    const width = 640, height = 340;
    const canvas = htl.html`<canvas width=${ width } height=${ height } style="border:1px solid #ccc; border-radius:4px; background:#1a1a2e">`;
    const ctx = canvas.getContext('2d');
    const serverX = width - 80, serverR = 30;
    const n = numClients;
    const halfH = height / 2;
    const SPREAD_FRAMES = 60;
    const BASE_SERVICE_TIME = 20;
    function createClients(yOffset) {
        return Array.from({ length: n }, (_, i) => ({
            x: 30,
            y: yOffset + 20 + i * (halfH - 40) / Math.max(n - 1, 1),
            targetX: serverX - serverR - 5,
            flying: false,
            returning: false,
            retryCount: 0,
            waitUntil: Math.floor(i * SPREAD_FRAMES / n),
            progress: 0
        }));
    }
    const sims = [
        {
            clients: createClients(0),
            label: 'Fixed backoff',
            totalSuccess: 0,
            totalReject: 0,
            history: [],
            serverCooldown: 0,
            serverLoad: 0
        },
        {
            clients: createClients(halfH),
            label: 'Exponential backoff',
            totalSuccess: 0,
            totalReject: 0,
            history: [],
            serverCooldown: 0,
            serverLoad: 0
        }
    ];
    let tick = 0;
    function step() {
        tick++;
        ctx.clearRect(0, 0, width, height);
        // Dividing line
        ctx.strokeStyle = '#444';
        ctx.setLineDash([
            4,
            4
        ]);
        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(width, halfH);
        ctx.stroke();
        ctx.setLineDash([]);
        sims.forEach((sim, si) => {
            const yOff = si * halfH;
            // Count how many requests arrive this frame
            let arrivingThisFrame = 0;
            sim.clients.forEach(c => {
                if (c.flying && c.progress + 0.05 >= 1 && c.progress < 1)
                    arrivingThisFrame++;
            });
            // Server load decays toward 0, spikes when requests arrive
            sim.serverLoad = sim.serverLoad * 0.95 + arrivingThisFrame;
            // Service time increases with concurrent load (the key mechanic!)
            const effectiveServiceTime = Math.floor(BASE_SERVICE_TIME * (1 + sim.serverLoad * 0.5));
            const busy = sim.serverCooldown > 0;
            const overloaded = sim.serverLoad > 2;
            // Draw server - size pulses with load
            const pulseR = serverR + Math.min(sim.serverLoad * 2, 15);
            ctx.beginPath();
            ctx.arc(serverX, yOff + halfH / 2, pulseR, 0, Math.PI * 2);
            ctx.fillStyle = overloaded ? '#ff2222' : busy ? '#ff8844' : '#44ff44';
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = overloaded ? '#ff2222' : busy ? '#ff8844' : '#44ff44';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#888';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Server', serverX, yOff + halfH / 2 + pulseR + 15);
            // Strategy label
            ctx.fillStyle = '#ddd';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(sim.label, 10, yOff + 15);
            // Throughput
            const recent = sim.history.filter(t => t > tick - 300).length;
            const throughput = (recent / 5).toFixed(1);
            ctx.fillStyle = '#88ff88';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${ throughput } req/s  |  OK:${ sim.totalSuccess }  Fail:${ sim.totalReject }`, width - 10, yOff + 15);
            if (sim.serverCooldown > 0)
                sim.serverCooldown--;
            sim.clients.forEach(c => {
                if (!c.flying && !c.returning && tick >= c.waitUntil) {
                    c.flying = true;
                    c.progress = 0;
                }
                if (c.flying) {
                    c.progress += 0.05;
                    if (c.progress >= 1) {
                        if (sim.serverCooldown <= 0) {
                            sim.totalSuccess++;
                            sim.history.push(tick);
                            sim.serverCooldown = effectiveServiceTime;
                            c.retryCount = 0;
                            c.flying = false;
                            c.returning = true;
                            c.progress = 1;
                            c.waitUntil = tick + 25 + Math.floor(Math.random() * 10);
                        } else {
                            sim.totalReject++;
                            c.flying = false;
                            c.returning = true;
                            c.progress = 1;
                            c.retryCount++;
                            if (si === 0) {
                                c.waitUntil = tick + 60;
                            } else {
                                const base = Math.min(Math.pow(2, c.retryCount) * 10, 300);
                                c.waitUntil = tick + Math.floor(base * (0.5 + Math.random()));
                            }
                        }
                    }
                }
                if (c.returning) {
                    c.progress -= 0.05;
                    if (c.progress <= 0) {
                        c.returning = false;
                        c.progress = 0;
                    }
                }
                const drawX = c.x + (c.targetX - c.x) * c.progress;
                ctx.beginPath();
                ctx.arc(drawX, c.y, 5, 0, Math.PI * 2);
                const justSucceeded = c.returning && c.retryCount === 0;
                ctx.fillStyle = c.returning ? justSucceeded ? '#44ff44' : '#ff8844' : c.flying ? '#44aaff' : '#666';
                ctx.fill();
            });
        });
    }
    while (true) {
        step();
        yield canvas;
        await new Promise(r => requestAnimationFrame(r));
    }
};
const _px1vgd = function _simulation(numClients) {
    const ticks = 100;
    const serverCapacity = 1;
    // 1 request per tick
    function simulate(strategy) {
        // Each client: {nextRetry, retryCount, completed}
        const clients = Array.from({ length: numClients }, () => ({
            nextRetry: 0,
            retryCount: 0,
            completed: false
        }));
        const serverLoad = [];
        // requests hitting server per tick
        const completions = [];
        // cumulative completions
        let totalCompleted = 0;
        for (let t = 0; t < ticks; t++) {
            // Count requests arriving this tick
            const arriving = clients.filter(c => !c.completed && c.nextRetry === t);
            const load = arriving.length;
            serverLoad.push(load);
            // Server processes up to capacity
            let processed = 0;
            for (const client of arriving) {
                if (processed < serverCapacity) {
                    client.completed = true;
                    totalCompleted++;
                    processed++;
                } else {
                    // Rejected — schedule retry
                    client.retryCount++;
                    if (strategy === 'fixed') {
                        client.nextRetry = t + 5;    // fixed 5-tick delay
                    } else {
                        // Exponential backoff with jitter
                        const base = Math.min(Math.pow(2, client.retryCount), 32);
                        client.nextRetry = t + Math.floor(base * (0.5 + Math.random()));
                    }
                }
            }
            completions.push(totalCompleted);
        }
        return {
            serverLoad,
            completions
        };
    }
    const fixed = simulate('fixed');
    const exponential = simulate('exponential');
    // Build flat array for Plot
    const data = [];
    for (let t = 0; t < ticks; t++) {
        data.push({
            tick: t,
            load: fixed.serverLoad[t],
            strategy: 'Fixed backoff'
        });
        data.push({
            tick: t,
            load: exponential.serverLoad[t],
            strategy: 'Exponential backoff'
        });
    }
    return {
        data,
        fixed,
        exponential
    };
};
const _1nvapr1 = function _anonymous(md) {return (md`A computational blog post gives you a vehicle for communicating data driven, or model driven insights, but they are quite difficult to write and also quite difficult to consume by your downstream systems.

So with Lopecode now you can connect Claude Code directly to the blog post via the channels API. You can download the blog post locally (export), as well as change the variables live, or move into your code base.`);};
const _1dhgp2g = function identity(x) {
  return x;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map([].map((name) => {
    const module_name = "@tomlarkworthy/computational-blogs-with-claude-code-connectivity";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_13r6fnd", "header", ["md"], _13r6fnd);  
  $def("_15ly9p0", "viewof numClients", ["Inputs"], _15ly9p0);  
  main.variable(observer("numClients")).define("numClients", ["Generators", "viewof numClients"], (G, _) => G.input(_));  
  $def("_1z0y6l9", "serverSim", ["htl","numClients"], _1z0y6l9);  
  $def("_px1vgd", "simulation", ["numClients"], _px1vgd);  
  $def("_1nvapr1", "_1nvapr1", ["md"], _1nvapr1);  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}