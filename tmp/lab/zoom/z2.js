/* z2.js — Z2: the lift inside the owner's swipe model (a row of three: the room print · the polaroid pile (2) · the drawing).
   OPEN, one finger (slop 10 pt, then |dy| > 1.4 |dx| = vertical):
     · drag that STARTS ON THE PICTURE  → the picture itself: the pile's front card follows the finger (next) / the previous card comes in
       from the left under it (prev) — at the pile's end (or a pile of one) the whole page follows instead and the release moves on
     · drag that STARTS ON THE WHITE    → the next / previous stack straight away (the page follows the finger)
     · commit: |d| ≥ min(.22 W, 100 pt) or a flick ≥ 300 pt/s, unless flicked back ≥ 150 pt/s (site.html's TOUCH rule)
     · drag down → close (the page follows and shrinks about the finger; past .15 H or a flick ≥ 500 pt/s)
     · tap the left / right border (44 pt band, full height) → the stack on that side; tap the picture's left / right 30 % → the pile's
       previous / next card; tap the white → close (HOME: tap a stack → open)
   OPEN, two fingers on the picture → the LIFT (lift.js), from wherever the picture is (mid-drag included). */
(function () {
'use strict';
const { Sim, IOS7, stepSpring, makeLift, makeRouter, makeHud, clamp, lerp, Q } = Lift;
const PICS = {
  room:    { base: 'img/room-print', ext: 'webp', w: 2018, h: 1083 },
  neo:     { base: 'img/neo-card',   ext: 'webp', w: 1645, h: 2000, alpha: true },
  hand:    { base: 'img/hand-card',  ext: 'webp', w: 1645, h: 2000, alpha: true },
  drawing: { base: 'img/drawing-04', ext: 'jpg',  w: 1346, h: 2000 },
};
const VARS = [1000, 1400, 1800];
const srcset = p => VARS.map(L => `${p.base}-${L}.${p.ext} ${Math.round(p.w * L / Math.max(p.w, p.h))}w`).concat(`${p.base}.${p.ext} ${p.w}w`).join(', ');
const CAPTION = [['NEO', 1], null, ['Design'], ['Head & Body'], ['AI Companion'], null, null, null, ['1X'], null,
                 ['Bernt Børnich'], ['Dar Sleeper'], ['Christoph Kohstall'], ['Eric Jang'], ['Chris Tan'], ['Viktor Dune']];
const TC = { commit: .22, commitMax: 100, flick: .3, back: .15, downD: .15, downV: .5, shrink: .55, sMin: .6, border: 44, pad: 24, rb: .55 };
const NB = 27, TILT = 4 * Math.PI / 180, DEG = Math.PI / 180;

const table = document.getElementById('table');
table.innerHTML = '<div class="cover"></div>';
const STACKS = [
  { id: 'room', pics: [PICS.room], cap: true, homeRot: -1.2 * DEG },
  { id: 'pol', pics: [PICS.neo, PICS.hand], cap: true, homeRot: 0 },
  { id: 'draw', pics: [PICS.drawing], cap: false, homeRot: 1 * DEG },
];
for (const st of STACKS) {
  st.cards = st.pics.map((p, k) => {
    const el = document.createElement('div'); el.className = 'card' + (p.alpha ? ' alpha' : '');
    const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.decoding = 'async';
    el.appendChild(im);
    return { el, im, p, st, k, w: 0, h: 0, seat: { ox: 0, oy: 0, r: 0 }, sv: { x: 0, v: 0, to: 0 },   // sv: the HOME → OPEN fan blend is p; a re-seat after a flip springs sv
             ex: { x: 0, v: 0, to: 0 }, tl: { x: 0, v: 0, to: 0 }, lf: { x: 1, v: 0, to: 1 }, top: false, parked: false };
  });
  for (const c of st.cards.slice().reverse()) table.appendChild(c.el);   // DOM order = the starting depth order (back cards first): software snapshots paint DOM order
  st.order = st.cards.map((c, k) => k); st.at = 0;
}
const cap = document.createElement('div'); cap.className = 'caption';
cap.innerHTML = CAPTION.map(l => !l ? '<div style="height:9px"></div>' : l[1] ? `<div><b>${l[0]}</b></div>` : `<div>${l[0]}</div>`).join('');
cap.style.opacity = '0'; table.appendChild(cap);

/* ---------- layout: every card laid out at its OPEN size (crisp: the camera only ever scales it down) ---------- */
let W = 0, H = 0, isLand = true, capBase = [0, 0], homeS = 1;
function fit(p, bw, bh) { const r = p.w / p.h; return r >= bw / bh ? [bw, bw / r] : [bh * r, bh]; }
function layout() {
  W = innerWidth; H = innerHeight; isLand = W > H;
  const [bw, bh] = isLand ? [.5 * W, .82 * H] : [W - 40, .55 * H];
  for (const st of STACKS) for (const c of st.cards) {
    [c.w, c.h] = fit(c.p, bw, bh);
    c.el.style.width = c.w + 'px'; c.el.style.height = c.h + 'px';
    c.im.sizes = Math.round(c.w) + 'px';
    if (!c.im.getAttribute('srcset')) { c.im.srcset = srcset(c.p); c.im.src = `${c.p.base}.${c.p.ext}`; }
  }
  const maxH = Math.max(...STACKS.map(st => st.cards[0].h));
  homeS = (isLand ? .42 : .26) * H / maxH;
  cap.style.display = isLand ? '' : 'none';
  capBase = [Math.max(20, .06 * W), Math.round(H / 2 - cap.offsetHeight / 2)];
}
layout();
const front = st => st.cards[st.order[0]];
const homeFan = (st, rank) => rank === 0 ? { ox: 0, oy: 0, r: 0 } : (() => {   // HOME: the pile fans (the back card 6° about a low-left pivot); OPEN: exactly behind
  const c = front(st), px = -.15 * c.w, py = .56 * c.h, th = 6 * rank * DEG, vx = -px, vy = -py;
  return { ox: px + Math.cos(th) * vx - Math.sin(th) * vy, oy: py + Math.sin(th) * vx + Math.cos(th) * vy, r: th };
})();

/* ---------- framings: where each stack's item sits (centre, scale, rotation) ---------- */
function framing(j) {
  const cy = isLand ? H / 2 : .42 * H;
  return STACKS.map((st, i) => {
    const c = front(st), ext = c.w / 2 * Math.cos(TILT) + c.h / 2 * Math.sin(TILT);
    if (i === j) return { cx: W / 2, cy, s: 1, r: 0 };
    if (i === j - 1) return { cx: NB - ext, cy, s: 1, r: TILT };
    if (i === j + 1) return { cx: W - NB + ext, cy, s: 1, r: TILT };
    return i < j ? { cx: NB - ext - (j - 1 - i) * W * .7 - 40, cy, s: 1, r: TILT } : { cx: W - NB + ext + (i - j - 1) * W * .7 + 40, cy, s: 1, r: TILT };
  });
}
function homeFraming() {
  const ws = STACKS.map(st => front(st).w * homeS), gap = Math.max(28, .06 * W), tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  let x = W / 2 - tot / 2; const cy = isLand ? .56 * H : .5 * H;
  return STACKS.map((st, i) => { const cx = x + ws[i] / 2; x += ws[i] + gap; return { cx, cy, s: homeS, r: st.homeRot }; });
}
const lerpPose = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), u)), r: lerp(a.r, b.r, u) });

