/* poslab.js — the polaroids' POSITION lab (site.html?pos=1; owner 2026-10-06: "create a debug page where I can only move the position
   of the polaroids by dragging them horizontally and text too. Only horizontally. I can copy values and put them here … I think the
   positioning of both is too awkward. As if two having a first ever date and there are too many awkward pauses").

   Loaded by site.html only with ?pos. It opens the polaroids; then two things drag, on x only:
   - the PILE: the stack's openDx (the open pile's centre right of the viewer's centre, a fraction of the viewer width), applied through
     the page's own layout (layoutAll: the zones, the caption's band and the neighbours' peeks follow exactly as on the site);
   - the CAPTION: its left edge, a fraction of the viewer width. It stays put while the pile moves (⌘-drag moves both).
   The rulers on the caption's line show the intervals: the page's edge → the text → the print, and the fan → the page's edge,
   in px and in LINES of the caption (its line-height: the research's unit — brew/design-guide/spacing-tldr.md). SNAP (on by default,
   S) keeps the text ↔ print gap a whole number of lines while either is dragged (← → then step one line); CENTRE PAIR (C) centres
   the text + pile as one block, the gap kept. ALIGN (A) sets the caption flush left or flush right (the lines' straight edge toward the
   page edge or toward the print); TONE (T) swaps the TYPE · MA tones of the 2026-10-05 write-up (the site's html[data-ma] CSS: quiet
   gray ?ma=3, two tones = the site since 2026-10-06 (?ma=1), ?ma=4 strict, ?ma=5 one ink, ?ma=2 Mike's).
   Copy puts the values on the clipboard; they port as openDx + the band's split (margin / (margin + gap)) in the .caption CSS.
   The page's own clicks in OPEN (flip, close, the camera's move to a neighbour) are off here; Esc closes. Nothing touches the normal
   page: the state lives in localStorage under ?pos only. */
(() => {
'use strict';
const pol = (window.__stacks || []).find(s => s.name === 'polaroids');
if (!pol?.capEl || !window.__row?.layoutAll || !('openDx' in pol)) return;
const viewer = document.getElementById('viewer'), capEl = pol.capEl, root = document.documentElement;
const KEY = 'site.poslab.v1';
const vrect = () => viewer.getBoundingClientRect();
const block = () => capEl.firstElementChild;                 // the caption's type: the lines, then the credits
const lineH = () => parseFloat(getComputedStyle(capEl).lineHeight) || 20;   // one caption line (px): the unit of every interval
const SNAPK = 'site.poslab.snap';
const live = () => pol.state === 'open';
const r0 = Math.round;
const TONES = [['site', 'Two tones · the site'], ['3', 'Quiet gray · ?ma=3'], ['4', 'Strict contrast · ?ma=4'], ['5', 'One ink · ?ma=5'], ['2', 'Mike\'s hierarchy · ?ma=2']];   // the site = ?ma=1 since 2026-10-06
const okTone = t => TONES.some(([k]) => k === t);
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); if (!o || !Number.isFinite(o.dx) || !Number.isFinite(o.cx)) return null;
  const r = { dx: o.dx, cx: o.cx }; if (o.al === 'left' || o.al === 'right') r.al = o.al; if (okTone(o.tone)) r.tone = o.tone; return r; } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

/* ---------- the site's own values (Reset): its openDx, and where its band puts the caption (the ::before / ::after split) ---------- */
const SITE = { dx: pol.openDx, a: 1, b: 2, ba: 0, bb: 0,
               al: root.dataset.align === 'hug' ? 'right' : 'left', tone: okTone(root.dataset.ma) ? root.dataset.ma : 'site' };   // the URL's own align / tone (?ma=1 = the site's two tones)   // the site's openDx and its band's spacers: grow a : b, bases ba / bb in em of the caption (read at boot, before the lab's CSS; &align=hug = 1 : 0 + 3.6em)
