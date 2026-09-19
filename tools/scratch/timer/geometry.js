const _t09 = function _geometry()
{
  const width = 1, height = 3.2;
  const thickness = 0.06, channel = 0.1, wall = 0.03, spoutLength = 0.12;
  // three plates, a pool chamber at each end, a wheel chamber between each pair.
  // Every plate has a spout pointing down at x = 0.3 and one pointing up at
  // x = 0.7: the whole tube maps onto itself under (x, y) -> (1 - x, 3.2 - y),
  // so a flip lands in the mirror of the start.
  const plates = [0.6, 1.6, 2.6].map((y) => {
    const spouts = [{ x: 0.3, dir: -1 }, { x: 0.7, dir: 1 }];
    const y0 = y - thickness / 2, y1 = y + thickness / 2;
    const solids = [];
    let x0 = 0;
    for (const s of spouts) {
      solids.push([x0, s.x - channel / 2, y0, y1]);
      x0 = s.x + channel / 2;
      // the spout's two walls, reaching into the next chamber
      const ya = s.dir > 0 ? y1 : y0 - spoutLength, yb = s.dir > 0 ? y1 + spoutLength : y0;
      solids.push([s.x - channel / 2 - wall, s.x - channel / 2, ya, yb]);
      solids.push([s.x + channel / 2, s.x + channel / 2 + wall, ya, yb]);
    }
    solids.push([x0, width, y0, y1]);
    // where the plug acts: the channel through the plate and its spout
    const channels = spouts.map((s) => [s.x - channel / 2, s.x + channel / 2, s.dir > 0 ? y0 : y0 - spoutLength, s.dir > 0 ? y1 + spoutLength : y1]);
    return { y, thickness, spouts, solids, channels, top: y1, bottom: y0 };
  });
  return {
    width, height, plates,
    wheels: [{ x: 0.5, y: 2.1 }, { x: 0.5, y: 1.1 }].map((w) => ({ ...w, radius: 0.3, hub: 0.05, spokes: 6, width: 0.02 }))
  };
};
