/* pilelab.js — the PILE lab (site.html?pile=1; owner 2026-10-13: "I want ts to be in front, but I need to adjust which ones are shown
   on the back and In what position. make a separate tool where I can adjust and copy values and you apply it to the main"; the same
   day: "and do the same for concept art one, but lemme pick the front one too").

   Loaded by site.html only with ?pile (?pile=drawings / ?pile=digital pick the pile; else the last one used). Two piles: the DRAWINGS and
   the CONCEPT ART. The row comes to rest on the pile, at HOME, as the site shows it. The lab works on the REAL pile through the engine
   (each stack's `lab` hook: its slot table, its deck, its FAN, a held hover), so what it shows is what the site will show:
   - the TRAY: every picture of the pile — the pile first, front first (Front, 2, 3 …), then the ones not in it. A click on one outside
     puts it at the back; drag a thumb to reorder (to the first place = the new front) or out of the pile to take it out; its ×, or ⌫ on
     the selected card, takes it out (two cards at least). MAKE FRONT (F) swaps the selected card with the front one: it takes the front,
     the old front takes its place.
   - on the pile: a click selects a card; drag it to move it, its round knob turns it, its corners size it (⇧: straight / whole steps).
     The front card stays put (the zoom lands on it) and is see-through for the pointer: a press on it takes the card under it. The
     selected card's outline shows where it runs under the cards above; X outlines them all. A click on the other pile switches to it.
   - the fields: X / Y (% of the pile's box = a card's long side), Turn (°, + = clockwise), Size (%) — type, ↑ ↓, or drag the label.
   - Preview (P): the lab steps aside — hover the pile, click it, flip, close: the site as it would be with these values.
   - REST | HOVER (V; owner 2026-10-13: "I need the underpics to move out more not just rotate"): the Hover view holds the pile fully
     hovered; drag a card there to set how far it moves out on hover, its knob how much more it turns (a dashed outline marks its rest
     place). The engine animates rest → hover on its own hover spring (cfg.hover, the HOVER POSE: per slot [dx, dy, drot] at full hover).
   The two piles keep their poses differently, so Copy values speaks each one's language:
   - the drawings: the deck (IMAGES indices, front first) and each slot's nudge [dx, dy, drot, dsize] = the site's DEFAULT_DECK /
     DEFAULT_NUDGE. A nudge is ADDED to its slot's seeded pose, which depends on how many cards the pile holds: the lab solves them for
     the pile as it is. Plus a link that shows them on the plain site (?deck= &front= &nudge=).
   - the concept art: the deck (DIGITAL indices) and its hand-held FAN (DIG_FAN: per slot rot / size / jitter about the pivot, open =
     the hover's further turn, its side following the card's: left cards open left).
   Both carry the hover: [dx, dy, drot] per slot (cfg.hover). Plus the poses in words. Nothing touches the normal page: each pile's state lives in localStorage under ?pile only. */
