/* typelab.js — the polaroid CAPTION's type lab (site.html?type=1; owner 2026-09-28: "play around with font of the neo, people
   etc on the left from the polaroids … rgb i can put in as color, and all what apple can offer system font wise, drag the
   text around to position it + scale, controls under the page when i scroll, copy paste the values"; then "its all one font
   style, so all settings is for all text" + "one panel control for the whole thing").

   Loaded by site.html only with ?type. It opens the polaroids, measures the live caption (Reset), then replaces the
   caption's content with three free pieces — the name, the role lines, the credits — that share ONE style (one panel).
   Each piece is dragged on its own (⌘-drag moves them all); the scale (corner dot, pinch, ⌥-scroll, the Size slider) scales
   the whole composition about its top corner: the type AND the spaces between the pieces. Nothing here touches the normal
   page: the state lives in localStorage under ?type only; the site keeps its caption until the values are ported into
   POL_CAPTION / the .caption CSS.

   Units (so the values survive another window size): x / y in the page's em (--em), x from the pile's left edge (the
   effective rect's; negative = left of it) to a piece's anchor (its left / centre / right edge by align), y from the pile's
   vertical centre to its top. size in em (1 = the caption as it is: 20 px at a full-size window). tracking in em of the
   type's own size. */
(() => {
'use strict';
const pol = (window.__stacks || []).find(s => s.capEl);
if (!pol) return;
const viewer = document.getElementById('viewer'), shield = document.getElementById('shield'), capEl = pol.capEl;
const KEY = 'site.typelab.v3', OLD = ['site.typelab.v2', 'site.typelab.v1'];   // v3: one style for the whole caption
const IDS = ['name', 'role', 'credits'], LABEL = { name: 'Name', role: 'Role', credits: 'Credits' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
const emPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--em')) || 20;
const vrect = () => viewer.getBoundingClientRect();

/* ---------- fonts: Apple's system faces first (the keyword families reach SF / New York / SF Mono, which have no public
   name in Safari), then every Latin family macOS ships. Named ones are tested in this browser; the missing are disabled. */
const KW = {
  system:  { label: 'SF Pro — system', css: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' },
  rounded: { label: 'SF Pro Rounded — ui-rounded', css: 'ui-rounded, -apple-system, sans-serif' },
  serif:   { label: 'New York — ui-serif', css: 'ui-serif, Georgia, serif' },
  mono:    { label: 'SF Mono — ui-monospace', css: 'ui-monospace, Menlo, monospace' },
};
const FONTS = [
  ['Apple system', ['system', 'rounded', 'serif', 'mono', 'SF Pro Text', 'SF Pro Display', 'SF Compact', 'SF Compact Text', 'SF Compact Display', 'SF Compact Rounded']],
  ['Sans', ['Helvetica Neue', 'Helvetica', 'Avenir Next', 'Avenir Next Condensed', 'Avenir', 'Futura', 'Gill Sans', 'Optima', 'Seravek', 'Lucida Grande',
            'Geneva', 'Skia', 'DIN Alternate', 'DIN Condensed', 'PT Sans', 'PT Sans Narrow', 'Galvji', 'Sukhumvit Set', 'Kohinoor Devanagari', 'Arial',
            'Arial Narrow', 'Verdana', 'Trebuchet MS', 'Tahoma']],
  ['Serif', ['Iowan Old Style', 'Charter', 'Athelas', 'Palatino', 'Hoefler Text', 'Baskerville', 'Big Caslon', 'Didot', 'Bodoni 72', 'Bodoni 72 Oldstyle',
             'Bodoni 72 Smallcaps', 'Cochin', 'Georgia', 'Times', 'Times New Roman', 'Marion', 'Superclarendon', 'Rockwell', 'PT Serif', 'STIX Two Text']],
  ['Mono & typewriter', ['Menlo', 'Monaco', 'Courier', 'Courier New', 'Andale Mono', 'PT Mono', 'American Typewriter']],
  ['Display & script', ['Copperplate', 'Phosphate', 'Herculanum', 'Impact', 'Arial Black', 'Marker Felt', 'Noteworthy', 'Chalkboard SE', 'Chalkduster',
                        'Bradley Hand', 'SignPainter', 'Snell Roundhand', 'Apple Chancery', 'Zapfino', 'Savoye LET', 'Trattatello', 'Luminari', 'Papyrus',
                        'Party LET', 'Academy Engraved LET']],
];
const probe = document.createElement('span');
probe.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:40px;white-space:nowrap;visibility:hidden';
probe.textContent = 'mmmmmwwwlli NEO Head & Body Børnich 1X';
document.body.appendChild(probe);
function hasFont(name) {
  for (const fb of ['monospace', 'serif', 'sans-serif']) {
    probe.style.fontFamily = fb; const w0 = probe.offsetWidth;
    probe.style.fontFamily = `"${name}", ${fb}`; if (probe.offsetWidth !== w0) return true;
  }
  return false;
}
const AVAIL = {}; for (const [, list] of FONTS) for (const f of list) AVAIL[f] = !!KW[f] || hasFont(f);
probe.remove();
const isSF = f => f === 'system' || f === 'rounded' || /^SF /.test(f);
const isNY = f => f === 'serif';
function familyCss(t) {
  if (KW[t.font]) return KW[t.font].css;
  const n = (t.font === 'custom' ? t.custom : t.font || '').replace(/["\\]/g, '').trim();
  return n ? `"${n}", -apple-system, sans-serif` : KW.system.css;
}
function variations(t) {            // SF Pro: opsz 17–96, GRAD 400–1000; New York: opsz 12–256, GRAD 0–1 (the fonts' fvar)
  const v = [];
  if (t.opsz !== 'auto' && (isSF(t.font) || isNY(t.font))) v.push(`"opsz" ${t.opsz}`);
  if (t.grade > 0 && isSF(t.font)) v.push(`"GRAD" ${Math.round(400 + 6 * t.grade)}`);
  if (t.grade > 0 && isNY(t.font)) v.push(`"GRAD" ${r3(t.grade / 100)}`);
  return v.join(', ') || 'normal';
}
const CASES = { none: ['none', 'normal'], upper: ['uppercase', 'normal'], lower: ['lowercase', 'normal'], title: ['capitalize', 'normal'],
                small: ['none', 'small-caps'], allsmall: ['none', 'all-small-caps'] };

/* ---------- state: { style, blocks: { id: { text, x, y } } } ---------- */
let S = null, DEF = null, sel = 'name';
const els = {};
const STYLE0 = { font: 'system', custom: '', size: 1, weight: 400, italic: false, width: 100, opsz: 'auto', grade: 0, leading: 1.2,
                 tracking: -.009, rgb: [199, 199, 204], alpha: 1, case: 'none', align: 'left' };
function measureDefaults() {        // the live caption as the site draws it (flex band left of the pile, 45 / 55, centred)
  const vr = vrect(), em = emPx(), e = pol.eff, cy = e.top + e.height / 2;
  const ttl = [...capEl.querySelectorAll(':scope > div > div:not(.credits) > p')], cr = capEl.querySelector('.credits');
  const cs = getComputedStyle(ttl[0] || capEl), fs = parseFloat(cs.fontSize) || em;
  const at = (el, text) => { const r = el.getBoundingClientRect(); return { text, x: r2((r.left - vr.left - e.left) / em), y: r2((r.top - vr.top - cy) / em) }; };
  const rgb = (cs.color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const d = { style: { ...STYLE0, tracking: r3((parseFloat(cs.letterSpacing) || 0) / fs), weight: Math.round(parseFloat(cs.fontWeight)) || 400,
                       leading: r2((parseFloat(cs.lineHeight) || fs * 1.2) / fs), ...(rgb.length === 3 ? { rgb } : {}) }, blocks: {} };   // Reset = the live CSS (weight / colour / leading too)
  d.blocks.name = at(ttl[0], [ttl[0].textContent]);
  d.blocks.role = ttl[1] ? at(ttl[1], ttl.slice(1).map(p => p.textContent)) : { text: [], x: d.blocks.name.x, y: r2(d.blocks.name.y + 1.2) };
  d.blocks.credits = cr ? at(cr, [...cr.querySelectorAll('p')].map(p => p.textContent)) : { text: [], x: d.blocks.name.x, y: r2(d.blocks.name.y + 8) };
  return d;
}
function sanitize(o, base) {        // o over base; also reads the old per-block shape (v1 / v2: the style from its name block)
  const out = structuredClone(base);
  const src = o?.style || (o?.blocks?.name && 'font' in o.blocks.name ? o.blocks.name : null);
  if (src) {
    const t = out.style;
    for (const k of Object.keys(t)) {
      const v = src[k]; if (v === undefined) continue;
      if (k === 'rgb') { if (Array.isArray(v) && v.length === 3) t.rgb = v.map(c => clamp(Math.round(+c) || 0, 0, 255)); }
      else if (k === 'opsz') t.opsz = v === 'auto' ? 'auto' : clamp(+v || 17, 12, 256);
      else if (typeof t[k] === 'number') { if (Number.isFinite(+v)) t[k] = +v; }
      else if (typeof t[k] === 'boolean') t[k] = !!v;
      else if (typeof v === 'string') t[k] = v;
    }
    t.size = clamp(t.size, .1, 12); t.weight = clamp(Math.round(t.weight), 1, 1000); t.width = clamp(t.width, 30, 150);
    t.alpha = clamp(t.alpha, 0, 1); t.grade = clamp(t.grade, 0, 100);
    if (!['left', 'center', 'right'].includes(t.align)) t.align = 'left';
    if (!CASES[t.case]) t.case = 'none';
  }
  for (const id of IDS) {
    const s = o?.blocks?.[id], b = out.blocks[id]; if (!s || typeof s !== 'object') continue;
    if (Array.isArray(s.text)) b.text = s.text.map(String); else if (typeof s.text === 'string') b.text = s.text.split('\n');
    if (Number.isFinite(+s.x) && s.x !== null) b.x = +s.x;
    if (Number.isFinite(+s.y) && s.y !== null) b.y = +s.y;
  }
  return out;
}
function load() {
  try { for (const k of [KEY, ...OLD]) { const t = localStorage.getItem(k); if (t) return JSON.parse(t); } } catch {}
  return null;
}
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }, 150); }

/* history (⌘Z / ⇧⌘Z): a snapshot per finished edit */
const hist = [], redo = [];
let lastSnap = '';
function commit() { const s = JSON.stringify(S); if (s === lastSnap) return; if (lastSnap) hist.push(lastSnap); if (hist.length > 200) hist.shift(); redo.length = 0; lastSnap = s; }
function restore(s) { S = JSON.parse(s); lastSnap = s; applyAll(); syncPanel(); save(); }

/* ---------- the pieces, in the caption (its opacity / place stay the site's: render() and placeCover()) ---------- */
function build() {
  capEl.textContent = '';
  for (const id of IDS) { const d = document.createElement('div'); d.className = 'tl-b'; d.dataset.id = id; capEl.appendChild(d); els[id] = d; }
  document.documentElement.classList.add('tl');
}
function styleAll() {
  const t = S.style, [tt, fvc] = CASES[t.case];
  const st = {
    fontFamily: familyCss(t), fontSize: `calc(var(--em) * ${t.size})`, fontWeight: String(t.weight), fontStyle: t.italic ? 'italic' : 'normal',
    fontStretch: t.width + '%', fontVariationSettings: variations(t), fontOpticalSizing: 'auto', lineHeight: String(t.leading),
    letterSpacing: t.tracking + 'em', color: `rgb(${t.rgb.join(' ')} / ${t.alpha})`, textTransform: tt, fontVariantCaps: fvc,
    textAlign: t.align, translate: t.align === 'right' ? '-100% 0' : t.align === 'center' ? '-50% 0' : '0 0',
  };
  for (const id of IDS) { const el = els[id], tx = S.blocks[id].text.join('\n'); if (el.textContent !== tx) el.textContent = tx; Object.assign(el.style, st); }
}
function placeBlocks() {
  const e = pol.eff; if (!e) return; const em = emPx(), cy = e.top + e.height / 2;
  for (const id of IDS) { const b = S.blocks[id]; els[id].style.left = (e.left + b.x * em) + 'px'; els[id].style.top = (cy + b.y * em) + 'px'; }
  guides();
}
function applyAll() { styleAll(); placeBlocks(); writeJSON(); }

/* the whole composition scaled by k about its top corner (left / centre / right by align): the type and the gaps */
function rectOf(id) { const r = els[id].getBoundingClientRect(), v = vrect(); return { l: r.left - v.left, t: r.top - v.top, r: r.right - v.left, b: r.bottom - v.top }; }
function union() { const rs = IDS.map(rectOf); return { l: Math.min(...rs.map(q => q.l)), t: Math.min(...rs.map(q => q.t)), r: Math.max(...rs.map(q => q.r)), b: Math.max(...rs.map(q => q.b)) }; }
function groupCorner(u = union()) {  // the scale handle (the bottom corner away from the anchor) and the anchor (top)
  const a = S.style.align;
  return { hx: a === 'right' ? u.l - 7 : u.r + 7, hy: u.b + 7, ax: a === 'right' ? u.r : a === 'center' ? (u.l + u.r) / 2 : u.l, ay: u.t };   // the dot sits on the group box (outline-offset 7)
}
function scaleTo(size, anchor, from) {  // from: { size, blocks } at the gesture's start (so a drag never accumulates rounding)
  const e = pol.eff, em = emPx(), cy = e.top + e.height / 2, k = size / from.size;
  for (const id of IDS) {
    const b0 = from.blocks[id], px = e.left + b0.x * em, py = cy + b0.y * em;
    S.blocks[id].x = r3((anchor.ax + (px - anchor.ax) * k - e.left) / em);
    S.blocks[id].y = r3((anchor.ay + (py - anchor.ay) * k - cy) / em);
  }
  S.style.size = r3(size);
  styleAll(); placeBlocks(); writeJSON(); save();
}
const snapshot = () => ({ size: S.style.size, blocks: structuredClone(S.blocks) });

/* ---------- set: one style key ---------- */
function set(k, v, { quiet } = {}) {
  if (k === 'size') { scaleTo(clamp(v, .1, 12), groupCorner(), snapshot()); if (!quiet) syncPanel(); return; }
  S.style[k] = Array.isArray(v) ? [...v] : v;
  styleAll(); placeBlocks(); writeJSON(); save();
  if (!quiet) syncPanel();
}

/* ---------- on-page editing: drag a piece (⌘ = all of them), the corner dot / pinch / ⌥-scroll scale the whole ---------- */
const ov = document.createElement('div'); ov.className = 'tl-ov'; viewer.appendChild(ov);
const boxes = {}; for (const id of IDS) { const b = document.createElement('div'); b.className = 'tl-box'; ov.appendChild(b); boxes[id] = b; }
const gbox = document.createElement('div'); gbox.className = 'tl-box tl-group'; gbox.innerHTML = '<i></i>'; ov.appendChild(gbox);
const gx = document.createElement('div'), gy = document.createElement('div'), tip = document.createElement('div');
gx.className = 'tl-gx'; gy.className = 'tl-gy'; tip.className = 'tl-tip'; ov.append(gx, gy, tip);
let hov = null, drag = null, showAll = false, swallowClick = false;
const live = () => pol.state === 'open' && S;
function hitAt(cx, cy) {                // → { id, mode: 'scale' | 'move' }
  if (!live()) return null;
  const v = vrect(), x = cx - v.left, y = cy - v.top;
  if (cy < v.top || cy > v.bottom) return null;
  const c = groupCorner(); if (Math.hypot(x - c.hx, y - c.hy) <= 11) return { id: 'all', mode: 'scale' };
  for (const id of [sel, ...IDS.filter(i => i !== sel)]) { const r = rectOf(id), p = 6; if (x >= r.l - p && x <= r.r + p && y >= r.t - p && y <= r.b + p) return { id, mode: 'move' }; }
  return null;
}
function guides() {
  if (!S) return;
  const on = live(), any = on && (showAll || hov || drag);
  for (const id of IDS) {
    const bx = boxes[id], vis = on && (showAll || id === hov?.id || id === drag?.id || drag?.all);
    bx.style.display = vis ? 'block' : 'none'; if (!vis) continue;
    const r = rectOf(id);
    Object.assign(bx.style, { left: r.l + 'px', top: r.t + 'px', width: (r.r - r.l) + 'px', height: (r.b - r.t) + 'px' });
  }
  gbox.style.display = any ? 'block' : 'none';
  if (any) {
    const u = union(), c = groupCorner(u);
    Object.assign(gbox.style, { left: u.l + 'px', top: u.t + 'px', width: (u.r - u.l) + 'px', height: (u.b - u.t) + 'px' });
    gbox.firstChild.style.left = (c.hx - u.l) + 'px'; gbox.firstChild.style.top = (c.hy - u.t) + 'px';
  }
}
function setCursor(h, meta) {
  const c = drag ? (drag.mode === 'scale' ? 'nwse-resize' : 'grabbing') : h ? (h.mode === 'scale' ? 'nwse-resize' : 'grab') : '';
  if (shield.style.cursor !== c) shield.style.cursor = c;
}
function showTip(x, y, text) { tip.textContent = text; tip.style.display = 'block'; tip.style.left = (x + 14) + 'px'; tip.style.top = (y + 16) + 'px'; }
const SNAP = 5;
function snap1(edges, cands) {          // the closest candidate within SNAP px of any edge → [shift, line]
  let best = null;
  for (const e of edges) for (const c of cands) { const d = c - e; if (Math.abs(d) <= SNAP && (!best || Math.abs(d) < Math.abs(best[0]))) best = [d, c]; }
  return best;
}
addEventListener('pointerdown', e => {
  swallowClick = false;
  if (e.button !== 0 || e.pointerType === 'touch') return;
  const h = hitAt(e.clientX, e.clientY);
  if (!h) return;
  e.stopPropagation(); e.preventDefault(); swallowClick = true;
  const all = h.mode === 'scale' || e.metaKey;
  if (h.id !== 'all') sel = h.id;
  drag = { ...h, all, x0: e.clientX, y0: e.clientY, from: snapshot(), r0: all ? union() : rectOf(h.id), c0: groupCorner(),
           others: all ? [] : IDS.filter(i => i !== h.id).map(rectOf), v: vrect() };
  setCursor(); guides();
}, true);
addEventListener('pointermove', e => {
  if (!drag) { if (!S) return; const h = hitAt(e.clientX, e.clientY); if (h?.id !== hov?.id || h?.mode !== hov?.mode) { hov = h; guides(); } setCursor(h); return; }
  e.stopPropagation();
  const em = emPx(), v = drag.v, px = e.clientX - v.left, py = e.clientY - v.top;
  gx.style.display = gy.style.display = 'none';
  if (drag.mode === 'move') {
    let dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }           // ⇧: one axis
    if (!e.altKey) {                                                                     // ⌥: no snapping
      const r = drag.r0, pe = pol.eff, o = drag.others;
      const sx = snap1([r.l + dx, r.r + dx], [...o.flatMap(q => [q.l, q.r]), pe.left, pe.left + pe.width]);
      const sy = snap1([r.t + dy, r.b + dy, (r.t + r.b) / 2 + dy], [...o.flatMap(q => [q.t, q.b]), pe.top, pe.top + pe.height, pe.top + pe.height / 2]);
      if (sx) { dx += sx[0]; Object.assign(gx.style, { display: 'block', left: sx[1] + 'px' }); }
      if (sy) { dy += sy[0]; Object.assign(gy.style, { display: 'block', top: sy[1] + 'px' }); }
    }
    for (const id of drag.all ? IDS : [drag.id]) { const b0 = drag.from.blocks[id]; S.blocks[id].x = r2(b0.x + dx / em); S.blocks[id].y = r2(b0.y + dy / em); }
    placeBlocks(); writeJSON(); save();
    const b = S.blocks[drag.all ? 'name' : drag.id];
    showTip(px, py, drag.all ? `all · x ${b.x.toFixed(2)} em  ·  y ${b.y.toFixed(2)} em` : `x ${b.x.toFixed(2)} em  ·  y ${b.y.toFixed(2)} em`);
  } else {
    const c = drag.c0, d0 = Math.hypot(c.hx - c.ax, c.hy - c.ay) || 1, d1 = Math.hypot(px - c.ax, py - c.ay);
    scaleTo(clamp(drag.from.size * d1 / d0, .1, 12), c, drag.from);
    showTip(px, py, `size ${S.style.size.toFixed(3)} em  ·  ${(S.style.size * em).toFixed(1)} px`);
  }
  syncPanelSoon();
}, true);
addEventListener('pointerup', e => {
  if (!drag) return;
  e.stopPropagation();
  drag = null; tip.style.display = gx.style.display = gy.style.display = 'none';
  commit(); syncPanel(); setCursor(hitAt(e.clientX, e.clientY)); guides();
}, true);
addEventListener('click', e => {
  if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); return; }
  // a click on the empty page in OPEN does not close the viewer here (Esc or the panel's Close does): tuning keeps it open
  if (live() && viewer.contains(e.target) && pol.zoneAt(e.clientX, e.clientY) === null) e.stopPropagation();
}, true);
/* scale by pinch (Safari: gesture events; others: ctrl + wheel) or ⌥ + scroll, over the caption */
let pinch = null, wheelT = 0;
addEventListener('gesturestart', e => { if (!hitAt(e.clientX, e.clientY)) return; e.preventDefault(); pinch = { from: snapshot(), c: groupCorner() }; });
addEventListener('gesturechange', e => { if (!pinch) return; e.preventDefault(); scaleTo(clamp(pinch.from.size * e.scale, .1, 12), pinch.c, pinch.from); syncPanelSoon(); });
addEventListener('gestureend', e => { if (!pinch) return; e.preventDefault(); pinch = null; commit(); syncPanel(); });
addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.altKey)) return;
  if (!hitAt(e.clientX, e.clientY)) return;
  e.preventDefault(); e.stopPropagation();
  scaleTo(clamp(S.style.size * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .002)), .1, 12), groupCorner(), snapshot());
  syncPanelSoon(); clearTimeout(wheelT); wheelT = setTimeout(commit, 250);
}, { capture: true, passive: false });
/* SCROLL (owner 2026-09-28: "it scrolls super weird … only on the zoomed out version and then it gets stuck"): the page's row
   physics eats every vertical wheel at HOME, and in OPEN the wheel over the viewer never scrolled the page. In ?type the
   page's vertical scroll is this script's: a stream (gaps < 100 ms, performance.now()) locks its axis on its first event;
   vertical → the page (every state, anywhere), horizontal → left to the row (HOME). A box that can scroll keeps its wheel. */
