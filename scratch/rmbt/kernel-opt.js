var window = self;
const scanRows = [];
const SVD = function(r,f,o,e,t){if(f=void 0===f||f,o=void 0===o||o,t=1e-64/(e=e||Math.pow(2,-52)),!r)throw new TypeError("Matrix a is not defined");var i,a,n,s,h,l,M,d,p,b,u,w,y=r[0].length,q=r.length;if(q<y)throw new TypeError("Invalid matrix: m < n");for(var v=[],c=[],x=[],g="f"===f?q:y,m=b=M=0;m<q;m++)c[m]=new Array(g).fill(0);for(m=0;m<y;m++)x[m]=new Array(y).fill(0);var S,T=new Array(y).fill(0);for(m=0;m<q;m++)for(i=0;i<y;i++)c[m][i]=r[m][i];for(m=0;m<y;m++){for(v[m]=M,p=0,n=m+1,i=m;i<q;i++)p+=Math.pow(c[i][m],2);if(p<t)M=0;else for(d=(l=c[m][m])*(M=l<0?Math.sqrt(p):-Math.sqrt(p))-p,c[m][m]=l-M,i=n;i<y;i++){for(p=0,a=m;a<q;a++)p+=c[a][m]*c[a][i];for(l=p/d,a=m;a<q;a++)c[a][i]=c[a][i]+l*c[a][m]}for(T[m]=M,p=0,i=n;i<y;i++)p+=Math.pow(c[m][i],2);if(p<t)M=0;else{for(d=(l=c[m][m+1])*(M=l<0?Math.sqrt(p):-Math.sqrt(p))-p,c[m][m+1]=l-M,i=n;i<y;i++)v[i]=c[m][i]/d;for(i=n;i<q;i++){for(p=0,a=n;a<y;a++)p+=c[i][a]*c[m][a];for(a=n;a<y;a++)c[i][a]=c[i][a]+p*v[a]}}b<(u=Math.abs(T[m])+Math.abs(v[m]))&&(b=u)}if(o)for(m=y-1;0<=m;m--){if(0!==M){for(d=c[m][m+1]*M,i=n;i<y;i++)x[i][m]=c[m][i]/d;for(i=n;i<y;i++){for(p=0,a=n;a<y;a++)p+=c[m][a]*x[a][i];for(a=n;a<y;a++)x[a][i]=x[a][i]+p*x[a][m]}}for(i=n;i<y;i++)x[m][i]=0,x[i][m]=0;x[m][m]=1,M=v[m],n=m}if(f){if("f"===f)for(m=y;m<q;m++){for(i=y;i<q;i++)c[m][i]=0;c[m][m]=1}for(m=y-1;0<=m;m--){for(n=m+1,M=T[m],i=n;i<g;i++)c[m][i]=0;if(0!==M){for(d=c[m][m]*M,i=n;i<g;i++){for(p=0,a=n;a<q;a++)p+=c[a][m]*c[a][i];for(l=p/d,a=m;a<q;a++)c[a][i]=c[a][i]+l*c[a][m]}for(i=m;i<q;i++)c[i][m]=c[i][m]/M}else for(i=m;i<q;i++)c[i][m]=0;c[m][m]=c[m][m]+1}}for(e*=b,a=y-1;0<=a;a--)for(var k=0;k<50;k++){for(S=!1,n=a;0<=n;n--){if(Math.abs(v[n])<=e){S=!0;break}if(Math.abs(T[n-1])<=e)break}if(!S)for(h=0,s=n-(p=1),m=n;m<a+1&&(l=p*v[m],v[m]=h*v[m],!(Math.abs(l)<=e));m++)if(M=T[m],T[m]=Math.sqrt(l*l+M*M),h=M/(d=T[m]),p=-l/d,f)for(i=0;i<q;i++)u=c[i][s],w=c[i][m],c[i][s]=u*h+w*p,c[i][m]=-u*p+w*h;if(w=T[a],n===a){if(w<0&&(T[a]=-w,o))for(i=0;i<y;i++)x[i][a]=-x[i][a];break}for(b=T[n],l=(((u=T[a-1])-w)*(u+w)+((M=v[a-1])-(d=v[a]))*(M+d))/(2*d*u),M=Math.sqrt(l*l+1),l=((b-w)*(b+w)+d*(u/(l<0?l-M:l+M)-d))/b,m=n+(p=h=1);m<a+1;m++){if(M=v[m],u=T[m],d=p*M,M*=h,w=Math.sqrt(l*l+d*d),l=b*(h=l/(v[m-1]=w))+M*(p=d/w),M=-b*p+M*h,d=u*p,u*=h,o)for(i=0;i<y;i++)b=x[i][m-1],w=x[i][m],x[i][m-1]=b*h+w*p,x[i][m]=-b*p+w*h;if(w=Math.sqrt(l*l+d*d),l=(h=l/(T[m-1]=w))*M+(p=d/w)*u,b=-p*M+h*u,f)for(i=0;i<q;i++)u=c[i][m-1],w=c[i][m],c[i][m-1]=u*h+w*p,c[i][m]=-u*p+w*h}v[n]=0,v[a]=l,T[a]=b}for(m=0;m<y;m++)T[m]<e&&(T[m]=0);return{u:c,q:T,v:x}};
const LAYOUT = {"R":28,"bands":[[0,4,1],[4,6,0],[6,8,"p0"],[8,9,1],[9,10,0],[10,11,1],[11,13,"p1"],[13,15,"p2"],[15,17,"p3"],[17,19,"p4"],[19,21,"p5"],[21,23,"p6"],[23,25,"p7"],[25,26,1],[26,28,0]],"cells":[{"i":0,"r0":6,"r1":8,"rm":7},{"i":1,"r0":11,"r1":13,"rm":12},{"i":2,"r0":13,"r1":15,"rm":14},{"i":3,"r0":15,"r1":17,"rm":16},{"i":4,"r0":17,"r1":19,"rm":18},{"i":5,"r0":19,"r1":21,"rm":20},{"i":6,"r0":21,"r1":23,"rm":22},{"i":7,"r0":23,"r1":25,"rm":24}],"fixedEdges":[4,9,10,26,28],"anchorRadii":[28,10],"whiteRefs":[2,8.5,10.5,25.5],"blackRefs":[5,9.5,27]};
const crCurve = [{"d":0,"aOut":28,"aIn":10,"cr":1.2892857142857144,"fIn":0.32142857142857145},{"d":0.25,"aOut":27.99888390632741,"aIn":9.996874511566103,"cr":1.2894523076677356,"fIn":0.3214772677187513},{"d":0.5,"aOut":27.995535358338838,"aIn":9.987492177719089,"cr":1.2899531467283196,"fIn":0.32162348299683113},{"d":0.75,"aOut":27.98995355480248,"aIn":9.971835337589566,"cr":1.290791425457096,"fIn":0.32186759763524847},{"d":1,"aOut":27.982137159266443,"aIn":9.9498743710662,"cr":1.2919725251981642,"fIn":0.32221024944531007},{"d":1.25,"aOut":27.972084298457276,"aIn":9.921567416492215,"cr":1.2935041036141535,"fIn":0.322652339549838},{"d":1.5,"aOut":27.95979256003163,"aIn":9.886859966642595,"cr":1.295396223182955,"fIn":0.3231950407819583},{"d":1.75,"aOut":27.945258989674794,"aIn":9.845684333757609,"cr":1.297661523422828,"fIn":0.32383980879555657},{"d":2,"aOut":27.92848008753788,"aIn":9.797958971132712,"cr":1.3003154426176642,"fIn":0.3245883961385942},{"d":2.25,"aOut":27.909451804003602,"aIn":9.743587634952538,"cr":1.3033764967144477,"fIn":0.32544286961675783},{"d":2.5,"aOut":27.888169534768682,"aIn":9.682458365518542,"cr":1.3068666254130232,"fIn":0.3264056313655285},{"d":2.75,"aOut":27.86462811522881,"aIn":9.614442261514705,"cr":1.3108116184277299,"fIn":0.32747944415845015},{"d":3,"aOut":27.83882181415011,"aIn":9.539392014169456,"cr":1.3152416386922587,"fIn":0.32866746161432897},{"d":3.25,"aOut":27.810744326608734,"aIn":9.45714015968887,"cr":1.3201918642067358,"fIn":0.3299732641344576},{"d":3.5,"aOut":27.780388766178202,"aIn":9.367496997597597,"cr":1.3257032767124375,"fIn":0.3314009016136908},{"d":3.75,"aOut":27.747747656341406,"aIn":9.270248108869579,"cr":1.3318236340222072,"fIn":0.3329549442411954},{"d":4,"aOut":27.712812921102035,"aIn":9.16515138991168,"cr":1.3386086744892227,"fIn":0.33464054305846314},{"d":4.25,"aOut":27.67557587476727,"aIn":9.051933495115836,"cr":1.346123618005319,"fIn":0.33646350240233336},{"d":4.5,"aOut":27.636027210870957,"aIn":8.930285549745875,"cr":1.3544450499120408,"fIn":0.3384303669698038},{"d":4.75,"aOut":27.59415699020356,"aIn":8.799857953399021,"cr":1.363663305018827,"fIn":0.34054852705731986},{"d":5,"aOut":27.54995462791182,"aIn":8.660254037844387,"cr":1.3738855127120844,"fIn":0.34282634663451717},{"d":5.25,"aOut":27.503408879627994,"aIn":8.511022265274601,"cr":1.3852395273418707,"fIn":0.3452733204359481},{"d":5.5,"aOut":27.454507826584692,"aIn":8.351646544245034,"cr":1.3978790608406033,"fIn":0.3479002683821929},{"d":5.75,"aOut":27.403238859667667,"aIn":8.181534085976786,"cr":1.4119904732142563,"fIn":0.3507195786623157},{"d":6,"aOut":27.349588662354687,"aIn":8,"cr":1.4278018881112973,"fIn":0.35374551517457387},{"d":6.25,"aOut":27.29354319248419,"aIn":7.806247497997997,"cr":1.4455956307146607,"fIn":0.35699461145543754},{"d":6.5,"aOut":27.235087662792644,"aIn":7.599342076785332,"cr":1.465725513046498,"fIn":0.36048618291823575},{"d":6.75,"aOut":27.174206520154364,"aIn":7.378177281686853,"cr":1.4886413598818435,"fIn":0.36424300418459943},{"d":7,"aOut":27.110883423451916,"aIn":7.14142842854285,"cr":1.5149246419372844,"fIn":0.368292222038673},{"d":7.25,"aOut":27.045101219999157,"aIn":6.887488656977955,"cr":1.5453416755228293,"fIn":0.37266661342933277},{"d":7.5,"aOut":26.97684192043242,"aIn":6.614378277661476,"cr":1.5809256019910896,"fIn":0.3774063639997144},{"d":7.75,"aOut":26.906086671978144,"aIn":6.319612329882269,"cr":1.6231075087271067,"fIn":0.38256165961763683},{"d":8,"aOut":26.832815729997478,"aIn":6,"cr":1.6739356881873897,"fIn":0.38819660112501053},{"d":8.25,"aOut":26.757008427699834,"aIn":5.651327277728657,"cr":1.7364626734786628,"fIn":0.3943953825593186},{"d":8.5,"aOut":26.6786431439082,"aIn":5.267826876426369,"cr":1.8154760796357168,"fIn":0.40127258631537216}];
const carrierTemplate = [-28,-26,-10,-9,-4,4,9,10,26,28];
const codebook = [{"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0},{"0":1,"1":1,"2":1,"3":0,"4":0,"5":0,"6":0,"7":1},{"0":1,"1":0,"2":0,"3":1,"4":1,"5":0,"6":0,"7":1},{"0":0,"1":1,"2":1,"3":1,"4":1,"5":0,"6":0,"7":0},{"0":0,"1":1,"2":0,"3":1,"4":0,"5":1,"6":0,"7":1},{"0":1,"1":0,"2":1,"3":1,"4":0,"5":1,"6":0,"7":0},{"0":1,"1":1,"2":0,"3":0,"4":1,"5":1,"6":0,"7":0},{"0":0,"1":0,"2":1,"3":0,"4":1,"5":1,"6":0,"7":1},{"0":1,"1":1,"2":0,"3":1,"4":0,"5":0,"6":1,"7":0},{"0":0,"1":0,"2":1,"3":1,"4":0,"5":0,"6":1,"7":1},{"0":0,"1":1,"2":0,"3":0,"4":1,"5":0,"6":1,"7":1},{"0":1,"1":0,"2":1,"3":0,"4":1,"5":0,"6":1,"7":0},{"0":1,"1":0,"2":0,"3":0,"4":0,"5":1,"6":1,"7":1},{"0":0,"1":1,"2":1,"3":0,"4":0,"5":1,"6":1,"7":0},{"0":0,"1":0,"2":0,"3":1,"4":1,"5":1,"6":1,"7":0},{"0":1,"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"7":1}];
const minMargin = 2;
const edgeThreshold = 12;
const dpScratch = (function () { const s = { cells: 0, n: 0 }; s.ensure = function ensure(cells, n) {
    if (cells > s.cells) {
      s.cells = cells;
      s.D = new Float64Array(cells);
      s.P = new Int8Array(cells);
    }
    if (n > s.n) {
      s.n = n;
      s.map = new Int32Array(n);
      s.proj = new Float64Array(n);
      s.px = new Float64Array(n);
      s.pk = new Float64Array(n);
    }
  }; return s; })();