/* ---------- the page state ---------- */
const V = { mode: 'home', j: 1, p: 0, zt: null, mv: null, fl: null };   // mode: home · zoom · open · move  (zt: a zoom tween, mv: a camera move, fl: a flight)
const DR = { dx: 0, dy: 0, ds: 1, px: 0, py: 0, vx: 0, vy: 0, vs: 0, mode: '', k0: null };   // the drag offset over the whole page (mode: hold · spring · decay)
function poses() {
  let P;
  if (V.mode === 'home') P = homeFraming();
  else if (V.mode === 'zoom') { const a = homeFraming(), b = framing(V.j); P = a.map((h, i) => lerpPose(h, b[i], V.p)); }
  else if (V.mode === 'move') { const a = framing(V.mv.from), b = framing(V.mv.to); P = a.map((f, i) => lerpPose(f, b[i], V.mv.u.x)); }
  else P = framing(V.j);
  return P;
}
const drApply = (q) => DR.mode ? { cx: DR.ds * (q.cx - DR.px) + DR.px + DR.dx, cy: DR.ds * (q.cy - DR.py) + DR.py + DR.dy, s: DR.ds * q.s, r: q.r } : q;
const openP = () => V.mode === 'open' ? 1 : V.mode === 'move' ? 1 : V.mode === 'zoom' ? V.p : 0;
function cardSim(c, q, opts = {}) {             // a card's box → screen, from its item pose q (+ its seat, its flight unless opts.rest)
  const st = c.st, rank = st.order.indexOf(c.k), pp = openP();
  const fan = homeFan(st, c.top ? 0 : rank), k = 1 - pp;                     // the HOME fan, folded flat by the zoom
  const ox = fan.ox * k, oy = fan.oy * k, rs = fan.r * k;
  const ex = opts.rest ? 0 : c.ex.x, tl = opts.rest ? 0 : c.tl.x, lf = opts.rest ? 1 : c.lf.x;
  const cs = Math.cos(q.r) * q.s, sn = Math.sin(q.r) * q.s, lx = ox + ex, ly = oy;
  return Sim.box(q.cx + cs * lx - sn * ly, q.cy + sn * lx + cs * ly, c.w, c.h, q.s * lf, q.r + rs + tl);
}
const activeIdx = () => V.mode === 'move' ? V.mv.to : V.j;
function render() {
  const P = poses().map(drApply);
  STACKS.forEach((st, i) => {
    const act = V.mode !== 'home' && (i === V.j || (V.mode === 'move' && (i === V.mv.from || i === V.mv.to)));
    for (const c of st.cards) {
      const rank = st.order.indexOf(c.k), T = cardSim(c, P[i]);
      const z = c.parked ? -2 : (act ? 0 : -.5) + (c.top ? .3 : .2 - .1 * rank);
      c.el.style.transform = `translate3d(${T.x}px,${T.y}px,${z}px) rotate(${T.r}rad) scale(${T.s})`;
    }
  });
  const cq = drApply({ cx: capBase[0], cy: capBase[1], s: 1, r: 0 });          // the caption is on the table: it follows the page's drag (never seen in a move: faded)
  if (!capPinned) cap.style.transform = `translate3d(${cq.cx}px,${cq.cy}px,-.3px) scale(${cq.s})`;
}
let capPinned = false, capT = 0;
function capShow(on, delay = 0) {
  clearTimeout(capT);
  if (!on) { cap.style.transition = 'opacity .15s ease-out'; cap.style.opacity = '0'; capPinned = true; return; }
  capT = setTimeout(() => { capPinned = false; render(); requestAnimationFrame(() => { cap.style.transition = 'opacity .6s ease-in-out'; cap.style.opacity = '1'; }); }, delay);
}

