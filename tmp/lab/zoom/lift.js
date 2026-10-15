/* lift.js — the pinch LIFT labs' shared engine (fslab/zoom: z1 · z2 · z3). No dependencies.

   THE LIFT (Instagram's feed pinch, the owner's spec): two fingers grab the picture, it comes off the table above everything, follows
   both fingers (the point under the fingers' centroid stays under it, scale = the fingers' distance ratio, the centroid's travel = pan),
   the rest of the page dissolves into the page colour as it grows, and on the last finger's release it springs back onto its seat.
     · one finger lifting mid-pinch keeps the picture held: it pans under the remaining finger (UIPinchGestureRecognizer: the gesture
       ends only "when the user lifts both fingers"); a finger landing again re-bases the pinch (no jump); a third finger is ignored
       until one of the tracked two lifts (PhotoSwipe tracks two, so does UIKit's pinch)
     · scale: soft limits — below 1 and above SMAX a rubber band (log space, slope .5, ≤ ×.85 / ×1.25 more)
     · the return: one spring per channel (centre x, y, scale, rotation), SwiftUI-style response / dampingFraction, critically damped
       by default, seeded with the release velocity (clamped so it never overshoots the seat)
     · a finger landing on the returning picture catches it (interruptible: WWDC18 "Designing Fluid Interfaces")
   THE COPY: the lift moves a COPY in a fixed layer above the table — never the card: the card is PARKED under the table's cover sheet
   (a depth change: Safari keeps its bitmap and decoded image; opacity / visibility would evict them after ~1 s → a re-decode stall on
   the return). The copy = a base <img> of the card's own source at the card's size (the same decoded image: pixel-identical at the
   start) + a HI <img> of the largest file laid out at its native size and scaled down, decoded (img.decode(): natural size, off the
   main thread) at the second finger's landing and faded in by scale once it has painted.
   MODES: 'lift' (springs back) · 'stay' (iOS Photos: stays zoomed, pans, double-tap toggles; z3).
   URL knobs (labs): ?smax ?over ?under ?veil ?resp ?zeta ?twist=1 ?hud=0 */
(function () {
'use strict';
const Q = new URLSearchParams(location.search);
const num = (k, d) => { const v = parseFloat(Q.get(k)); return Number.isFinite(v) ? v : d; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };

/* a similarity transform {s, r, x, y}: p → s·R(r)·p + (x, y) (screen px, r radians, clockwise on screen) */
const Sim = {
  I: () => ({ s: 1, r: 0, x: 0, y: 0 }),
  apply(T, px, py) { const c = Math.cos(T.r) * T.s, n = Math.sin(T.r) * T.s; return [c * px - n * py + T.x, n * px + c * py + T.y]; },
  mul(A, B) { const [x, y] = Sim.apply(A, B.x, B.y); return { s: A.s * B.s, r: A.r + B.r, x, y }; },
  inv(A) { const s = 1 / A.s, r = -A.r, c = Math.cos(r) * s, n = Math.sin(r) * s; return { s, r, x: -(c * A.x - n * A.y), y: -(n * A.x + c * A.y) }; },
  css(T) { const c = Math.cos(T.r) * T.s, n = Math.sin(T.r) * T.s; return `matrix(${c},${n},${-n},${c},${T.x},${T.y})`; },
  /* a box w × h centred at (cx, cy), scale s, rotation r → its top-left-origin map */
  box(cx, cy, w, h, s = 1, r = 0) { const c = Math.cos(r) * s, n = Math.sin(r) * s; return { s, r, x: cx - (c * w / 2 - n * h / 2), y: cy - (n * w / 2 + c * h / 2) }; },
  /* is screen point (x, y) inside the box (w × h) mapped by T, padded by pad px */
  hit(T, w, h, x, y, pad = 0) { const [lx, ly] = Sim.apply(Sim.inv(T), x, y), p = pad / T.s; return lx >= -p && ly >= -p && lx <= w + p && ly <= h + p; },
};

/* iOS 7's app zoom (memory ios7-zoom-timing: cubic-bezier(.37,.14,.32,1), in 540 / out 450 ms) */
function bezier(x1, y1, x2, y2) {
  const B = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (B(t, x1, x2) < x) lo = t; else hi = t; } return B(t, y1, y2); };
}
const IOS7 = bezier(.37, .14, .32, 1);