let wStream = null;
addEventListener('wheel', e => {
  if (e.ctrlKey || e.altKey) return;                                                     // the scale gestures (above)
  const now = performance.now();
  if (!wStream || now - wStream.t > 100) wStream = { axis: Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? 'y' : 'x' };
  wStream.t = now;
  if (wStream.axis === 'x') return;                                                      // sideways: the row's (HOME), or nothing
  const ta = e.target.closest?.('textarea, select');
  if (ta && ta.scrollHeight > ta.clientHeight + 1) return;                               // a scrollable box scrolls itself
  e.preventDefault(); e.stopPropagation();
  if ((window.__stacks || []).some(s => s.state === 'zoom' || s.state === 'close')) return;   // the zoom / close run at the top
  const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
  scrollBy(0, e.deltaY * k);
}, { capture: true, passive: false });
addEventListener('keydown', e => {
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
    e.preventDefault();
    if (e.shiftKey) { const s = redo.pop(); if (s) { hist.push(lastSnap); restore(s); } }
    else { const s = hist.pop(); if (s) { redo.push(lastSnap); restore(s); } }
    return;
  }
  if (typing || !S || e.metaKey || e.ctrlKey) return;
  if (e.key === 'Escape' && pol.state === 'open') { pol.collapse(); return; }
  if (!live()) return;
  const em = emPx(), step = (e.shiftKey ? 10 : 1) / em;
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (mv) {                                          // the whole caption; ⌥ = only the piece last dragged
    e.preventDefault();
    for (const id of e.altKey ? [sel] : IDS) { const b = S.blocks[id]; b.x = r2(b.x + mv[0]); b.y = r2(b.y + mv[1]); }
    placeBlocks(); writeJSON(); save(); syncPanel(); clearTimeout(wheelT); wheelT = setTimeout(commit, 400); return;
  }
  if (e.key === '=' || e.key === '+' || e.key === '-') {
    e.preventDefault(); const f = (e.key === '-' ? -1 : 1) * (e.shiftKey ? .05 : .01);
    set('size', S.style.size * (1 + f)); clearTimeout(wheelT); wheelT = setTimeout(commit, 400);
  }
  if (e.key === 'g') { showAll = !showAll; guidesBox.checked = showAll; guides(); }
});
let resizeT = 0;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(placeBlocks, 120); });   // after the page's own layoutAll (50 ms)