/* ---------- the loop ---------- */
let raf = 0, lastT = 0;
function kick() { if (!raf) raf = requestAnimationFrame(frame); }
function busyAnim() { return !!V.zt || !!V.mv || !!V.fl || (DR.mode === 'spring' || DR.mode === 'decay'); }
function frame(now) {
  raf = 0; const dt = lastT ? Math.min(.05, (now - lastT) / 1000) : 1 / 60; lastT = now;
  if (V.zt) {                                                       // a zoom (iOS 7: in 540 / out 450 ms)
    const u = clamp((now - V.zt.t0) / V.zt.ms, 0, 1); V.p = lerp(V.zt.from, V.zt.to, IOS7(u));
    if (DR.mode === 'decay') { const k = V.p; DR.dx = DR.k0.dx * k; DR.dy = DR.k0.dy * k; DR.ds = 1 + (DR.k0.ds - 1) * k; }
    if (u >= 1) { const z = V.zt; V.zt = null; if (DR.mode === 'decay') drReset(); if (z.to === 1) land(0); else { V.mode = 'home'; } }
  }
  if (V.mv) {                                                       // a camera move: one clock u for every stack, the drag offset decays on it
    stepSpring(V.mv.u, dt, 2 * Math.PI / .5, 1);
    if (V.mv.u.x > 1) { V.mv.u.x = 1; V.mv.u.v = 0; }
    if (DR.mode === 'decay') { const k = 1 - V.mv.u.x; DR.dx = DR.k0.dx * k; DR.dy = DR.k0.dy * k; }
    if (1 - V.mv.u.x < 1e-4 && Math.abs(V.mv.u.v) < .01) { const m = V.mv; V.mv = null; drReset(); V.mode = 'open'; V.j = m.to; land(m.dir); }
  }
  if (DR.mode === 'spring') {
    const w = 2 * Math.PI / .55, a = { x: DR.dx, v: DR.vx, to: 0 }, b = { x: DR.dy, v: DR.vy, to: 0 }, c = { x: DR.ds, v: DR.vs, to: 1 };
    stepSpring(a, dt, w, 1); stepSpring(b, dt, w, 1); stepSpring(c, dt, w, 1);
    DR.dx = a.x; DR.vx = a.v; DR.dy = b.x; DR.vy = b.v; DR.ds = c.x; DR.vs = c.v;
    if (Math.abs(DR.dx) < .2 && Math.abs(DR.dy) < .2 && Math.abs(DR.ds - 1) < 3e-4 && Math.abs(DR.vx) + Math.abs(DR.vy) < 5) drReset();
  }
  if (V.fl) flightStep(dt);
  for (const st of STACKS) for (const c of st.cards) if (c !== V.fl?.c && !(G && G.f && G.f.c === c)) {   // cards springing home (a cancelled flip)
    if (c.ex.x !== 0 || c.tl.x !== 0 || c.lf.x !== 1) { const w = 2 * Math.PI / .38; stepSpring(c.ex, dt, w, .9); stepSpring(c.tl, dt, w, .9); stepSpring(c.lf, dt, w, .9);
      if (Math.abs(c.ex.x) < .05 && Math.abs(c.ex.v) < 2 && Math.abs(c.tl.x) < 1e-4 && Math.abs(c.lf.x - 1) < 1e-4) { c.ex.x = c.ex.v = c.tl.x = c.tl.v = 0; c.lf.x = 1; c.lf.v = 0; } }
  }
  render();
  if (busyAnim() || (G && G.kind) || STACKS.some(st => st.cards.some(c => c.ex.x !== 0 || c.tl.x !== 0 || c.lf.x !== 1))) raf = requestAnimationFrame(frame); else lastT = 0;
}
function drReset() { Object.assign(DR, { dx: 0, dy: 0, ds: 1, vx: 0, vy: 0, vs: 0, mode: '', k0: null }); }
function drSpring(vx = 0, vy = 0) { if (!DR.mode) return; DR.mode = 'spring'; DR.vx = clamp(vx, -3, 3) * 1000; DR.vy = clamp(vy, -3, 3) * 1000; DR.vs = 0; kick(); }
const rubber = (o, dim) => (1 - 1 / (o * TC.rb / Math.max(1, dim) + 1)) * dim;

