const _nlimq9 = function _1(md){return(
md`# Direct Manipulation Plot


In a [Future of Coding conversation](https://akkartik.name/archives/foc/linking-together/1721317807.883659.html) provoked by the blog [Where Should Visual Programming Go?](https://tonsky.me/blog/diagrams/) I argued that great visualization tools like \`Plot\` were the Future of Coding. However, some disagreed becuase it is _"only"_ a data -> viz transformation, and *true* Future of Code tools would support direct manipulation for the inverse. That made we wonder if it is possible to "invert" visual tools to generate direct manipulation tools in a methodical way?
`
)};
const _1wydlcl = function _2(md){return(
md`~~~js
import {manipulate, invert} from '@tomlarkworthy/manipulate'
~~~`
)};
const _2kwzzv = function _3(md){return(
md`## Plot is extremely flexible

You might not appreciate how flexible plot is at illustrating technical and spatial concepts. What the optimal angle to throw a ball to make it travel furthest? `
)};
const _1sk0fsg = function _x_trajectory(Inputs){return(
Inputs.input([{ j: 40, i: 20 }])
)};
const _9qvkdc = (G, _) => G.input(_);
const _1tutfvm = function _plot_trajectory(Plot,x_trajectory,arc,max_arc,d3){return(
Plot.plot({
  aspectRatio: 1,
  x: {
    domain: [0, 300]
  },
  y: {
    domain: [0, 150]
  },
  marks: [
    Plot.dot(
      x_trajectory,
      Plot.pointer({
        x: "i",
        y: "j",
        fill: "red",
        r: 20,
        maxRadius: 100
      })
    ),
    Plot.dot(x_trajectory, { x: "i", y: "j", value: true, r: 20 }),
    Plot.line(arc, {
      strokeDasharray: [1, 20]
    }),
    Plot.link([max_arc], {
      x1: max_arc[0],
      y1: (d) => 40,
      x2: (d) => max_arc[0],
      y2: (d) => 0,
      stroke: "red"
    }),
    Plot.link([max_arc], {
      x1: 0,
      y1: (d) => d[1],
      x2: (d) => d[0] / 2,
      y2: (d) => d[1],
      stroke: "blue"
    }),
    Plot.text(x_trajectory, {
      x: 5,
      y: max_arc[1],
      text: (d) => `${max_arc[1].toFixed(1)}`,
      textAnchor: "start",
      fontSize: 12,
      fill: "blue",
      dy: -10
    }),

    Plot.text(x_trajectory, {
      x: d3.max(arc, (d) => d[0]),
      y: 5,
      text: (d) => `${max_arc[0].toFixed(1)}`,
      textAnchor: "end",
      fontSize: 12,
      fill: "red",
      dy: -10
    }),
    Plot.text(x_trajectory, {
      x: 20,
      y: 5,
      text: (d) => `${((Math.atan(d.j / d.i) * 180) / Math.PI).toFixed(0)}°`,
      textAnchor: "start",
      fontSize: 24
    }),
    Plot.arrow([{}], {
      x1: 0,
      y1: 0,
      x2: arc.at(-1)[0],
      y2: 0
    }),
    Plot.arrow(x_trajectory, {
      x1: 0,
      y1: 0,
      x2: "i",
      y2: "j",
      stroke: "green"
    })
  ]
})
)};
const _1p1w0tf = (G, _) => G.input(_);
const _j2wrk5 = function _trajectory_manipulate(manipulate,$0,$1,invalidation,invert){return(
manipulate({
  this: this,
  viewofData: $0,
  viewofPlot: $1,
  invalidation,
  onInteraction: ({
    event,
    pixelStart,
    pixelCurrent,
    dataStart,
    dataCurrent,
    viewofPlot
  }) => {
    // Adjust control surface
    const scaleX = viewofPlot.scale("x");
    const scaleY = viewofPlot.scale("y");
    dataCurrent.i = Math.max(
      invert(
        scaleX,
        scaleX.apply(dataStart.i) + pixelCurrent[0] - pixelStart[0]
      ),
      0.1
    );
    dataCurrent.j = Math.max(
      invert(
        scaleY,
        scaleY.apply(dataStart.j) + pixelCurrent[1] - pixelStart[1]
      ),
      0.1
    );

    // fix velocity
    const magnitude = Math.sqrt(
      dataCurrent.i * dataCurrent.i + dataCurrent.j * dataCurrent.j
    );
    if (magnitude > 50) {
      const scale = 50 / magnitude;
      dataCurrent.i *= scale;
      dataCurrent.j *= scale;
    }
    event.preventDefault(); // prevents scrolling on mobile
  }
})
)};
const _18nif75 = function _arc(x_trajectory)
{
  const g = 9.81; // acceleration due to gravity in m/s^2

  // Initial velocity components
  const v = Math.sqrt(
    Math.pow(x_trajectory[0].i, 2) + Math.pow(x_trajectory[0].j, 2)
  );
  const thetaRad = Math.atan2(x_trajectory[0].j, x_trajectory[0].i);

  const points = [];

  // Function to calculate y for a given x using the parabolic motion formula
  function getY(x) {
    return (
      x * Math.tan(thetaRad) -
      (g * x * x) / (2 * v * v * Math.pow(Math.cos(thetaRad), 2))
    );
  }

  // Calculate the range of the projectile
  const range = (v * v * Math.sin(2 * thetaRad)) / g;
  const step = range / 200; // dividing the range into 100 steps

  // Generate points for the arc
  for (let x = 0; x <= range; x += step) {
    const y = getY(x);
    points.push([x, y]);
  }

  return points;
};
const _zt7f0o = function _max_arc(d3,arc){return(
[d3.max(arc, (d) => d[0]), d3.max(arc, (d) => d[1])]
)};
const _m56yzo = function _9(md){return(
md`# Theory
`
)};
const _zr2klq = function _10(tex,md){return(
md`## Inverting scales

Given a dataset, ${tex`X`}, each Plot creates scales, ${tex`S`}, that map data space to pixel space, ${tex`P`}:

<div style="margin-left: 100px; margin-bottom: 15px"> ${tex`XS = P`} </div>
When we click the mouse, ${tex`m`}, at time ${tex`t`}, we indicate a position in pixel space, ${tex`u`}:

<div style="margin-left: 100px; margin-bottom: 15px"> ${tex`u \in P \times P := m_t`} </div>
When we drag the mouse, ${tex`m`}, on the screen, we express a vector action, ${tex`\bar{u}`}, in pixel space. This vector is the difference between the starting and ending positions:

<div style="margin-left: 100px"> ${tex`\bar{u} \in P \times P := m_t - u`} </div>
To invert the mapping:

<div style="margin-left: 100px; margin-bottom: 15px"> ${tex`(X + x)S = P + \bar{u}`} </div>
If ${tex`S`} is linear, inversion is straightforward. However, for general cases, we minimize the following objective:

<div style="margin-left: 100px; margin-bottom: 15px"> ${tex`\min_x \| (X + x)S - (P + \bar{u}) \|^2`} </div>
This ensures we find ${tex`x`} such that the adjusted dataset maps to the perturbed pixel space, accounting for the drag action. The minimisation approach generalizes to ordinal and categorical variables.`
)};
const _1cbswqo = function _invert(){return(
(scale, point) => {
  if (scale.type === "linear") {
    // easy case
    return scale.invert(point);
  } else if (scale.type === "point") {
    // nearest neighbour search
    let nearestSq = Number.MAX_VALUE;
    let nearest = undefined;
    for (let i = 0; i < scale.domain.length; i++) {
      const candidate = scale.apply(scale.domain[i]);
      const distSq = (point - candidate) * (point - candidate);
      if (distSq < nearestSq) {
        nearestSq = distSq;
        nearest = scale.domain[i];
      }
    }
    return nearest;
  } else {
    throw new Error(`Can't invert '${scale.type}'`);
  }
}
)};
const _1e11rhx = function _12(Generators,invalidation,interactions){return(
Generators.observe((notify) => {
  invalidation.then(
    interactions(({ event, pixelStart, pixelCurrent }) => {
      notify({ event, pixelStart, pixelCurrent });
    })
  );
})
)};
const _t6n2qb = function _13(md){return(
md`## Manipulate

Manipulate is the userspace function to update the data from manipulations of the [Plot pointer](https://observablehq.com/plot/interactions/pointer). There is quite a lot of state tracking going on, so it is vitally important the result of manipulate is returned from the enclosing cell, so that next tick, \`this\` is initialised to the previous result.

~~~js
manipulate({
  this: this,     // important! It juggles the 
  viewofData: viewof x_trajectory,    // the data the pointer is drawn from
  viewofPlot: viewof plot_trajectory, // a plot that contains a pointer
  invalidation,
  onInteraction: ({
    event,        // triggering DOM event, event.preventDefault() to stop scrolling
    pixelStart,   // start pointer position in pixel space
    pixelCurrent, // current pointer position in pixel space
    dataStart,    // shallow copy of selected data when drag began
    dataCurrent,  // live reference to selected data
    viewofPlot    // reference to viewofPlot
  }) => {
    // your custom code here
    // typically you will read the scale from viewofPlot
    // convert the delta in pixel space to a delta in data space using invert
    // then set dataCurrent to be dataStart + delta data space
    // but you can also apply any domain constraints programatically
    // or change a different dataset, or do nothing.
    // its a good ideal to call event.preventDefault() if you have served an interaction
    // as this prevents scrolling on mobile.
  }
);
~~~`
)};
const _1ibbpl2 = function _manipulate(interactions,Event){return(
function manipulate({
  this: state,
  viewofData,
  viewofPlot, // or anything that can select
  invalidation,
  onInteraction = undefined
}) {
  state = state || {};
  if (onInteraction) {
    if (state.interactor) state.interactor();
    state.interactor = interactions((interaction) => {
      if (!interaction.pixelCurrent) {
        state.dataCurrent = undefined;
        state.dataStart = undefined;
      } else if (!state.dataCurrent) {
        state.dataCurrent = viewofData.value.find((x) => x == viewofPlot.value);
        state.dataStart = { ...state.dataCurrent };
      }

      if (state.dataCurrent) {
        onInteraction({
          ...interaction,
          ...state,
          dataStart: state.dataStart,
          dataCurrent: state.dataCurrent,
          viewofPlot,
          viewofData
        });
        viewofData.dispatchEvent(new Event("input"));
      }
    });
  }
  return state;
}
)};
const _14tdcf8 = function _15(md){return(
md`## Interaction

We listen to DOM events and pipe the pixel change *synchronously* to a callback. We include the triggering events, so that downstream listeners can conditionally cancel the DOM event to prevent unwanted scrolling on mobile.`
)};
const _kllwrf = function _interactions(MouseEvent,invalidation)
{
  const listeners = new Set();

  const register = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };
  const notify = (event) => {
    listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error(err);
      }
    });
  };
  const position = (evt) =>
    evt.clientX
      ? [evt.clientX, evt.clientY]
      : [evt.touches[0].clientX, evt.touches[0].clientY];
  let start = undefined;
  let current = undefined;

  const emit = (event) => {
    if (start && current)
      notify({
        event,
        pixelCurrent: current,
        pixelStart: start
      });
    else {
      notify({
        event,
        pixelCurrent: undefined,
        pixelStart: undefined
      });
    }
    //event.preventDefault();
  };

  function pointerdown(evt) {
    start = current = position(evt);
    evt.target.addEventListener("touchmove", move, { passive: false });
    evt.target.addEventListener("touchend", pointerup);
    emit(evt);
  }
  function pointerup(evt) {
    start = current = undefined;
    evt.target.removeEventListener("touchmove", move, { passive: false });
    evt.target.removeEventListener("touchend", pointerup);
    emit(evt);
  }
  function move(evt) {
    if (evt instanceof MouseEvent) {
      const flags = evt.buttons !== undefined ? evt.buttons : evt.which;
      const primaryMouseButtonDown = (flags & 1) === 1;
      if (primaryMouseButtonDown) current = position(evt);
      else start = current = undefined;
    } else {
      // touch
      current = position(evt);
    }
    emit(evt);
  }
  //overlay.addEventListener("pointerdown", pointerdown); swallowed by plot
  document.addEventListener("mousedown", pointerdown);
  document.addEventListener("touchstart", pointerdown, { passive: false });
  document.addEventListener("pointerup", pointerup);
  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("touchend", pointerup);

  invalidation.then(() => {
    //overlay.removeEventListener("pointerdown", pointerdown);
    document.removeEventListener("mousedown", pointerdown);
    document.removeEventListener("touchstart", pointerdown, { passive: false });
    document.removeEventListener("pointerup", pointerup);
    document.removeEventListener("pointermove", move, { passive: false });
    document.removeEventListener("touchmove", move, { passive: false });
    document.removeEventListener("touchend", pointerup);
  });
  return register;
};
const _r11equ = function _17(md){return(
md`# MORE EXAMPLES`
)};
const _2r7xu = function _18(md){return(
md`## Continuous Linear case `
)};
const _jkoq8b = function _x_simple(Inputs){return(
Inputs.input([
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.1, y: 0.9 },
  { x: 0.5, y: 0.5 }
])
)};
const _1jaja13 = (G, _) => G.input(_);
const _1yny15z = function _20(manipulate,$0,$1,invalidation,invert){return(
manipulate({
  this: this,
  viewofData: $0,
  viewofPlot: $1,
  invalidation,
  onInteraction: ({
    event,
    pixelStart,
    pixelCurrent,
    dataStart,
    dataCurrent,
    viewofPlot
  }) => {
    const scaleX = viewofPlot.scale("x");
    const scaleY = viewofPlot.scale("y");
    dataCurrent.x = invert(
      scaleX,
      scaleX.apply(dataStart.x) + pixelCurrent[0] - pixelStart[0]
    );
    dataCurrent.y = invert(
      scaleY,
      scaleY.apply(dataStart.y) + pixelCurrent[1] - pixelStart[1]
    );
    event.preventDefault(); // prevents scrolling on mobile
  }
})
)};
const _w8j2dg = function _plot_simple(Plot,x_simple){return(
Plot.plot({
  marks: [
    Plot.density(x_simple, {
      x: "x",
      y: "y",
      stroke: "blue",
      fill: "#fefeff",
      thresholds: 5,
      bandwidth: 70,
      strokeWidth: 0.25
    }),
    Plot.dot(x_simple, { x: "x", y: "y", value: true, r: 20 }),
    Plot.dot(
      x_simple,
      Plot.pointer({
        x: "x",
        y: "y",
        fill: "red",
        r: 20,
        maxRadius: Infinity
      })
    )
  ]
})
)};
const _1ttiopw = (G, _) => G.input(_);
const _bjtzri = function _22(md){return(
md`todo: its pretty trivial to add points with a click, and remove the last selected point with a key press`
)};
const _61yquq = function _23(md){return(
md`## Ordinal/Categorical Data

Not all data domains are continuous`
)};
const _194pd7b = function _x_ordcat(Inputs){return(
Inputs.input([
  { ordinal: "small", categorical: "a" },
  { ordinal: "medium", categorical: "b" },
  { ordinal: "large", categorical: "c" }
])
)};
const _jnv2oc = (G, _) => G.input(_);
const _rwz76 = function _25(manipulate,$0,$1,invalidation,invert){return(
manipulate({
  this: this,
  viewofData: $0,
  viewofPlot: $1,
  invalidation,
  onInteraction: ({
    event,
    pixelStart,
    pixelCurrent,
    dataStart,
    dataCurrent,
    viewofPlot
  }) => {
    const scaleX = viewofPlot.scale("x");
    const scaleY = viewofPlot.scale("y");
    dataCurrent.ordinal = invert(
      scaleX,
      scaleX.apply(dataStart.ordinal) + pixelCurrent[0] - pixelStart[0]
    );
    dataCurrent.categorical = invert(
      scaleY,
      scaleY.apply(dataStart.categorical) + pixelCurrent[1] - pixelStart[1]
    );
    event.preventDefault(); // prevents scrolling on mobile
  }
})
)};
const _17ton11 = function _26(md){return(
md`non-linear scales aren't directly invertible, so we do nearest neighbour instead. You achieve a nice snapping effect.`
)};
const _zx2ekg = function _plot_ordcat(Plot,x_ordcat){return(
Plot.plot({
  x: {
    type: "point",
    domain: ["small", "medium", "large"],
    grid: true
  },
  y: {
    type: "point",
    domain: ["a", "b", "c"],
    grid: true
  },
  marks: [
    Plot.dot(x_ordcat, {
      x: "ordinal",
      y: "categorical",
      value: true,
      r: 10
    }),
    Plot.dot(
      x_ordcat,
      Plot.pointer({
        x: "ordinal",
        y: "categorical",
        fill: "red",
        r: 10,
        maxRadius: Infinity
      })
    )
  ]
})
)};
const _rkwpzb = (G, _) => G.input(_);
const _12t71f8 = function _28(md){return(
md`## Clamping

\`Plot\` provides a ton of flexibility when going from data space to visualisation. These features carry over to derived manipulations`
)};
const _axg7v0 = function _x_sliders(Inputs){return(
Inputs.input([
  { value: 0 },
  { value: 1 },
  { value: 0.5 },
  { value: -0.1 },
  { value: -0.1 }
])
)};
const _1ku8xun = (G, _) => G.input(_);
const _1jmimsw = function _30(manipulate,$0,$1,invalidation,invert){return(
manipulate({
  this: this,
  viewofData: $0,
  viewofPlot: $1,
  invalidation,
  onInteraction: ({
    event,
    pixelStart,
    pixelCurrent,
    dataStart,
    dataCurrent,
    viewofPlot
  }) => {
    const y_scale = viewofPlot.scale("y");
    dataCurrent.value = invert(
      y_scale,
      y_scale.apply(dataStart.value) + pixelCurrent[1] - pixelStart[1]
    );
    event.preventDefault(); // prevents scrolling on mobile
  }
})
)};
const _1a9q3dr = function _plot_sliders(Plot,x_sliders){return(
Plot.plot({
  height: 200,
  y: {
    type: "linear",
    domain: [-1, 1],
    clamp: true,
    grid: true
  },
  x: {
    domain: [-0.5, 4.5],
    axis: null
  }, // hide axis
  marks: [
    Plot.ruleX(x_sliders, {
      x: (d, i) => i,
      strokeWidth: 2,
      strokeLinecap: "round",
      stroke: "#aaa"
    }),
    Plot.dot(x_sliders, {
      symbol: "square2",
      r: 25,
      x: (d, i) => i,
      y: "value",
      stroke: "black",
      fill: "#eee"
    }),
    Plot.text(x_sliders, {
      x: (d, i) => i,
      y: "value",
      text: "value"
    }),
    Plot.dot(
      x_sliders,
      Plot.pointer({
        x: (d, i) => i,
        y: "value",
        symbol: "square2",
        stroke: "red",
        r: 25,
        maxRadius: Infinity
      })
    )
  ]
})
)};
const _1lsn6jm = (G, _) => G.input(_);
const _10x36ry = function _32(md){return(
md`## References

Some types of data points need to reference to others, think arrows or edges on graphs.`
)};
const _1dcy4ep = function _x_nodes(Inputs){return(
Inputs.input([
  {
    id: "node1",
    x: 0,
    y: 1
  },
  {
    id: "node2",
    x: 1,
    y: 0
  },
  {
    id: "node3",
    x: 0,
    y: 0.2
  }
])
)};
const _16rmqcs = (G, _) => G.input(_);
const _wxt1y7 = function _x_edges(Inputs){return(
Inputs.input([
  {
    start: "node1",
    end: "node2"
  },
  {
    start: "node2",
    end: "node3"
  },
  {
    start: "node3",
    end: "node2"
  }
])
)};
const _1n2e1kf = (G, _) => G.input(_);
const _1haancv = function _35(manipulate,$0,$1,invalidation,invert){return(
manipulate({
  this: this,
  viewofData: $0,
  viewofPlot: $1,
  invalidation,
  onInteraction: ({
    event,
    pixelStart,
    pixelCurrent,
    dataStart,
    dataCurrent,
    viewofPlot
  }) => {
    const x_scale = viewofPlot.scale("x");
    const y_scale = viewofPlot.scale("y");
    dataCurrent.x = invert(
      x_scale,
      x_scale.apply(dataStart.x) + pixelCurrent[0] - pixelStart[0]
    );
    dataCurrent.y = invert(
      y_scale,
      y_scale.apply(dataStart.y) + pixelCurrent[1] - pixelStart[1]
    );
    event.preventDefault(); // prevents scrolling on mobile
  }
})
)};
const _14wqgf0 = function _plot_graph(Plot,x_nodes,x_edges){return(
Plot.plot({
  width: 400,
  aspectRatio: 1,
  x: {
    domain: [-0.2, 1.2]
  },
  y: {
    domain: [-0.2, 1.2]
  },
  axis: false,
  marks: [
    Plot.frame(),
    Plot.dot(x_nodes, { x: "x", y: "y", r: 40 }),
    Plot.text(x_nodes, { x: "x", y: "y", text: "id" }),
    Plot.arrow(x_edges, {
      x1: (d) => x_nodes.find((n) => n.id == d.start).x,
      x2: (d) => x_nodes.find((n) => n.id == d.end).x,
      y1: (d) => x_nodes.find((n) => n.id == d.start).y,
      y2: (d) => x_nodes.find((n) => n.id == d.end).y,
      inset: 40,
      bend: true
    }),
    Plot.dot(
      x_nodes,
      Plot.pointer({
        x: "x",
        y: "y",
        r: 40,
        stroke: "red",
        maxRadius: Infinity
      })
    )
  ]
})
)};
const _1jp79a4 = (G, _) => G.input(_);
const _1r136yq = function _37(md){return(
md`We can consider the references as a separate categorical map. You can mix and match multiple manipulations targeting the same data and plots freely.`
)};
const _dqug3z = function _x_edges_domain(Inputs,x_nodes){return(
Inputs.input(
  Array.from({ length: x_nodes.length * x_nodes.length }).flatMap((_, i) =>
    i % x_nodes.length != Math.floor(i / x_nodes.length)
      ? {
          start: x_nodes[i % x_nodes.length].id,
          end: x_nodes[Math.floor(i / x_nodes.length)].id
        }
      : []
  )
)
)};
const _cpr906 = (G, _) => G.input(_);
const _1izgqqp = function _plot_edges(Plot,x_nodes,x_edges,x_edges_domain,_){return(
Plot.plot({
  x: {
    type: "point",
    domain: x_nodes.map((n) => n.id),
    grid: true
  },
  y: {
    type: "point",
    domain: x_nodes.map((n) => n.id),
    grid: true
  },
  marks: [
    Plot.dot(x_edges, {
      x: "start",
      y: "end",
      r: 5,
      fill: "black"
    }),
    Plot.dot(
      x_edges_domain,
      Plot.pointer({
        x: "start",
        y: "end",
        r: 7,
        stroke: (d) => (x_edges.find((e) => _.isEqual(d, e)) ? "red" : "blue")
      })
    )
  ]
})
)};
const _1axeb52 = (G, _) => G.input(_);
const _1bvc4dm = function _40(manipulate,$0,$1,invalidation,_,$2,Event){return(
manipulate({
  this: this,
  viewofData: $0,
  viewofPlot: $1,
  invalidation,
  onInteraction: ({
    event,
    pixelStart,
    pixelCurrent,
    dataStart,
    dataCurrent,
    viewofPlot
  }) => {
    if (!_.isEqual(pixelStart, pixelCurrent)) return; // only trigger for click
    const edgeIndex = $2.value.findIndex((x) =>
      _.isEqual(x, dataCurrent)
    );
    if (edgeIndex != -1) {
      $2.value.splice(edgeIndex, 1);
    } else {
      $2.value.push({ ...dataCurrent });
    }
    $2.dispatchEvent(new Event("input"));
    event.preventDefault(); // prevents scrolling on mobile
  }
})
)};
const _urbw1h = function _41(md){return(
md`## Non linear Spaces (projections)

DOES NOT WORK waiting on https://github.com/observablehq/plot/issues/1191`
)};
const _1k1jmfd = function _longitude(Inputs){return(
Inputs.range([-180, 180])
)};
const _18mgxi3 = (G, _) => G.input(_);
const _14fuh6q = function _x_location(Inputs){return(
Inputs.input([
  {
    longitude: 0,
    latitude: 0
  }
])
)};
const _49ktyi = (G, _) => G.input(_);
const _11ot0eg = function _plot_location(Plot,longitude,land,x_location){return(
Plot.plot({
  width: 300,
  projection: { type: "orthographic", rotate: [-longitude, 0] },
  r: { transform: (d) => Math.pow(10, d) }, // convert Richter to amplitude
  marks: [
    Plot.geo(land, { fill: "currentColor", fillOpacity: 0.2 }),
    Plot.sphere(),
    Plot.dot(x_location, {
      x: "longitude",
      y: "latitude",
      stroke: "blue",
      fill: "blue",
      r: 10,
      fillOpacity: 0.2
    }),
    Plot.dot(
      x_location,
      Plot.pointer({
        x: "longitude",
        y: "latitude",
        stroke: "red",
        fill: "red",
        r: 10,
        fillOpacity: 0.2
      })
    )
  ]
})
)};
const _zifmi9 = (G, _) => G.input(_);
const _1qr7ka9 = function _46(md){return(
md`## Editable Text

Not sure if its possible, ideally we would use https://github.com/observablehq/plot/issues/1213`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_nlimq9", null, ["md"], _nlimq9);  
  $def("_1wydlcl", null, ["md"], _1wydlcl);  
  $def("_2kwzzv", null, ["md"], _2kwzzv);  
  $def("_1sk0fsg", "viewof x_trajectory", ["Inputs"], _1sk0fsg);  
  $def("_9qvkdc", "x_trajectory", ["Generators","viewof x_trajectory"], _9qvkdc);  
  $def("_1tutfvm", "viewof plot_trajectory", ["Plot","x_trajectory","arc","max_arc","d3"], _1tutfvm);  
  $def("_1p1w0tf", "plot_trajectory", ["Generators","viewof plot_trajectory"], _1p1w0tf);  
  $def("_j2wrk5", "trajectory_manipulate", ["manipulate","viewof x_trajectory","viewof plot_trajectory","invalidation","invert"], _j2wrk5);  
  $def("_18nif75", "arc", ["x_trajectory"], _18nif75);  
  $def("_zt7f0o", "max_arc", ["d3","arc"], _zt7f0o);  
  $def("_m56yzo", null, ["md"], _m56yzo);  
  $def("_zr2klq", null, ["tex","md"], _zr2klq);  
  $def("_1cbswqo", "invert", [], _1cbswqo);  
  $def("_1e11rhx", null, ["Generators","invalidation","interactions"], _1e11rhx);  
  $def("_t6n2qb", null, ["md"], _t6n2qb);  
  $def("_1ibbpl2", "manipulate", ["interactions","Event"], _1ibbpl2);  
  $def("_14tdcf8", null, ["md"], _14tdcf8);  
  $def("_kllwrf", "interactions", ["MouseEvent","invalidation"], _kllwrf);  
  $def("_r11equ", null, ["md"], _r11equ);  
  $def("_2r7xu", null, ["md"], _2r7xu);  
  $def("_jkoq8b", "viewof x_simple", ["Inputs"], _jkoq8b);  
  $def("_1jaja13", "x_simple", ["Generators","viewof x_simple"], _1jaja13);  
  $def("_1yny15z", null, ["manipulate","viewof x_simple","viewof plot_simple","invalidation","invert"], _1yny15z);  
  $def("_w8j2dg", "viewof plot_simple", ["Plot","x_simple"], _w8j2dg);  
  $def("_1ttiopw", "plot_simple", ["Generators","viewof plot_simple"], _1ttiopw);  
  $def("_bjtzri", null, ["md"], _bjtzri);  
  $def("_61yquq", null, ["md"], _61yquq);  
  $def("_194pd7b", "viewof x_ordcat", ["Inputs"], _194pd7b);  
  $def("_jnv2oc", "x_ordcat", ["Generators","viewof x_ordcat"], _jnv2oc);  
  $def("_rwz76", null, ["manipulate","viewof x_ordcat","viewof plot_ordcat","invalidation","invert"], _rwz76);  
  $def("_17ton11", null, ["md"], _17ton11);  
  $def("_zx2ekg", "viewof plot_ordcat", ["Plot","x_ordcat"], _zx2ekg);  
  $def("_rkwpzb", "plot_ordcat", ["Generators","viewof plot_ordcat"], _rkwpzb);  
  $def("_12t71f8", null, ["md"], _12t71f8);  
  $def("_axg7v0", "viewof x_sliders", ["Inputs"], _axg7v0);  
  $def("_1ku8xun", "x_sliders", ["Generators","viewof x_sliders"], _1ku8xun);  
  $def("_1jmimsw", null, ["manipulate","viewof x_sliders","viewof plot_sliders","invalidation","invert"], _1jmimsw);  
  $def("_1a9q3dr", "viewof plot_sliders", ["Plot","x_sliders"], _1a9q3dr);  
  $def("_1lsn6jm", "plot_sliders", ["Generators","viewof plot_sliders"], _1lsn6jm);  
  $def("_10x36ry", null, ["md"], _10x36ry);  
  $def("_1dcy4ep", "viewof x_nodes", ["Inputs"], _1dcy4ep);  
  $def("_16rmqcs", "x_nodes", ["Generators","viewof x_nodes"], _16rmqcs);  
  $def("_wxt1y7", "viewof x_edges", ["Inputs"], _wxt1y7);  
  $def("_1n2e1kf", "x_edges", ["Generators","viewof x_edges"], _1n2e1kf);  
  $def("_1haancv", null, ["manipulate","viewof x_nodes","viewof plot_graph","invalidation","invert"], _1haancv);  
  $def("_14wqgf0", "viewof plot_graph", ["Plot","x_nodes","x_edges"], _14wqgf0);  
  $def("_1jp79a4", "plot_graph", ["Generators","viewof plot_graph"], _1jp79a4);  
  $def("_1r136yq", null, ["md"], _1r136yq);  
  $def("_dqug3z", "viewof x_edges_domain", ["Inputs","x_nodes"], _dqug3z);  
  $def("_cpr906", "x_edges_domain", ["Generators","viewof x_edges_domain"], _cpr906);  
  $def("_1izgqqp", "viewof plot_edges", ["Plot","x_nodes","x_edges","x_edges_domain","_"], _1izgqqp);  
  $def("_1axeb52", "plot_edges", ["Generators","viewof plot_edges"], _1axeb52);  
  $def("_1bvc4dm", null, ["manipulate","viewof x_edges_domain","viewof plot_edges","invalidation","_","viewof x_edges","Event"], _1bvc4dm);  
  $def("_urbw1h", null, ["md"], _urbw1h);  
  $def("_1k1jmfd", "viewof longitude", ["Inputs"], _1k1jmfd);  
  $def("_18mgxi3", "longitude", ["Generators","viewof longitude"], _18mgxi3);  
  $def("_14fuh6q", "viewof x_location", ["Inputs"], _14fuh6q);  
  $def("_49ktyi", "x_location", ["Generators","viewof x_location"], _49ktyi);  
  $def("_11ot0eg", "viewof plot_location", ["Plot","longitude","land","x_location"], _11ot0eg);  
  $def("_zifmi9", "plot_location", ["Generators","viewof plot_location"], _zifmi9);  
  $def("_1qr7ka9", null, ["md"], _1qr7ka9);
  return main;
}