/* ---------- the panel, under the page: ONE set of controls for the whole caption ---------- */
const css = document.createElement('style');
css.textContent = `
  html.tl .caption { display: block; }
  html.tl .caption::before, html.tl .caption::after { display: none; }
  html.tl .caption > .tl-b { position: absolute; white-space: pre; }
  .tl-ov { position: absolute; inset: 0; z-index: 100; pointer-events: none; }
  .tl-box { position: absolute; display: none; outline: 1px dashed rgba(0, 122, 255, .4); outline-offset: 3px; }
  .tl-box.tl-group { outline: 1px solid rgba(0, 122, 255, .7); outline-offset: 7px; }
  .tl-box > i { position: absolute; width: 9px; height: 9px; translate: -50% -50%; border-radius: 50%;
                background: #fff; box-shadow: 0 0 0 1.25px #007AFF, 0 1px 3px rgba(0,0,0,.2); }
  .tl-gx, .tl-gy { position: absolute; display: none; background: rgba(255, 45, 85, .7); }
  .tl-gx { top: 0; bottom: 0; width: 1px; } .tl-gy { left: 0; right: 0; height: 1px; }
  .tl-tip { position: absolute; display: none; padding: 3px 7px; border-radius: 6px; background: rgba(28,28,30,.82); color: #fff;
            font: 500 11px/1.3 -apple-system, sans-serif; letter-spacing: 0; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tl-panel { --line: #E5E5EA; --dim: #8E8E93; --ink: #1D1D1F; --acc: #007AFF;
              background: #fff; color: var(--ink); border-top: 1px solid var(--line); padding: 20px 28px 48px;
              font: 12px/1.35 -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; -webkit-user-select: text; user-select: text; accent-color: var(--acc); }
  .tl-panel * { box-sizing: border-box; }
  .tl-top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
  .tl-top h2 { font-size: 13px; font-weight: 600; margin: 0 6px 0 0; }
  .tl-top .hint { color: var(--dim); flex: 1 1 320px; }
  .tl-top label { display: inline-flex; gap: 5px; align-items: center; }
  .tl-card { border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 28px; }
  @media (max-width: 1000px) { .tl-card { grid-template-columns: 1fr; } }
  .tl-sec h3 { margin: 0 0 6px; font-size: 11px; font-weight: 600; color: var(--dim); text-transform: uppercase; letter-spacing: .04em; }
  .tl-row { display: grid; grid-template-columns: 76px minmax(0, 1fr) 62px; gap: 8px; align-items: center; min-height: 25px; }
  .tl-row > span:first-child { color: var(--dim); }
  .tl-row > span:first-child small { color: #AEAEB2; font-size: 11px; }
  .tl-row.wide { grid-template-columns: 76px minmax(0, 1fr); }
  .tl-row.off { opacity: .38; }
  .tl-row.top { align-items: start; } .tl-row.top > span:first-child { padding-top: 3px; }
  .tl-panel input[type=range] { width: 100%; margin: 0; }
  .tl-panel input[type=number], .tl-panel input[type=text], .tl-panel select, .tl-panel textarea {
    font: inherit; font-variant-numeric: tabular-nums; color: var(--ink); border: 1px solid #D1D1D6; border-radius: 6px; background: #fff; padding: 2px 5px; min-width: 0; }
  .tl-panel input[type=number] { width: 100%; }
  .tl-panel select { width: 100%; height: 23px; }
  .tl-panel textarea { width: 100%; resize: vertical; line-height: 1.3; }
  .tl-flex { display: flex; gap: 6px; align-items: center; min-width: 0; }
  .tl-flex input[type=number] { width: 52px; }
  .tl-flex input[type=text] { width: 76px; }
  .tl-flex input.xy { width: 68px; }
  .tl-flex > select { flex: 1 1 0; width: auto; }
  .tl-flex > label, .tl-flex > .tl-seg { flex: none; }
  .tl-panel input[type=color] { width: 30px; height: 23px; padding: 0 2px; border: 1px solid #D1D1D6; border-radius: 6px; background: #fff; }
  .tl-sw { display: flex; flex-wrap: wrap; gap: 5px; }
  .tl-sw button { width: 18px; height: 18px; border-radius: 50%; border: 0; padding: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); cursor: pointer; }
  .tl-seg { display: inline-flex; border: 1px solid #D1D1D6; border-radius: 6px; overflow: hidden; }
  .tl-seg button { font: inherit; border: 0; background: #fff; padding: 2px 9px; cursor: pointer; color: var(--ink); }
  .tl-seg button + button { border-left: 1px solid #D1D1D6; }
  .tl-seg button.on { background: var(--acc); color: #fff; }
  .tl-btn { font: inherit; border: 1px solid #D1D1D6; background: #fff; border-radius: 7px; padding: 4px 11px; cursor: pointer; color: var(--ink); }
  .tl-btn.pri { background: var(--acc); border-color: var(--acc); color: #fff; }
  .tl-piece { margin-bottom: 6px; }
  .tl-piece .tl-flex { margin-bottom: 3px; }
  .tl-piece b { font-weight: 500; flex: 1; }
  .tl-vals { margin-top: 14px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
  .tl-vals textarea { font: 11px/1.45 ui-monospace, Menlo, monospace; height: 112px; white-space: pre; }
  .tl-vals .btns { display: flex; flex-direction: column; gap: 6px; }
  .tl-vals .msg { color: var(--dim); font-size: 11px; min-height: 14px; }
  .tl-px { color: var(--dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
`;
document.head.appendChild(css);