/* a spring channel {x, v, to}: SwiftUI's response (s) / dampingFraction → ω = 2π / response, c = 2ζω (unit mass) */
function stepSpring(ch, dt, w, z) {
  const n = Math.max(1, Math.ceil(dt / .002)), h = dt / n;
  for (let i = 0; i < n; i++) { const a = -w * w * (ch.x - ch.to) - 2 * z * w * ch.v; ch.v += a * h; ch.x += ch.v * h; }
}

/* ============================================================ the LIFT ============================================================ */
function makeLift(o) {
  const C = {
    mode: o.mode || 'lift',
    smax: num('smax', o.smax ?? 3), over: num('over', 1.25), under: num('under', .85), veilAt: num('veil', o.veilAt ?? 1.6),
    resp: num('resp', o.resp ?? .40), zeta: num('zeta', o.zeta ?? 1),
    twist: Q.has('twist') ? Q.get('twist') !== '0' : !!o.twist, rotOn: 10 * Math.PI / 180, minD: 24, rbk: .5,
  };
  const host = o.host;
  host.innerHTML = '<div class="veil"></div><div class="copy"><div class="sh sh1"></div><div class="sh sh2"></div>' +
    '<img class="base" alt="" draggable="false"><img class="hi" alt="" draggable="false" decoding="async"></div>';
  const veil = host.querySelector('.veil'), copy = host.querySelector('.copy'), sh1 = copy.querySelector('.sh1'), sh2 = copy.querySelector('.sh2'),
        base = copy.querySelector('.base'), hi = copy.querySelector('.hi');
  let state = 'idle';                         // idle · hold (fingers on it) · return (springing home) · settle (stay: springing to a zoomed rest) · zoomed (stay: at rest, zoomed)
  let T = null;                               // the target: { seat: Sim (its box → screen at rest), w, h, src, hi, park(on), alpha }
  let L = Sim.I(), Lr = 0;                    // the lift (a screen similarity over the seat) and its raw (unresisted) log scale
  const P = new Map();                        // the fingers on it: id → {x, y}
  let ids = [];                               // the tracked two (arrival order)
  let B = null;                               // the re-base: { L0, Lr0, C0, d0, a0 } | { L0, Lr0, F0 }
  let rotOn = false, dirty = false, lastMoveT = 0, focal = null;
  const hist = [];                            // [t, cx, cy, s, r] per solve, the last 120 ms
  const ch = { x: { x: 0, v: 0, to: 0 }, y: { x: 0, v: 0, to: 0 }, s: { x: 1, v: 0, to: 1 }, r: { x: 0, v: 0, to: 0 } };
  let spring = { w: 2 * Math.PI / C.resp, z: C.zeta };
  let hiKey = '', hiK = 1, hiReady = false, hiBusy = false, hiShownAt = 0;
  const stats = { frames: 0, moves: 0, t0: 0, fps: 0, pmHz: 0, geMax: null, geD0: null };

  /* the soft scale: raw log scale → shown scale (rubber bands past 1 / SMAX) and back */
  const rb = (x, lim) => lim * (1 - 1 / (1 + C.rbk * x / lim));
  const irb = (y, lim) => { const q = 1 - y / lim; return q <= 1e-6 ? 1e3 : (lim / C.rbk) * (1 / q - 1); };
  function soft(lr) { const M = Math.log(C.smax), oM = Math.log(C.over), oU = Math.log(1 / C.under); return Math.exp(lr > M ? M + rb(lr - M, oM) : lr < 0 ? -rb(-lr, oU) : lr); }
  function unsoft(s) { const M = Math.log(C.smax), oM = Math.log(C.over), oU = Math.log(1 / C.under), l = Math.log(s); return l > M ? M + irb(l - M, oM) : l < 0 ? -irb(-l, oU) : l; }

  const seatC = () => Sim.apply(T.seat, T.w / 2, T.h / 2);       // the seat's centre, screen
  const centreOf = M => Sim.apply(M, ...seatC());                  // where the lift M puts the seat's centre
  function fromCentre(cx, cy, s, r) { const [x0, y0] = seatC(), c = Math.cos(r) * s, n = Math.sin(r) * s; return { s, r, x: cx - (c * x0 - n * y0), y: cy - (n * x0 + c * y0) }; }

  function render() {
    const M = Sim.mul(L, T.seat);
    copy.style.transform = Sim.css(M);
    const s = L.s;
    veil.style.opacity = (smooth((s - 1) / (C.veilAt - 1))).toFixed(4);
    const h = smooth((s - 1) / 1.2);
    sh1.style.opacity = (1 - h).toFixed(3); sh2.style.opacity = h.toFixed(3);
    hi.style.opacity = hiReady ? smooth((s - 1.02) / .2).toFixed(3) : '0';
    o.onRender?.(L, state);
    const probe = window.__liftProbe;                                    // lab tests: every rendered pose with the fingers it was solved from
    if (probe) probe({ t: performance.now(), state, L: { ...L }, M: Sim.mul(L, T.seat), F: ids.map(id => { const f = P.get(id); return f ? [f.x, f.y] : null; }), n: P.size });
  }
  /* the HI source: the largest file, laid out at its native size (÷ dpr) and scaled down to the card — WebKit decodes an image for its
     drawn size (subsampled when smaller: bug 302801), so only a native-size layout keeps its full resolution under the zoom */
  function layoutHi(t) {
    const dpr = devicePixelRatio || 1, nat = t.hiW || hi.naturalWidth || t.w * dpr * C.smax;
    hiK = clamp(nat / (t.w * dpr), 1, C.smax * C.over);
    hi.style.width = t.w * hiK + 'px'; hi.style.height = t.h * hiK + 'px'; hi.style.transform = `scale(${1 / hiK})`;
  }
  function setHi(t) {
    if (!t.hi) { hiKey = ''; hiReady = false; return; }
    if (hiKey !== t.hi) { hiKey = t.hi; hiReady = false; hi.src = t.hi; }
    layoutHi(t);
  }
  function decodeHi() {
    if (hiReady || hiBusy || !hiKey) return;
    hiBusy = true; const key = hiKey, t0 = performance.now();
    (hi.decode ? hi.decode() : Promise.resolve()).then(() => {
      if (key !== hiKey) return;
      if (T) layoutHi(T);
      requestAnimationFrame(() => requestAnimationFrame(() => { if (key === hiKey) { hiReady = true; hiShownAt = performance.now() - t0; render(); } }));
    }).catch(() => {}).finally(() => { hiBusy = false; });
  }

  function rebase() {
    if (ids.length >= 2) {
      const a = P.get(ids[0]), b = P.get(ids[1]);
      B = { L0: { ...L }, Lr0: Lr, C0: [(a.x + b.x) / 2, (a.y + b.y) / 2], d0: Math.max(C.minD, Math.hypot(b.x - a.x, b.y - a.y)), a0: Math.atan2(b.y - a.y, b.x - a.x) };
    } else if (ids.length === 1) { const a = P.get(ids[0]); B = { L0: { ...L }, Lr0: Lr, F0: [a.x, a.y] }; }
    else B = null;
  }
  function solve() {
    if (state !== 'hold' || !B) return;
    if (ids.length >= 2 && B.C0) {
      const a = P.get(ids[0]), b = P.get(ids[1]);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.max(C.minD, Math.hypot(b.x - a.x, b.y - a.y));
      Lr = B.Lr0 + Math.log(d / B.d0);
      const s = soft(Lr), sig = s / B.L0.s;
      let phi = 0;
      if (C.twist) {                                                     // rotation: eased in over the first 10° (no unintended tilt in a pure pinch), then 1:1
        const da = wrapA(Math.atan2(b.y - a.y, b.x - a.x) - B.a0);
        if (!rotOn && Math.abs(da) >= C.rotOn) rotOn = true;
        phi = rotOn ? da : da * smooth(Math.abs(da) / C.rotOn);
      }
      const c = Math.cos(phi) * sig, n = Math.sin(phi) * sig, dx = B.L0.x - B.C0[0], dy = B.L0.y - B.C0[1];
      L = { s, r: B.L0.r + phi, x: c * dx - n * dy + cx, y: n * dx + c * dy + cy };   // T(C) · S(σ) · R(φ) · T(−C0) · L0: the centroid's point stays under it
      focal = [cx, cy];
    } else if (ids.length === 1 && B.F0) {
      const a = P.get(ids[0]);
      L = { s: B.L0.s, r: B.L0.r, x: B.L0.x + a.x - B.F0[0], y: B.L0.y + a.y - B.F0[1] };
      focal = [a.x, a.y];
    }
    const now = performance.now(), [cx, cy] = centreOf(L);
    hist.push([now, cx, cy, L.s, L.r]); while (hist.length > 2 && now - hist[0][0] > 120) hist.shift();
    render();
  }
  function velocity() {                       // per ms, over the last 100 ms (the site's rule: 0 if the fingers rested > 60 ms)
    const n = hist.length; if (n < 2) return null;
    const b = hist[n - 1]; let a = hist[0]; for (const h of hist) if (b[0] - h[0] <= 100) { a = h; break; }
    const dt = b[0] - a[0]; if (dt <= 0) return null;
    return { x: (b[1] - a[1]) / dt, y: (b[2] - a[2]) / dt, s: (b[3] - a[3]) / dt, r: (b[4] - a[4]) / dt };
  }

  function attach(t, L1) {                    // the copy takes the card's place and look; the card parks under the cover
    T = t;
    copy.style.width = t.w + 'px'; copy.style.height = t.h + 'px';
    copy.classList.toggle('alpha', !!t.alpha);
    if (base.getAttribute('src') !== t.src) base.src = t.src;        // the card's own decoded source, at its own size: the first frame is the card
    setHi(t);
    L = L1 || Sim.I(); Lr = unsoft(L.s); rotOn = false;
    render(); copy.style.opacity = '1'; t.park(true);
  }
  function begin(fingers, opt = {}) {
    if (state === 'idle') {
      const t = o.target(opt); if (!t) return false;
      attach(t, Sim.mul(t.cur || t.seat, Sim.inv(t.seat)));          // its pose now, over its seat (a drag may have moved it)
      opt.before?.();                                                    // the page's drag lets go under the copy (its picture is parked: unseen)
    } else Lr = unsoft(L.s);                                            // a catch (the return / the stay rest): from where it is
    state = 'hold'; P.clear(); ids = []; hist.length = 0; stats.geMax = null; stats.geD0 = null;
    for (const f of fingers) { P.set(f.id, { x: f.x, y: f.y }); if (ids.length < 2) ids.push(f.id); }
    rebase(); solve(); decodeHi();
    stats.t0 = performance.now(); stats.frames = 0; stats.moves = 0;
    o.onState?.(state); kick(); return true;
  }
  function addFinger(id, x, y) { if (state !== 'hold') return false; P.set(id, { x, y }); if (ids.length < 2) { solve(); ids.push(id); rebase(); } return true; }
  function moveFinger(id, x, y, t) {
    const f = P.get(id); if (!f) return false;
    f.x = x; f.y = y;
    if (ids.includes(id)) { dirty = true; lastMoveT = t; if (id === ids[0]) stats.moves++; kick(); }
    return true;
  }
  function removeFinger(id, x, y, t, cancel) {
    const f = P.get(id); if (!f) return false;
    if (ids.includes(id) && !cancel) { f.x = x; f.y = y; solve(); }   // its last position first
    P.delete(id);
    const i = ids.indexOf(id);
    if (i >= 0) {
      ids.splice(i, 1);
      for (const k of P.keys()) if (ids.length < 2 && !ids.includes(k)) ids.push(k);   // a waiting third finger takes its place
      if (ids.length && !cancel) rebase();
      else { const v = cancel || t - lastMoveT > 60 ? null : velocity(); P.clear(); ids = []; release(v); }
    }
    return true;
  }
  function seed(c, x, to, v, away) {          // a channel from x toward `to` with velocity v (/s): toward its seat ≤ ω·|d| (no overshoot)
    c.x = x; c.to = to; const d = to - x;
    c.v = v * d > 0 ? Math.sign(v) * Math.min(Math.abs(v), spring.w * Math.abs(d)) : Math.sign(v) * Math.min(Math.abs(v), away);
    if (!Number.isFinite(c.v)) c.v = 0;
  }
  function release(v) {
    B = null;
    const [cx, cy] = centreOf(L), [sx, sy] = seatC();
    L.r = wrapA(L.r);
    let to = { x: sx, y: sy, s: 1, r: 0 };
    spring = { w: 2 * Math.PI / C.resp, z: C.zeta };
    if (C.mode === 'stay') {                                             // iOS Photos: it stays where it is, inside its limits
      let s = clamp(L.s, 1, C.smax), x = cx, y = cy;
      if (v && Math.abs(L.s - s) < 1e-3) { x += v.x * 199; y += v.y * 199; }   // a pan's momentum: UIScrollView-like projection (decel .995 / ms → v · .995 / .005)
      if (focal && s !== L.s) { x = focal[0] + (cx - focal[0]) * s / L.s; y = focal[1] + (cy - focal[1]) * s / L.s; }
      if (s <= 1 + 1e-3) { s = 1; x = sx; y = sy; } else [x, y] = bound(x, y, s);
      to = { x, y, s, r: 0 }; spring = { w: 2 * Math.PI / .55, z: 1 };
    }
    state = to.s === 1 && to.x === sx && to.y === sy ? 'return' : 'settle';
    seed(ch.x, cx, to.x, v ? v.x * 1000 : 0, 1500); seed(ch.y, cy, to.y, v ? v.y * 1000 : 0, 1500);
    seed(ch.s, L.s, to.s, v ? v.s * 1000 : 0, 3); seed(ch.r, L.r, to.r, v ? v.r * 1000 : 0, 3);
    o.onState?.(state); kick();
  }
  function bound(x, y, s) {                   // stay mode: a zoomed picture never shows a gap at a screen edge it overhangs; smaller → centred on its seat
    const W = innerWidth, H = innerHeight, w = T.w * s, h = T.h * s, [sx, sy] = seatC();
    x = w > W ? clamp(x, W - w / 2, w / 2) : sx; y = h > H ? clamp(y, H - h / 2, h / 2) : sy;
    return [x, y];
  }
  function zoomTo(px, py, s1) {               // stay mode: a double tap — to s1 about (px, py), or back to the seat
    if (state === 'hold') return;
    if (state === 'idle') { const t = o.target(); if (!t) return; attach(t); }
    decodeHi();
    const [cx, cy] = centreOf(L), [sx, sy] = seatC();
    let to;
    if (L.s > 1.05 || s1 <= 1) to = { x: sx, y: sy, s: 1 };
    else { const k = s1 / L.s; const [x, y] = bound(px + (cx - px) * k, py + (cy - py) * k, s1); to = { x, y, s: s1 }; }
    spring = { w: 2 * Math.PI / .38, z: 1 };
    seed(ch.x, cx, to.x, 0, 0); seed(ch.y, cy, to.y, 0, 0); seed(ch.s, L.s, to.s, 0, 0); seed(ch.r, L.r, 0, 0, 0);
    state = to.s === 1 ? 'return' : 'settle'; o.onState?.(state); kick();
  }
  function finish() {
    L = Sim.I(); Lr = 0; render();
    T.park(false);                            // the card back to its depth in the same frame the copy goes: nothing moves, nothing re-rasters
    copy.style.opacity = '0'; veil.style.opacity = '0';
    state = 'idle'; o.onState?.(state);
  }
  function abort() { if (state === 'idle') return; P.clear(); ids = []; B = null; finish(); }

  /* the frame loop: while held (a solve per frame from the latest finger positions — pointer events arrive per finger), springing */
  let raf = 0, lastT = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = lastT ? Math.min(.05, (now - lastT) / 1000) : 1 / 60; lastT = now;
    stats.frames++;
    if (state === 'hold') { if (dirty) { dirty = false; solve(); } }
    else if (state === 'return' || state === 'settle') {
      for (const k of ['x', 'y', 's', 'r']) stepSpring(ch[k], dt, spring.w, spring.z);
      L = fromCentre(ch.x.x, ch.y.x, Math.max(.05, ch.s.x), ch.r.x);
      render();
      const done = Math.abs(ch.x.x - ch.x.to) < .05 && Math.abs(ch.y.x - ch.y.to) < .05 && Math.abs(ch.s.x - ch.s.to) < 2e-4 && Math.abs(ch.r.x - ch.r.to) < 2e-4 &&
                   Math.abs(ch.x.v) + Math.abs(ch.y.v) < 2 && Math.abs(ch.s.v) < .01;
      if (done) {
        if (state === 'return') finish();
        else { L = fromCentre(ch.x.to, ch.y.to, ch.s.to, ch.r.to); Lr = unsoft(L.s); render(); state = 'zoomed'; o.onState?.(state); }
      }
    }
    const el = (now - stats.t0) / 1000; if (el > .25) { stats.fps = stats.frames / el; stats.pmHz = stats.moves / el; }
    if (state === 'hold' || state === 'return' || state === 'settle') raf = requestAnimationFrame(frame); else lastT = 0;
  }

  return {
    C, begin, addFinger, moveFinger, removeFinger, abort, zoomTo,
    prefetch(t) { if (t) { setHi(t); } },
    hit(x, y, pad = 0) { return !!T && state !== 'idle' && Sim.hit(Sim.mul(L, T.seat), T.w, T.h, x, y, pad); },
    owns: id => P.has(id),
    get state() { return state; }, get L() { return { ...L }; }, get Lr() { return Lr; }, get target() { return T; },
    get matrix() { return T ? Sim.mul(L, T.seat) : null; }, get fingers() { return ids.length; },
    get hiReady() { return hiReady; }, get hiMs() { return hiShownAt; }, get hiK() { return hiK; }, stats,
    geStart() { if (ids.length >= 2) { const a = P.get(ids[0]), b = P.get(ids[1]); stats.geD0 = Math.hypot(b.x - a.x, b.y - a.y); } },
    geSample(scale) { if (state === 'hold' && ids.length >= 2 && stats.geD0) { const a = P.get(ids[0]), b = P.get(ids[1]), ours = Math.hypot(b.x - a.x, b.y - a.y) / stats.geD0, d = Math.abs(ours - scale); stats.geMax = Math.max(stats.geMax || 0, d); } },
  };
}