function land(dir) {                          // OPEN: the zoom / the move landed
  V.mode = 'open'; const st = STACKS[V.j];
  st.at = dir < 0 ? st.cards.length - 1 : 0;                       // arrived from the right: the run ends at the front card (walking back retraces)
  if (st.cap) capShow(true, 1200);
  lift.prefetch(liftTarget());
  kick();
}
function zoom(j, to) {
  if (to === 1) { V.j = j; V.mode = 'zoom'; STACKS[j].at = 0; }
  else capShow(false);
  V.zt = { from: V.p, to, t0: performance.now(), ms: to === 1 ? 540 : 450 };
  kick();
}
function moveTo(dir, v = 0) {                // the camera to the neighbour on that side (v: the finger's speed, px/ms, along the move)
  const b = V.j + dir; if (b < 0 || b >= STACKS.length || V.mode !== 'open') return false;
  const T = Math.abs(framing(V.j)[V.j].cx - framing(b)[V.j].cx), left = Math.max(1, T - Math.abs(DR.dx));
  const u0 = clamp(Math.abs(v) * 1000 / left, 0, 2 * Math.PI / .5);   // the finger's speed as the move's start (≤ ω: never past the seat)
  V.mv = { from: V.j, to: b, dir, u: { x: 0, v: u0, to: 1 } }; V.mode = 'move';
  if (DR.mode) { DR.mode = 'decay'; DR.k0 = { dx: DR.dx, dy: DR.dy, ds: DR.ds }; }
  capShow(false); kick(); return true;
}

