/* flip-render.js — a print turned over by a captured hand flip (brew/flipcap): the 2D TRAPEZOID projection.

   The print is a thin slab (1 print-width wide, `aspect` tall, `thick` thick) posed by a rotation R and a centre P over the
   table (units: print widths; x right, y up the screen, z toward the camera; the table = z 0 = the print's mid-plane at
   rest). A pinhole camera at height F looks straight down at the rest centre. Every drawn layer is a flat rectangle in that
   world — the front, the back, the four cut edges, the table shadow — so its screen image is ONE homography of its own CSS
   box, written as matrix3d with the perspective terms in the w row and z passed through (z = the layer's depth nudge only):
   the GPU warps the texture perspective-correctly and the layer stays in the page's flat depth order (no rotateY slicing
   through the site's cover sheet). The homography is built in closed form from the layer's affine map (box px → world),
   never fitted from corners, so an edge-on face is just a zero-width image, never a blow-up.

   At rest (R = I, P = 0) every transform is exactly the flat print's: s = F/(F − 0) = 1, no w terms, shade/sheen 0, edges
   back-facing (hidden), the table shadow = the rest texture on the card box.

   Faces are never hidden with opacity (Safari evicts a layer unseen for ~1–2 s and re-rasters it on return — the flip's
   face swap would hitch): both are painted, the one facing the camera is on top (depth nudge, a free compositor change) and
   the one underneath is inset 1.5 px so its anti-aliased rim never shows through.

   API (window.FlipRender):
     loadTake(json)                              → take (typed arrays; json from brew/flipcap/process.py)
     makeScene(host, cfg)                        → scene; cfg {front:{src,srcset?}, back:{src}, aspect, floor?:{src,fx,fy},
                                                   floorSoft?:{src,fx,fy}, widthPx}
     scene.resize(widthPx)
     scene.draw(state)                           state = pose(take, t, knobs, flip) or FlipRender.REST
     pose(take, t, knobs, {side, from})          → {R, P, face} : take time t (s), side ±1 (+1: the right / top edge lifts
                                                   first), from 'front' | 'back' (which face is up before this flip)
     KNOBS                                       defaults (lens, lift, travel, thick, light, shade, sheen …)
*/
(function (root) {
  'use strict';

  const KNOBS = {
    lens: 8,          // camera height, print widths (lower = a stronger trapezoid; physics couples it to the lift's growth)
    speed: 1,           // playback rate of the captured flip
    smooth: 40,         // ms (Gaussian σ on the turn's angular velocity, zero-phase): hand tremor + sensor noise out, the gesture kept
    wobble: 1,          // the hand's SWAY (everything off the flip axis: the print turning in its own plane, rocking), kept
                        // at its size (designer: "don't rule it out … draw some curve on the input approximating and
                        // smoothing lots of it"); 0 = a pure turn about the flip axis
    wobbleCurve: 4,     // the curve drawn through the sway: control points of a cubic spline, flat at both rests (fewer = smoother)
    hint: 14,           // degrees: hovering an edge plays the take's start up to this turn — it shows the print can be turned
    hintSpeed: 12,      // rad/s: the hover teaser's spring (critically damped; ~.4 s to settle)
    lift: .05,          // × the phone's own lift (retargeted) — designer: "raise lightly", then "lift not so much, more subtle"
    clear: 1,           // share of the lift a turn about its middle needs to clear the table (1 = physical: at 90° the centre
                        // rises half a print width). Below 1 the print dips through the table and the dipped half casts its
                        // shadow toward the light — keep 1; soften the rise with `lens` (a longer lens = less growth)
    travel: .5,         // × the phone's sideways travel (retargeted; it lands in place)
    thick: .5,          // the paper's edge, CSS px — designer: "a picture, so as thin as paper" (a hairline at edge-on)
    az: 135,            // light azimuth, degrees (135 = from the upper left, as the site's shadows)
    el: 68,             // light elevation, degrees (higher = the lifted shadow slides out less)
    ambient: .5,        // the room's fill light (white walls): the share of light that doesn't depend on the face's angle
    shade: .45,         // how much a face darkens as it turns from the light (Lambert, relative to rest)
    lighten: .35,       // how much it brightens turning toward it
    sheen: .55,         // the front's gloss band at the mirror angle (0 = matte)
    gloss: 60,          // Blinn exponent: higher = a tighter, briefer glint
    sheenW: .45,        // the band's width, print widths
    backSheen: .12,     // the back is resin-coated paper: a faint, broad sheen
    edge: 248,          // the cut edge's grey at full light (near the paper's white: an edge, not a board)
    contact: .006,      // print widths: the rest shadow is a CONTACT line — gone once any edge is this far off the table
    sharpTo: .1,        // height (print widths) by which the near-sharp silhouette (σ .01) has become the soft one (σ .03)
    shadowFade: .7,     // print widths of height over which the lifted shadow fades out
    softMax: 1,         // the lifted shadow's strength (its texture: D .12 at the core, the measured warm colour)
    wideAt: .35,        // height (print widths) by which the soft penumbra has become the wide one
  };
  const REST = { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], P: [0, 0, 0], rest: true };

  // ---- quaternions (w, x, y, z) and 3×3 row-major matrices -------------------------------------------------------
  function qmat(q) {
    const w = q[0], x = q[1], y = q[2], z = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
            2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
            2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)];
  }
  function slerp(a, b, u) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    let bb = b;
    if (d < 0) { d = -d; bb = [-b[0], -b[1], -b[2], -b[3]]; }
    let k0, k1;
    if (d > .9995) { k0 = 1 - u; k1 = u; }
    else { const th = Math.acos(d), s = Math.sin(th); k0 = Math.sin((1 - u) * th) / s; k1 = Math.sin(u * th) / s; }
    const q = [k0 * a[0] + k1 * bb[0], k0 * a[1] + k1 * bb[1], k0 * a[2] + k1 * bb[2], k0 * a[3] + k1 * bb[3]];
    const n = Math.hypot(q[0], q[1], q[2], q[3]);
    return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  }
  function mmul(A, B) {
    const C = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return C;
  }
  const mvec = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
                          A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const mT = A => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const smax = (a, b, e) => (a + b + Math.sqrt((a - b) * (a - b) + e * e)) / 2;

  const qm = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
                        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  const qc = a => [a[0], -a[1], -a[2], -a[3]];
  const qn = a => { const n = Math.hypot(a[0], a[1], a[2], a[3]); return [a[0] / n, a[1] / n, a[2] / n, a[3] / n]; };
  function qlog(a) {                                  // → rotation vector (short way)
    const b = a[0] < 0 ? [-a[0], -a[1], -a[2], -a[3]] : a, s = Math.hypot(b[1], b[2], b[3]);
    const k = s < 1e-12 ? 2 : 2 * Math.atan2(s, b[0]) / s;
    return [b[1] * k, b[2] * k, b[3] * k];
  }
  function qexp(v) {
    const th = Math.hypot(v[0], v[1], v[2]), k = th < 1e-12 ? .5 : Math.sin(th / 2) / th;
    return [Math.cos(th / 2), v[0] * k, v[1] * k, v[2] * k];
  }
  /* SMOOTHING (designer 2026-09-29: the raw take "looks like a cheap gyro preview"): the take's world angular-velocity
     increments get a zero-phase Gaussian (σ = ms; zero-padded: the rests continue beyond the ends), re-integrated from the
     start rest; the small end error is spread in proportion to the turn so it lands exactly on the end rest. The travel gets
     the same Gaussian with exact ends. Measured on the first real takes: σ 40 ms removes ~90 % of the > 4 Hz speed wiggle
     (14–17 → ~1.7 °/s rms), jerk ÷ ~100, the turn's shape within 3°, the lift peak within 1 %. */
  const smKey = k => k.smooth + '|' + k.wobble + '|' + k.wobbleCurve;
  function smoothTake(take, kk) {
    const k = typeof kk === 'number' ? Object.assign({}, KNOBS, { smooth: kk }) : Object.assign({}, KNOBS, kk);
    const ms = k.smooth, n = take.n, fps = (n - 1) / take.dur, sig = ms / 1000 * fps;
    take._sm = smKey(k);
    if (!(sig > .3)) { take.q = take.qRaw.slice(); take.p = take.pRaw.slice(); return sway(take, k); }
    const R = Math.ceil(4 * sig), ker = [];
    let ks = 0;
    for (let i = -R; i <= R; i++) { const v = Math.exp(-i * i / (2 * sig * sig)); ker.push(v); ks += v; }
    for (let i = 0; i < ker.length; i++) ker[i] /= ks;
    const Q = i => [take.qRaw[i * 4], take.qRaw[i * 4 + 1], take.qRaw[i * 4 + 2], take.qRaw[i * 4 + 3]];
    const d = [];                                     // world increments q[i+1] q[i]⁻¹
    for (let i = 0; i < n - 1; i++) d.push(qlog(qm(Q(i + 1), qc(Q(i)))));
    const conv = (arr, dim) => arr.map((_, i) => {
      const o = new Array(dim).fill(0);
      for (let j = -R; j <= R; j++) { const k = i + j; if (k < 0 || k >= arr.length) continue; const w = ker[j + R]; for (let c = 0; c < dim; c++) o[c] += w * arr[k][c]; }
      return o;
    });
    const ds = conv(d, 3);
    const out = [Q(0)];
    for (let i = 0; i < ds.length; i++) out.push(qn(qm(qexp(ds[i]), out[i])));
    const err = qlog(qm(Q(n - 1), qc(out[n - 1])));
    const cum = [0];
    for (let i = 0; i < ds.length; i++) cum.push(cum[i] + Math.hypot(ds[i][0], ds[i][1], ds[i][2]));
    const tot = cum[n - 1] || 1, q = new Float64Array(n * 4);
    for (let i = 0; i < n; i++) {
      const u = cum[i] / tot, r = qn(qm(qexp([err[0] * u, err[1] * u, err[2] * u]), out[i]));
      if (i && q[(i - 1) * 4] * r[0] + q[(i - 1) * 4 + 1] * r[1] + q[(i - 1) * 4 + 2] * r[2] + q[(i - 1) * 4 + 3] * r[3] < 0) { r[0] = -r[0]; r[1] = -r[1]; r[2] = -r[2]; r[3] = -r[3]; }
      q.set(r, i * 4);
    }
    const P = []; for (let i = 0; i < n; i++) P.push([take.pRaw[i * 3], take.pRaw[i * 3 + 1], take.pRaw[i * 3 + 2]]);
    const ps = conv(P, 3), p = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      for (let c = 0; c < 3; c++) p[i * 3 + c] = ps[i][c] - ps[0][c] * (1 - u) - ps[n - 1][c] * u;   // exact ends (0 at both)
    }
    take.q = q; take.p = p;
    return sway(take, k);
  }
  /* the SWAY (designer: "the flat image rotating angled right and left … it wobbles cuz my hands are shaky", then "don't
     rule it out … draw some curve on the input approximating and smoothing lots of it"): each frame is split into the turn
     about the flip axis (twist, kept as recorded) and the rest (swing: the print turning in its own plane, rocking),
     q = swing ⊗ twist. A least-squares cubic B-spline with `wobbleCurve` free control points is drawn through the swing's
     rotation vector — its value and slope pinned to 0 at both rests — and replaces it (× `wobble`): the hand's slow lean at
     its real size, none of its shake. take-002 sways up to 5.4° in-plane and 2.4° rocking. */
  function bsplineBasis(m, u) {                         // clamped uniform cubic basis, m + 1 control points, at u ∈ [0, 1]
    const kn = [0, 0, 0, 0];
    for (let i = 1; i < m - 2; i++) kn.push(i / (m - 2));
    kn.push(1, 1, 1, 1);
    const uu = Math.min(u, 1 - 1e-9);
    let N = kn.slice(0, -1).map((_, i) => (uu >= kn[i] && uu < kn[i + 1]) ? 1 : 0);
    for (let p = 1; p <= 3; p++) {
      const M = [];
      for (let i = 0; i < kn.length - p - 1; i++) {
        const a = kn[i + p] - kn[i], b = kn[i + p + 1] - kn[i + 1];
        M.push((a ? (uu - kn[i]) / a * N[i] : 0) + (b ? (kn[i + p + 1] - uu) / b * N[i + 1] : 0));
      }
      N = M;
    }
    return N;                                          // m + 1 values
  }
  function sway(take, k) {
    const a = take.axis === 'x' ? [1, 0, 0] : take.axis === 'y' ? [0, 1, 0] : null;
    if (!a || (k.wobble === 1 && !(k.wobbleCurve > 0))) return take;
    const n = take.n;
    const tw = [], sv = [];
    for (let i = 0; i < n; i++) {
      const q = [take.q[i * 4], take.q[i * 4 + 1], take.q[i * 4 + 2], take.q[i * 4 + 3]];
      const d = q[1] * a[0] + q[2] * a[1] + q[3] * a[2];
      const t = qn([q[0], d * a[0], d * a[1], d * a[2]]);
      tw.push(t); sv.push(qlog(qm(q, qc(t))));
    }
    // the curve: free control points c2 … c(m−2) of an (m + 1)-point clamped spline (c0 = c1 = c(m−1) = cm = 0: flat rests)
    const K = Math.max(1, Math.round(k.wobbleCurve || 4)), m = K + 3;
    const B = [];
    for (let i = 0; i < n; i++) B.push(bsplineBasis(m, i / (n - 1)).slice(2, m - 1));
    const A = Array.from({ length: K }, () => new Array(K).fill(0)), rhs = [0, 1, 2].map(() => new Array(K).fill(0));
    for (let i = 0; i < n; i++) for (let r = 0; r < K; r++) {
      for (let c = 0; c < K; c++) A[r][c] += B[i][r] * B[i][c];
      for (let d = 0; d < 3; d++) rhs[d][r] += B[i][r] * sv[i][d];
    }
    for (let r = 0; r < K; r++) A[r][r] += 1e-9;
    const solve = (M, v) => {                         // Gauss–Jordan, K ≤ ~12
      const X = M.map((row, i) => [...row, v[i]]);
      for (let c = 0; c < K; c++) {
        let p = c; for (let r = c + 1; r < K; r++) if (Math.abs(X[r][c]) > Math.abs(X[p][c])) p = r;
        [X[c], X[p]] = [X[p], X[c]];
        for (let r = 0; r < K; r++) if (r !== c) { const f = X[r][c] / X[c][c]; for (let j = c; j <= K; j++) X[r][j] -= f * X[c][j]; }
      }
      return X.map((row, i) => row[K] / row[i]);
    };
    const C = [0, 1, 2].map(d => solve(A, rhs[d]));
    const sm = B.map(b => [0, 1, 2].map(d => b.reduce((acc, v, j) => acc + v * C[d][j], 0)));
    const q2 = new Float64Array(n * 4);
    for (let i = 0; i < n; i++) {
      const v = [sm[i][0] * k.wobble, sm[i][1] * k.wobble, sm[i][2] * k.wobble];
      let r = qn(qm(qexp(v), tw[i]));
      if (i && q2[(i - 1) * 4] * r[0] + q2[(i - 1) * 4 + 1] * r[1] + q2[(i - 1) * 4 + 2] * r[2] + q2[(i - 1) * 4 + 3] * r[3] < 0) r = [-r[0], -r[1], -r[2], -r[3]];
      q2.set(r, i * 4);
    }
    take.q = q2;
    return take;
  }

  // ---- takes -----------------------------------------------------------------------------------------------------
  function loadTake(j) {
    const n = j.n || j.q.length;
    const q = new Float64Array(n * 4), p = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) {
      let a = j.q[i];
      if (i && q[(i - 1) * 4] * a[0] + q[(i - 1) * 4 + 1] * a[1] + q[(i - 1) * 4 + 2] * a[2] + q[(i - 1) * 4 + 3] * a[3] < 0)
        a = [-a[0], -a[1], -a[2], -a[3]];
      q.set(a, i * 4);
      p.set(j.p[i], i * 3);
    }
    const phone = j.phone || { w: 64.2, h: 131.5, d: 7.65 };
    return { n, dur: j.dur, q, p, qRaw: q.slice(), pRaw: p.slice(), _sm: 0, axis: j.axis || 'y', side: j.side || 1, end: j.end_q || [0, 0, 1, 0],
             E: qmat(j.end_q || [0, 0, 1, 0]), phone, phoneExt: j.phone_ext || null, w: j.w || null, report: j.report || {}, name: j.name || '' };
  }

  function sampleTake(take, t) {
    if (!(t > 0)) return { q: [1, 0, 0, 0], p: [0, 0, 0], u: 0 };
    if (t >= take.dur) return { q: take.end.slice(), p: [0, 0, 0], u: 1 };
    const f = t / take.dur * (take.n - 1), i = Math.min(Math.floor(f), take.n - 2), u = f - i;
    const a = Array.from(take.q.subarray(i * 4, i * 4 + 4)), b = Array.from(take.q.subarray(i * 4 + 4, i * 4 + 8));
    const p0 = take.p.subarray(i * 3, i * 3 + 3), p1 = take.p.subarray(i * 3 + 3, i * 3 + 6);
    return { q: slerp(a, b, u), p: [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u],
             u: t / take.dur };
  }

  /* the print's pose at take time t. flip.side: which edge lifts first (+1: right for a y-flip, top for an x-flip) —
     the take is mirrored when it was captured the other way; flip.from: the face up before it starts.
     geom {aspect, W}: the print's height / width and its on-screen width (px, for the thickness knob). */
  function pose(take, t, k, flip, geom) {
    if (take.qRaw && take._sm !== smKey(k)) smoothTake(take, k);          // (re)smoothed when a knob changes
    const s = sampleTake(take, t), aspect = geom.aspect;
    if (s.u <= 0 || s.u >= 1) {
      const up = (flip.from === 'back') !== (s.u >= 1);
      return { R: up ? take.E.slice() : REST.R.slice(), P: [0, 0, 0], u: s.u, face: up ? 'back' : 'front', rest: true, done: s.u >= 1 };
    }
    let R = qmat(s.q), p = s.p;
    if ((flip.side || 1) !== take.side) {                  // mirror across the flip plane: R → M R M, p → M p
      const m = take.axis === 'x' ? [1, -1, 1] : [-1, 1, 1];
      R = R.map((v, i) => v * m[Math.floor(i / 3)] * m[i % 3]);
      p = [p[0] * m[0], p[1] * m[1], p[2] * m[2]];
    }
    if (flip.from === 'back') R = mmul(R, take.E);         // world-frame motion, composed onto the current rest
    // retarget: the phone's travel (mm) in print widths, scaled by the swept half-extents of the two objects
    const ext = take.phoneExt || [take.phone.w, take.phone.h];   // the phone's extent along the print's x, y (mm)
    const kk = take.axis === 'x' ? aspect / ext[1] : 1 / ext[0];
    const P = [p[0] * kk * k.travel, p[1] * kk * k.travel, p[2] * kk * k.lift];
    // it never goes through the table: the slab's lowest point stays on or above it (smooth max, exact where both are 0)
    const th = k.thick / geom.W;
    let lo = Infinity;
    for (const [u, v] of [[-.5, aspect / 2], [.5, aspect / 2], [.5, -aspect / 2], [-.5, -aspect / 2]])
      lo = Math.min(lo, R[6] * u + R[7] * v);
    const need = Math.max(0, -lo + th / 2 * (Math.abs(R[8]) - 1)) * k.clear;
    const e = .004;
    P[2] = Math.max(0, smax(P[2], need, e) - e / 2);
    return { R, P, u: s.u, face: (flip.from === 'back') ? 'back' : 'front', rest: false, done: false };
  }

  // ---- homographies ------------------------------------------------------------------------------------------------
  /* A: world point of box coords (ex, ey, 1) as a 3×3 row-major matrix (rows X, Y, Z). The camera maps a world point to
     screen px (x right, y down, origin at the rest centre): x = W·X·s, y = −W·Y·s, s = F/(F − Z). Homogeneous rows:
     [W·A_X], [−W·A_Y], [e3 − A_Z/F]. Returned as the CSS matrix3d string (column-major; z passed through + a nudge). */
  function css(A, W, F, dz, off) {
    let a = W * A[0], b = W * A[1], c = W * A[2];
    let d = -W * A[3], e = -W * A[4], f = -W * A[5];
    let g = -A[6] / F, h = -A[7] / F, i = Math.max(1e-3, 1 - A[8] / F);
    a /= i; b /= i; c /= i; d /= i; e /= i; f /= i; g /= i; h /= i;
    if (off) {                                     // + a screen offset (ox, oy): x' = x + ox = (x_h + ox·w) / w
      const ox = off[0], oy = off[1];
      a += ox * g; b += ox * h; c += ox; d += oy * g; e += oy * h; f += oy;
    }
    return 'matrix3d(' + [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, dz || 0, 1].map(n6).join(',') + ')';
  }
  const n6 = v => (Math.abs(v) < 1e-12 ? 0 : +v.toPrecision(12));
  /* the affine map box px → world for a face: body(ex, ey) = B·[ex, ey, 1] (B 3×3: columns d/dex, d/dey, offset), then
     world = R·body + P */
  function faceA(R, P, B) {
    const RB = mmul(R, B);
    return [RB[0], RB[1], RB[2] + P[0], RB[3], RB[4], RB[5] + P[1], RB[6], RB[7], RB[8] + P[2]];
  }

  // ---- the scene -----------------------------------------------------------------------------------------------------
  const CSS_TEXT = `
  .fr-stage { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
  .fr-layer { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
  .fr-face { overflow: hidden; background: #fff; }
  .fr-face img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .fr-tint { position: absolute; inset: 0; will-change: opacity; opacity: 0; pointer-events: none; }
  .fr-sheen { position: absolute; top: -10%; height: 120%; left: 0; will-change: transform, opacity; opacity: 0; pointer-events: none;
              background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.18) 24%, rgba(255,255,255,.62) 42%,
                          rgba(255,255,255,.8) 50%, rgba(255,255,255,.62) 58%, rgba(255,255,255,.18) 76%, rgba(255,255,255,0) 100%); }
  .fr-sheen.h { background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.18) 24%, rgba(255,255,255,.62) 42%,
                rgba(255,255,255,.8) 50%, rgba(255,255,255,.62) 58%, rgba(255,255,255,.18) 76%, rgba(255,255,255,0) 100%); }
  .fr-edge { width: 100px; height: 100px; opacity: 0; will-change: transform, opacity; }
  .fr-floor { pointer-events: none; }
  .fr-floor img { position: absolute; display: block; }
  `;

  function makeScene(host, cfg) {
    if (!document.getElementById('fr-css')) {
      const st = document.createElement('style'); st.id = 'fr-css'; st.textContent = CSS_TEXT; document.head.appendChild(st);
    }
    const stage = document.createElement('div'); stage.className = 'fr-stage'; host.appendChild(stage);
    const mk = (cls, parent) => { const d = document.createElement('div'); d.className = cls; (parent || stage).appendChild(d); return d; };
    const floors = [];                                             // bottom → top: wide, soft, sharp (the lifted silhouette), rim (rest)
    for (const f of [cfg.floorWide, cfg.floorSoft, cfg.floorSharp, cfg.floor]) {
      if (!f) { floors.push(null); continue; }
      const el = mk('fr-layer fr-floor');
      const img = document.createElement('img'); img.src = f.src; img.alt = ''; img.decoding = 'async'; el.appendChild(img);
      floors.push({ el, img, f, o: -1 });
    }
    const faces = {};
    for (const name of ['back', 'front']) {
      const el = mk('fr-layer fr-face fr-' + name);
      const img = document.createElement('img'); img.alt = ''; img.decoding = 'async'; img.draggable = false;
      const c = cfg[name];
      if (c.srcset) img.srcset = c.srcset;
      img.src = c.src;
      el.appendChild(img);
      const tint = mk('fr-tint', el);
      const sheen = mk('fr-sheen', el);
      faces[name] = { el, img, tint, sheen, tf: '', o: -1, so: -1, st: '', tc: '' };
    }
    const edges = [0, 1, 2, 3].map(() => ({ el: mk('fr-layer fr-edge'), tf: '', o: -1, c: '' }));
    const S = { host, stage, faces, edges, floors, cfg, aspect: cfg.aspect, W: cfg.widthPx || 600 };
    applySize(S);
    S.resize = w => { S.W = w; applySize(S); };
    S.draw = (state, k, take) => draw(S, state, k || KNOBS, take);
    S.pose = (take, t, k, flip) => pose(take, t, k || KNOBS, flip || {}, { aspect: S.aspect, W: S.W });
    S.destroy = () => stage.remove();
    return S;
  }

  function applySize(S) {
    const W = S.W, H = W * S.aspect;
    for (const f of Object.values(S.faces)) { f.el.style.width = W + 'px'; f.el.style.height = H + 'px'; }
    for (const fl of S.floors) {
      if (!fl) continue;
      fl.el.style.width = W + 'px'; fl.el.style.height = H + 'px';
      const { fx, fy } = fl.f;
      Object.assign(fl.img.style, { left: -fx * W + 'px', top: -fy * H + 'px', width: W * (1 + 2 * fx) + 'px', height: H * (1 + 2 * fy) + 'px' });
    }
  }

  /* body maps (box px → body point) */
  function frontB(W, a) { return [1 / W, 0, -.5, 0, -1 / W, a / 2, 0, 0, 0]; }
  function backB(W, a, E) { return mmul(mT(E), frontB(W, a)); }     // upright on screen at the take's end pose
  function inset(B, W, a, px) {                                     // shrink about the face centre by px on every side
    const k = 1 - 2 * px / W, ctr = mvec(B, [W / 2, W * a / 2, 1]);
    const C = B.slice();
    for (let r = 0; r < 3; r++) { C[r * 3] *= k; C[r * 3 + 1] *= k; C[r * 3 + 2] = ctr[r] + (B[r * 3 + 2] - ctr[r]) * k; }
    return C;
  }

  function light(k) {
    const az = k.az * Math.PI / 180, el = k.el * Math.PI / 180;
    return [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  }

  function draw(S, st, k, take) {
    const W = S.W, a = S.aspect, F = k.lens;
    const R = st.R, P = st.P, L = light(k);
    const cam = [0, 0, F];
    const E = take ? take.E : [-1, 0, 0, 0, 1, 0, 0, 0, -1];
    const nF = [R[2], R[5], R[8]];                                   // the front's normal (world)
    const toCam = [cam[0] - P[0], cam[1] - P[1], cam[2] - P[2]];
    const frontUp = dot(nF, toCam) > 0;
    const Bf = frontB(W, a), Bb = backB(W, a, E);
    const horiz = !!take && take.axis === 'x';                     // an end-over flip sweeps the glint vertically
    // faces: the one facing the camera on top; the other inset under it
    for (const name of ['front', 'back']) {
      const f = S.faces[name];
      const vis = (name === 'front') === frontUp;
      let B = name === 'front' ? Bf : Bb;
      if (!vis) B = inset(B, W, a, 1.5);
      // depth nudges only where they can't be seen: any z ≠ 0 makes WebKit resample the layer (measured: up to 30 levels on
      // the photo), so at rest the face on top sits at exactly z 0 — the same pixels as a flat 2D placement
      const tf = css(faceA(R, P, B), W, F, vis ? (st.rest ? 0 : .02) : -.02, S.origin);
      if (tf !== f.tf) { f.el.style.transform = tf; f.tf = tf; }
      // shade: Lambert vs rest, on the visible face only (the hidden one keeps its last value — it is covered)
      if (!vis) continue;
      const n = name === 'front' ? nF : [-nF[0], -nF[1], -nF[2]];
      const lam = x => k.ambient + (1 - k.ambient) * Math.max(0, x);
      const m = lam(dot(n, L)) / lam(L[2]);
      let tc, to;
      if (m < 1) { tc = '#000'; to = (1 - m) * k.shade; } else { tc = '#fff'; to = (m - 1) * k.lighten; }
      if (st.rest) to = 0;
      if (tc !== f.tc) { f.tint.style.background = tc; f.tc = tc; }
      if (Math.abs(to - f.o) > .002 || (to === 0 && f.o !== 0)) { f.tint.style.opacity = to.toFixed(4); f.o = to; }
      // sheen: Blinn-Phong along the face's width (at 11 points), above the rest level, as a band
      const gl = name === 'front' ? k.sheen : k.backSheen;
      let so = 0, su = 0;
      if (gl > 0 && !st.rest) {
        const B2 = name === 'front' ? Bf : Bb;
        let best = -1, bi = 0;
        const vals = [];
        for (let j = 0; j <= 10; j++) {
          const ex = horiz ? W / 2 : W * j / 10, ey = horiz ? W * a * j / 10 : W * a / 2;
          const b = mvec(B2, [ex, ey, 1]);
          const X = mvec(R, b); X[0] += P[0]; X[1] += P[1]; X[2] += P[2];
          const V = [cam[0] - X[0], cam[1] - X[1], cam[2] - X[2]], vl = Math.hypot(V[0], V[1], V[2]);
          const Hh = [V[0] / vl + L[0], V[1] / vl + L[1], V[2] / vl + L[2]], hl = Math.hypot(Hh[0], Hh[1], Hh[2]);
          const sp = Math.pow(Math.max(0, dot(n, Hh) / hl), name === 'front' ? k.gloss : k.gloss / 4);
          // the same point at rest (flat, same box position): the level that is already "in" the print
          const Xr = mvec(Bf, [ex, ey, 1]);                        // the same box point on the flat print (either face up)
          const Vr = [cam[0] - Xr[0], cam[1] - Xr[1], cam[2] - Xr[2]], vr = Math.hypot(Vr[0], Vr[1], Vr[2]);
          const Hr = [Vr[0] / vr + L[0], Vr[1] / vr + L[1], Vr[2] / vr + L[2]], hr = Math.hypot(Hr[0], Hr[1], Hr[2]);
          const sr = Math.pow(Math.max(0, Hr[2] / hr), name === 'front' ? k.gloss : k.gloss / 4);
          const v = Math.max(0, sp - sr);
          vals.push(v);
          if (v > best) { best = v; bi = j; }
        }
        // parabolic refinement of the peak between samples
        let jj = bi;
        if (bi > 0 && bi < 10) {
          const y0 = vals[bi - 1], y1 = vals[bi], y2 = vals[bi + 1], den = y0 - 2 * y1 + y2;
          if (den < 0) jj = bi + .5 * (y0 - y2) / den;
        }
        so = Math.min(1, best) * gl;
        su = jj / 10;                                             // 0..1 across the face's box width
      }
      const bw = k.sheenW * W;
      const stf = horiz ? 'translate3d(0,' + (su * W * a - bw / 2).toFixed(2) + 'px,0)'
                        : 'translate3d(' + (su * W - bw / 2).toFixed(2) + 'px,0,0)';
      if (f.bw !== bw || f.hz !== horiz) {
        f.bw = bw; f.hz = horiz;
        f.sheen.classList.toggle('h', horiz);
        Object.assign(f.sheen.style, horiz ? { width: '120%', left: '-10%', top: '0', height: bw + 'px' }
                                           : { width: bw + 'px', left: '0', top: '-10%', height: '120%' });
      }
      if (stf !== f.st) { f.sheen.style.transform = stf; f.st = stf; }
      if (Math.abs(so - f.so) > .002 || (so === 0 && f.so !== 0)) { f.sheen.style.opacity = so.toFixed(4); f.so = so; }
    }
    // the cut edges: thin rectangles through the thickness, lit by Lambert, shown only while they face the camera
    const th = k.thick / W, h2 = th / 2;
    const sides = [
      { n: [1, 0, 0], B: [0, 0, .5, -a / 100, 0, a / 2, 0, -th / 100, h2] },    // right: ex along −y, ey through −z
      { n: [-1, 0, 0], B: [0, 0, -.5, a / 100, 0, -a / 2, 0, -th / 100, h2] },  // left
      { n: [0, 1, 0], B: [1 / 100, 0, -.5, 0, 0, a / 2, 0, -th / 100, h2] },    // top
      { n: [0, -1, 0], B: [-1 / 100, 0, .5, 0, 0, -a / 2, 0, -th / 100, h2] },  // bottom
    ];
    for (let i = 0; i < 4; i++) {
      const e = S.edges[i], sd = sides[i];
      const n = mvec(R, sd.n);
      const mid = mvec(R, [sd.B[2] + sd.B[0] * 50, sd.B[5] + sd.B[3] * 50, 0]);
      const vis = !st.rest && dot(n, [cam[0] - P[0] - mid[0], cam[1] - P[1] - mid[1], cam[2] - P[2] - mid[2]]) > 0;
      const o = vis ? 1 : 0;
      if (vis) {
        const tf = css(faceA(R, P, sd.B), W, F, .03, S.origin);
        if (tf !== e.tf) { e.el.style.transform = tf; e.tf = tf; }
        const m = (k.ambient + (1 - k.ambient) * Math.max(0, dot(n, L))) / (k.ambient + (1 - k.ambient) * L[2]);
        const g = Math.max(0, Math.min(255, Math.round(k.edge * Math.min(1.06, m))));
        const c = 'rgb(' + g + ',' + g + ',' + Math.max(0, g - 4) + ')';
        if (c !== e.c) { e.el.style.background = c; e.c = c; }
      }
      if (o !== e.o) { e.el.style.opacity = o; e.o = o; }
    }
    // the table shadow: the print's silhouette projected along the light onto z = 0, mapped from the card box
    // (the back's map once the light sees the back, so the texture is upright at both rests); contact → soft with height
    const lightSeesFront = dot(nF, L) > 0;
    const Bs = lightSeesFront ? Bf : Bb;
    const A = faceA(R, P, Bs);
    const Sh = [A[0] - L[0] / L[2] * A[6], A[1] - L[0] / L[2] * A[7], A[2] - L[0] / L[2] * A[8],
                A[3] - L[1] / L[2] * A[6], A[4] - L[1] / L[2] * A[7], A[5] - L[1] / L[2] * A[8], 0, 0, 0];
    // the REST shadow is a contact line hugging the print's edge: it never travels with the light (a displaced sharp line
    // reads as a second print edge — designer: "it doubles the picture" just before it settled) — it stays on the print's
    // footprint and is gone once ANY edge is `contact` off the table. The filled silhouette takes over, its penumbra
    // growing with height: sharp (σ .01) → soft (σ .03) by `sharpTo`, soft → wide (σ .09) by `wideAt`.
    const Foot = [A[0], A[1], A[2], A[3], A[4], A[5], 0, 0, 0];
    const hgt = Math.max(0, P[2]);
    let top = -Infinity;
    for (const [u, v] of [[-.5, a / 2], [.5, a / 2], [.5, -a / 2], [-.5, -a / 2]]) top = Math.max(top, R[6] * u + R[7] * v);
    const hTop = Math.max(0, P[2] + top);
    const ss = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    const oRim = st.rest ? 1 : Math.exp(-hTop / k.contact);
    const lifted = st.rest ? 0 : (1 - oRim) * Math.exp(-hgt / k.shadowFade) * k.softMax;
    const mSoft = ss(hgt / k.sharpTo), mWide = ss((hgt - k.sharpTo) / Math.max(1e-6, k.wideAt - k.sharpTo));
    const ops = [lifted * mSoft * mWide, lifted * mSoft * (1 - mWide), lifted * (1 - mSoft), oRim];
    // at rest the three lifted shadows are PARKED: opaque, shrunk to 45 % under the print's middle (covered by it), so Safari
    // keeps their bitmaps — at opacity 0 it would drop them after ~1 s and redraw them in the flip's first frame
    const tuck = [.45 / W, 0, -.225, 0, -.45 / W, .225 * a, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const fl = S.floors[i];
      if (!fl) continue;
      const parked = st.rest && i < 3, rim = i === 3;
      const tfs = css(parked ? tuck : rim ? Foot : Sh, W, F, st.rest ? 0 : -.5 + i * .01, S.origin);   // at rest z 0 (flat pixels), DOM order stacks them
      const o = parked ? 1 : ops[i];
      if (tfs !== fl.tf) { fl.el.style.transform = tfs; fl.tf = tfs; }
      if (Math.abs(o - fl.o) > .002 || (o === 0 && fl.o !== 0) || (o === 1 && fl.o !== 1)) {
        fl.el.style.opacity = o.toFixed(4); fl.o = o;
      }
    }
    S.last = { R, P, frontUp, lightSeesFront };
  }

  /* the projected outline of the print's mid-plane (debug / verification): screen px relative to the rest centre */
  function outline(S, st, k) {
    const W = S.W, a = S.aspect, F = k.lens, out = [];
    for (const [u, v] of [[-.5, a / 2], [.5, a / 2], [.5, -a / 2], [-.5, -a / 2]]) {
      const X = mvec(st.R, [u, v, 0]); X[0] += st.P[0]; X[1] += st.P[1]; X[2] += st.P[2];
      const s = F / (F - X[2]);
      out.push([X[0] * s * W, -X[1] * s * W]);
    }
    return out;
  }

  /* attach to an existing card (the site): cfg {card, img, fcast?, rim?, back:{src,srcset?,sizes?}, floorSoft?, floorWide?,
     W, H}. The card becomes a 3D context (its faces are ordered by depth); its img moves into the front face wrapper (the
     img element itself is kept — the page's loaders hold it); the back face, the edges and the lifted shadows are added. All
     layers use the card's box with the origin at its top-left, so every homography gets the (W/2, H/2) offset. */
  function attach(cfg) {
    if (!document.getElementById('fr-css')) {
      const st = document.createElement('style'); st.id = 'fr-css'; st.textContent = CSS_TEXT + ATTACH_CSS; document.head.appendChild(st);
    }
    const card = cfg.card, mk = (cls, parent, before) => {
      const d = document.createElement('div'); d.className = cls; parent.insertBefore(d, before || null); return d;
    };
    card.classList.add('fr-card');
    const faces = {};
    const frontEl = mk('fr-layer fr-face fr-front fr-in', card, cfg.img);
    frontEl.appendChild(cfg.img);
    const backEl = mk('fr-layer fr-face fr-back fr-in', card, frontEl);
    const bimg = document.createElement('img'); bimg.alt = ''; bimg.decoding = 'async'; bimg.draggable = false;
    if (cfg.back.sizes) bimg.sizes = cfg.back.sizes;
    if (cfg.back.srcset) bimg.srcset = cfg.back.srcset;
    bimg.src = cfg.back.src;
    backEl.appendChild(bimg);
    for (const [name, el, img] of [['back', backEl, bimg], ['front', frontEl, cfg.img]])
      faces[name] = { el, img, tint: mk('fr-tint', el), sheen: mk('fr-sheen', el), tf: '', o: -1, so: -1, st: '', tc: '' };
    const edges = [0, 1, 2, 3].map(() => ({ el: mk('fr-layer fr-edge', card), tf: '', o: -1, c: '' }));
    const floors = [null, null, null, null];
    if (cfg.fcast && cfg.rim) {
      const wrap = (f, img) => {
        const el = mk('fr-layer fr-in fr-sh', cfg.fcast, img || null);
        if (img) el.appendChild(img);
        else { img = document.createElement('img'); img.alt = ''; img.decoding = 'async'; img.draggable = false; img.src = f.src; el.appendChild(img); }
        el.style.setProperty('--fx', f.fx); el.style.setProperty('--fy', f.fy);
        return { el, img, f, o: -1, tf: '', site: true };
      };
      floors[3] = wrap({ fx: +getComputedStyle(cfg.fcast).getPropertyValue('--fx') || 0, fy: +getComputedStyle(cfg.fcast).getPropertyValue('--fy') || 0 }, cfg.rim);
      if (cfg.floorSharp) floors[2] = wrap(cfg.floorSharp);
      if (cfg.floorSoft) floors[1] = wrap(cfg.floorSoft);
      if (cfg.floorWide) floors[0] = wrap(cfg.floorWide);
      let above = floors[3];                             // DOM order bottom → top: wide, soft, sharp, rim
      for (let i = 2; i >= 0; i--) if (floors[i]) { cfg.fcast.insertBefore(floors[i].el, above.el); above = floors[i]; }
    }
    const S = { faces, edges, floors, aspect: cfg.H / cfg.W, W: cfg.W, origin: [cfg.W / 2, cfg.H / 2], attached: true };
    S.resize = (W, H) => {
      S.W = W; S.aspect = H / W; S.origin = [W / 2, H / 2];
      for (const f of Object.values(faces)) { f.el.style.width = W + 'px'; f.el.style.height = H + 'px'; f.tf = ''; }
      for (const e of edges) e.tf = '';
      for (const fl of floors) if (fl) { fl.el.style.width = W + 'px'; fl.el.style.height = H + 'px'; fl.tf = ''; }
    };
    S.resize(cfg.W, cfg.H);
    S.draw = (state, k, take) => draw(S, state, k || KNOBS, take);
    S.pose = (take, t, k, flip) => pose(take, t, k || KNOBS, flip || {}, { aspect: S.aspect, W: S.W });
    S.images = [bimg, ...floors.filter(f => f && !f.site).map(f => f.img)];
    return S;
  }
  const ATTACH_CSS = `
  .card.fr-card { transform-style: preserve-3d; }
  .fr-in { overflow: hidden; }
  .card .fr-face img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: auto; }
  .fr-sh { overflow: visible; }
  .fr-sh img { position: absolute; display: block; left: calc(-100% * var(--fx)); top: calc(-100% * var(--fy));
               width: calc(100% * (1 + 2 * var(--fx))); height: calc(100% * (1 + 2 * var(--fy))); }
  `;

  /* the take time at which the turn first reaches `deg` degrees (the hover teaser's target) */
  function hintTime(take, deg) {                      // (on the take as it is smoothed now)
    const c = Math.cos(deg * Math.PI / 360);
    for (let i = 0; i < take.n; i++) if (Math.abs(take.q[i * 4]) <= c) return i / (take.n - 1) * take.dur;
    return take.dur * .1;
  }
  /* a critically damped spring on the teaser's take time: {t, v, target} advanced by dt seconds at ω */
  function hintStep(h, dt, w) {
    const x = h.t - h.target;
    const a = -w * w * x - 2 * w * h.v;
    h.v += a * dt; h.t += h.v * dt;
    if (Math.abs(h.t - h.target) < 1e-4 && Math.abs(h.v) < 1e-3) { h.t = h.target; h.v = 0; return false; }
    return true;
  }

  /* how high the slab's centre must sit so its lowest point clears the table, for any R (print widths) */
  function clearance(R, aspect, thickW) {
    let lo = Infinity;
    for (const [u, v] of [[-.5, aspect / 2], [.5, aspect / 2], [.5, -aspect / 2], [-.5, -aspect / 2]])
      lo = Math.min(lo, R[6] * u + R[7] * v);
    return Math.max(0, -lo + thickW / 2 * (Math.abs(R[8]) - 1));
  }

  root.FlipRender = { attach, clearance, smoothTake, hintTime, hintStep, KNOBS, REST, loadTake, sampleTake, pose: (take, t, k, flip, geom) => pose(take, t, k || KNOBS, flip || {}, geom),
                      makeScene, outline, qmat, slerp, css, _internals: { frontB, backB, faceA, inset, light } };
})(typeof window !== 'undefined' ? window : globalThis);