/* ============================================================ the RECOGNISER ============================================================
   One owner for every finger (window capture, like site.html's TOUCH block). A page plugs in its one-finger gesture (one: down / lock /
   move / up / cancel), its taps, liftAt(x, y) (does a two-finger touch here grab the picture?) and busy() (a flight: new touches wait).
     1 finger: slop 10 pt → axis lock (|dy| > 1.4 |dx| = vertical) → the page's drag; a tap = up inside the slop
     2nd finger: on the picture (the centroid or the first finger's touch-down, padded) → the page CANCELS its drag (forLift: its
       picture snaps home under the park, unseen) and the LIFT takes both fingers from where they are; elsewhere → both are dead
     the lift holds every finger until the last lifts; a finger on a returning picture catches it */
function makeRouter(o) {
  const lift = o.lift, RC = { slop: 10, bias: 1.4, win: 100, rest: 60, dbl: 300, dblPx: 30 };
  const finger = e => e.pointerType === 'touch' || e.pointerType === 'pen' || (e.pointerType === 'mouse' && (e.type !== 'pointerdown' || e.button === 0));
  const dead = new Set();
  let g = null, lastTap = null, ct = null;    // ct: a one-finger catch of a resting zoomed picture (stay mode) — still a tap if it never moves
  const mine = e => !(e.target && e.target.closest && e.target.closest('#hud'));   // the lab readout keeps its own taps
  function tapAt(x, y, t, gg) {
    if (o.dbltap && lastTap && t - lastTap.t < RC.dbl && Math.hypot(x - lastTap.x, y - lastTap.y) < RC.dblPx) { lastTap = null; o.dbltap(x, y); return; }
    lastTap = { t, x, y };
    o.tap?.(x, y, gg);
  }
  function vel(gg, tUp) { const q = gg.q, a = q[0], b = q[q.length - 1], span = b[0] - a[0]; return span > 0 && tUp - b[0] < RC.rest ? { x: (b[1] - a[1]) / span, y: (b[2] - a[2]) / span } : { x: 0, y: 0 }; }
  function down(e) {
    if (!finger(e) || !mine(e)) return;
    e.stopImmediatePropagation();
    const id = e.pointerId, x = e.clientX, y = e.clientY, t = e.timeStamp;
    if (lift.state === 'hold') { lift.addFinger(id, x, y); return; }
    if (lift.state === 'return' || lift.state === 'settle' || lift.state === 'zoomed') {
      if (lift.state === 'zoomed' || lift.hit(x, y, 24)) {               // a catch
        if (g) { dead.add(g.id); g = null; }
        ct = lift.state === 'zoomed' || lift.state === 'settle' ? { id, x0: x, y0: y, t0: t, moved: false } : null;   // (stay mode: still a tap — a double tap's second)
        lift.begin([{ id, x, y }]); return;
      }
      if (lift.state !== 'zoomed') { dead.add(id); return; }
    }
    if (dead.size) { dead.add(id); return; }
    if (!g) {
      if (o.busy?.()) { dead.add(id); return; }
      g = { id, x0: x, y0: y, x, y, t0: t, q: [[t, x, y]], lock: '', lx: x, ly: y };
      o.one?.down?.(g);
      return;
    }
    const a = { id: g.id, x: g.x, y: g.y }, b = { id, x, y }, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    if (o.liftAt && (o.liftAt(cx, cy) || o.liftAt(g.x0, g.y0, g))) {
      const gg = g; g = null;                                            // the lift reads the picture's pose NOW (mid-drag), then the page lets its drag go
      if (!lift.begin([a, b], { from: gg, before: () => o.one?.cancel?.(gg, true) })) { o.one?.cancel?.(gg, false); dead.add(a.id); dead.add(b.id); }
    } else { o.one?.cancel?.(g, false); dead.add(g.id); dead.add(id); g = null; }
  }
  function move(e) {
    if (!finger(e) || !mine(e)) return;
    e.stopImmediatePropagation();
    const id = e.pointerId, x = e.clientX, y = e.clientY, t = e.timeStamp;
    if (ct && ct.id === id && Math.hypot(x - ct.x0, y - ct.y0) > RC.slop) ct.moved = true;
    if (lift.moveFinger(id, x, y, t)) return;
    if (!g || id !== g.id) return;
    g.x = x; g.y = y; g.q.push([t, x, y]); while (g.q.length > 2 && t - g.q[0][0] > RC.win) g.q.shift();
    if (!g.lock) {
      const dx = x - g.x0, dy = y - g.y0;
      if (Math.hypot(dx, dy) <= RC.slop) return;
      g.lock = Math.abs(dy) > RC.bias * Math.abs(dx) ? 'v' : 'h'; g.lx = x; g.ly = y;   // the dragged thing moves from the lock point: it never jumps the slop
      o.one?.lock?.(g);
    }
    o.one?.move?.(g);
  }
  function up(e, cancel) {
    if (!finger(e) || !mine(e)) return;
    e.stopImmediatePropagation();
    const id = e.pointerId, x = e.clientX, y = e.clientY, t = e.timeStamp;
    if (ct && ct.id !== id && lift.fingers > 1) ct = null;
    if (lift.removeFinger(id, x, y, t, cancel)) {
      if (ct && ct.id === id) { const c = ct; ct = null; if (!c.moved && !cancel && t - c.t0 < 350) tapAt(x, y, t, null); }
      return;
    }
    if (dead.delete(id)) return;
    if (!g || id !== g.id) return;
    const gg = g; g = null;
    if (x !== gg.x || y !== gg.y) { gg.x = x; gg.y = y; gg.q.push([t, x, y]); }
    const v = cancel ? { x: 0, y: 0 } : vel(gg, t);
    if (!gg.lock) { if (!cancel) tapAt(x, y, t, gg); return; }
    o.one?.up?.(gg, v, cancel);
  }
  addEventListener('pointerdown', down, { capture: true });
  addEventListener('pointermove', move, { capture: true, passive: true });
  addEventListener('pointerup', e => up(e, false), { capture: true });
  addEventListener('pointercancel', e => up(e, true), { capture: true });
  addEventListener('click', e => { if (mine(e)) { e.stopImmediatePropagation(); e.preventDefault(); } }, { capture: true });
  addEventListener('contextmenu', e => e.preventDefault());
  /* Safari's GestureEvent: iOS fires it beside the touches — no centroid there (it is a UIEvent: scale + rotation only), so it only
     feeds the lab's cross-check (our scale vs Safari's); prevented as a belt over touch-action: none. On a Mac trackpad (no touches)
     it drives a virtual two-finger pinch about the pointer, as does ctrl + wheel (Chrome, Firefox): a desk preview of the same lift. */
  let mouse = [innerWidth / 2, innerHeight / 2], vp = null;
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mouse = [e.clientX, e.clientY]; }, { passive: true });
  const vBegin = () => { const [x, y] = mouse; if (!o.liftAt?.(x, y) && lift.state !== 'zoomed' && lift.state !== 'settle' && lift.state !== 'return') return false;
    vp = { x, y }; return lift.begin([{ id: 'vA', x: x - 100, y }, { id: 'vB', x: x + 100, y }]); };
  const vMove = s => { if (!vp) return; const t = performance.now(); lift.moveFinger('vA', vp.x - 100 * s, vp.y, t); lift.moveFinger('vB', vp.x + 100 * s, vp.y, t); };
  const vEnd = () => { if (!vp) return; const t = performance.now(); lift.removeFinger('vA', vp.x, vp.y, t + 100, false); lift.removeFinger('vB', vp.x, vp.y, t + 100, false); vp = null; };
  const touching = () => !!g || lift.fingers > 0 && !vp;
  addEventListener('gesturestart', e => { e.preventDefault(); if (!touching() && !vp) vBegin(); else lift.geStart(); }, { passive: false });
  addEventListener('gesturechange', e => { e.preventDefault(); if (vp) vMove(e.scale); else lift.geSample(e.scale); }, { passive: false });
  addEventListener('gestureend', e => { e.preventDefault(); vEnd(); }, { passive: false });
  let wheelS = 1, wheelT = 0;
  addEventListener('wheel', e => {
    if (!e.ctrlKey) return; e.preventDefault();
    if (!vp) { wheelS = 1; if (!vBegin()) return; }
    wheelS *= Math.exp(-e.deltaY / 120); vMove(wheelS);
    clearTimeout(wheelT); wheelT = setTimeout(vEnd, 160);
  }, { passive: false });
  return { get gesture() { return g; }, dead };
}