/* ---------- the pile: a visit's run (THE KEYS' rule), the finger's flip ---------- */
const canWalk = (st, dir) => st.cards.length > 1 && (dir > 0 ? st.at < st.cards.length - 1 : st.at > 0);
let G = null;                                 // the finger's one-finger drag state (kind: flip · move · end · close)
function flipBegin(st, dir) {
  if (dir > 0) { const c = front(st); return { c, dir, apex: -(c.w * .98 + 18) }; }
  const c = st.cards[st.order[st.order.length - 1]], q = framing(V.j)[V.j];
  c.top = true; const x0 = -(q.cx + c.w / 2 + 8);                   // the previous card: on top, just past the left edge (unseen; exactly behind the front until now)
  c.ex.x = x0; c.ex.v = 0; c.tl.x = -6 * DEG; c.lf.x = 1.03;
  return { c, dir, x0 };
}
function flipMove(f, d) {
  const c = f.c;
  if (f.dir > 0) { let x = Math.min(0, d); if (x < f.apex) x = f.apex - rubber(f.apex - x, W); const q = clamp(x / f.apex, 0, 1); c.ex.x = x; c.tl.x = -6 * DEG * q; c.lf.x = 1 + .03 * q; }
  else { let x = f.x0 + Math.max(0, d); if (x > 0) x = rubber(x, W); const r = 1 - clamp(x / f.x0, 0, 1); c.ex.x = x; c.tl.x = -6 * DEG * (1 - r); c.lf.x = 1 + .03 * (1 - r); }
  c.ex.v = c.tl.v = c.lf.v = 0;
}
function flipEnd(f, commit, v, instant) {    // v: px/ms
  const st = STACKS[V.j], c = f.c;
  if (instant) {                              // under the lift's park: back to rest at once, unseen
    if (f.dir < 0) { st.order = [c.k].concat(st.order.filter(k => k !== c.k)); st.at--; }   // (a pinch on the incoming card takes it: it becomes the front)
    c.top = false; c.ex.x = c.ex.v = c.tl.x = c.tl.v = 0; c.lf.x = 1; c.lf.v = 0; return;
  }
  if (f.dir > 0 && commit) { c.ex.v = Math.min(0, v * 1000); V.fl = { c, phase: 'out', apex: f.apex, st }; st.at++; }
  else if (f.dir < 0 && commit) { st.order = [c.k].concat(st.order.filter(k => k !== c.k)); st.at--; c.ex.v = Math.max(0, v * 1000); V.fl = { c, phase: 'back', st }; }
  else if (f.dir < 0) { c.ex.v = Math.min(0, v * 1000); V.fl = { c, phase: 'away', x0: f.x0, st }; }
  else { c.ex.v = Math.max(0, v * 1000); }    // (the cancelled next springs home in the loop)
  kick();
}
function tapFlip(dir) {                       // a tap on the picture's side: the same flight, from rest
  const st = STACKS[V.j]; if (!canWalk(st, dir) || V.fl) return;
  const f = flipBegin(st, dir);
  if (dir > 0) { V.fl = { c: f.c, phase: 'out', apex: f.apex, st }; st.at++; }
  else { st.order = [f.c.k].concat(st.order.filter(k => k !== f.c.k)); st.at--; f.c.ex.x = -(f.c.w * .98 + 18); V.fl = { c: f.c, phase: 'back', st }; }
  kick();
}
function flightStep(dt) {
  const f = V.fl, c = f.c;
  if (f.phase === 'out') {
    const w = 2 * Math.PI / .24; c.ex.to = f.apex; c.tl.to = -6 * DEG; c.lf.to = 1.03; stepSpring(c.ex, dt, w, 1); stepSpring(c.tl, dt, w, 1); stepSpring(c.lf, dt, w, 1);
    if (Math.abs(c.ex.x - f.apex) < 6) { f.st.order = f.st.order.filter(k => k !== c.k).concat(c.k); f.phase = 'back'; }   // the apex: under the pile (depth), then home
  } else if (f.phase === 'back') {
    const w = 2 * Math.PI / .4; c.ex.to = 0; c.tl.to = 0; c.lf.to = 1; stepSpring(c.ex, dt, w, .86); stepSpring(c.tl, dt, w, .86); stepSpring(c.lf, dt, w, .86);
    if (Math.abs(c.ex.x) < .05 && Math.abs(c.ex.v) < 2 && Math.abs(c.tl.x) < 1e-4) { c.ex.x = c.ex.v = c.tl.x = c.tl.v = 0; c.lf.x = 1; c.lf.v = 0; c.top = false; V.fl = null; lift.prefetch(liftTarget()); }
  } else if (f.phase === 'away') {
    const w = 2 * Math.PI / .3; c.ex.to = f.x0; stepSpring(c.ex, dt, w, 1);
    if (Math.abs(c.ex.x - f.x0) < 2) { c.ex.x = c.ex.v = c.tl.x = c.tl.v = 0; c.lf.x = 1; c.lf.v = 0; c.top = false; V.fl = null; }   // back under the pile, unseen
  }
}