(() => {
'use strict';
const stacks = window.__stacks || [], row = window.__row;
const PILES = [
  { key: 'drawings', label: 'Drawings', st: stacks.find(s => s.primary), store: 'site.pilelab.v1', thumb: pic => '../assets/drawings/' + pic.id + '-thumb.jpg' },
  { key: 'digital', label: 'Concept art', st: stacks.find(s => s.name === 'digital'), store: 'site.pilelab.v1:digital', thumb: pic => (pic.src || '').replace(/(\.\w+)$/, '-1000$1') },
].filter(p => p.st && p.st.lab);
if (!PILES.length || !row?.RP) return;
const root = document.documentElement, PILE_KEY = 'site.pilelab.pile';
const RANGE = [[-.5, .5], [-.5, .5], [-45, 45], [-.6, .3]];                 // the engine's NUDGE_RANGE (site.html): dx, dy (box), drot (°), dsize — a nudge is clamped there
const KNOB = 26;                                                             // the turn knob: screen px above the selected card's top edge
const FRONT = { x: 0, y: 0, r: 0, s: 1, hx: 0, hy: 0, hr: 0 }, NUL = { x: null, y: null, r: null, s: null, hx: null, hy: null, hr: null };   // NUL: the slot's own pose (its seeded pose / its fan values) and hover
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rd = (v, q = 1e5) => Math.round(v * q) / q;
const clone = o => JSON.parse(JSON.stringify(o));
const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch {} };   // (a synthetic press has no pointer to capture)
const allHome = () => stacks.every(s => s.state === 'home');
function whenHome(f) { (function w() { if (allHome()) f(); else requestAnimationFrame(w); })(); }
const h = (tag, props = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') el.className = v; else if (k in el) el[k] = v; else el.setAttribute(k, v); } for (const c of kids) if (c != null) el.append(c); return el; };

/* ---------- state, per pile: S = { cards: [{ j, x, y, r, s, hx, hy, hr }] } front first — j = its images index; x, y = the card's centre
   from the pile's centre in box units (B, the viewer box = a card's long side at size 1); r degrees (+ clockwise); s size; hx, hy, hr =
   its shift at full hover (box units, degrees). ---------- */
let P = null, mode = 'edit', view = 'rest', drag = null, hovI = -1, xray = false, pend = false, Q = [], keyT = 0;   // view: 'rest' | 'hover' (the pose being edited)
const L = (p = P) => p.st.lab;
const IM = (p = P) => L(p).images;
const nameOf = (j, p = P) => IM(p)[j].id;
const selIdx = () => (P.S && P.selJ != null ? P.S.cards.findIndex(c => c.j === P.selJ) : -1);
function valid(o, D) {
  if (!o || !Array.isArray(o.cards) || o.cards.length < 2) return null;
  const seen = new Set(), num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null), cards = [];
  for (const c of o.cards) {
    const j = Number.isInteger(c?.j) ? c.j : -1;
    if (j < 0 || j >= D || seen.has(j)) return null;
    seen.add(j); cards.push({ j, x: num(c.x), y: num(c.y), r: num(c.r), s: num(c.s), hx: num(c.hx), hy: num(c.hy), hr: num(c.hr) });
  }
  return { cards };
}
const load = p => { try { return valid(JSON.parse(localStorage.getItem(p.store)), IM(p).length); } catch { return null; } };
const save = (p = P) => { try { localStorage.setItem(p.store, JSON.stringify(p.S)); } catch {} };

/* ---------- the engine: read a pile's poses (its slot table) / write the state (the deck, then each slot's nudge or fan values) ---------- */
function readPile(p) {
  const lb = L(p), B = lb.geom.B;
  return p.st.knobs.deck.map((j, i) => { const s = lb.slots[i]; return { j, x: s.dx / B, y: s.dy / B, r: s.rot, s: s.size, hx: i ? s.sx / B : 0, hy: i ? s.sy / B : 0, hr: i ? s.srot : 0 }; });
}
const fanC = (F, t, dy) => {                                  // the engine's fanC: a slot's centre − the front's (box units) before its jitter
  const [p0, p1] = F.pivot, q0 = -p0, q1 = dy - p1, c = Math.cos(t), s = Math.sin(t);
  return [p0 + q0 * c - q1 * s, p1 + q0 * s + q1 * c];
};
function fanFill(F, N) {                                      // every slot < N explicit — the engine's own fallbacks written out
  if (!Array.isArray(F.open)) { const o = F.open || 0; F.open = Array.from({ length: Math.max(N, F.rot.length) }, (_, i) => o * i); }
  F.size = F.size || []; F.jitter = F.jitter || [];
  for (let i = 0; i < N; i++) {
    if (F.rot[i] == null) F.rot[i] = F.rot[F.rot.length - 1] ?? 0;
    if (F.size[i] == null) F.size[i] = 1;
    if (!F.jitter[i]) F.jitter[i] = [0, 0];
    if (F.open[i] == null) F.open[i] = 0;
  }
}
function push(p = P) {                                        // S → the engine
  if (!p.S || mode !== 'edit' || p.st.state !== 'home') return false;
  const lb = L(p), S = p.S, dk = S.cards.map(c => c.j), deck = () => p.st.knobs.deck.join();
  if (deck() !== dk.join()) lb.setDeck(dk);                  // the order rebuilt, the table re-laid (a new length: new seeded poses)
  if (deck() !== dk.join()) return false;
  const B = lb.geom.B, sl = lb.slots, F = lb.fan;
  if (F) {                                                    // the FAN (concept art): rot / size as they are, the jitter puts the centre where it is
    fanFill(F, dk.length);
    S.cards.forEach((c, i) => {
      if (i === 0) { Object.assign(c, FRONT); F.rot[0] = 0; F.size[0] = 1; F.jitter[0] = [0, 0]; F.open[0] = 0; return; }
      if (c.x == null) return;
      const [fx, fy] = fanC(F, c.r * Math.PI / 180, (1 - c.s) / 2);
      F.rot[i] = c.r; F.size[i] = c.s; F.jitter[i] = [c.x - fx, c.y - fy];
      F.open[i] = (Math.abs(c.x) > .004 ? Math.sign(c.x) : Math.sign(c.r)) * p.openMag;   // the hover opens it further out, on its own side
    });
  } else {                                                    // the NUDGE (drawings): the seeded pose of slot i (+ its rest ramp) = its pose − its nudge
    const nd = p.st.knobs.nudge;
    S.cards.forEach((c, i) => {
      if (i === 0) { Object.assign(c, FRONT); nd[0] = [0, 0, 0, 0]; return; }   // the front: what the zoom lands on
      if (c.x == null) { nd[i] = [0, 0, 0, 0]; return; }
      const n = nd[i], s = sl[i], base = [s.dx / B - n[0], s.dy / B - n[1], s.rot - n[2], s.size - (n[3] || 0)];
      nd[i] = [c.x, c.y, c.r, c.s].map((w, k) => clamp(w - base[k], RANGE[k][0], RANGE[k][1]));
    });
  }
  lb.hover = S.cards.some((c, i) => i && c.hx != null) ? S.cards.map((c, i) => (i && c.hx != null ? [c.hx, c.hy, c.hr] : null)) : p.HOV0;   // the HOVER POSE (a card without one: the slot's own)
  lb.arrange();
  readPile(p).forEach((q, i) => {                            // as drawn — a slot's own pose, a clamp; else the asked values stay exact (no drift through push → read)
    const c = S.cards[i];
    if (c.x == null || ['x', 'y', 'r', 's'].some(k => Math.abs(q[k] - c[k]) > 1e-9)) Object.assign(c, { x: q.x, y: q.y, r: q.r, s: q.s });
    if (c.hx == null || ['hx', 'hy', 'hr'].some(k => Math.abs(q[k] - c[k]) > 1e-9)) Object.assign(c, { hx: q.hx, hy: q.hy, hr: q.hr });
  });
  return true;
}
const later = () => { pend = true; };                        // a drag / a key: one push a frame (loop())
function centre(p = P) {                                      // the row at rest with the pile in the middle of the window
  const R = row.RP, e = R.els.find(e => e.el === p.st.wrap); if (!e) return;
  R.S = R.sPrev = Math.round(clamp(e.cx - R.W / 2, 0, R.M)); R.V = 0; R.drive = 'rest';
  row.rowWrite();
}

/* ---------- undo (per pile) ---------- */
function commit() { const s = JSON.stringify(P.S); if (s === P.lastSnap) return; P.hist.push(P.lastSnap); if (P.hist.length > 300) P.hist.shift(); P.redo.length = 0; P.lastSnap = s; save(); renderHud(); }
function restore(s) { P.S = JSON.parse(s); P.lastSnap = s; save(); if (selIdx() < 0) P.selJ = null; push(); renderHud(); }
function flush() { clearTimeout(keyT); commit(); }
function undo() { flush(); const s = P.hist.pop(); if (s) { P.redo.push(P.lastSnap); restore(s); } }
function redoIt() { flush(); const s = P.redo.pop(); if (s) { P.hist.push(P.lastSnap); restore(s); } }
const burst = () => { clearTimeout(keyT); keyT = setTimeout(commit, 400); };   // keys / field steps: one undo step per burst

/* ---------- the pile's edits ---------- */
function select(j) { if (P.selJ !== j) { P.selJ = j; renderHud(); } }
function makeFront(j, quiet) {                                // the card takes the front; the old front takes its place (a swap: nothing else moves)
  const S = P.S, i = S.cards.findIndex(c => c.j === j); if (i < 1) return;
  const old = S.cards[0], c = S.cards[i], at = { x: c.x, y: c.y, r: c.r, s: c.s, hx: c.hx, hy: c.hy, hr: c.hr };
  S.cards[0] = c; S.cards[i] = old; Object.assign(old, at);
  P.selJ = j; push(); commit(); if (!quiet) flashTag(nameOf(j) + ' in front');
}
function addCard(j, at) {
  const S = P.S; if (S.cards.some(c => c.j === j)) return;
  S.cards.push({ j, ...NUL }); P.selJ = j; push();            // at the back first: the new slot's own pose
  if (at === 0) { makeFront(j); return; }                     // … then, to the front, a swap: the old front takes that pose
  if (at != null && at < S.cards.length - 1) { const [c] = S.cards.splice(S.cards.length - 1, 1); S.cards.splice(Math.max(1, at), 0, c); push(); }
  commit();
}
function removeCard(j) {
  const S = P.S, i = S.cards.findIndex(c => c.j === j); if (i < 0) return;
  if (S.cards.length <= 2) { flashTag('Two cards at least'); return; }
  S.cards.splice(i, 1);
  if (i === 0) Object.assign(S.cards[0], FRONT);              // the next one is the front now
  if (P.selJ === j) P.selJ = null;
  push(); commit();
}
function moveCard(j, to) {
  const S = P.S, from = S.cards.findIndex(c => c.j === j); if (from < 0) return;
  to = clamp(to, 0, S.cards.length - 1); if (to === from) return;
  if (to === 0) { makeFront(j); return; }
  const [c] = S.cards.splice(from, 1); S.cards.splice(to, 0, c);
  if (from === 0) Object.assign(c, NUL);                      // the old front dragged back: its new slot's own pose (S.cards[0] is forced to the front's)
  push(); commit();
}

/* ---------- geometry: the pile's frame on screen at HOME and each card's quad (centre, half sizes, angle) ----------
   .item is B × B, anchored at the box's bottom centre, scale 1 / S at HOME; a card sits at (X, Y) from the item's centre (render()'s pose). */
function frame0(p = P) {                                    // + the .hover scale m about its origin (oy below the item's centre): the Hover view holds h = 1
  const g = L(p).geom, r = p.box.getBoundingClientRect(), k = 1 / g.S, he = p.hoverEl;
  const m = parseFloat(/scale\(([-\d.e]+)\)/.exec(he.style.transform || '')?.[1]) || 1;
  const oy = (parseFloat((he.style.transformOrigin || '').split(' ')[1]) || g.B / 2) - g.B / 2;
  return { cx: r.left + r.width / 2, cy: r.bottom - g.B * k / 2, k, b: g.B * k, m, oy };   // b: one box unit in screen px (× m under the hover)
}
function quadOf(i, f) {
  const c = L().cards[P.S.cards[i].j], q = c.pose || { X: 0, Y: 0, R: 0, SC: 1 };
  return { cx: f.cx + f.k * f.m * q.X, cy: f.cy + f.k * (f.oy + f.m * (q.Y - f.oy)), hw: c.w * q.SC * f.k * f.m / 2, hh: c.h * q.SC * f.k * f.m / 2, a: q.R * Math.PI / 180, R: q.R };
}
function restQuad(i, f) {                                     // the Hover view's ghost: where the card rests (no hover, no hover scale)
  const c = L().cards[P.S.cards[i].j], s = P.S.cards[i], B = L().geom.B;
  return { cx: f.cx + f.k * s.x * B, cy: f.cy + f.k * s.y * B, hw: c.w * s.s * f.k / 2, hh: c.h * s.s * f.k / 2, a: s.r * Math.PI / 180, R: s.r };
}
const toScreen = (q, lx, ly) => { const c = Math.cos(q.a), s = Math.sin(q.a); return [q.cx + lx * c - ly * s, q.cy + lx * s + ly * c]; };
const inQuad = (q, x, y) => { const dx = x - q.cx, dy = y - q.cy, c = Math.cos(q.a), s = Math.sin(q.a);
  return Math.abs(dx * c + dy * s) <= q.hw && Math.abs(-dx * s + dy * c) <= q.hh; };
const CORNERS = [['nw', -1, -1], ['ne', 1, -1], ['se', 1, 1], ['sw', -1, 1]];
function handleAt(x, y) {                                     // the selected back card's knob ('rot') or a corner, else null
  const i = selIdx(); if (i < 1 || !Q[i]) return null;
  const q = Q[i], [kx, ky] = toScreen(q, 0, -q.hh - KNOB);
  if (Math.hypot(x - kx, y - ky) <= 11) return 'rot';
  if (view === 'hover') return null;                          // no size on hover
  for (const [k, sx, sy] of CORNERS) { const [hx, hy] = toScreen(q, sx * q.hw, sy * q.hh); if (Math.hypot(x - hx, y - hy) <= 9) return k; }
  return null;
}
function cardAt(x, y, deep) {                                 // the slot a press there takes, −1 = none
  const hits = []; for (let i = 0; i < Q.length; i++) if (Q[i] && inQuad(Q[i], x, y)) hits.push(i);   // top first (slot order = depth)
  if (!hits.length) return -1;
  const back = hits.filter(i => i > 0), si = selIdx();
  if (deep && back.length) return back[(back.indexOf(si) + 1) % back.length];   // ⌥: the next one down at that point
  if (hits[0] > 0) return hits[0];                                                 // a back card seen there
  if (back.includes(si)) return si;                                                // under the front (see-through): the selected one first
  return back.length ? back[0] : 0;                                                // … else the top one under it, else the front itself
}
const otherPileAt = (x, y) => { const w = document.elementFromPoint(x, y)?.closest('.wrap'); return w ? PILES.find(p => p !== P && p.st.wrap === w) || null : null; };

/* ---------- the overlay ---------- */
const ROT_CUR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 14.5a7 7 0 0 1 11.6-7.2M17.5 5v3.2h-3.2" stroke="#fff" stroke-width="4"/><path d="M5.5 14.5a7 7 0 0 1 11.6-7.2M17.5 5v3.2h-3.2" stroke="#000" stroke-width="1.6"/></g></svg>')}") 12 12, crosshair`;
const css = h('style');
css.textContent = `
  .pk-ov { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; overflow: hidden; }
  .pk-ov > * { position: absolute; left: 0; top: 0; display: none; }
  .pk-ov > .on { display: block; }
  .pk-o { box-sizing: border-box; transform-origin: 50% 50%; border-radius: 2px; }
  .pk-o.hov { box-shadow: 0 0 0 1px rgba(0, 122, 255, .55); }
  .pk-o.xr { outline: 1px dashed rgba(0, 122, 255, .55); outline-offset: 0; }
  .pk-o.sel { box-shadow: 0 0 0 1.5px #007AFF; outline: none; }
  .pk-o.front.sel { box-shadow: 0 0 0 1.5px #AEAEB2; }
  .pk-badge { position: absolute; left: -1px; bottom: calc(100% + 5px); padding: 1px 6px; border-radius: 5px; background: #007AFF; color: #fff; white-space: nowrap;
              font: 600 11px/16px -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; font-variant-numeric: tabular-nums; display: none; }
  .pk-o.sel .pk-badge, .pk-o.hov .pk-badge, .pk-o.xr .pk-badge { display: block; }
  .pk-o.xr:not(.sel):not(.hov) .pk-badge { background: rgba(0, 122, 255, .7); }
  .pk-o.front .pk-badge { background: #8E8E93; }
  .pk-h { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; box-sizing: border-box; background: #fff; border: 1.5px solid #007AFF; border-radius: 2px; }
  .pk-knob { width: 12px; height: 12px; margin: -6px 0 0 -6px; box-sizing: border-box; background: #fff; border: 1.5px solid #007AFF; border-radius: 50%; }
  .pk-stem { width: 1.5px; height: ${KNOB}px; margin-left: -.75px; background: #007AFF; transform-origin: 50% 100%; }
  .pk-rest { box-sizing: border-box; transform-origin: 50% 50%; border-radius: 2px; outline: 1px dashed rgba(175, 82, 222, .8); }
  html.pk-hv .pk-o.sel { box-shadow: 0 0 0 1.5px #AF52DE; } html.pk-hv .pk-o.hov { box-shadow: 0 0 0 1px rgba(175, 82, 222, .55); }
  html.pk-hv .pk-o:not(.front) .pk-badge { background: #AF52DE; } html.pk-hv .pk-knob { border-color: #AF52DE; } html.pk-hv .pk-stem { background: #AF52DE; }
  html.pk-c-grab, html.pk-c-grab * { cursor: grab !important; }
  html.pk-c-grabbing, html.pk-c-grabbing * { cursor: grabbing !important; }
  html.pk-c-rot, html.pk-c-rot * { cursor: ${ROT_CUR} !important; }
  html.pk-c-nwse, html.pk-c-nwse * { cursor: nwse-resize !important; }
  html.pk-c-nesw, html.pk-c-nesw * { cursor: nesw-resize !important; }
  html.pk-c-ns, html.pk-c-ns * { cursor: ns-resize !important; }
  html.pk-c-ew, html.pk-c-ew * { cursor: ew-resize !important; }
  html.pk-c-ptr, html.pk-c-ptr * { cursor: pointer !important; }
  html.pk-c-def, html.pk-c-def * { cursor: default !important; }
  .pk-hud { position: fixed; left: 12px; right: 12px; top: 12px; z-index: 2147483001; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none;
            font: 12px/1.3 -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; color: #1D1D1F; -webkit-user-select: none; user-select: none; }
  .pk-hud[hidden] { display: none; }
  .pk-bar { pointer-events: auto; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px; max-width: calc(100vw - 24px); padding: 6px 6px 6px 10px;
            border-radius: 12px; background: rgba(255, 255, 255, .92); box-shadow: 0 0 0 .5px rgba(0, 0, 0, .14), 0 2px 10px rgba(0, 0, 0, .08);
            -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); white-space: nowrap; }
  .pk-tray { position: relative; display: flex; align-items: flex-end; gap: 8px; padding: 18px 10px 8px; }
  .pk-in, .pk-out { display: flex; align-items: flex-end; gap: 8px; min-height: 46px; }
  .pk-out:empty::before { content: 'all in the pile'; color: #AEAEB2; font-size: 11px; align-self: center; }
  .pk-tsep { width: 1px; align-self: stretch; background: #E5E5EA; margin: 0 4px; }
  .pk-th { position: relative; height: 46px; border-radius: 3px; cursor: grab; flex: none; }
  .pk-th img { display: block; height: 100%; width: auto; border-radius: 3px; box-shadow: 0 0 0 .5px rgba(0, 0, 0, .18); pointer-events: none; }
  .pk-out .pk-th img { opacity: .38; filter: grayscale(.5); transition: opacity .15s; }
  .pk-out .pk-th:hover img { opacity: .85; filter: none; }
  .pk-th.sel img { box-shadow: 0 0 0 2px #007AFF; }
  .pk-th.drag { opacity: .25; }
  .pk-n { position: absolute; left: 50%; top: -15px; translate: -50% 0; font-size: 10px; font-weight: 600; color: #8E8E93; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pk-th.sel .pk-n { color: #007AFF; }
  .pk-out .pk-n { color: #C7C7CC; }
  .pk-x { position: absolute; right: -6px; top: -6px; width: 16px; height: 16px; padding: 0; border: 0; border-radius: 50%; background: #8E8E93; color: #fff;
          font: 600 11px/16px -apple-system, sans-serif; text-align: center; cursor: pointer; display: none; }
  .pk-in .pk-th:hover .pk-x { display: block; }
  .pk-x:hover { background: #FF3B30; }
  .pk-mark { position: absolute; width: 2px; height: 52px; bottom: 5px; margin-left: -1px; border-radius: 1px; background: #007AFF; display: none; }
  .pk-tray.out-drop .pk-out { border-radius: 6px; box-shadow: 0 0 0 1.5px rgba(255, 59, 48, .5); }
  .pk-ghost { position: fixed; left: 0; top: 0; z-index: 2147483002; height: 46px; pointer-events: none; opacity: .9; }
  .pk-ghost img { height: 100%; border-radius: 3px; box-shadow: 0 6px 18px rgba(0, 0, 0, .22); }
  .pk-seg { display: inline-flex; padding: 2px; border-radius: 7px; background: #F2F2F7; gap: 2px; }
  .pk-seg button { font: inherit; border: 0; border-radius: 5px; padding: 2px 9px; background: transparent; color: #6E6E73; cursor: pointer; }
  .pk-seg button.on { background: #fff; color: #1D1D1F; font-weight: 500; box-shadow: 0 1px 2px rgba(0, 0, 0, .14); }
  .pk-name { min-width: 104px; color: #6E6E73; font-weight: 500; }
  .pk-name b { color: #1D1D1F; font-weight: 600; }
  .pk-f { display: inline-flex; align-items: center; gap: 3px; color: #6E6E73; }
  .pk-fl { cursor: ew-resize; padding: 2px 1px; }
  .pk-f input { width: 46px; font: inherit; font-variant-numeric: tabular-nums; text-align: right; border: 0; border-radius: 6px; padding: 3px 5px; background: #F2F2F7; color: #1D1D1F; -webkit-user-select: text; user-select: text; }
  .pk-f input:focus { outline: 2px solid rgba(0, 122, 255, .5); outline-offset: 0; background: #fff; }
  .pk-sep { width: 1px; align-self: stretch; background: #E5E5EA; margin: 2px 0; }
  .pk-bar label.pk-chk { display: inline-flex; align-items: center; gap: 4px; color: #6E6E73; cursor: pointer; }
  .pk-btn { font: inherit; border: 0; border-radius: 7px; padding: 4px 10px; background: transparent; color: #1D1D1F; cursor: pointer; }
  .pk-btn:hover { background: #F2F2F7; }
  .pk-btn.pri { background: #007AFF; color: #fff; font-weight: 500; }
  .pk-btn.on { background: #1D1D1F; color: #fff; }
  .pk-btn:disabled { opacity: .35; cursor: default; background: transparent; }
  .pk-hint { color: #8E8E93; font-size: 11px; white-space: nowrap; text-shadow: 0 0 6px #fff, 0 0 2px #fff; pointer-events: auto; }
  html.pk-preview .pk-tray, html.pk-preview .pk-edit-only { opacity: .35; pointer-events: none; }
  .pk-tag { position: fixed; left: 50%; top: 18px; translate: -50% 0; z-index: 2147483001; padding: 4px 11px; border-radius: 8px; background: rgba(29, 29, 31, .8);
            color: #fff; font: 500 12px/16px -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; opacity: 0; transition: opacity .4s; pointer-events: none; white-space: nowrap; }
  .pk-tag.on { opacity: 1; transition: opacity .12s; }
`;
document.head.appendChild(css);
const DMAX = Math.max(...PILES.map(p => IM(p).length));
const ov = h('div', { class: 'pk-ov', 'aria-hidden': 'true' });
const outl = Array.from({ length: DMAX }, () => ov.appendChild(h('div', { class: 'pk-o' }, h('span', { class: 'pk-badge' }))));
const hd = CORNERS.map(() => ov.appendChild(h('div', { class: 'pk-h' })));
const stem = ov.appendChild(h('div', { class: 'pk-stem' })), knob = ov.appendChild(h('div', { class: 'pk-knob' }));
const ghost = ov.insertBefore(h('div', { class: 'pk-rest' }), ov.firstChild);   // the Hover view: the selected card's rest place
document.body.appendChild(ov);
const put = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; el.style[k] = v; } };
const tog = (el, c, on) => { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); };
function draw() {
  const live = mode === 'edit' && !!P?.S && P.st.state === 'home';
  ov.style.display = live ? '' : 'none';
  if (!live) { Q = []; return; }
  const f = frame0(), si = selIdx(), dragI = drag ? drag.i : -1;
  Q = P.S.cards.map((_, i) => quadOf(i, f));
  outl.forEach((el, i) => {
    const q = Q[i], on = !!q && (xray || i === si || i === hovI || i === dragI);
    tog(el, 'on', on); if (!on) return;
    tog(el, 'sel', i === si); tog(el, 'hov', i === hovI && i !== si); tog(el, 'xr', xray); tog(el, 'front', i === 0);
    put(el, 'width', (2 * q.hw).toFixed(2) + 'px'); put(el, 'height', (2 * q.hh).toFixed(2) + 'px');
    put(el, 'transform', `translate(${(q.cx - q.hw).toFixed(2)}px, ${(q.cy - q.hh).toFixed(2)}px) rotate(${q.R.toFixed(3)}deg)`);
    const t = i === 0 ? (i === si ? 'Front · stays put' : 'Front') : (i === si || i === hovI || i === dragI ? `${i + 1} · ${nameOf(P.S.cards[i].j)}${view === 'hover' ? ' · hover' : ''}` : String(i + 1));
    if (el.firstChild.textContent !== t) el.firstChild.textContent = t;
  });
  const q = si >= 1 ? Q[si] : null, gq = q && view === 'hover' ? restQuad(si, f) : null;
  tog(ghost, 'on', !!gq);
  if (gq) { put(ghost, 'width', (2 * gq.hw).toFixed(2) + 'px'); put(ghost, 'height', (2 * gq.hh).toFixed(2) + 'px');
            put(ghost, 'transform', `translate(${(gq.cx - gq.hw).toFixed(2)}px, ${(gq.cy - gq.hh).toFixed(2)}px) rotate(${gq.R.toFixed(3)}deg)`); }
  hd.forEach((el, k) => { tog(el, 'on', !!q && view === 'rest'); if (!q || view !== 'rest') return; const [x, y] = toScreen(q, CORNERS[k][1] * q.hw, CORNERS[k][2] * q.hh); put(el, 'transform', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${q.R.toFixed(3)}deg)`); });
  tog(stem, 'on', !!q); tog(knob, 'on', !!q);
  if (q) {
    const [tx, ty] = toScreen(q, 0, -q.hh), [kx, ky] = toScreen(q, 0, -q.hh - KNOB);
    put(stem, 'transform', `translate(${tx.toFixed(2)}px, ${(ty - KNOB).toFixed(2)}px) rotate(${q.R.toFixed(3)}deg)`);
    put(knob, 'transform', `translate(${kx.toFixed(2)}px, ${ky.toFixed(2)}px)`);
  }
  placeHud();
}
/* the HUD in the band with room for it — between the name and the pile's top (its knob), or under the pile — never over the cards */
let hudKey = '';
function placeHud() {
  if (!Q.length || hud.hidden) return;
  let top = Infinity, bot = -Infinity;
  for (const q of Q) { const ey = Math.abs(q.hw * Math.sin(q.a)) + Math.abs(q.hh * Math.cos(q.a)); top = Math.min(top, q.cy - ey); bot = Math.max(bot, q.cy + ey); }
  const key = [Math.round(top), Math.round(bot), innerWidth, innerHeight].join(); if (key === hudKey) return; hudKey = key;
  const hh = hud.offsetHeight, nm = document.querySelector('#hdr .name'), t0 = (nm ? nm.getBoundingClientRect().bottom : 0) + 16;   // the name's line (#hdr is the whole header box)
  const above = top - KNOB - 22 - t0, below = innerHeight - 12 - (bot + 16);
  const y = above >= hh || above >= below ? t0 + Math.max(0, (above - hh) / 2) : innerHeight - 12 - hh;
  hud.style.top = Math.round(y) + 'px';
}

/* ---------- the HUD: the tray, the selected card's fields, the actions ---------- */
const inG = h('div', { class: 'pk-in' }), outG = h('div', { class: 'pk-out' }), mark = h('div', { class: 'pk-mark' });
const tray = h('div', { class: 'pk-tray' }, inG, h('span', { class: 'pk-tsep' }), outG, mark);
function thumbsOf(p) {                                        // one per picture of the pile, built on its first visit
  if (p.thumbs) return p.thumbs;
  return (p.thumbs = IM(p).map((pic, j) => {
    const el = h('div', { class: 'pk-th', title: pic.id }, h('img', { src: p.thumb(pic), alt: '', draggable: false }), h('span', { class: 'pk-n' }),
                  h('button', { class: 'pk-x', type: 'button', title: 'Take it out of the pile (⌫)', textContent: '×' }));
    el.dataset.j = j; el.querySelector('img').style.aspectRatio = `${pic.w} / ${pic.h}`;
    el.querySelector('.pk-x').addEventListener('click', e => { e.stopPropagation(); removeCard(j); });
    return el;
  }));
}
const pileSeg = h('div', { class: 'pk-seg pk-edit-only', title: 'which pile — or click the other pile on the page' },
  ...PILES.map(p => { const b = h('button', { type: 'button', textContent: p.label }); b.dataset.k = p.key; b.onclick = () => setPile(p.key); return b; }));
const viewSeg = h('div', { class: 'pk-seg pk-edit-only', title: 'V — the pose you edit: at rest, or when the pile is hovered' },
  ...[['rest', 'Rest'], ['hover', 'Hover']].map(([v, t]) => { const b = h('button', { type: 'button', textContent: t }); b.dataset.v = v; b.onclick = () => setView(v); return b; }));
const nameEl = h('span', { class: 'pk-name' });
const F = [
  { label: 'X', unit: '%', get: c => c.x * 100, set: (c, v) => { c.x = v / 100; }, step: .1, dp: 1, title: 'across, % of the pile’s box (a card’s long side)' },
  { label: 'Y', unit: '%', get: c => c.y * 100, set: (c, v) => { c.y = v / 100; }, step: .1, dp: 1, title: 'down, % of the pile’s box' },
  { label: 'Turn', unit: '°', get: c => c.r, set: (c, v) => { c.r = v; }, step: .1, dp: 1, title: 'degrees, + = clockwise' },
  { label: 'Size', unit: '%', get: c => c.s * 100, set: (c, v) => { c.s = v / 100; }, step: .5, dp: 1, title: '% of its full size (its long side = the box)' },
  { v: 'hover', label: 'Out X', unit: '%', get: c => c.hx * 100, set: (c, v) => { c.hx = v / 100; }, step: .1, dp: 1, title: 'how far it moves across on hover, % of the box' },
  { v: 'hover', label: 'Out Y', unit: '%', get: c => c.hy * 100, set: (c, v) => { c.hy = v / 100; }, step: .1, dp: 1, title: 'how far it moves down on hover (− = up), % of the box' },
  { v: 'hover', label: 'Turn', unit: '°', get: c => c.hr, set: (c, v) => { c.hr = v; }, step: .1, dp: 1, title: 'how much more it turns on hover, + = clockwise' },
];
for (const fd of F) fd.v = fd.v || 'rest';
for (const fd of F) {
  fd.input = h('input', { type: 'text', inputMode: 'decimal', spellcheck: false, title: fd.title + ' · ↑ ↓ step (⇧ ×10)' });
  fd.lab = h('span', { class: 'pk-fl', textContent: fd.label, title: 'drag sideways · ' + fd.title });
  fd.el = h('label', { class: 'pk-f pk-edit-only' }, fd.lab, fd.input, h('span', { textContent: fd.unit }));
  const cur = () => { const i = selIdx(); return i >= 1 ? P.S.cards[i] : null; };
  const setV = v => { const c = cur(); if (!c || !Number.isFinite(v)) return; fd.set(c, v); later(); };
  fd.input.addEventListener('change', () => { setV(parseFloat(fd.input.value.replace('−', '-').replace(',', '.'))); pend = false; push(); flush(); renderFields(true); });
  fd.input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); renderFields(true); fd.input.blur(); return; }
    if (e.key === 'Enter') { e.preventDefault(); fd.input.dispatchEvent(new Event('change')); return; }
    const d = { ArrowUp: 1, ArrowDown: -1 }[e.key]; if (!d) return;
    e.preventDefault(); const c = cur(); if (!c) return;
    setV(rd(fd.get(c) + d * fd.step * (e.shiftKey ? 10 : 1), 1e4)); pend = false; push(); renderFields(true); burst();
  });
  fd.lab.addEventListener('pointerdown', e => {                 // scrub: drag the label sideways
    const c = cur(); if (!c || e.button !== 0) return;
    e.preventDefault(); capture(fd.lab, e);
    const x0 = e.clientX, v0 = fd.get(c);
    const mv = ev => { setV(rd(v0 + (ev.clientX - x0) * fd.step * (ev.shiftKey ? 10 : 1), 1e4)); };
    const up = () => { fd.lab.removeEventListener('pointermove', mv); fd.lab.removeEventListener('pointerup', up); fd.lab.removeEventListener('pointercancel', up); pend = false; push(); flush(); };
    fd.lab.addEventListener('pointermove', mv); fd.lab.addEventListener('pointerup', up); fd.lab.addEventListener('pointercancel', up);
  });
}
const frontBtn = h('button', { class: 'pk-btn pk-edit-only', type: 'button', textContent: 'Make front', title: 'F — this card in front; the front one takes its place' });
frontBtn.onclick = () => { if (selIdx() >= 1) makeFront(P.selJ); };
const outBtn = h('button', { class: 'pk-btn pk-edit-only', type: 'button', textContent: 'Take out', title: '⌫ — the selected card out of the pile' });
outBtn.onclick = () => { if (selIdx() >= 1) removeCard(P.selJ); };
const xrBox = h('input', { type: 'checkbox' }); xrBox.onchange = () => { xray = xrBox.checked; };
const prevBtn = h('button', { class: 'pk-btn', type: 'button', textContent: 'Preview', title: 'P — the site as it would be: hover the pile, click it, flip, close' });
prevBtn.onclick = () => setMode(mode === 'edit' ? 'preview' : 'edit');
const undoBtn = h('button', { class: 'pk-btn pk-edit-only', type: 'button', textContent: 'Undo', title: '⌘Z (⇧⌘Z redo)' }); undoBtn.onclick = undo;
const resetBtn = h('button', { class: 'pk-btn pk-edit-only', type: 'button', textContent: 'Reset', title: 'this pile back to the site as it is' });
resetBtn.onclick = () => { flush(); P.S = clone(P.SITE); if (selIdx() < 0) P.selJ = null; push(); commit(); };
const copyBtn = h('button', { class: 'pk-btn pri', type: 'button', textContent: 'Copy values' });
copyBtn.onclick = async () => {
  const t = fmt();
  try { await navigator.clipboard.writeText(t); }
  catch { const ta = h('textarea', { value: t }); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  copyBtn.textContent = 'Copied ✓'; clearTimeout(copyBtn.t); copyBtn.t = setTimeout(() => (copyBtn.textContent = 'Copy values'), 1600);
};
const sep = () => h('span', { class: 'pk-sep' });
const bar1 = h('div', { class: 'pk-bar' }, tray);
const bar2 = h('div', { class: 'pk-bar' }, ...(PILES.length > 1 ? [pileSeg] : []), viewSeg, sep(), nameEl, ...F.map(fd => fd.el), frontBtn, outBtn, sep(),
                h('label', { class: 'pk-chk pk-edit-only', title: 'X — every card’s outline' }, xrBox, 'Outlines'), prevBtn, undoBtn, resetBtn, copyBtn);
const hint = h('div', { class: 'pk-hint', textContent: 'V rest / hover · drag a card · knob turns · corners size · ⇧ straight / whole steps · ⌥-click the one under · arrows 1 px · [ ] turn · − = size · ⌘[ ⌘] depth · F front · Tab next · ⌫ out · P preview · X outlines · C centre · H hide · ⌘Z' });
const hud = h('div', { class: 'pk-hud' }, bar1, bar2, hint);
for (const t of ['pointerdown', 'pointerup', 'click', 'dblclick']) hud.addEventListener(t, e => e.stopPropagation());   // the page's own press routing never sees the HUD
document.body.appendChild(hud);
const tag = h('div', { class: 'pk-tag' }); document.body.appendChild(tag);
function flashTag(t, ms = 1400) { tag.textContent = t; tag.classList.add('on'); clearTimeout(flashTag.t); flashTag.t = setTimeout(() => tag.classList.remove('on'), ms); }

function renderTray() {
  const th = thumbsOf(P), inJ = P.S.cards.map(c => c.j), outJ = IM().map((_, j) => j).filter(j => !inJ.includes(j));
  for (const g of [inG, outG]) for (const el of [...g.children]) if (!th.includes(el)) el.remove();   // another pile's thumbs
  inJ.forEach((j, i) => { const el = th[j]; if (inG.children[i] !== el) inG.insertBefore(el, inG.children[i] || null); el.querySelector('.pk-n').textContent = i ? String(i + 1) : 'Front'; el.title = nameOf(j) + (i ? ' · drag to the first place for the front' : ''); });
  outJ.forEach((j, i) => { const el = th[j]; if (outG.children[i] !== el) outG.insertBefore(el, outG.children[i] || null); el.querySelector('.pk-n').textContent = '+'; el.title = nameOf(j) + ' · click to put it at the back'; });
  th.forEach((el, j) => tog(el, 'sel', j === P.selJ));
}
function renderFields(force) {
  const i = selIdx(), c = i >= 0 ? P.S.cards[i] : null;
  nameEl.innerHTML = !c ? 'Click a card' : i === 0 ? `<b>${nameOf(c.j)}</b> · front, stays put` : `<b>${nameOf(c.j)}</b> · ${i + 1}${['', '', 'nd', 'rd'][i + 1] || 'th'}`;
  for (const fd of F) {
    fd.el.style.display = i >= 1 && fd.v === view ? '' : 'none';
    if (c && i >= 1 && fd.v === view && (force || document.activeElement !== fd.input)) { const v = fd.get(c); fd.input.value = (Math.abs(v) < .05 ? 0 : v).toFixed(fd.dp); }
  }
  frontBtn.style.display = outBtn.style.display = i >= 1 ? '' : 'none';
}
function renderHud() {
  if (!P?.S) return;
  renderTray(); renderFields();
  for (const b of pileSeg.children) tog(b, 'on', b.dataset.k === P.key);
  for (const b of viewSeg.children) tog(b, 'on', b.dataset.v === view);
  root.classList.toggle('pk-hv', view === 'hover');
  prevBtn.textContent = mode === 'edit' ? 'Preview' : 'Edit'; tog(prevBtn, 'on', mode === 'preview');
  undoBtn.disabled = !P.hist.length;
  xrBox.checked = xray;
}

/* tray drag: reorder / put in / take out */
let td = null;
tray.addEventListener('pointerdown', e => {
  const th = e.target.closest('.pk-th'); if (!th || e.button !== 0 || e.target.closest('.pk-x') || mode !== 'edit') return;
  e.preventDefault(); capture(th, e);
  td = { j: +th.dataset.j, el: th, x0: e.clientX, y0: e.clientY, on: false, drop: null };
});
tray.addEventListener('pointermove', e => {
  if (!td) return;
  if (!td.on) { if (Math.hypot(e.clientX - td.x0, e.clientY - td.y0) < 4) return;
    td.on = true; td.el.classList.add('drag');
    td.ghost = h('div', { class: 'pk-ghost' }, h('img', { src: P.thumb(IM()[td.j]), alt: '' })); document.body.appendChild(td.ghost); }
  td.ghost.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 34}px)`;
  const tr = tray.getBoundingClientRect(), sepX = tray.querySelector('.pk-tsep').getBoundingClientRect().left;
  const outDrop = e.clientY < tr.top - 50 || e.clientX > sepX;
  tray.classList.toggle('out-drop', outDrop && P.S.cards.some(c => c.j === td.j));
  if (outDrop) { td.drop = { out: true }; mark.style.display = 'none'; return; }
  const others = [...inG.children].filter(el => el !== td.el);
  let at = others.findIndex(el => { const r = el.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; }); if (at < 0) at = others.length;
  td.drop = { at };
  const ref = others[at] ? others[at].getBoundingClientRect() : null, prev = others[at - 1] ? others[at - 1].getBoundingClientRect() : null;
  const mx = ref ? ref.left - 4 : prev ? prev.right + 4 : inG.getBoundingClientRect().left;
  mark.style.display = 'block'; mark.style.left = (mx - tr.left) + 'px';
});
function trayEnd() {
  if (!td) return;
  const t = td; td = null;
  t.el.classList.remove('drag'); t.ghost?.remove(); mark.style.display = 'none'; tray.classList.remove('out-drop');
  const inPile = P.S.cards.some(c => c.j === t.j);
  if (!t.on) { if (inPile) select(t.j); else addCard(t.j); return; }
  if (!t.drop) return;
  if (t.drop.out) { if (inPile) removeCard(t.j); return; }
  if (inPile) moveCard(t.j, t.drop.at); else addCard(t.j, t.drop.at);
}
tray.addEventListener('pointerup', trayEnd);
tray.addEventListener('pointercancel', trayEnd);

/* ---------- the pile: presses are the lab's in EDIT (window capture: before the page's zoom click, its row drag) ---------- */
const inHud = e => e.target instanceof Node && hud.contains(e.target);
let swallow = false, curC = '';
function setCursor(c) { if (c === curC) return; if (curC) root.classList.remove('pk-c-' + curC); curC = c; if (c) root.classList.add('pk-c-' + c); }
function cornerCursor(q, k) {                                   // the resize cursor along the corner's diagonal as drawn
  const [, sx, sy] = CORNERS.find(c => c[0] === k), [x, y] = toScreen(q, sx * q.hw, sy * q.hh);
  const a = ((Math.atan2(y - q.cy, x - q.cx) * 180 / Math.PI) % 180 + 180) % 180;
  return a < 22.5 || a >= 157.5 ? 'ew' : a < 67.5 ? 'nwse' : a < 112.5 ? 'ns' : 'nesw';
}
addEventListener('pointerdown', e => {
  swallow = false;
  if (mode !== 'edit' || !P?.S || inHud(e) || e.button !== 0) return;
  e.stopPropagation(); e.preventDefault(); swallow = true;
  if (document.activeElement && hud.contains(document.activeElement)) document.activeElement.blur();
  if (P.st.state !== 'home') return;
  draw();
  const x = e.clientX, y = e.clientY, hk = handleAt(x, y), si = selIdx();
  if (hk) {
    const q = Q[si], c = P.S.cards[si];
    drag = hk === 'rot' ? { kind: 'rot', i: si, view, cx: q.cx, cy: q.cy, r0: view === 'hover' ? c.hr : c.r, acc: 0, last: Math.atan2(y - q.cy, x - q.cx) }
                        : { kind: 'size', i: si, cx: q.cx, cy: q.cy, d0: Math.max(1, Math.hypot(x - q.cx, y - q.cy)), s0: c.s, cur: cornerCursor(q, hk) };
    setCursor(hk === 'rot' ? 'rot' : drag.cur); return;
  }
  const i = cardAt(x, y, e.altKey);
  if (i < 0) { const o = otherPileAt(x, y); if (o) setPile(o.key); else select(null); return; }
  select(P.S.cards[i].j);
  if (i === 0) return;                                             // the front: selected, never moved
  const f0 = frame0(); drag = { kind: 'move', i, view, x0: x, y0: y, c0: { ...P.S.cards[i] }, b: f0.b * (view === 'hover' ? f0.m : 1) };
  setCursor('grabbing');
}, true);
addEventListener('pointermove', e => {
  if (drag) {
    e.stopPropagation();
    const c = P.S.cards[drag.i]; if (!c) return;
    if (drag.kind === 'move') {
      let dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (drag.view === 'hover') { c.hx = drag.c0.hx + dx / drag.b; c.hy = drag.c0.hy + dy / drag.b; }   // how far it moves out
      else { c.x = drag.c0.x + dx / drag.b; c.y = drag.c0.y + dy / drag.b; }
    } else if (drag.kind === 'rot') {
      const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
      let d = a - drag.last; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;   // unwrapped: a full turn and more
      drag.acc += d; drag.last = a;
      const r = drag.r0 + drag.acc * 180 / Math.PI, rr = e.shiftKey ? Math.round(r) : r;
      if (drag.view === 'hover') c.hr = rr; else c.r = rr;
    } else {
      const s = drag.s0 * Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) / drag.d0; c.s = e.shiftKey ? Math.round(s * 100) / 100 : s;
    }
    later(); return;
  }
  if (mode !== 'edit' || !P?.S || P.st.state !== 'home' || inHud(e)) { hovI = -1; setCursor(''); return; }
  const x = e.clientX, y = e.clientY, hk = handleAt(x, y);
  if (hk) { hovI = -1; setCursor(hk === 'rot' ? 'rot' : cornerCursor(Q[selIdx()], hk)); return; }
  const i = cardAt(x, y, e.altKey);
  hovI = i >= 1 ? i : -1;
  setCursor(i >= 1 ? 'grab' : i < 0 && otherPileAt(x, y) ? 'ptr' : 'def');
}, true);
function endDrag(e) {
  if (swallow && e) e.stopPropagation();
  if (!drag) return;
  drag = null; pend = false; push(); commit(); setCursor('');
}
addEventListener('pointerup', endDrag, true);
addEventListener('pointercancel', endDrag, true);
addEventListener('click', e => { if (swallow || (mode === 'edit' && !inHud(e))) { swallow = false; if (!inHud(e)) { e.stopPropagation(); e.preventDefault(); } } }, true);