const crossRatio = function crossRatio(a, b, c, d) {
  return ((a - c) * (b - d)) / ((b - c) * (a - d));
};
const crDistance = function crDistance(u, v) {
  // chordal distance on the Riemann sphere: bounded in [0,1] and well behaved
  // when a cross ratio runs off to infinity (a degenerate, near-coincident window)
  if (!isFinite(u) || !isFinite(v)) return isFinite(u) === isFinite(v) ? 0 : 1;
  return Math.abs(u - v) / Math.sqrt((1 + u * u) * (1 + v * v));
};
const xFromK = function xFromK(pqrs, k) {
  const denom = k * pqrs.r - pqrs.p;
  if (Math.abs(denom) < 1e-12) return NaN; // parallel / undefined
  return (pqrs.q - k * pqrs.s) / denom;
};
const templateAtOffset = function templateAtOffset(template_edges, d) {
  // |k| is the ring radius; a chord at perpendicular distance d meets it at
  // sign(k)*sqrt(k^2 - d^2), and misses the ring entirely when |k| <= |d|
  const ad = Math.abs(d);
  const out = [];
  for (const k of template_edges) {
    const r = Math.abs(k);
    if (r <= ad) continue;
    out.push(Math.sign(k) * Math.sqrt(r * r - ad * ad));
  }
  return out;
};
const fitMobiusLS = function fitMobiusLS(pairs) {
  const N = pairs.length;
  if (N < 3) throw new Error("need >=3 points");
  let x0 = 0;
  for (let i = 0; i < N; i++) x0 += pairs[i].x;
  x0 /= N;
  let sc = 0;
  for (let i = 0; i < N; i++) { const e = pairs[i].x - x0; sc += e * e; }
  sc = Math.sqrt(sc / N) || 1;
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < N; i++) {
    const u = (pairs[i].x - x0) / sc, k = pairs[i].k, c = -k * u;
    a00 += u * u; a01 += u; a02 += u * c;
    a12 += c; a22 += c * c;
    b0 += u * k; b1 += k; b2 += c * k;
  }
  const a11 = N;
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a12 * a02 - a01 * a22;
  const c02 = a01 * a12 - a11 * a02;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (!(det > 1e-12 || det < -1e-12)) throw new Error("degenerate window");
  const c11 = a00 * a22 - a02 * a02;
  const c12 = a01 * a02 - a00 * a12;
  const c22 = a00 * a11 - a01 * a01;
  const inv = 1 / det;
  const p = (c00 * b0 + c01 * b1 + c02 * b2) * inv;
  const q = (c01 * b0 + c11 * b1 + c12 * b2) * inv;
  const r = (c02 * b0 + c12 * b1 + c22 * b2) * inv;
  return { p, q: sc * q - x0 * p, r, s: sc - x0 * r };
};
const dpAlignFast = function dpAlignFast(tplX, N, scanX, M, gapPenalty, map) {
  // Needleman-Wunsch on 1D image positions. Same recurrence and tie-breaking as
  // Part II's dpAlign, but on flat reused buffers with the cost inlined, and it
  // emits only templateToScan (as an Int32Array, -1 for unmatched) because that
  // is the only field the refit consumes.
  const cols = M + 1;
  dpScratch.ensure((N + 1) * cols, Math.max(N, M));
  const D = dpScratch.D;
  const P = dpScratch.P;

  D[0] = 0;
  P[0] = 0;
  for (let i = 1; i <= N; i++) {
    D[i * cols] = i * gapPenalty;
    P[i * cols] = 1;
  }
  for (let j = 1; j <= M; j++) {
    D[j] = j * gapPenalty;
    P[j] = 2;
  }

  for (let i = 1; i <= N; i++) {
    const xt = tplX[i - 1];
    const base = i * cols;
    const prev = base - cols;
    for (let j = 1; j <= M; j++) {
      let m = xt - scanX[j - 1];
      if (m < 0) m = -m;
      let best = D[prev + j - 1] + m;
      let ptr = 0;
      const up = D[prev + j] + gapPenalty;
      if (up < best) {
        best = up;
        ptr = 1;
      }
      const left = D[base + j - 1] + gapPenalty;
      if (left < best) {
        best = left;
        ptr = 2;
      }
      D[base + j] = best;
      P[base + j] = ptr;
    }
  }

  for (let t = 0; t < N; t++) map[t] = -1;
  let i = N;
  let j = M;
  while (i > 0 || j > 0) {
    if (i === 0) {
      j--;
      continue;
    }
    if (j === 0) {
      i--;
      continue;
    }
    const p = P[i * cols + j];
    if (p === 0) {
      map[i - 1] = j - 1;
      i--;
      j--;
    } else if (p === 1) {
      i--;
    } else {
      j--;
    }
  }
  return D[N * cols + M];
};
const windowCandidates = function windowCandidates(sx, opts = {}) {
  // Candidate generation, split out of detectLandmarkRow so strategies can be
  // swapped (opts.generator) against identical downstream code. Returns one
  // candidate per accepted window: the mirror-symmetric mid pair whose cross
  // ratio sits closest to the CR(d) curve.
  //
  //   "scan"    exhaustive over every (i,j). The reference.
  //   "vote"    sweep centres expanded directly into rim pairs. Fastest, but it
  //             finds fewer decodable rows per mark, and marks that then sit on
  //             the V-fit's 3-row minimum carry 2-7px of position error.
  //   "gated"   DEFAULT. The reflection sweep decides WHERE to enumerate; near a
  //             surviving centre the enumeration is exactly "scan", so the
  //             candidate set around a real mark -- and hence the accuracy -- is
  //             unchanged. A false centre costs a few wasted windows, never a
  //             wrong landmark; the cross-ratio and decode gates downstream
  //             still judge every window on its own merits.
  const n = sx.length;
  const minWidth = opts.minWidth ?? 24;
  const maxWidth = opts.maxWidth ?? 400;
  // 48 not 32: a large crisp mark crosses ~34 physical rings near its equator and
  // anti-aliasing can double-peak several of them; at 32 the enumeration break
  // fired before j reached the far rim, silently discarding the full-rim window
  // of exactly the biggest, easiest marks
  const maxEdges = opts.maxEdges ?? 48;
  const crTol = opts.crTol ?? 0.012;
  const generator = opts.generator ?? "gated";
  const cands = [];
  let windows = 0;

  // largest edge-free run inside a window, as a width fraction: a true mark is
  // edge-dense throughout (rings everywhere), while a window stitched across two
  // neighbouring marks contains the blank background between them
  const holeFracOf = (i, j, width) => {
    let mg = 0;
    for (let e = i; e < j; e++) {
      const gp = sx[e + 1] - sx[e];
      if (gp > mg) mg = gp;
    }
    return mg / width;
  };
  // given a rim pair (i,j), the best mid pair on the CR(d) curve
  const midPair = (i, j) => {
    const width = sx[j] - sx[i];
    const aLo = sx[i] + 0.26 * width, aHi = sx[i] + 0.48 * width;
    const bLo = sx[i] + 0.52 * width, bHi = sx[i] + 0.74 * width;
    let bestC = null;
    for (let a = i + 1; a < j; a++) {
      if (sx[a] < aLo) continue;
      if (sx[a] > aHi) break;
      const fa = (sx[a] - sx[i]) / width;
      for (let b = a + 1; b < j; b++) {
        if (sx[b] < bLo) continue;
        if (sx[b] > bHi) break;
        const fb = (sx[b] - sx[i]) / width;
        if (Math.abs(fa - (1 - fb)) > 0.06) continue; // not mirror-symmetric
        const cr = crossRatio(sx[i], sx[a], sx[b], sx[j]);
        let bestT = null, bestDist = Infinity;
        for (const t of crCurve) {
          const dist = crDistance(cr, t.cr);
          if (dist < bestDist) { bestDist = dist; bestT = t; }
        }
        if (bestDist > crTol) continue;
        if (!bestC || bestDist < bestC.crDist)
          bestC = { i, a, b, j, width, cr, crDist: bestDist, dSeed: bestT.d };
      }
    }
    return bestC;
  };
  const take = (i, j) => {
    windows++;
    const bestC = midPair(i, j);
    if (bestC) {
      bestC.holeFrac = holeFracOf(i, j, sx[j] - sx[i]);
      cands.push(bestC);
    }
  };

  if (generator === "scan") {
    for (let i = 0; i < n; i++) {
      for (let j = i + 7; j < n; j++) {
        const width = sx[j] - sx[i];
        if (width > maxWidth) break;
        if (j - i + 1 > maxEdges) break;
        if (width < minWidth) continue;
        take(i, j);
      }
    }
    return { cands, windows };
  }

  // Reflection sweep. A mark is concentric, so it is mirror-symmetric about its
  // centre and EVERY ring pair it contributes shares one midpoint. The key fact
  // (which took two broken histogram designs to see): the centre of a symmetric
  // edge set always lies BETWEEN its innermost mirror pair, so the only centre
  // hypotheses worth testing are the midpoints of near-adjacent edge pairs --
  // a linear sweep, not an O(n^2) vote. Each hypothesis is verified by walking
  // two pointers outward and counting mirrored offsets that agree within
  // mirrorTol; the count is a direct "how many ring pairs corroborate this
  // centre" statistic, where the histogram's raw pair-vote mostly measured
  // local edge density and let one busy stretch of the row starve real marks
  // out of a rank cap.
  //
  // mirrorTol is loose on purpose: a perspective image of a circle is NOT
  // exactly mirror-symmetric (that is why the decoder fits a Mobius map rather
  // than assuming symmetry), and matching mirrored edges to 2px lost the
  // foreshortened marks entirely.
  //
  // maxInnerGap kills most chimera centres for free: the midpoint between two
  // NEIGHBOURING marks is also a symmetry centre, but it sits in the blank
  // between them, so its nearest edges are far away -- whereas a real mark has
  // mid-sync edges close to its centre.
  //
  // No rank cap. Dense periodic texture (a 90-degree row through the screen
  // grid) is mirror-symmetric about every half-period point and produces fake
  // centres with pair counts far above any real mark's, so keeping the "best" N
  // centres is exactly backwards there. Fake centres are harmless to accuracy
  // -- they only admit windows the cross-ratio gate then rejects -- and after
  // suppression a typical row carries ~7 centres, so admitting all of them
  // still cuts enumeration hard.
  const mirrorTol = opts.mirrorTol ?? 5;
  const maxInnerGap = opts.maxInnerGap ?? 60;
  const minPairs = opts.minPairs ?? 5;
  const nmsPx = opts.centreSuppress ?? 20;
  const centreTol = opts.centreTol ?? 6;
  const raw = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j <= Math.min(i + 2, n - 1); j++) {
      if (sx[j] - sx[i] > maxInnerGap) continue;
      const c = (sx[i] + sx[j]) / 2;
      let l = i, r = j, pairs = 0;
      while (l >= 0 && r < n) {
        const dl = c - sx[l], dr = sx[r] - c;
        if (dl > maxWidth / 2 || dr > maxWidth / 2) break;
        if (Math.abs(dl - dr) <= mirrorTol) { pairs++; l--; r++; }
        else if (dl < dr) l--;
        else r++;
      }
      if (pairs >= minPairs) raw.push({ c, pairs });
    }
  }
  // suppression: the strongest corroboration wins its neighbourhood. 20px is
  // well under any plausible same-row mark spacing (marks are >=110px wide), so
  // it collapses one mark's cluster of near-identical hypotheses without ever
  // merging two real marks.
  raw.sort((a, b) => b.pairs - a.pairs);
  const centres = [];
  for (const cd of raw) {
    let near = false;
    for (const k of centres) if (Math.abs(k.c - cd.c) < nmsPx) { near = true; break; }
    if (!near) centres.push(cd);
  }

  if (generator === "gated") {
    // accept windows whose midpoint lands within centreTol of a sweep centre.
    // centreTol covers the perspective skew between a rim pair's midpoint and
    // the true centre (measured up to ~5px on the foreshortened marks).
    const accept = new Set();
    for (const k of centres) {
      const kc = Math.round(k.c);
      for (let o = -centreTol; o <= centreTol; o++) accept.add(kc + o);
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 7; j < n; j++) {
        const width = sx[j] - sx[i];
        if (width > maxWidth) break;
        if (j - i + 1 > maxEdges) break;
        if (width < minWidth) continue;
        if (!accept.has(Math.round((sx[i] + sx[j]) / 2))) continue;
        take(i, j);
      }
    }
    return { cands, windows };
  }

  // "vote": sweep centres expanded directly into the rim pairs centred there.
  // Everything downstream still has its say -- but see the header: fewer
  // decodable rows survive per mark, so this trades position accuracy for
  // speed and is not the default.
  const taken = new Set();
  for (const { c } of centres) {
    const pairs = [];
    for (let p = 0; p < n; p++) {
      const mirror = 2 * c - sx[p];
      if (mirror <= sx[p]) continue;
      let lo = p + 1, hi = n - 1, q = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (Math.abs(sx[mid] - mirror) <= centreTol) { q = mid; break; }
        if (sx[mid] < mirror) lo = mid + 1; else hi = mid - 1;
      }
      if (q < 0) continue;
      const width = sx[q] - sx[p];
      if (width < minWidth || width > maxWidth) continue;
      if (q - p + 1 > maxEdges) continue;
      pairs.push({ p, q, width });
    }
    pairs.sort((a, b) => b.width - a.width);
    for (const { p, q } of pairs.slice(0, opts.pairsPerCentre ?? 6)) {
      const tag = p * 4096 + q;
      if (taken.has(tag)) continue;
      taken.add(tag);
      take(p, q);
    }
  }
  return { cands, windows };
};
// The chord template at each swept offset. Offsets are quantised to 0.25, so
// there are ~35 of them and rebuilding one per hypothesis (33k times a frame)
// was pure waste.
const carrierTable = (function () {
  const out = [];
  for (let d = 0; d <= crCurve[crCurve.length - 1].d + 1e-9; d += 0.25)
    out.push(Float64Array.from(templateAtOffset(carrierTemplate, d)));
  return out;
})();
// Predicted cross ratio of the (rim, mid) quadruple at each swept offset, one row
// per mid-pair radius interpretation. A window is only admitted in the first place
// because its measured cross ratio sits on the r=10 curve, so most of the offsets
// the sweep used to try were inconsistent with the very measurement that admitted
// it -- 89 hypotheses per candidate, of which about 20 are consistent.
const crTable = (function () {
  const R = LAYOUT.R;
  return [LAYOUT.anchorRadii[1], 8, 6].map((rc) =>
    Float64Array.from(carrierTable, (_, di) => {
      const d = di * 0.25;
      if (d > rc - 0.5) return NaN;
      const aOut = Math.sqrt(R * R - d * d), aIn = Math.sqrt(rc * rc - d * d);
      return crossRatio(-aOut, -aIn, aIn, aOut);
    })
  );
})();
// fitMobiusLS's arithmetic against caller-owned buffers, writing into a caller-owned
// object, so the sweep allocates neither its inputs nor its output.
const fitMobiusInto = function fitMobiusInto(xs, ks, n, out) {
  let x0 = 0;
  for (let i = 0; i < n; i++) x0 += xs[i];
  x0 /= n;
  let sc = 0;
  for (let i = 0; i < n; i++) { const e = xs[i] - x0; sc += e * e; }
  sc = Math.sqrt(sc / n) || 1;
  let a00 = 0, a01 = 0, a02 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const u = (xs[i] - x0) / sc, k = ks[i], c = -k * u;
    a00 += u * u; a01 += u; a02 += u * c;
    a12 += c; a22 += c * c;
    b0 += u * k; b1 += k; b2 += c * k;
  }
  const a11 = n;
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a12 * a02 - a01 * a22;
  const c02 = a01 * a12 - a11 * a02;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (!(det > 1e-12 || det < -1e-12)) return false;
  const c11 = a00 * a22 - a02 * a02;
  const c12 = a01 * a02 - a00 * a12;
  const c22 = a00 * a11 - a01 * a01;
  const inv = 1 / det;
  const p = (c00 * b0 + c01 * b1 + c02 * b2) * inv;
  const q = (c01 * b0 + c11 * b1 + c12 * b2) * inv;
  const r = (c02 * b0 + c12 * b1 + c22 * b2) * inv;
  out.p = p; out.q = sc * q - x0 * p; out.r = r; out.s = sc - x0 * r;
  return isFinite(out.p) && isFinite(out.q) && isFinite(out.r) && isFinite(out.s);
};
// One set of buffers for the whole sweep. Safe to share because a row is scanned
// start to finish on one thread with no await inside; a worker gets its own copy
// of the module and therefore its own buffers.
const sweepScratch = (function () {
  const rings = carrierTemplate.length;
  const nBins = Math.floor(crCurve[crCurve.length - 1].d) + 1;
  return {
    midRadii: [LAYOUT.anchorRadii[1], 8, 6],
    proj: new Float64Array(rings),
    pairX: new Float64Array(rings),
    pairK: new Float64Array(rings),
    seedX: new Float64Array(4),
    seedK: new Float64Array(4),
    mob: { p: 0, q: 0, r: 0, s: 1 },
    mobR: { p: 0, q: 0, r: 0, s: 1 },
    nBins,
    used: new Uint8Array(nBins),
    d: new Float64Array(nBins),
    score: new Float64Array(nBins),
    rmse: new Float64Array(nBins),
    pairs: new Int32Array(nBins),
    rings: new Int32Array(nBins),
    p: new Float64Array(nBins),
    q: new Float64Array(nBins),
    r: new Float64Array(nBins),
    s: new Float64Array(nBins)
  };
})();
const detectLandmarkRow = function detectLandmarkRow(scanEdges, opts = {}) {
  const out = [];
  out.windows = 0;
  out.survived = 0;
  const n = scanEdges ? scanEdges.length : 0;
  if (n < 8) return out;
  const sx = Float64Array.from(scanEdges, (e) => (typeof e === "number" ? e : e.x));

  const maxCands = opts.maxCands ?? 12; // fine-sweep budget per row
  const maxXRMSE = opts.maxXRMSE ?? 2.5;
  const minPairs = opts.minPairs ?? 7;
  const gapFrac = opts.gapFrac ?? 0.04; // gap penalty as a fraction of window width
  // How far a swept offset's predicted cross ratio may sit from the window's
  // measured one before the offset is skipped. Deliberately five times the
  // tolerance the window was ADMITTED under: the measured cross ratio picks the
  // right neighbourhood but not the right offset within it, and at the admission
  // tolerance the gate cut decodable rows (95 -> 58 on the angled frame) and put
  // 3px into the fused centres. At 0.06 the swept set is a superset of what wins,
  // and both frames decode MORE rows than the ungated sweep managed before the
  // fit was preconditioned.
  const dGateTol = opts.dGateTol ?? 0.06;
  const rOut = LAYOUT.R;
  const rIn = LAYOUT.anchorRadii[1];
  const dMax = crCurve[crCurve.length - 1].d;

  // candidate generation lives in windowCandidates so the exhaustive scan and
  // the reflection vote can be swapped (opts.generator) against identical
  // downstream code
  const gen = windowCandidates(sx, opts);
  const cands = gen.cands;
  out.windows = gen.windows;
  out.survived = cands.length;
  // spend the expensive alignment on the WIDEST curve-consistent windows: a real
  // mark's full-rim window is wider than any of its internal accidental windows,
  // and accidental quadruples routinely beat true ones on cross-ratio distance
  // (edge noise puts the truth at ~0.003; chance alignments can hit 0.0001).
  // Two refinements, both learned from mark-dense scenes: windows with a large
  // internal hole rank AFTER hole-free ones (they are usually stitched across
  // two marks — and on a symmetric grid such a chimera is centred exactly on the
  // mark between its parts), and at most 2 candidates may share an x-locality so
  // one busy region cannot starve the rest of the row.
  cands.sort(
    (p, q) =>
      (p.holeFrac > 0.24) - (q.holeFrac > 0.24) ||
      q.width - p.width ||
      p.crDist - q.crDist
  );
  const picked = [];
  for (const c of cands) {
    if (picked.length >= maxCands) break;
    const cx = (sx[c.i] + sx[c.j]) / 2;
    // anti-aliasing double-peaks rim edges, minting several near-identical
    // copies of the same window (same centre, width within a few px). Copies
    // must not count against the locality quota or they alone fill it — on a
    // symmetric grid the wide stitched window over marks A and C is centred
    // exactly on mark B, and its AA twins were evicting B's true window.
    let near = 0, twin = false;
    for (const k of picked) {
      if (Math.abs(k.cx - cx) >= 24) continue;
      if (Math.abs(k.width - c.width) < 0.08 * k.width) { twin = true; break; }
      near++;
    }
    if (twin || near >= 2) continue;
    c.cx = cx;
    picked.push(c);
  }

  const S = sweepScratch;
  const midRadii = S.midRadii, proj = S.proj, pairX = S.pairX, pairK = S.pairK;
  const seedX = S.seedX, seedK = S.seedK, mob = S.mob, mobR = S.mobR;
  const binUsed = S.used, binD = S.d, binScore = S.score, binRMSE = S.rmse;
  const binPairs = S.pairs, binRings = S.rings, binP = S.p, binQ = S.q, binR = S.r, binS = S.s;
  const nBins = S.nBins;
  // The d-sweep, on preallocated scratch. Semantics are unchanged from the
  // straightforward version: same offsets, same three mid-pair radii, same gates,
  // same best-per-1-unit-d-bin. What is gone is the allocation -- a template array,
  // a projection array, one object per matched ring and one per bin, all minted
  // ~85k times a frame. That churn, not the arithmetic, was over half the frame.
  for (const c of picked) {
    const gapPenalty = gapFrac * c.width;
    const scan = sx.subarray(c.i, c.j + 1);
    const M = scan.length;
    const xi = sx[c.i], xa = sx[c.a], xb = sx[c.b], xj = sx[c.j];
    binUsed.fill(0, 0, nBins);
    let anyBin = false;
    for (let di = 0; di < carrierTable.length; di++) {
      const d = di * 0.25;
      const aOut = Math.sqrt(rOut * rOut - d * d);
      const kS = carrierTable[di];
      const N = kS.length;
      dpScratch.ensure((N + 1) * (M + 1), N > M ? N : M);
      const bin = Math.floor(d);
      for (let ri = 0; ri < 3; ri++) {
        const rc = midRadii[ri];
        if (d > rc - 0.5) continue;
        if (crDistance(c.cr, crTable[ri][di]) > dGateTol) continue;
        const aIn = Math.sqrt(rc * rc - d * d);
        seedX[0] = xi; seedK[0] = -aOut;
        seedX[1] = xa; seedK[1] = -aIn;
        seedX[2] = xb; seedK[2] = aIn;
        seedX[3] = xj; seedK[3] = aOut;
        if (!fitMobiusInto(seedX, seedK, 4, mob)) continue;
        const mp = mob.p, mq = mob.q, mr = mob.r, ms = mob.s;
        let ok = true;
        for (let t = 0; t < N; t++) {
          const den = kS[t] * mr - mp;
          if (den > -1e-12 && den < 1e-12) { ok = false; break; }
          const v = (mq - kS[t] * ms) / den;
          if (!isFinite(v)) { ok = false; break; }
          proj[t] = v;
        }
        if (!ok) continue;
        dpAlignFast(proj, N, scan, M, gapPenalty, dpScratch.map);
        let np = 0;
        for (let t = 0; t < N; t++) {
          const s = dpScratch.map[t];
          if (s >= 0) { pairX[np] = scan[s]; pairK[np] = kS[t]; np++; }
        }
        if (np < minPairs) continue;
        if (!fitMobiusInto(pairX, pairK, np, mobR)) continue;
        const rp = mobR.p, rq = mobR.q, rr = mobR.r, rs = mobR.s;
        let ss = 0;
        for (let t = 0; t < np; t++) {
          const den = pairK[t] * rr - rp;
          if (den > -1e-12 && den < 1e-12) { ss = NaN; break; }
          const e = (rq - pairK[t] * rs) / den - pairX[t];
          ss += e * e;
        }
        const xRMSE = Math.sqrt(ss / np);
        if (!(xRMSE <= maxXRMSE)) continue;
        const score = xRMSE * (1 + (2 * (N - np)) / N);
        if (!isFinite(score)) continue;
        if (binUsed[bin] && binScore[bin] <= score) continue;
        binUsed[bin] = 1; anyBin = true;
        binD[bin] = d; binScore[bin] = score; binRMSE[bin] = xRMSE;
        binPairs[bin] = np; binRings[bin] = N;
        binP[bin] = rp; binQ[bin] = rq; binR[bin] = rr; binS[bin] = rs;
      }
    }
    if (!anyBin) continue;
    const dCands = [];
    for (let b = 0; b < nBins; b++) {
      if (!binUsed[b]) continue;
      dCands.push({
        d: binD[b], score: binScore[b], xRMSE: binRMSE[b],
        mobius: { p: binP[b], q: binQ[b], r: binR[b], s: binS[b] },
        pairsUsed: binPairs[b], rings: binRings[b]
      });
    }
    dCands.sort((p, q) => p.score - q.score);
    const best = dCands[0];
    out.push({
      startIndex: c.i,
      endIndex: c.j,
      mobius: best.mobius,
      dCandidates: dCands,
      anchors: [xi, xa, xb, xj],
      d: best.d,
      dSeed: c.dSeed,
      crDist: c.crDist,
      holeFrac: c.holeFrac,
      xRMSE: best.xRMSE,
      score: best.score,
      pairsUsed: best.pairsUsed,
      rings: best.rings,
      footX: xFromK(best.mobius, 0),
      leftX: xi,
      rightX: xj
    });
  }

  // non-maximum suppression by coverage then residual. runPipeline defers this
  // until after decoding (opts.nms === false) so a junk window cannot eclipse a
  // decodable one purely on edge-alignment merit.
  if (opts.nms !== false) {
    out.sort((p, q) => q.pairsUsed - p.pairsUsed || p.score - q.score);
    const accepted = [];
    for (const c of out) {
      const clash = accepted.some(
        (a) => !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) accepted.push(c);
    }
    accepted.windows = out.windows;
    accepted.survived = out.survived;
    return accepted;
  }
  return out;
};
const decodeLandmark = function decodeLandmark(hit, frame, opts = {}) {
  const g = frame.gray;
  const W = frame.w;
  const row = hit.y * W;
  const radialMargin = opts.radialMargin ?? 0.3;

  const sample = (mob, k) => {
    const x = xFromK(mob, k);
    if (!isFinite(x) || x < 0 || x > W - 2) return null;
    const ix = Math.floor(x);
    const f = x - ix;
    return g[row + ix] * (1 - f) + g[row + ix + 1] * f;
  };
  // radius r is crossed at k = ±√(r²−d²); average the two sides when both land
  const both = (mob, d, r) => {
    if (r <= d + radialMargin) return null;
    const k = Math.sqrt(r * r - d * d);
    const a = sample(mob, k);
    const b = sample(mob, -k);
    if (a == null && b == null) return null;
    return a == null ? b : b == null ? a : (a + b) / 2;
  };
  // photometric consistency of a hypothesised (map, offset): a correct pair reads
  // every white reference brighter than every black one
  const refEval = (mob, d, dr) => {
    const ws = LAYOUT.whiteRefs.map((r) => both(mob, d, r + dr)).filter((v) => v != null);
    const bs = LAYOUT.blackRefs.map((r) => both(mob, d, r + dr)).filter((v) => v != null);
    if (ws.length < 2 || bs.length < 2) return null;
    return {
      sep: Math.min(...ws) - Math.max(...bs),
      wSpread: Math.max(...ws) - Math.min(...ws),
      bSpread: Math.max(...bs) - Math.min(...bs),
      wRef: ws.reduce((a, b) => a + b, 0) / ws.length,
      bRef: bs.reduce((a, b) => a + b, 0) / bs.length
    };
  };

  // Each detector hypothesis is decoded IN FULL and judged on its decode margin —
  // the final criterion — rather than on reference separation alone. On crisp
  // marks the references read cleanly even at a wrong offset (thick rings forgive
  // radius error), so separation saturates while the payload bits scramble; the
  // margin collapses exactly when that happens, and it costs only ~30 samples and
  // 16 dot products per hypothesis to measure it directly.
  //
  // ringOffsets can widen the search with δ-ring-shifted rereads of each
  // hypothesis (the quasi-periodic ring lattice makes off-by-one DP locks
  // conceivable). Default is [0]: in testing the shifted rereads never rescued a
  // failing row but did surface coherent wrong-id reads at low margin, so the
  // wider sweep is opt-in.
  const hyps = hit.dCandidates ?? [{ d: hit.d, mobius: hit.mobius }];
  const ringOffsets = opts.ringOffsets ?? [0];
  let best = null;
  for (const h of hyps) {
    for (const dr of ringOffsets) {
      const r = refEval(h.mobius, h.d, dr);
      if (!r) continue;
      const contrast = r.wRef - r.bRef;
      if (contrast < (opts.minContrast ?? 30)) continue;
      // stitched-chimera killer: a window spanning two neighbouring marks reads
      // some references off the background between them, which collapses the
      // worst-case class separation (sep) far below the mean contrast. A true
      // mark keeps sep comparable to contrast even when anti-aliasing smears
      // individual rings — the sep RATIO is the discriminator. The spread gate
      // is deliberately loose (0.75·contrast): a single mis-registered
      // reference inflates spread on an otherwise perfect margin-8 decode, and
      // tightening it was observed to reject exactly those clean reads.
      if (r.sep < (opts.minSepFrac ?? 0.25) * contrast) continue;
      const maxSpread = (opts.maxRefSpread ?? 0.75) * contrast;
      if (r.wSpread > maxSpread || r.bSpread > maxSpread) continue;

      // soft bits: black → −1, white → +1, erasure → 0
      const soft = new Array(8).fill(0);
      for (const c of LAYOUT.cells) {
        const v = both(h.mobius, h.d, c.rm + dr);
        if (v == null) continue;
        const t = (2 * (v - r.bRef)) / (r.wRef - r.bRef) - 1;
        soft[c.i] = Math.max(-1, Math.min(1, t));
      }
      const readable = soft.filter((x) => x !== 0).length;

      // correlation decode over the whole codebook — the only place codebook size enters
      let bestSc = -Infinity, second = -Infinity, bestId = -1;
      for (let id = 0; id < codebook.length; id++) {
        const w = codebook[id];
        let sc = 0;
        for (let i = 0; i < 8; i++) sc += soft[i] * (2 * w[i] - 1);
        if (sc > bestSc) { second = bestSc; bestSc = sc; bestId = id; }
        else if (sc > second) second = sc;
      }
      // ids 0 and 15 are reserved: their payloads are all-black / all-white, which
      // is exactly what a misplaced window over featureless paint reads
      if (bestId === 0 || bestId === 15) continue;
      const margin = bestSc - second;
      if (!best || margin > best.margin || (margin === best.margin && r.sep > best.sep)) {
        best = {
          id: bestId,
          score: bestSc,
          margin,
          readable,
          soft,
          d: h.d,
          ringOffset: dr,
          sep: r.sep,
          mobius: h.mobius,
          wRef: r.wRef,
          bRef: r.bRef
        };
      }
    }
  }
  return best;
};
const edges1Dsub = function edges1Dsub(sig, thr = 6) {
  // Part II's edges1D with parabolic sub-pixel refinement of each gradient peak.
  // Integer edge positions cost ~0.03 of cross ratio at 2px-per-template-unit
  // mark scales — past the CR gate's tolerance — so the quarter-pixel accuracy
  // here is what lets small on-screen marks through detection at all.
  const n = sig.length;
  const d = new Float32Array(n);
  for (let i = 1; i < n; i++) d[i] = sig[i] - sig[i - 1];
  const idx = [];
  for (let i = 2; i < n - 2; i++) {
    const v = d[i];
    if (Math.abs(v) < thr) continue;
    if (
      (v > 0 && d[i] >= d[i - 1] && d[i] >= d[i + 1]) ||
      (v < 0 && d[i] <= d[i - 1] && d[i] <= d[i + 1])
    ) {
      const y1 = Math.abs(d[i - 1]), y2 = Math.abs(d[i]), y3 = Math.abs(d[i + 1]);
      const den = y1 - 2 * y2 + y3;
      const off = Math.abs(den) > 1e-6 ? (0.5 * (y1 - y3)) / den : 0;
      idx.push({ x: i + Math.max(-0.5, Math.min(0.5, off)), s: Math.sign(v) });
    }
  }
  return idx;
};
const rowOf = function rowOf(frame, y) {
  return frame.gray.subarray(y * frame.w, (y + 1) * frame.w);
};
const runPipeline = function runPipeline(frame, opts = {}) {
  const t0 = window.performance.now();
  const mm = opts.minMargin ?? minMargin;
  const minReadable = opts.minReadable ?? 5;
  // callers may re-phase the scan lattice (opts.scanRows): a static scene can be
  // temporally dithered so a mark that straddles one phase's rows badly is caught
  // by the next frame's offset rows
  const rows = opts.scanRows ?? scanRows;
  // opts.collectWindows hands back the pre-decode windows. They are the detector's
  // GEOMETRIC evidence, and geometry survives rows whose payload will not decode,
  // so a caller can use them to find where the marks are before spending any
  // photometry there. Collected here rather than by a second pass because the
  // edges are already extracted at this point.
  const winList = opts.collectWindows ? [] : null;
  const hits = [];
  let rawHits = 0, rejected = 0, windows = 0, survived = 0, edges = 0;
  let msDetect = 0, msDecode = 0;
  for (const y of rows) {
    const tA = window.performance.now();
    const se = edges1Dsub(rowOf(frame, y), opts.edgeThreshold ?? edgeThreshold);
    edges += se.length;
    // decode BEFORE non-maximum suppression: overlapping windows are resolved by
    // who actually reads as a valid codeword, not by edge-alignment score alone
    const dets = detectLandmarkRow(se, { ...opts, nms: false });
    windows += dets.windows;
    survived += dets.survived;
    rawHits += dets.length;
    if (winList)
      for (const d of dets)
        winList.push({
          y,
          cx: (d.leftX + d.rightX) / 2,
          w: d.rightX - d.leftX,
          holeFrac: d.holeFrac
        });
    const tB = window.performance.now();
    msDetect += tB - tA;
    const decoded = [];
    for (const det of dets) {
      const hit = { y, ...det };
      const dec = decodeLandmark(hit, frame, opts);
      if (!dec || dec.margin < mm || dec.readable < minReadable) {
        rejected++;
        continue;
      }
      decoded.push({
        ...hit,
        mobius: dec.mobius,
        d: dec.d,
        footX: xFromK(dec.mobius, 0),
        id: dec.id,
        decodeMargin: dec.margin,
        refSep: dec.sep,
        readable: dec.readable,
        soft: dec.soft
      });
    }
    // NMS among decodable hits: strongest decode wins overlaps
    decoded.sort((p, q) => q.decodeMargin - p.decodeMargin || p.xRMSE - q.xRMSE);
    for (const c of decoded) {
      const clash = hits.some(
        (a) => a.y === c.y && !(c.endIndex < a.startIndex || c.startIndex > a.endIndex)
      );
      if (!clash) hits.push(c);
      else rejected++;
    }
    msDecode += window.performance.now() - tB;
  }
  return {
    frame: frame.n,
    hits,
    windowList: winList,
    rawHits,
    rejectedByDecode: rejected,
    windows,
    survived,
    scanEdges: edges,
    rowsTouched: rows.length,
    msDetect,
    msDecode,
    ms: window.performance.now() - t0
  };
};