function siteDefaults() {                                    // at the current size: the band at the site's openDx (eff.left moves 1 : 1 with openDx × W), laid out as its flex spacers do
  const W = vrect().width, e = pol.eff, tw = block().offsetWidth, fs = parseFloat(getComputedStyle(capEl).fontSize) || 16;
  const band = Math.max(0, (e ? e.left : 0) - (pol.openDx - SITE.dx) * W), a = SITE.a, b = SITE.b, ba = SITE.ba * fs, bb = SITE.bb * fs;
  const free = Math.max(0, band - tw - ba - bb);
  return { dx: SITE.dx, cx: (ba + (a + b > 0 ? free * a / (a + b) : 0)) / W, al: SITE.al, tone: SITE.tone };
}

/* ---------- state { dx: openDx, cx: the caption's left edge / W }, undo ---------- */
let DEF = null, S = null, lastSnap = null, sel = 'text', drag = null, hov = null, pinned = false, swallow = false, nudgeUntil = 0, keyT = 0;
let snap = (() => { try { return localStorage.getItem(SNAPK) !== '0'; } catch { return true; } })();
const snapGap = (gap, lh) => { const n = Math.round(gap / lh); return n >= 1 ? n * lh : gap; };   // whole lines (free under one line: an overlap stays possible)
const lines = (px, lh) => { const n = px / lh; return Math.abs(n - Math.round(n)) < .05 ? String(Math.round(n)) : n.toFixed(1); };
const hist = [], redo = [];
function commit() {
  const s = JSON.stringify(S); if (s === lastSnap) return;
  hist.push(lastSnap); if (hist.length > 300) hist.shift(); redo.length = 0; lastSnap = s; save();
}
function restore(s) { S = JSON.parse(s); lastSnap = s; save(); apply(); }
function flush() { clearTimeout(keyT); commit(); }         // a nudge burst not yet committed (its 400 ms) is a step of its own
function undo() { flush(); const s = hist.pop(); if (s) { redo.push(lastSnap); restore(s); } }
function redoIt() { flush(); const s = redo.pop(); if (s) { hist.push(lastSnap); restore(s); } }

/* ---------- apply: one frame — the pile through the page's layout (only when it moved), the caption's x, the rulers, the HUD ---------- */
let rq = 0;
function apply() { if (!rq) rq = requestAnimationFrame(frame); }
function applyType() {                                       // ALIGN + TONE: classes on the root (the lab's CSS) and the site's own data-ma
  root.classList.toggle('pl-al-right', S.al === 'right'); root.classList.toggle('pl-al-left', S.al !== 'right');
  if (S.tone === 'site') { if ('ma' in root.dataset) delete root.dataset.ma; } else if (root.dataset.ma !== S.tone) root.dataset.ma = S.tone;
}
function frame() {
  rq = 0;
  if (!S) return;
  if (pol.openDx !== S.dx) { pol.openDx = S.dx; window.__row.layoutAll('poslab'); }
  applyType();
  capEl.style.setProperty('--pl-x', (S.cx * vrect().width).toFixed(2) + 'px');
  const g = live() ? geom() : null;
  draw(g); syncHud(g);
}

/* ---------- geometry, viewer px: the text, the front print (the effective rect), the pile (the print ∪ the fan's cards) ---------- */
function geom() {
  const v = vrect(), e = pol.eff, t = block().getBoundingClientRect();
  const text = { l: t.left - v.left, r: t.right - v.left, t: t.top - v.top, b: t.bottom - v.top };
  const print = { l: e.left, r: e.left + e.width, t: e.top, b: e.top + e.height }, pile = { ...print };
  for (const c of pol.wrap.querySelectorAll('.card')) {
    const q = c.getBoundingClientRect(), l = q.left - v.left, r = q.right - v.left;
    if (!q.width || r < 0 || l > v.width) continue;                                       // a parked card (off the table)
    pile.l = Math.min(pile.l, l); pile.r = Math.max(pile.r, r); pile.t = Math.min(pile.t, q.top - v.top); pile.b = Math.max(pile.b, q.bottom - v.top);
  }
  const [b1, b2] = [...block().children].map(c => c.getBoundingClientRect());
  const line = b1 && b2 ? (b1.bottom + b2.top) / 2 - v.top : (text.t + text.b) / 2;   // the rulers' y: between the title lines and the credits
  return { W: v.width, H: v.height, lh: lineH(), text, print, pile, line, margin: text.l, gap: print.l - text.r, edge: v.width - pile.r };
}
function hitAt(x, y) {                                       // viewer px → 'text' | 'pile' | null (the text wins where they overlap)
  const g = geom(), inR = (r, p) => x >= r.l - p && x <= r.r + p && y >= r.t - p && y <= r.b + p;
  return inR(g.text, 10) ? 'text' : inR(g.pile, 0) ? 'pile' : null;
}