const h = (tag, props = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') el.className = v; else if (k in el) el[k] = v; else el.setAttribute(k, v); } for (const c of kids) if (c != null) el.append(c); return el; };
const panel = h('section', { class: 'tl-panel' });
document.body.appendChild(panel);
const syncers = [];                  // () => void: every control reads the state back
let syncQ = 0;
function syncPanel() { cancelAnimationFrame(syncQ); syncQ = 0; for (const f of syncers) f(); }
function syncPanelSoon() { if (!syncQ) syncQ = requestAnimationFrame(syncPanel); }

// top bar
const guidesBox = h('input', { type: 'checkbox' });
const openBtn = h('button', { class: 'tl-btn', type: 'button' });
guidesBox.onchange = () => { showAll = guidesBox.checked; guides(); };
openBtn.onclick = () => {
  if (pol.state === 'open') pol.collapse();
  else if (pol.state === 'home') { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => pol.expand(), 350); }
};
syncers.push(() => { openBtn.textContent = pol.state === 'home' ? 'Open polaroids' : 'Close polaroids'; });
panel.append(h('div', { class: 'tl-top' },
  h('h2', {}, 'Caption type'),
  h('label', { title: 'G' }, guidesBox, 'Show boxes'),
  openBtn,
  h('span', { class: 'hint' }, 'Drag a piece to move it (⌘ moves all, ⇧ one axis, ⌥ no snap) · corner dot, pinch or ⌥-scroll scales the whole caption · arrows nudge all (⇧ ×10, ⌥ just the last piece) · = / − scale · ⌘Z undo · Esc closes')));