/* ---------- keys ---------- */
function nudgeSel(fn) { const i = selIdx(); if (i < 1) return; fn(P.S.cards[i]); later(); burst(); }
addEventListener('keydown', e => {
  if (!P?.S) return;
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (typing) return;
  const k = e.key, code = e.code, stop = () => { e.preventDefault(); e.stopPropagation(); };
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') { if (mode !== 'edit') return; stop(); if (e.shiftKey) redoIt(); else undo(); return; }
  if (k.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) { stop(); setMode(mode === 'edit' ? 'preview' : 'edit'); return; }
  if (mode !== 'edit') return;
  const i = selIdx(), f0 = frame0(), hv = view === 'hover', px = (e.shiftKey ? 10 : 1) / (f0.b * (hv ? f0.m : 1));
  if ((e.metaKey || e.ctrlKey) && (code === 'BracketLeft' || code === 'BracketRight')) {   // depth: ⌘[ one deeper, ⌘] one up (the front stays the front)
    stop(); if (i < 1) return;
    const to = i + (code === 'BracketLeft' ? 1 : -1); if (to >= 1 && to < P.S.cards.length) moveCard(P.selJ, to); return;
  }
  if (e.metaKey || e.ctrlKey) return;
  const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (arrow) { stop(); nudgeSel(c => { if (hv) { c.hx += arrow[0] * px; c.hy += arrow[1] * px; } else { c.x += arrow[0] * px; c.y += arrow[1] * px; } }); return; }
  if (code === 'BracketLeft' || code === 'BracketRight') { stop(); const d = (code === 'BracketLeft' ? -1 : 1) * (e.shiftKey ? 2 : .5); nudgeSel(c => { if (hv) c.hr = rd(c.hr + d, 1e4); else c.r = rd(c.r + d, 1e4); }); return; }
  if ((code === 'Minus' || code === 'Equal') && !hv) { stop(); const d = (code === 'Minus' ? -1 : 1) * (e.shiftKey ? .05 : .01); nudgeSel(c => { c.s = rd(c.s + d, 1e4); }); return; }
  if (k === 'Tab') { stop(); const n = P.S.cards.length; select(P.S.cards[i < 0 ? (e.shiftKey ? n - 1 : 1) : (i + (e.shiftKey ? n - 1 : 1)) % n].j); return; }   // from nothing: the first back card
  if (k === 'Backspace' || k === 'Delete') { stop(); if (i >= 1) removeCard(P.selJ); return; }
  if (k === 'Escape') { stop(); select(null); return; }
  const lk = k.toLowerCase();
  if (lk === 'f') { if (i >= 1) makeFront(P.selJ); return; }
  if (lk === 'v') { setView(view === 'rest' ? 'hover' : 'rest'); return; }
  if (lk === 'x') { xray = !xray; renderHud(); return; }
  if (lk === 'h') { hud.hidden = !hud.hidden; hudKey = ''; return; }
  if (lk === 'c') { centre(); return; }
}, true);