/* ---------- the overlay: the rulers on the caption's line + the dragged / hovered outline ---------- */
const css = document.createElement('style');
css.textContent = `
  html.pl .caption::before { flex: 0 0 var(--pl-x, 0px) !important; }
  html.pl .caption::after  { flex: 1 1 0 !important; }
  html.pl-live #zoneL, html.pl-live #zoneR, html.pl-live .nzone { pointer-events: none !important; }
  html.pl-ew, html.pl-ew * { cursor: ew-resize !important; }
  html.pl-al-left .caption > div { text-align: left !important; }
  html.pl-al-right .caption > div { text-align: right !important; }
  .pl-seg { display: inline-flex; padding: 2px; border-radius: 7px; background: #F2F2F7; gap: 2px; }
  .pl-seg button { font: inherit; border: 0; border-radius: 5px; padding: 2px 8px; background: transparent; color: #6E6E73; cursor: pointer; }
  .pl-seg button.on { background: #fff; color: #1D1D1F; box-shadow: 0 1px 2px rgba(0, 0, 0, .14); }
  .pl-sel { font: inherit; border: 0; border-radius: 7px; padding: 3px 6px; background: #F2F2F7; color: #1D1D1F; cursor: pointer; }
  .pl-ov { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }
  .pl-ov > * { position: absolute; opacity: 0; }
  .pl-r { height: 0; border-top: 1px solid #FF2D55; }
  .pl-r::before, .pl-r::after { content: ''; position: absolute; top: -5px; width: 1px; height: 9px; background: #FF2D55; }
  .pl-r::before { left: 0; } .pl-r::after { right: 0; }
  .pl-r.neg { border-top-style: dashed; }
  .pl-r > span { position: absolute; left: 50%; top: 0; translate: -50% -50%; padding: 0 5px; border-radius: 4px; background: #FF2D55; color: #fff;
                 font: 600 11px/16px -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pl-box { outline: 1px dashed rgba(0, 122, 255, .55); outline-offset: 4px; }
  .pl-box.on { outline-style: solid; outline-color: rgba(0, 122, 255, .8); }
  .pl-hud { position: fixed; top: 12px; left: 12px; right: 12px; z-index: 2147483001; display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: none;
            font: 12px/1.3 -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; color: #1D1D1F; -webkit-user-select: none; user-select: none; }
  .pl-bar { display: flex; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 24px); align-items: center; gap: 10px; padding: 5px 6px 5px 10px; border-radius: 11px; background: rgba(255, 255, 255, .92);
            box-shadow: 0 0 0 .5px rgba(0, 0, 0, .14), 0 2px 10px rgba(0, 0, 0, .08); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); white-space: nowrap; }
  .pl-strip { display: flex; align-items: center; gap: 0; font-variant-numeric: tabular-nums; }
  .pl-gap { min-width: 40px; padding: 0 6px; text-align: center; color: #FF2D55; font-weight: 600; line-height: 1.15; }
  .pl-gap small { display: block; font-size: 10px; font-weight: 500; opacity: .8; }
  .pl-chip { font: inherit; font-weight: 500; border: 0; border-radius: 6px; padding: 2px 8px; background: #F2F2F7; color: #1D1D1F; cursor: pointer; }
  .pl-chip.on { background: #007AFF; color: #fff; }
  .pl-sep { width: 1px; align-self: stretch; background: #E5E5EA; margin: 2px 0; }
  .pl-bar label { display: inline-flex; align-items: center; gap: 4px; color: #6E6E73; cursor: pointer; }
  .pl-btn { font: inherit; border: 0; border-radius: 7px; padding: 4px 10px; background: transparent; color: #1D1D1F; cursor: pointer; }
  .pl-btn:hover { background: #F2F2F7; }
  .pl-btn.pri { background: #007AFF; color: #fff; font-weight: 500; }
  .pl-btn:disabled { opacity: .35; cursor: default; background: transparent; }
  .pl-bar, .pl-hint { pointer-events: auto; }
  .pl-hint { color: #8E8E93; font-size: 11px; white-space: nowrap; text-shadow: 0 0 6px #fff, 0 0 2px #fff; }
  .pl-hud[hidden] { display: none; }
`;
document.head.appendChild(css);
const h = (tag, props = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') el.className = v; else if (k in el) el[k] = v; else el.setAttribute(k, v); } for (const c of kids) if (c != null) el.append(c); return el; };
const ov = h('div', { class: 'pl-ov', 'aria-hidden': 'true' });
const rul = { margin: h('div', { class: 'pl-r' }, h('span')), gap: h('div', { class: 'pl-r' }, h('span')), edge: h('div', { class: 'pl-r' }, h('span')) };
const box = { text: h('div', { class: 'pl-box' }), pile: h('div', { class: 'pl-box' }) };
ov.append(rul.margin, rul.gap, rul.edge, box.text, box.pile);
document.body.appendChild(ov);
function setRuler(el, a, b, y, show, lh) {
  el.style.opacity = show ? '1' : '0'; if (!show) return;
  Object.assign(el.style, { left: Math.min(a, b) + 'px', top: r0(y) + 'px', width: Math.max(1, Math.abs(b - a)) + 'px' });
  el.classList.toggle('neg', b < a); el.firstChild.textContent = `${r0(b - a)} · ${lines(b - a, lh)} ln`;
}
function setBox(el, r, show, on) {
  el.style.opacity = show ? '1' : '0'; if (!show) return;
  Object.assign(el.style, { left: r.l + 'px', top: r.t + 'px', width: (r.r - r.l) + 'px', height: (r.b - r.t) + 'px' });
  el.classList.toggle('on', on);
}
function draw(g) {
  const v = vrect(), on = !!g && (pinned || !!drag || !!hov || performance.now() < nudgeUntil);
  const ox = v.left, oy = v.top;                             // viewer px → the overlay (the window)
  const sh = r => g && { l: r.l + ox, r: r.r + ox, t: r.t + oy, b: r.b + oy };
  const y = g ? g.line + oy : 0;
  const lh = g ? g.lh : 20;
  setRuler(rul.margin, ox, g ? g.text.l + ox : 0, y, on, lh);
  setRuler(rul.gap, g ? g.text.r + ox : 0, g ? g.print.l + ox : 0, y, on, lh);
  setRuler(rul.edge, g ? g.pile.r + ox : 0, ox + (g ? g.W : 0), y, on, lh);
  const both = !!drag?.both, cur = drag?.id || hov;
  setBox(box.text, sh(g?.text || {}), !!g && (cur === 'text' || both), !!drag);
  setBox(box.pile, sh(g?.pile || {}), !!g && (cur === 'pile' || both), !!drag);
}
function centrePair() {                                     // the text + the pile (to the fan's edge) centred as one block; both move, the gap kept
  if (!live()) return;
  flush();
  const g = geom(), W = g.W, k = (S.dx - pol.openDx) * W, tl = S.cx * W, pr = g.pile.r + k;
  const shift = (W - (pr - tl)) / 2 - tl;
  S.cx += shift / W; S.dx += shift / W; commit(); nudgeShow(); apply();
}
let nudgeT = 0;
function nudgeShow() { nudgeUntil = performance.now() + 1200; clearTimeout(nudgeT); nudgeT = setTimeout(apply, 1250); }

/* ---------- the HUD (top centre, over the empty band above the print): the intervals as a strip, the controls ---------- */
const gm = h('span', { class: 'pl-gap', title: 'margin: the page edge → the text' }), gg = h('span', { class: 'pl-gap', title: 'gap: the text → the front print' }),
      ge = h('span', { class: 'pl-gap', title: 'the fan → the page edge' });
const chip = id => { const c = h('button', { class: 'pl-chip', type: 'button', textContent: id === 'text' ? 'Text' : 'Polaroids', title: 'drag it on the page · ← → nudge it' }); c.dataset.id = id; c.onclick = () => { sel = id; apply(); }; return c; };
const chips = [chip('text'), chip('pile')];
const strip = h('div', { class: 'pl-strip' }, gm, chips[0], gg, chips[1], ge);
const rulersBox = h('input', { type: 'checkbox', title: 'G' });
rulersBox.onchange = () => { pinned = rulersBox.checked; apply(); };
const snapBox = h('input', { type: 'checkbox', title: 'S — the text ↔ print gap in whole caption lines', checked: snap });
const setSnap = v => { snap = snapBox.checked = v; try { localStorage.setItem(SNAPK, v ? '1' : '0'); } catch {} };
snapBox.onchange = () => setSnap(snapBox.checked);
const centreBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Centre pair', title: 'C — the text + polaroids centred as one block (the gap kept)' });
centreBtn.onclick = () => centrePair();
const openBtn = h('button', { class: 'pl-btn', type: 'button' });
openBtn.onclick = () => { if (live()) pol.collapse(); else if (pol.state === 'home' && !(window.__stacks || []).some(s => s.state !== 'home')) pol.expand(); };
const undoBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Undo', title: '⌘Z (⇧⌘Z redo)' }); undoBtn.onclick = undo;
const resetBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Reset', title: 'back to the site as it is' });
resetBtn.onclick = () => { flush(); DEF = siteDefaults(); S = { ...DEF }; commit(); apply(); };
const copyBtn = h('button', { class: 'pl-btn pri', type: 'button', textContent: 'Copy values' });
copyBtn.onclick = async () => {
  const t = fmt();
  try { await navigator.clipboard.writeText(t); }
  catch { const ta = h('textarea', { value: t }); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  copyBtn.textContent = 'Copied ✓'; clearTimeout(copyBtn.t); copyBtn.t = setTimeout(() => (copyBtn.textContent = 'Copy values'), 1600);
};
const alSeg = h('div', { class: 'pl-seg', title: 'A — the lines flush left or flush right' },
  ...[['left', 'Left'], ['right', 'Right']].map(([v, t]) => { const b = h('button', { type: 'button', textContent: t }); b.dataset.v = v; b.onclick = () => setType({ al: v }); return b; }));
const toneSel = h('select', { class: 'pl-sel', title: 'T — the caption\'s tone (TYPE · MA)' }, ...TONES.map(([v, t]) => h('option', { value: v, textContent: t })));
toneSel.onchange = () => setType({ tone: toneSel.value });
function setType(o) { flush(); Object.assign(S, o); commit(); apply(); }
const sep = () => h('span', { class: 'pl-sep' });
const liveBits = [strip, sep(), h('label', {}, snapBox, 'Snap to lines'), h('label', {}, rulersBox, 'Rulers'), centreBtn, sep(), alSeg, toneSel];
const bar = h('div', { class: 'pl-bar' }, ...liveBits, sep(), openBtn, undoBtn, resetBtn, copyBtn);
const hint = h('div', { class: 'pl-hint', textContent: 'Drag sideways · ⌘-drag both · ← → one line (snap off: 1 px, ⇧ 10) · S snap · C centre · A align · T tone · ⌘Z undo · G rulers · H hide · Esc' });
const hud = h('div', { class: 'pl-hud' }, bar, hint);
document.body.appendChild(hud);
function syncHud(g) {
  const on = !!g;
  for (const b of liveBits) b.style.display = on ? '' : 'none';
  openBtn.textContent = live() ? 'Close' : 'Open polaroids';
  undoBtn.disabled = !hist.length && lastSnap === JSON.stringify(S);
  for (const c of chips) c.classList.toggle('on', c.dataset.id === sel);
  if (S) { for (const b of alSeg.children) b.classList.toggle('on', b.dataset.v === S.al); if (toneSel.value !== S.tone) toneSel.value = S.tone; }
  if (!on) return;
  for (const [el, v] of [[gm, g.margin], [gg, g.gap], [ge, g.edge]]) el.innerHTML = `${r0(v)}<small>${lines(v, g.lh)} ln</small>`;
}
function fmt() {
  const g = geom(), em = parseFloat(getComputedStyle(root).getPropertyValue('--em')) || 0, f = v => r0(v);
  const split = g.margin + g.gap > 0 ? g.margin / (g.margin + g.gap) : 0;
  const L = v => `${f(v)} (${lines(v, g.lh)} ln)`, align = getComputedStyle(block()).textAlign === 'right' ? 'flush right' : 'flush left';
  const tone = (TONES.find(([k]) => k === S.tone) || TONES[0])[1];
  return `Polaroid position lab · ${f(g.W)}×${f(g.H)} · em ${+em.toFixed(2)} px · caption line ${g.lh.toFixed(2)} px · ${align} · tone ${tone}\n` +
         `margin ${L(g.margin)} · text ${f(g.text.r - g.text.l)} · gap ${L(g.gap)} · print ${f(g.print.r - g.print.l)} · fan → edge ${L(g.edge)} px\n` +
         `openDx ${S.dx.toFixed(4)} · caption left ${S.cx.toFixed(4)} W · split ${split.toFixed(3)}` +
         (g.margin > 0 ? ` (margin : gap = 1 : ${(g.gap / g.margin).toFixed(2)})` : '');
}

/* ---------- input: presses in the open page are the lab's (window capture: before the page's own routing) ---------- */
const inViewer = e => e.target instanceof Node && viewer.contains(e.target);
const local = e => { const v = vrect(); return [e.clientX - v.left, e.clientY - v.top]; };
function syncCursor() { root.classList.toggle('pl-ew', !!(drag || hov)); }
addEventListener('pointerdown', e => {
  swallow = false;
  if (!S || !live() || !inViewer(e) || e.button !== 0) return;
  e.stopPropagation(); swallow = true;                      // no flip, no close, no camera move: the open page is the lab's
  const hit = hitAt(...local(e)); if (!hit) return;
  e.preventDefault();
  sel = hit; drag = { id: hit, both: e.metaKey, x0: e.clientX, from: { ...S }, W: vrect().width, g0: geom() };
  syncCursor(); apply();
}, true);
addEventListener('pointermove', e => {
  if (!drag) {
    const hit = S && live() && inViewer(e) ? hitAt(...local(e)) : null;
    if (hit !== hov) { hov = hit; syncCursor(); apply(); }
    return;
  }
  e.stopPropagation();
  const d = r0(e.clientX - drag.x0) / drag.W, g0 = drag.g0, W = drag.W, tw = g0.text.r - g0.text.l;   // whole px of travel
  if (drag.both) { S.dx = drag.from.dx + d; S.cx = drag.from.cx + d; }                      // the pair together: the gap kept
  else if (drag.id === 'pile') {
    let pl = g0.print.l + d * W;                                                            // the print's left edge at this travel
    if (snap) pl = g0.text.r + snapGap(pl - g0.text.r, g0.lh);
    S.dx = drag.from.dx + (pl - g0.print.l) / W;
  } else {
    let tl = g0.text.l + d * W;
    if (snap) tl = g0.print.l - tw - snapGap(g0.print.l - tw - tl, g0.lh);
    S.cx = tl / W;
  }
  apply();
}, true);
function endDrag(e) {
  if (swallow) e.stopPropagation();
  if (!drag) return;
  drag = null; commit(); syncCursor(); apply();
}
addEventListener('pointerup', endDrag, true);
addEventListener('pointercancel', endDrag, true);
addEventListener('click', e => {
  if (swallow || (S && live() && inViewer(e))) { swallow = false; e.stopPropagation(); e.preventDefault(); }
}, true);
addEventListener('keydown', e => {
  const t = e.target, typing = t && ((t.tagName === 'INPUT' && t.type !== 'checkbox') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (typing || !S) return;
  const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) redoIt(); else undo(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (k === 'escape') { if (live()) { e.stopPropagation(); pol.collapse(); } return; }
  if (k === 'g') { pinned = rulersBox.checked = !pinned; apply(); return; }
  if (k === 'h') { hud.hidden = !hud.hidden; return; }
  if (k === 's') { setSnap(!snap); return; }
  if (k === 'c') { if (live()) centrePair(); return; }
  if (k === 'a') { setType({ al: S.al === 'right' ? 'left' : 'right' }); return; }
  if (k === 't') { const i = TONES.findIndex(([v]) => v === S.tone); setType({ tone: TONES[(i + (e.shiftKey ? TONES.length - 1 : 1)) % TONES.length][0] }); return; }
  const dir = { arrowleft: -1, arrowright: 1 }[k];
  if (!dir || !live()) return;
  e.preventDefault(); e.stopPropagation();
  const g = geom(), W = g.W, pl = g.print.l + (S.dx - pol.openDx) * W, tl = S.cx * W, tw = g.text.r - g.text.l;   // from the state (a layout may be pending)
  if (snap && !e.shiftKey) {                                   // one line: the pile → right / the text ← left widens the gap
    const n = Math.max(1, Math.round((pl - tl - tw) / g.lh) + (sel === 'pile' ? dir : -dir)), gap = n * g.lh;
    if (sel === 'pile') S.dx += (tl + tw + gap - pl) / W; else S.cx = (pl - gap - tw) / W;
  } else { const d = dir * (e.shiftKey ? 10 : 1) / W; if (sel === 'pile') S.dx += d; else S.cx += d; }
  nudgeShow(); apply();
  clearTimeout(keyT); keyT = setTimeout(commit, 400);
}, true);
let resizeT = 0, wasLive = null;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(apply, 90); });   // after the page's own layoutAll (50 ms)
setInterval(() => {                                          // the pile's state: the HUD, the zones' pointer events, the rulers
  const on = live(); if (on === wasLive) return; wasLive = on;
  root.classList.toggle('pl-live', on); if (!on) { hov = drag = null; syncCursor(); }
  apply();
}, 150);

/* ---------- boot: the site's values (Reset), the stored ones, then open the polaroids ---------- */
function start() {
  const sp = s => getComputedStyle(capEl, s), fs = parseFloat(getComputedStyle(capEl).fontSize) || 16;
  SITE.a = parseFloat(sp('::before').flexGrow) || 0; SITE.b = parseFloat(sp('::after').flexGrow) || 0;
  SITE.ba = (parseFloat(sp('::before').flexBasis) || 0) / fs; SITE.bb = (parseFloat(sp('::after').flexBasis) || 0) / fs;
  DEF = siteDefaults();
  S = { ...DEF, ...(load() || {}) }; lastSnap = JSON.stringify(S);
  root.classList.add('pl');
  apply();
  if (pol.state === 'home' && !(window.__stacks || []).some(s => s.state !== 'home')) requestAnimationFrame(() => requestAnimationFrame(() => pol.expand()));
}
const ready = () => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(start, 400));
if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
window.__poslab = { get state() { return S; }, get defaults() { return DEF; }, geom, fmt, set(o) { flush(); Object.assign(S, o); commit(); apply(); }, reset() { flush(); DEF = siteDefaults(); S = { ...DEF }; commit(); apply(); } };
})();