/* ============================================================ the readout (labs only) ============================================================ */
function makeHud(el, name, lift, extra) {
  if (!el || Q.get('hud') === '0') { if (el) el.remove(); return () => {}; }
  el.innerHTML = '<a href="index.html"></a>';
  const a = el.firstChild;
  a.addEventListener('click', e => { e.preventDefault(); location.replace('index.html'); });   // replace: no back history, so no edge back-swipe on the labs
  let last = '';
  const tick = () => {
    const L = lift.L, st = lift.stats;
    const txt = `${name}  ${L.s.toFixed(2)}×` + (lift.fingers ? `  ${'●'.repeat(lift.fingers)}` : '') +
      (st.fps ? `  ${Math.round(st.fps)}fps ${Math.round(st.pmHz)}pm` : '') + (lift.hiReady ? `  hi ${Math.round(lift.hiMs)}ms` : '') +
      (st.geMax != null ? `  ge±${st.geMax.toFixed(3)}` : '') + (extra ? extra() : '');
    if (txt !== last) { a.textContent = txt; last = txt; }
  };
  setInterval(tick, 100); tick();
  return tick;
}

window.Lift = { Sim, IOS7, bezier, stepSpring, makeLift, makeRouter, makeHud, clamp, smooth, lerp, num, Q };
})();