/* ---------- the pile switch, PREVIEW (the site's own hover, zoom, flips, close on the values as they are) ---------- */
function setPile(key) {
  const np = PILES.find(p => p.key === key); if (!np || np === P || mode !== 'edit') return;
  if (drag) endDrag(); flush();
  L().pinHover(null);                                         // the pile left behind hovers as on the site again
  P = np; try { localStorage.setItem(PILE_KEY, key); } catch {}
  hovI = -1; Q = []; hudKey = ''; setCursor('');
  L().pinHover(view === 'hover' ? 1 : 0); centre(); push(); renderHud(); flashTag(P.label);
}
function setView(v) {                                        // the pose being edited: at rest, or the pile held fully hovered
  if (v === view || mode !== 'edit') return;
  if (drag) endDrag();
  view = v; L().pinHover(v === 'hover' ? 1 : 0); hudKey = ''; hovI = -1; renderHud();
  flashTag(v === 'hover' ? 'Hover · drag a card to where it goes when the pile is hovered' : 'Rest');
}
function setMode(m) {
  if (m === mode) return;
  if (drag) endDrag();
  if (m === 'preview') { flush(); mode = m; hovI = -1; setCursor(''); L().pinHover(null); flashTag('Preview · the site as it would be · P to edit'); }
  else {
    mode = m;
    for (const s of stacks) if (s.state !== 'home') s.collapse();
    whenHome(() => { if (mode !== 'edit') return; L().pinHover(view === 'hover' ? 1 : 0); for (const p of PILES) push(p); hudKey = ''; renderHud(); });   // a flip in the preview moved a pile on: the lab's piles back
  }
  root.classList.toggle('pk-edit', mode === 'edit'); root.classList.toggle('pk-preview', mode === 'preview');
  renderHud();
}