// controls
const COLOR_SW = [['#8E8E93', 'systemGray'], ['#AEAEB2', 'systemGray2'], ['#C7C7CC', 'systemGray3 — the site'], ['#D1D1D6', 'systemGray4'],
  ['#E5E5EA', 'systemGray5'], ['#F2F2F7', 'systemGray6'], ['#6E6E73', 'apple.com secondary'], ['#86868B', 'apple.com tertiary'],
  ['#1D1D1F', 'apple.com text'], ['#000000', 'label'], ['#3C3C43', 'secondaryLabel (use opacity .6)'], ['#007AFF', 'systemBlue']];
const hex = rgb => '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
const unhex = s => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim()); if (!m) return null; let t = m[1]; if (t.length === 3) t = [...t].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(t.slice(i, i + 2), 16)); };
function slider(key, label, min, max, step, fmt = v => v, { cond } = {}) {
  const rg = h('input', { type: 'range', min, max, step }), nb = h('input', { type: 'number', min, max, step });
  const row = h('div', { class: 'tl-row' }, h('span', {}, label), rg, nb);
  rg.oninput = () => { set(key, +rg.value, { quiet: true }); nb.value = fmt(+rg.value); syncPanelSoon(); };
  rg.onchange = commit;
  nb.onchange = () => { const v = +nb.value; if (Number.isFinite(v)) { set(key, v); commit(); } };
  syncers.push(() => { const v = S.style[key]; if (document.activeElement !== nb) nb.value = fmt(v); if (document.activeElement !== rg) rg.value = v; if (cond) row.classList.toggle('off', !cond(S.style)); });
  return row;
}
// type
const fsel = h('select');
for (const [g, list] of FONTS) {
  const og = h('optgroup', { label: g });
  for (const f of list) og.append(h('option', { value: f, disabled: !AVAIL[f], textContent: (KW[f]?.label || f) + (AVAIL[f] ? '' : '  (not in this browser)') }));
  fsel.append(og);
}
fsel.append(h('optgroup', { label: 'Other' }, h('option', { value: 'custom', textContent: 'Custom family name…' })));
const custom = h('input', { type: 'text', placeholder: 'family name', spellcheck: false }); custom.style.width = '100%';
const crow = h('div', { class: 'tl-row wide' }, h('span', {}, ''), custom);
fsel.onchange = () => { set('font', fsel.value); commit(); };
custom.oninput = () => set('custom', custom.value, { quiet: true }); custom.onchange = commit;
syncers.push(() => { const t = S.style; fsel.value = t.font; if (fsel.value !== t.font) fsel.value = 'custom'; crow.style.display = t.font === 'custom' ? '' : 'none'; if (document.activeElement !== custom) custom.value = t.custom; });
const sizeRow = slider('size', 'Size em', .3, 5, .005, v => r3(v)), sizePx = h('small');
sizeRow.firstChild.append(' ', sizePx);
syncers.push(() => { sizePx.textContent = Math.round(S.style.size * emPx() * 10) / 10 + 'px'; });
const oAuto = h('input', { type: 'checkbox', title: 'auto = the size in px (Safari picks SF Text ↔ Display by size)' });
const oRg = h('input', { type: 'range', min: 12, max: 96, step: .5 }), oNb = h('input', { type: 'number', min: 12, max: 256, step: .5 });
const orow = h('div', { class: 'tl-row' }, h('span', {}, 'Optical'), h('div', { class: 'tl-flex' }, h('label', { class: 'tl-flex' }, oAuto, 'auto'), oRg), oNb);
const autoOpsz = () => r2(clamp(S.style.size * emPx(), 12, 96));
oAuto.onchange = () => { set('opsz', oAuto.checked ? 'auto' : autoOpsz()); commit(); };
oRg.oninput = () => { set('opsz', +oRg.value, { quiet: true }); oNb.value = oRg.value; }; oRg.onchange = commit;
oNb.onchange = () => { set('opsz', clamp(+oNb.value || 17, 12, 256)); commit(); };
syncers.push(() => { const t = S.style, a = t.opsz === 'auto'; oAuto.checked = a; oRg.disabled = oNb.disabled = a; const v = a ? autoOpsz() : t.opsz; oRg.value = v; if (document.activeElement !== oNb) oNb.value = v; orow.classList.toggle('off', !(isSF(t.font) || isNY(t.font))); });
const typeSec = h('div', { class: 'tl-sec' }, h('h3', {}, 'Type'),
  h('div', { class: 'tl-row wide' }, h('span', {}, 'Font'), fsel), crow,
  sizeRow,
  slider('weight', 'Weight', 1, 1000, 1),
  slider('width', 'Width %', 30, 150, 1, v => v, { cond: t => isSF(t.font) || !KW[t.font] }),
  orow,
  slider('grade', 'Grade', 0, 100, 1, v => v, { cond: t => isSF(t.font) || isNY(t.font) }));