let FRAME = null;

const template_edges = [-28,-27,-26,-25,-24,-23,-22,-21,-20,-19,-17,-16,-15,-14,-13,-12,-10,-9,-8,-7,-5,5,7,8,9,10,12,13,14,15,16,17,19,20,21,22,23,24,25,26,27,28];
const scanLattice = function scanLattice(height, stride) {
  // calRows fixed to CAL_FRAME; this is the same construction for any height,
  // which a rotated frame needs since a quarter turn swaps the dimensions
  const rows = [];
  for (let y = Math.floor(stride / 2); y < height; y += stride) rows.push(y);
  return rows;
};
const clusterWindows = function clusterWindows(windows, opts = {}) {
  // Where does the row detector keep finding a compact window at a consistent x?
  // That question is pure geometry, so it is still answerable on rows whose
  // payload will not decode -- which is the situation every mark near the scale
  // floor is in. Locating marks this way and only then spending photometry on
  // them is what lets the fine pass be dense without being global.
  const maxHole = opts.maxHole ?? 0.2; // a chimera spans two marks, so it contains background
  const rowGap = opts.rowGap ?? 4;
  const minRows = opts.minRows ?? 2;
  const maxBands = opts.maxBands ?? 12;
  const stride = opts.stride ?? 12;
  const cl = [];
  for (const p of windows) {
    if (!(p.holeFrac <= maxHole)) continue;
    let best = null, bd = Infinity;
    for (const c of cl) {
      const dx = Math.abs(c.cx - p.cx);
      if (dx > 0.5 * p.w) continue;
      if (Math.abs(c.yLast - p.y) > rowGap * stride) continue;
      if (dx < bd) { bd = dx; best = c; }
    }
    if (best) {
      best.n++;
      best.cx = (best.cx * (best.n - 1) + p.cx) / best.n;
      best.yLast = p.y;
      best.y0 = Math.min(best.y0, p.y);
      best.y1 = Math.max(best.y1, p.y);
      best.w = Math.max(best.w, p.w);
    } else cl.push({ cx: p.cx, w: p.w, n: 1, y0: p.y, y1: p.y, yLast: p.y });
  }
  // Ranked and capped, not just filtered. A cluttered scene (or a frame scanned
  // across its texture rather than along it) throws up many weakly supported
  // bands, and an uncapped fine pass would then cost seconds. Bounded worst-case
  // work matters more than the last band.
  return cl
    .filter((c) => c.n >= minRows)
    .sort((a, b) => b.n - a.n || b.w - a.w)
    .slice(0, maxBands);
};
const fuseCluster = function fuseCluster(cluster, opts = {}) {
  const robust = opts.robust ?? true;
  const maxPasses = opts.maxPasses ?? 3;

  // |y_c - y_i| = s * d_i. Commit to a split (which rows are above the centre)
  // and the model is linear: y_i = y_c + sigma_i * s * d_i. There are only n+1
  // splits, so enumerate them exactly instead of searching.
  const fitV = (rows) => {
    const n = rows.length;
    if (n < 3) return null;
    const ys = rows.map((h) => h.y);
    const ds = rows.map((h) => Math.abs(h.d));
    let best = null;
    for (let k = 0; k <= n; k++) {
      // rows [0,k) above the centre (sigma = -1), [k,n) below (sigma = +1)
      let A = 0, B = 0, Y = 0, C = 0;
      for (let i = 0; i < n; i++) {
        const sg = i < k ? -1 : 1;
        A += sg * ds[i];
        B += ds[i] * ds[i];
        Y += ys[i];
        C += sg * ds[i] * ys[i];
      }
      const det = n * B - A * A;
      if (!isFinite(det) || Math.abs(det) < 1e-9) continue;
      const yc = (Y * B - A * C) / det;
      const s = (n * C - A * Y) / det;
      if (!isFinite(yc) || !isFinite(s) || s <= 0) continue;
      // the split has to agree with where the fit actually put the centre
      let consistent = true;
      for (let i = 0; i < n && consistent; i++) {
        if (ys[i] < yc !== i < k) consistent = false;
      }
      if (!consistent) continue;
      let sse = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.abs(yc - ys[i]) - s * ds[i];
        sse += r * r;
      }
      if (!best || sse < best.sse) best = { yc, s, sse, split: k };
    }
    return best;
  };

  const all = cluster.slice().sort((a, b) => a.y - b.y);
  let v = fitV(all);
  if (!v) return null;
  let rows = all;

  // A single row whose offset search landed on the wrong d drags the whole V.
  // Re-select from *all* rows each pass rather than only from the survivors: the
  // first cut is computed against a contaminated fit, so it also rejects good rows
  // that the refit then vindicates.
  if (robust && all.length > 3) {
    for (let pass = 0; pass < maxPasses; pass++) {
      const res = all.map((h) => Math.abs(v.yc - h.y) - v.s * Math.abs(h.d));
      const abs = res.map(Math.abs).sort((a, b) => a - b);
      const med = abs[Math.floor(abs.length / 2)];
      const cut = Math.max(opts.minCut ?? 1.5, (opts.cutFactor ?? 2.5) * med);
      const keep = all.filter((h, i) => Math.abs(res[i]) <= cut);
      if (keep.length < 3) break;
      if (keep.length === rows.length && keep.every((h, i) => h === rows[i]))
        break;
      const v2 = fitV(keep);
      if (!v2) break;
      rows = keep;
      v = v2;
    }
  }

  // x: footX drifts slightly with y under tilt, so fit a line and read it at y_c
  const n = rows.length;
  let sy = 0, sx = 0, syy = 0, sxy = 0;
  for (const h of rows) {
    const t = h.y - v.yc;
    sy += t;
    sx += h.footX;
    syy += t * t;
    sxy += t * h.footX;
  }
  const denom = n * syy - sy * sy;
  let xc, slope;
  if (Math.abs(denom) < 1e-9) {
    xc = sx / n;
    slope = 0;
  } else {
    slope = (n * sxy - sy * sx) / denom;
    xc = (sx - slope * sy) / n;
  }

  let rimR = 0;
  for (const k of template_edges) rimR = Math.max(rimR, Math.abs(k));
  return {
    xc,
    yc: v.yc,
    pxPerTemplateUnit: v.s,
    apparentRadiusY: v.s * rimR,
    xSlope: slope,
    rows: n,
    dropped: all.length - n,
    yResidual: Math.sqrt(v.sse / n),
    yRange: [rows[0].y, rows[n - 1].y]
  };
};
const fuseLandmarks = function fuseLandmarks(hits, opts = {}) {
  const xTol = opts.xTol ?? 0.6;
  const maxRowGap = opts.maxRowGap ?? 3;
  const minRows = opts.minRows ?? 2;
  // cluster: same greedy row-major sweep as Part III, keyed on footX proximity
  // relative to the window's own apparent half-width
  const sorted = hits
    .filter((h) => isFinite(h.footX) && isFinite(h.d))
    .sort((a, b) => a.y - b.y || a.footX - b.footX);
  const clusters = [];
  for (const h of sorted) {
    const span = Math.abs(h.rightX - h.leftX);
    const half = isFinite(span) && span > 1 ? span / 2 : 30;
    let best = null;
    let bestDx = Infinity;
    for (const c of clusters) {
      const last = c[c.length - 1];
      if (h.y - last.y > maxRowGap * rowStride) continue;
      const dx = Math.abs(h.footX - last.footX);
      if (dx > xTol * half) continue;
      if (dx < bestDx) {
        bestDx = dx;
        best = c;
      }
    }
    if (best) best.push(h);
    else clusters.push([h]);
  }
  const fuseOne = (c) => {
    if (c.length < minRows) return null;
    // margin-weighted id vote across the cluster's rows
    const votes = new Map();
    for (const h of c) votes.set(h.id, (votes.get(h.id) ?? 0) + h.decodeMargin);
    const ranked = [...votes.entries()].sort((p, q) => q[1] - p[1]);
    const [id, voteWeight] = ranked[0];
    const voteMargin = voteWeight - (ranked[1]?.[1] ?? 0);
    // geometry from winner rows only: a row that decoded to a losing id got its
    // position from a wrong map, and would drag the centre fit
    const geo = c.filter((h) => h.id === id);
    // the WINNER needs corroboration, not just the cluster: two disagreeing
    // low-margin rows form a 2-row cluster whose "winner" is a coin toss — a
    // wrong-id landmark is worse for navigation than no landmark, so demand
    // minRows rows of the winning id itself
    if (geo.length < minRows) return null;
    const fit = geo.length >= 3 ? fuseCluster(geo) : null;
    let xc, yc;
    if (fit) {
      xc = fit.xc;
      yc = fit.yc;
    } else {
      let w = 0, sx = 0, sy = 0;
      for (const h of geo) {
        w += h.decodeMargin;
        sx += h.decodeMargin * h.footX;
        sy += h.decodeMargin * h.y;
      }
      xc = sx / w;
      yc = sy / w;
    }
    return {
      id,
      xc,
      yc,
      voteWeight: +voteWeight.toFixed(2),
      voteMargin: +voteMargin.toFixed(2),
      rows: c.length,
      geoRows: geo.length,
      vFit: !!fit,
      apparentRadiusY: fit ? fit.apparentRadiusY : null,
      hits: c
    };
  };
  const out = [];
  for (const c of clusters) {
    const f = fuseOne(c);
    if (f) out.push(f);
  }
  // Same mark, two clusters. Decodes through a mark are erratic, so a run of
  // undecodable rows longer than the sweep's maxRowGap can split one physical
  // mark's rows into two clusters — observed once the reflection gate thinned
  // the decoded row set, which emitted the same id twice at the same spot. Two
  // landmarks with the same id whose centres sit within half a mark width ARE
  // one mark; re-fuse their combined rows so the geometry uses all of them.
  // Half a mark width cannot merge two genuinely distinct same-id marks: they
  // would have to physically overlap.
  const widthOf = (f) => {
    const spans = f.hits
      .map((h) => Math.abs(h.rightX - h.leftX))
      .filter((s) => isFinite(s) && s > 1)
      .sort((a, b) => a - b);
    return spans.length ? spans[spans.length >> 1] : 60;
  };
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < out.length; a++) {
      for (let b = a + 1; b < out.length; b++) {
        if (out[a].id !== out[b].id) continue;
        const lim = Math.max(widthOf(out[a]), widthOf(out[b])) / 2;
        if (Math.hypot(out[a].xc - out[b].xc, out[a].yc - out[b].yc) > lim) continue;
        const f = fuseOne(out[a].hits.concat(out[b].hits));
        out.splice(b, 1);
        if (f) out[a] = f;
        else out.splice(a, 1);
        merged = true;
        break outer;
      }
    }
  }
  return out.sort((p, q) => q.voteWeight - p.voteWeight);
};
const analyzeFrame = async function analyzeFrame(frame, opts = {}) {
  // One frame, coarse-to-fine.
  //
  // The old shape was a single uniform lattice, and it topped out at 3-4 of 6
  // marks. The reason was not detection and not the candidate budget (raising
  // maxCands changes nothing): it is that fusion demands two rows of the WINNING
  // id before it will emit a landmark, and a uniform lattice sparse enough to be
  // affordable puts only one decodable row through a mark. Rows through a mark
  // decode erratically -- one row can read the full margin 8 while its immediate
  // neighbours read nothing -- so "enough rows" has to mean many, and paying for
  // many everywhere is what we cannot afford.
  //
  // So: locate geometrically, then decode densely only where a mark actually is.
  // Windows are found on rows that will never decode, which makes them a much
  // better locator than decodes are.
  const coarseStride = opts.coarseStride ?? 16;
  const fineStride = opts.fineStride ?? 6;
  const maxFineRows = opts.maxFineRows ?? 260;
  const chunk = opts.chunk ?? Infinity;
  const breathe = opts.breathe ?? null;
  // Where rows actually get processed. The default runs them here; a worker pool
  // supplies its own and returns the same run records from another thread. This
  // is an injection point rather than a second copy of the routine on purpose --
  // a parallel analyzeFrame would be a fork of the passage below, and the two
  // would drift.
  const runRows =
    opts.runRows ??
    ((f, rows, o) => [runPipeline(f, { ...o, scanRows: rows })]);
  // everything not consumed here is forwarded to the pipeline, so detector
  // options (generator, minMargin, ...) reach it without this cell having to
  // know about each one. runRows and breathe are functions and must NOT be
  // forwarded -- they would be posted to a worker and fail to clone.
  const {
    coarseStride: _a, fineStride: _b, maxFineRows: _c, chunk: _d, breathe: _e,
    maxBands: _f, scanRows: _g, runRows: _h, ...forward
  } = opts;
  const pipeOpts = { minMargin: 4, minReadable: 4, ...forward };
  const merge = (a, b) =>
    !a ? b : {
      ...b,
      hits: a.hits.concat(b.hits),
      windowList: (a.windowList ?? []).concat(b.windowList ?? []),
      rawHits: a.rawHits + b.rawHits,
      rejectedByDecode: a.rejectedByDecode + b.rejectedByDecode,
      windows: a.windows + b.windows,
      survived: a.survived + b.survived,
      scanEdges: a.scanEdges + b.scanEdges,
      rowsTouched: a.rowsTouched + b.rowsTouched,
      msDetect: a.msDetect + b.msDetect,
      msDecode: a.msDecode + b.msDecode,
      ms: a.ms + b.ms
    };
  const sweep = async (list, acc, extra = {}) => {
    let run = acc;
    for (let i = 0; i < list.length; i += chunk) {
      const parts = await runRows(frame, list.slice(i, i + chunk), {
        ...pipeOpts,
        ...extra
      });
      for (const part of parts) run = merge(run, part);
      if (breathe && i + chunk < list.length) await breathe();
    }
    return run;
  };
  const lattice = (from, to, step) => {
    const out = [];
    for (let y = Math.max(0, Math.round(from)); y <= Math.min(frame.h - 1, to); y += step)
      out.push(y);
    return out;
  };

  // pass 1 -- coarse, and harvest the geometry
  const coarseRows = opts.scanRows ?? scanLattice(frame.h, coarseStride);
  let run = await sweep(coarseRows, null, { collectWindows: true });
  const bands = clusterWindows(run.windowList ?? [], {
    stride: coarseStride,
    maxBands: opts.maxBands ?? 12
  });

  // pass 2 -- dense, but only inside a band. Cost tracks the number of marks in
  // view, not the frame area, so an empty scene costs the coarse pass alone.
  const seen = new Set(coarseRows);
  const fine = [];
  for (const b of bands)
    for (const y of lattice(b.y0 - b.w * 0.55, b.y1 + b.w * 0.55, fineStride))
      if (!seen.has(y)) { seen.add(y); fine.push(y); }
  fine.sort((a, b) => a - b);
  const fineRows = fine.slice(0, maxFineRows);
  if (fineRows.length) run = await sweep(fineRows, run);
  let fused = fuseLandmarks(run.hits);

  // pass 3 -- a mark still short of the V-fit's three rows gets its own rescan.
  // Sub-row-stride yc needs the V-fit; without it yc degrades to the centroid of
  // whichever rows fired, measured at 29px rms and a -15px BIAS against loopback
  // truth, versus 1.9px and no bias once the fit engages.
  const weak = fused.filter((f) => f.geoRows < 3);
  let refinedRows = 0;
  if (weak.length) {
    const extra = [];
    for (const f of weak)
      for (const y of lattice(f.yc - fineStride * 3, f.yc + fineStride * 3, 2))
        if (!seen.has(y)) { seen.add(y); extra.push(y); }
    extra.sort((a, b) => a - b);
    refinedRows = extra.length;
    if (extra.length) {
      run = await sweep(extra, run);
      fused = fuseLandmarks(run.hits);
    }
  }
  return { run, fused, bands: bands.length, refinedRows };
};
const rowStride = 12;
export { runPipeline, analyzeFrame, detectLandmarkRow, windowCandidates, edges1Dsub,
         rowOf, decodeLandmark, fuseLandmarks, scanLattice, clusterWindows,
         LAYOUT, crCurve, carrierTemplate, codebook, templateAtOffset, fitMobiusLS,
         dpAlignFast, dpScratch, crossRatio, crDistance, xFromK };