/* ---------- Copy values ---------- */
function fmt() {
  const S = P.S, N = S.cards.length, deck = S.cards.map(c => c.j), Fn = L().fan, f = frame0(), n = (v, d) => +(+v).toFixed(d);
  const sg = (v, dp) => { const r = +v.toFixed(dp); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(dp); };
  const words = S.cards.map((c, i) => i === 0 ? `front ${nameOf(c.j)}` : `${i + 1} ${nameOf(c.j)}: x ${sg(c.x * 100, 1)} % · y ${sg(c.y * 100, 1)} % · turn ${sg(c.r, 1)}° · size ${(c.s * 100).toFixed(1)} %` +
                                            ` · on hover: x ${sg(c.hx * 100, 1)} % · y ${sg(c.hy * 100, 1)} % · turn ${sg(c.hr, 1)}°`);
  const hv = S.cards.map((c, i) => (i ? [n(c.hx, 5), n(c.hy, 5), n(c.hr, 3)] : [0, 0, 0]));
  let out = `${P.label} pile lab · ${innerWidth}×${innerHeight} · box ${Math.round(f.b)} px · ${N} cards\n` +
            `deck: [${deck.join(', ')}]   // ${deck.map(j => nameOf(j)).join(', ')}\n`;
  if (Fn) out += `fan: { pivot: [${Fn.pivot.join(', ')}], rot: [${Fn.rot.slice(0, N).map(v => n(v, 3)).join(', ')}], size: [${Fn.size.slice(0, N).map(v => n(v, 5)).join(', ')}], ` +
                 `jitter: [${Fn.jitter.slice(0, N).map(t => `[${n(t[0], 5)}, ${n(t[1], 5)}]`).join(', ')}], open: [${Fn.open.slice(0, N).map(v => n(v, 2)).join(', ')}] }\n`;
  else {
    const nd = P.st.knobs.nudge.slice(0, N).map(v => [n(v[0], 5), n(v[1], 5), n(v[2], 3), n(v[3] || 0, 5)]);
    out += `nudge: [${nd.map(v => `[${v.join(', ')}]`).join(', ')}]\n`;
    words.push(`at rest on the plain site: ${location.origin}${location.pathname}?deck=${deck.join(',')}&front=${deck[0]}&nudge=${nd.map(v => v.join(',')).join(';')}`);
  }
  out += `hover: [${hv.map(v => `[${v.join(', ')}]`).join(', ')}]\n`;
  return out + words.join('\n');
}