// colour & spacing
const pick = h('input', { type: 'color' }), R = h('input', { type: 'number', min: 0, max: 255, step: 1 }), G = h('input', { type: 'number', min: 0, max: 255, step: 1 }),
      B = h('input', { type: 'number', min: 0, max: 255, step: 1 }), hx = h('input', { type: 'text', spellcheck: false, title: 'hex, or paste rgb(…) / "199, 199, 204"' });
const fromRGB = () => set('rgb', [R, G, B].map(i => clamp(Math.round(+i.value) || 0, 0, 255)));
for (const i of [R, G, B]) { i.oninput = fromRGB; i.onchange = commit; }
pick.oninput = () => set('rgb', unhex(pick.value)); pick.onchange = commit;
hx.onchange = () => {
  const nums = hx.value.match(/\d+(\.\d+)?/g);
  const v = unhex(hx.value) || (nums && nums.length >= 3 && !/#/.test(hx.value) ? nums.slice(0, 3).map(n => clamp(Math.round(+n), 0, 255)) : null);
  if (v) { set('rgb', v); if (nums && nums.length === 4 && /rgba?\(/i.test(hx.value)) set('alpha', clamp(+nums[3], 0, 1)); commit(); } else syncPanel();
};
syncers.push(() => { const c = S.style.rgb; [R, G, B].forEach((i, k) => { if (document.activeElement !== i) i.value = c[k]; }); pick.value = hex(c).toLowerCase(); if (document.activeElement !== hx) hx.value = hex(c); });
const sw = h('div', { class: 'tl-sw' });
for (const [c, name] of COLOR_SW) { const bt = h('button', { type: 'button', title: `${name}  ${c}` }); bt.style.background = c; bt.onclick = () => { set('rgb', unhex(c)); commit(); }; sw.append(bt); }
const cs = h('select', {}, ...[['none', 'As typed'], ['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['title', 'Capitalize'], ['small', 'Small caps'], ['allsmall', 'All small caps']].map(([v, t]) => h('option', { value: v, textContent: t })));
cs.onchange = () => { set('case', cs.value); commit(); };
const it = h('input', { type: 'checkbox' }); it.onchange = () => { set('italic', it.checked); commit(); };
const seg = h('div', { class: 'tl-seg' }, ...['left', 'center', 'right'].map(a => { const bt = h('button', { type: 'button', textContent: a[0].toUpperCase() + a.slice(1), title: 'align (each piece keeps its place: its anchor moves to this edge)' }); bt.dataset.a = a; return bt; }));
seg.onclick = e => {
  const a = e.target.dataset?.a; if (!a || S.style.align === a) return;
  const f = { left: 0, center: .5, right: 1 }, em = emPx();
  for (const id of IDS) { const w = els[id].getBoundingClientRect().width / em; S.blocks[id].x = r2(S.blocks[id].x + (f[a] - f[S.style.align]) * w); }
  set('align', a); commit();
};
syncers.push(() => { const t = S.style; cs.value = t.case; it.checked = t.italic; for (const bt of seg.children) bt.classList.toggle('on', bt.dataset.a === t.align); });
const colorSec = h('div', { class: 'tl-sec' }, h('h3', {}, 'Colour & spacing'),
  h('div', { class: 'tl-row wide' }, h('span', {}, 'Color'), h('div', { class: 'tl-flex' }, pick, 'R', R, 'G', G, 'B', B, hx)),
  slider('alpha', 'Opacity', 0, 1, .01, v => r2(v)),
  h('div', { class: 'tl-row wide' }, h('span', {}, ''), sw),
  slider('leading', 'Leading', .7, 3, .01, v => r2(v)),
  slider('tracking', 'Tracking', -.1, .4, .001, v => r3(v)),
  h('div', { class: 'tl-row wide' }, h('span', {}, 'Style'), h('div', { class: 'tl-flex' }, h('label', { class: 'tl-flex' }, it, 'Italic'), cs, seg)));
// text & places (per piece: its words and where it sits; the style above is shared)
const textSec = h('div', { class: 'tl-sec' }, h('h3', {}, 'Text & position (em)'));
for (const id of IDS) {
  const X = h('input', { type: 'number', step: .05, class: 'xy', title: 'x: em from the pile’s left edge' }), Y = h('input', { type: 'number', step: .05, class: 'xy', title: 'y: em from the pile’s centre' });
  const ta = h('textarea', { rows: 1, spellcheck: false });
  const move = () => { if (Number.isFinite(+X.value) && Number.isFinite(+Y.value)) { S.blocks[id].x = +X.value; S.blocks[id].y = +Y.value; placeBlocks(); writeJSON(); save(); commit(); } };
  X.onchange = Y.onchange = move;
  ta.oninput = () => { S.blocks[id].text = ta.value.split('\n'); styleAll(); placeBlocks(); writeJSON(); save(); }; ta.onchange = commit;
  syncers.push(() => { const b = S.blocks[id]; if (document.activeElement !== X) X.value = b.x; if (document.activeElement !== Y) Y.value = b.y;
                       if (document.activeElement !== ta) { ta.value = b.text.join('\n'); ta.rows = clamp(b.text.length, 1, 6); } });
  textSec.append(h('div', { class: 'tl-piece' }, h('div', { class: 'tl-flex' }, h('b', {}, LABEL[id]), 'x', X, 'y', Y), ta));
}
panel.append(h('div', { class: 'tl-card' }, typeSec, colorSec, textSec));

// values: copy / paste / reset
const vals = h('textarea', { spellcheck: false }), msg = h('div', { class: 'msg' });
let dirty = false;                  // the box holds typed edits not yet applied: on-page edits leave it alone until Apply / Copy / Reset
function fmtJSON(s) {
  const e = emPx(), v = vrect();
  const one = o => JSON.stringify(o).replace(/,"/g, ', "').replace(/":/g, '": ');
  return `{\n  "at": "${Math.round(v.width)}×${Math.round(v.height)}, em ${r2(e)} px",\n  "style": ${one(s.style)},\n  "blocks": {\n` +
         IDS.map(id => `    "${id}": ${one(s.blocks[id])}`).join(',\n') + `\n  }\n}`;
}
function writeJSON() { if (!S || dirty) return; vals.value = fmtJSON(S); }
function note(t) { msg.textContent = t; clearTimeout(note.t); note.t = setTimeout(() => (msg.textContent = ''), 2600); }
function applyText(t, quietFail) {
  try { const o = JSON.parse(t); S = sanitize(o, S); dirty = false; applyAll(); syncPanel(); save(); commit(); note('Applied.'); return true; }
  catch (err) { if (!quietFail) note('Not valid JSON: ' + err.message); return false; }
}
const copyBtn = h('button', { class: 'tl-btn pri', type: 'button', textContent: 'Copy' });
copyBtn.onclick = async () => {
  const t = fmtJSON(S); dirty = false; vals.value = t;
  try { await navigator.clipboard.writeText(t); } catch { vals.select(); document.execCommand('copy'); }
  note('Copied — paste it to Claude or back in here.');
};
const applyBtn = h('button', { class: 'tl-btn', type: 'button', textContent: 'Apply' }); applyBtn.onclick = () => applyText(vals.value);
const resetBtn = h('button', { class: 'tl-btn', type: 'button', textContent: 'Reset', title: 'back to the caption as the site draws it' });
resetBtn.onclick = () => { S = structuredClone(DEF); dirty = false; applyAll(); syncPanel(); save(); commit(); note('Reset to the live site caption.'); };
vals.addEventListener('paste', () => setTimeout(() => applyText(vals.value, true), 0));
vals.addEventListener('input', () => { if (!dirty) { dirty = true; note('Edited — Apply to use it (Copy / Reset drop the edit).'); } });
panel.append(h('div', { class: 'tl-vals' }, h('div', {}, vals, msg), h('div', { class: 'btns' }, copyBtn, applyBtn, resetBtn)));

/* ---------- boot: open the polaroids, measure the live caption, take it over ---------- */
function start() {
  DEF = measureDefaults();
  S = sanitize(load() || DEF, DEF);
  build(); applyAll(); syncPanel(); commit();
  setInterval(() => { openBtn.textContent = pol.state === 'home' ? 'Open polaroids' : 'Close polaroids'; }, 300);
}
function whenOpen(f) { (function w() { if (pol.state === 'open' && pol.eff) f(); else requestAnimationFrame(w); })(); }
function go() {
  if (pol.state === 'home' && !(window.__stacks || []).some(s => s.state !== 'home')) pol.expand();
  whenOpen(() => requestAnimationFrame(start));
}
const ready = () => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(go, 400));
if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
window.__typelab = { get state() { return S; }, get defaults() { return DEF; }, set, applyText, fmt: () => fmtJSON(S) };
})();