/* ---------- hit tests ---------- */
function picSim(rest) { const st = STACKS[V.j], c = G && G.kind === 'flip' && G.f.dir < 0 ? G.f.c : front(st); const q = drApply(poses()[V.j]); return { c, T: cardSim(c, rest ? framing(V.j)[V.j] : q, { rest }) }; }
const onPic = (x, y, pad = 8) => { if (V.mode !== 'open') return false; const { c, T } = picSim(); return Sim.hit(T, c.w, c.h, x, y, pad); };
const borderSide = x => x <= TC.border && V.j > 0 ? -1 : x >= W - TC.border && V.j < STACKS.length - 1 ? 1 : 0;

/* ---------- the lift ---------- */
function liftTarget() {
  if (V.mode !== 'open') return null;
  const st = STACKS[V.j], prevFlip = G && G.kind === 'flip' && G.f.dir < 0, c = prevFlip ? G.f.c : front(st);
  const q = framing(V.j)[V.j], cur = cardSim(c, drApply(poses()[V.j]));
  const seat = Sim.box(q.cx, q.cy, c.w, c.h, 1, 0);                // its rest: the front seat (a pinched incoming card becomes the front)
  return { seat, cur, w: c.w, h: c.h, src: c.im.currentSrc || c.im.src, hi: `${c.p.base}.${c.p.ext}`, hiW: c.p.w, alpha: c.p.alpha,
           park: on => { c.parked = on; render(); } };
}
const lift = makeLift({ host: document.getElementById('lift'), mode: 'lift', target: liftTarget });