/* ---------- the loop: one push a frame while dragging / stepping, the overlay ---------- */
function loop() {
  requestAnimationFrame(loop);
  if (document.hidden || !P?.S) return;
  if (pend && mode === 'edit' && P.st.state === 'home') { pend = false; push(); renderFields(); }
  draw();
}

/* ---------- boot: each pile's site values (Reset), its stored ones; the row on the pile asked for (?pile=digital), else the last one ---------- */
function start() {
  const want = new URLSearchParams(location.search).get('pile'); let last = null; try { last = localStorage.getItem(PILE_KEY); } catch {}
  for (const p of PILES) {
    const Fn = L(p).fan;
    p.box = p.st.wrap.querySelector('.box'); p.hoverEl = p.st.wrap.querySelector('.hover'); p.HOV0 = L(p).hover;
    p.openMag = Fn ? (Array.isArray(Fn.open) ? Math.max(0, ...Fn.open.slice(1).map(v => Math.abs(v || 0))) : Math.abs(Fn.open || 0)) || 1.5 : 0;   // the site's hover turn of a back card
    p.SITE = { cards: readPile(p) };
    Object.assign(p, { S: load(p) || clone(p.SITE), selJ: null, hist: [], redo: [] });
  }
  root.classList.add('pk', 'pk-edit');
  for (const p of PILES) { if (!push(p)) p.S = clone(p.SITE); p.lastSnap = JSON.stringify(p.S); }
  P = PILES.find(p => p.key === want) || PILES.find(p => p.key === last) || PILES[0];
  L().pinHover(0); centre(); renderHud(); requestAnimationFrame(loop);
  flashTag(`${P.label} · drag the cards behind the front one`, 2400);
}
const ready = () => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(() => whenHome(start), 400));
if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
window.__pilelab = { get pile() { return P?.key; }, get state() { return P?.S; }, get site() { return P?.SITE; }, get quads() { return Q; }, fmt, push, select, addCard, removeCard, moveCard, makeFront, setPile, setMode, setView, frame0, get view() { return view; },
                     set(cards) { flush(); P.S = valid({ cards }, IM().length) || P.S; push(); commit(); }, reset() { resetBtn.onclick(); } };
})();
