// Breakout in a 320×240 field. The game is one pure function, step, from a world and an event to
// the next world; everything else feeds it events or draws its result.
type Ball = { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number };
type Brick = { readonly x: number; readonly y: number };
type World = {
  readonly ball: Ball;
  readonly paddle: number;
  readonly bricks: readonly Brick[];
  readonly lives: number;
  readonly score: number;
};
type Ev = { readonly kind: "tick"; readonly dt: number } | { readonly kind: "aim"; readonly x: number } | { readonly kind: "reset" };

const start = () => (): World => ({
  ball: { x: 160, y: 180, vx: 120, vy: -160 },
  paddle: 160,
  bricks: Array.from({ length: 24 }, (_, i) => ({ x: 8 + (i % 8) * 38, y: 24 + Math.floor(i / 8) * 16 })),
  lives: 3,
  score: 0,
});

const step = (start: () => World) => (w: World, e: Ev): World => {
  if (e.kind === "reset") return start();
  if (e.kind === "aim") return { ...w, paddle: Math.max(24, Math.min(296, e.x)) };
  if (w.lives === 0 || w.bricks.length === 0) return w;
  const s = Math.min(e.dt, 50) / 1000;
  let { x, y, vx, vy } = w.ball;
  x += vx * s;
  y += vy * s;
  if (x < 4 || x > 316) { vx = -vx; x = Math.max(4, Math.min(316, x)); }
  if (y < 4) { vy = -vy; y = 4; }
  // The paddle is 48 wide at y 220; where the ball lands on it sets the bounce angle.
  if (vy > 0 && y > 216 && y < 228 && Math.abs(x - w.paddle) < 28) { vy = -vy; vx = (x - w.paddle) * 8; y = 216; }
  const hit = w.bricks.findIndex((b) => x > b.x - 4 && x < b.x + 38 && y > b.y - 4 && y < b.y + 16);
  const bricks = hit < 0 ? w.bricks : w.bricks.filter((_, i) => i !== hit);
  if (hit >= 0) vy = -vy;
  if (y > 244) return { ...w, bricks, lives: w.lives - 1, ball: { x: w.paddle, y: 200, vx: 120, vy: -160 } };
  return { ...w, bricks, score: w.score + (hit < 0 ? 0 : 10), ball: { x, y, vx, vy } };
};

const world = (start: () => World): RefCell<World> => ref<World>(start());

// The world's only writes: three actions, each one call of step.
const tick = (world: Ref<World>, step) => action((dt: number) => world.update((w) => step(w, { kind: "tick", dt })));
const aim = (world: Ref<World>, step) => action((p: PointerData) => world.update((w) => step(w, { kind: "aim", x: p.x })));
const reset = (world: Ref<World>, step) => action(() => world.update((w) => step(w, { kind: "reset" })));

// Paused or playing is state of its own.
const playing = (): RefCell<boolean> => ref(false);
const toggle = (playing: Ref<boolean>) => action(() => playing.update((p) => !p));
const over = (world) => world.lives === 0 || world.bricks.length === 0;

// The clock is an ordinary generator cell: it yields the milliseconds since its last step and
// writes nothing. It reads playing and over, so it runs again when either changes; while the game
// is not running it yields nothing.
const ticks = function* (now: Clock, playing: boolean, over: boolean) {
  if (!playing || over) return;
  let t = now();
  while (true) {
    const t1 = now();
    yield t1 - t;
    t = t1;
  }
};

// A listener: the notebook runs tick once for each value of ticks. ticks: Events<number> is a
// handle to the generator, not a dependency on its values, so onTick does not run on every frame.
const onTick = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);

const box = () => (x: number, y: number, w: number, h: number, colour: string) =>
  `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${colour}`;

// Components are cells. Each reads only the part of the world it draws, and a cell whose value is
// the same as last time (Object.is) does not re-run its readers: step keeps the bricks array when no
// brick was hit, so bricksView runs once per broken brick, not once per frame.
const bricks = (world) => world.bricks;
const ball = (world) => world.ball;
const paddle = (world) => world.paddle;
const status = (world) =>
  `score ${world.score}, lives ${world.lives}, bricks ${world.bricks.length}${world.lives === 0 ? " · game over" : world.bricks.length === 0 ? " · cleared" : ""}`;

const bricksView = (bricks: readonly Brick[], box) => (
  <div>{bricks.map((b) => <div key={`${b.x},${b.y}`} style={box(b.x, b.y, 34, 12, `hsl(${b.y * 6}, 70%, 55%)`)} />)}</div>
);
const paddleView = (paddle: number, box) => <div style={box(paddle - 24, 220, 48, 6, "#ddd")} />;
const ballView = (ball: Ball, box) => <div style={box(ball.x - 4, ball.y - 4, 8, 8, "#fff") + ";border-radius:4px"} />;

const app = (bricksView: Elem, paddleView: Elem, ballView: Elem, status: string, playing: boolean, aim, toggle, reset) => (
  <div>
    <div style="position:relative;width:320px;height:240px;background:#111;overflow:hidden">
      {bricksView}
      {paddleView}
      {ballView}
      <canvas width={320} height={240} style="position:absolute;left:0;top:0" onPointerMove={aim} />
    </div>
    <output>{status}</output>{" "}
    <button onClick={toggle}>{playing ? "pause" : "play"}</button> <button onClick={reset}>new game</button>
  </div>
);

// Replay: the same events give the same world, with no browser and no clock.
const test_replay = (start: () => World, step) => {
  const run = () => {
    let w = start();
    for (let i = 0; i < 600; i++) w = step(step(w, { kind: "aim", x: w.ball.x }), { kind: "tick", dt: 16 });
    return w;
  };
  const a = run(), b = run();
  if (a.bricks.length >= 24) throw new Error("no brick was hit in 600 frames");
  if (a.score !== b.score || a.ball.x !== b.ball.x || a.ball.y !== b.ball.y || a.lives !== 3) throw new Error(`replay differs or lost a life: ${a.score} ${b.score} ${a.lives}`);
  return `${24 - a.bricks.length} bricks in 600 frames, score ${a.score}, lives ${a.lives}`;
};