/* ---------- the one-finger gestures ---------- */
const one = {
  down(g) { g.onPic = onPic(g.x0, g.y0); g.border = borderSide(g.x0); },
  lock(g) { G = g; g.kind = ''; g.dir = 0; if (V.mode !== 'open') g.kind = 'none'; },
  move(g) {
    if (g.kind === 'none') return;
    if (g.lock === 'h') {
      const d = g.x - g.lx, dir = d < 0 ? 1 : d > 0 ? -1 : g.dir;
      if (dir !== g.dir) {                                           // the first move past the slop, or back over the lock point
        if (g.kind === 'flip') flipEnd(g.f, false, 0, true);
        if (g.kind === 'move' || g.kind === 'end') drReset();
        g.dir = dir; const st = STACKS[V.j];
        g.kind = !dir ? '' : g.onPic && canWalk(st, dir) && !V.fl ? 'flip' : (V.j + dir >= 0 && V.j + dir < STACKS.length) ? 'move' : 'end';
        if (g.kind === 'flip') g.f = flipBegin(st, dir);
      }
      if (g.kind === 'flip') flipMove(g.f, d);
      else if (g.kind === 'move') { const o = Math.abs(d), h = .5 * W; Object.assign(DR, { mode: 'hold', dx: Math.sign(d) * (o <= h ? o : h + rubber(o - h, W)), dy: 0, ds: 1, px: g.lx, py: g.ly }); }
      else if (g.kind === 'end') Object.assign(DR, { mode: 'hold', dx: Math.sign(d) * rubber(Math.abs(d), W), dy: 0, ds: 1, px: g.lx, py: g.ly });
    } else {
      const dx = g.x - g.lx, dy = g.y - g.ly; g.kind = 'v';
      if (dy >= 0) Object.assign(DR, { mode: 'hold', dx, dy, ds: Math.max(TC.sMin, 1 - TC.shrink * dy / H), px: g.lx, py: g.ly });
      else Object.assign(DR, { mode: 'hold', dx: 0, dy: -rubber(-dy, H), ds: 1, px: g.lx, py: g.ly });
    }
    kick();
  },
  up(g, v, cancel) {
    G = null;
    if (g.kind === 'none' || !g.kind) { kick(); return; }
    if (g.lock === 'h') {
      const d = g.x - g.lx, fd = g.dir > 0 ? -1 : 1, along = v.x * fd, dd = g.x - g.x0;
      const commit = !cancel && along > -TC.back && ((Math.sign(dd) === fd && Math.abs(dd) >= Math.min(TC.commit * W, TC.commitMax)) || along >= TC.flick);
      if (g.kind === 'flip') flipEnd(g.f, commit, v.x);
      else if (g.kind === 'move' && commit) { if (!moveTo(g.dir, v.x)) drSpring(v.x, 0); }
      else drSpring(g.kind === 'end' ? 0 : v.x, 0);
    } else {
      const dy = g.y - g.ly;
      if (!cancel && dy > 0 && (v.y >= TC.downV || (dy >= TC.downD * H && v.y > -TC.back))) { DR.mode = 'decay'; DR.k0 = { dx: DR.dx, dy: DR.dy, ds: DR.ds }; V.mode = 'zoom'; V.p = 1; zoom(V.j, 0); }
      else drSpring(v.x, dy > 0 ? v.y : 0);
    }
    kick();
  },
  cancel(g, forLift) {                       // a second finger: the drag lets go (forLift: its picture is under the lift's park)
    G = null;
    if (g.kind === 'flip') flipEnd(g.f, false, 0, forLift);
    else if (DR.mode === 'hold') drSpring(0, 0);
    kick();
  },
};
makeRouter({
  lift, one,
  busy: () => V.mode === 'zoom' || V.mode === 'move' || !!V.fl || DR.mode === 'spring' || DR.mode === 'decay',
  liftAt: (x, y, g) => V.mode === 'open' && !V.mv && !V.fl && (g ? !!g.onPic : onPic(x, y, TC.pad)),
  tap(x, y) {
    if (V.mode === 'home') {
      const P = homeFraming();
      for (let i = 0; i < STACKS.length; i++) { const c = front(STACKS[i]); if (Sim.hit(cardSim(c, P[i]), c.w, c.h, x, y, 10)) { zoom(i, 1); return; } }
      return;
    }
    if (V.mode !== 'open') return;
    const b = borderSide(x); if (b) { moveTo(b); return; }
    if (onPic(x, y, 0)) {
      const { c, T } = picSim(), [lx] = Sim.apply(Sim.inv(T), x, y), f = lx / c.w;
      if (f < .3) tapFlip(-1); else if (f > .7) tapFlip(1);
      return;
    }
    zoom(V.j, 0);                             // the white: close
  },
});
makeHud(document.getElementById('hud'), 'Z2', lift, () => `  ${V.mode} ${STACKS[V.mode === 'move' ? V.mv.to : V.j].id}${STACKS[V.j].cards.length > 1 ? ' ' + (STACKS[V.j].at + 1) + '/' + STACKS[V.j].cards.length : ''}`);

/* start OPEN on the polaroids (?start=0|1|2, ?home=1 starts at HOME) */
const s0 = clamp(parseInt(Q.get('start') ?? '1', 10) || 0, 0, 2);
V.j = s0;
if (Q.get('home') === '1') { V.mode = 'home'; V.p = 0; } else { V.mode = 'open'; V.p = 1; land(0); }
render();
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { lift.abort(); layout(); render(); }, 60); });
window.__lab = { lift, V, DR, STACKS, framing, Sim, liftTarget, get G() { return G; }, W: () => W, H: () => H, front, cardSim, poses };
})();
