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
   gray ?ma=3, two tones = the site since 2026-10-06 (?ma=1), ?ma=4 strict, ?ma=5 one ink, ?ma=2 Mike's). TEXT (owner 2026-10-06: "lemme
   just type there, and add spaces with shift enter"; it replaces the GROUPING menu of the same day): double-click the caption (or Edit text)
   and type in place — Enter starts a new line, ⇧Enter adds HALF A LINE of space (press it again for more: 2 = one line, 3 = the 1.5 lines the
   site keeps before the names), Backspace at a line's start / Delete at its end removes one, Esc or a click outside finishes. The first line
   takes the title's tone, the lines after the last space the names' (the tones' hooks). Stored as text, a blank line = half a line of space.
   SWAP (site.html?swap=1; owner 2026-10-06: "remove all else ui, just I can swap between two, still edit it via text box by typing and entering and
   swap between two with arrows"): no bar, no rulers, no dragging — ← → swap the caption VARIANTS (the site's POL_VARS: 1 one ink, 2 two tones),
   a click on the text types in it (as TEXT), C copies the values. 2026-10-07 (owner: "add … ability to modify spacing and text to cd and macbook
   open. Lock the current position of text"): ↑ ↓ (or 1 2 3, row order) open the next CAPTIONED stack — the MacBook, the polaroids, the CD — each
   with its own text (shared by the variants), stored under 'site.swaplab.v1' as { cur, pile, copy: { name: text } }; C copies every text as a JS
   string. The place is never the lab's: the site's LOCK (the .caption.lock CSS) keeps each type's top-left corner where its reference text puts it.
   Copy puts the values on the clipboard; they port as openDx + the band's split (margin / (margin + gap)) in the .caption CSS.
   The page's own clicks in OPEN (flip, close, the camera's move to a neighbour) are off here; Esc closes. Nothing touches the normal
   page: the state lives in localStorage under ?pos only. */
(() => {
'use strict';
let pol = (window.__stacks || []).find(s => s.name === 'polaroids');
if (!pol?.capEl || !window.__row?.layoutAll || !('openDx' in pol)) return;
const viewer = document.getElementById('viewer'), root = document.documentElement;
let capEl = pol.capEl;                                        // let: the SWAP page switches between the captioned stacks (pol / capEl = the one open)
/* SWAP 2026-10-07 (owner: "add to …?swap=1 ability to modify spacing and text to cd and macbook open. Lock the current position of text. It
   shouldnt be changable"): every stack with a caption, in row order — ↑ ↓ (or 1 2 3) open the next one; its text types the same way. The
   place is the site's LOCK (the .caption.lock CSS): the type's corner stays where the reference text puts it, so nothing here moves it. */
const CAPS = [...document.querySelectorAll('#row > .wrap')].map(w => (window.__stacks || []).find(s => s.wrap === w && s.capEl)).filter(Boolean);
const CAP_NAME = { polaroids: 'Polaroids', macbook: 'MacBook', dandelion: 'CD', trianglebob: 'Triangle Bob', thedot: 'The Dot', friends: 'Dandelion' };
const blockOf = st => st.capEl.querySelector('.cap-live') || st.capEl.firstElementChild;   // the type: the lines (a locked caption's live lines)
const VAR = new URLSearchParams(location.search).get('var');
const BARE = new URLSearchParams(location.search).has('swap');   // the SWAP page: no UI but the text and the arrows
const KEY = BARE ? 'site.swaplab.v1' : 'site.poslab.v1' + (VAR ? ':var' + VAR : '');   // a variant (?var=N) keeps its own lab state
const vrect = () => viewer.getBoundingClientRect();
const block = () => blockOf(pol);                            // the caption's type: the lines, then the credits
const lineH = () => parseFloat(getComputedStyle(capEl).lineHeight) || 20;   // one caption line (px): the unit of every interval
const SNAPK = 'site.poslab.snap';
const SITE_HTML_OF = new Map(CAPS.map(st => [st, blockOf(st).innerHTML]));   // each stack's own caption (TEXT: S.copy null)
const SP_EM = .6;                                             // one ⇧Enter: half a line of the caption (its leading 1.2em)
function siteCopy(grp, st = pol) {                            // the site's caption as lab text ('' = half a line of space); grp: the GROUPING menu's old states
  const tmp = document.createElement('div'); tmp.innerHTML = SITE_HTML_OF.get(st) ?? blockOf(st).innerHTML;
  if (tmp.querySelector(':scope > .cap-sp, :scope > p')) return [...tmp.children].map(k => k.classList.contains('cap-sp') ? '' : k.textContent).join('\n');   // a TEXT caption (?var=N)
  const title = [...tmp.querySelectorAll(':scope > div:not(.credits) > p')].map(p => p.textContent);
  const names = [...tmp.querySelectorAll(':scope > .credits > p')].map(p => p.textContent);
  const [gk, gs] = (grp || 'none').split(':'), n = gs === '0.5' ? 1 : 2, out = [];
  title.forEach((t, i) => {
    if (i === 1 && (gk === 'neo' || gk === 'three')) out.push(...Array(n).fill(''));
    if (i > 0 && t.trim() === '1X' && (gk === 'three' || gk === '1x')) out.push(...Array(n).fill(''));
    out.push(t);
  });
  if (names.length) out.push('', '', '', ...names);          // .credits margin-top 1.8em = 1.5 lines = three halves
  return out.join('\n');
}
const live = () => pol.state === 'open';
const r0 = Math.round;
const TONES = [['site', 'One ink', 'One ink · the site (?ma=5)'], ['1', 'Two tones', 'Two tones · ?ma=1'], ['3', 'Quiet gray', 'Quiet gray · ?ma=3'],
               ['4', 'Strict', 'Strict contrast · ?ma=4'], ['2', 'Mike\'s', 'Mike\'s hierarchy · ?ma=2']];   // [key, menu, Copy values]; the site = one ink (?ma=5): var 1 (2026-10-06, and again 2026-10-07 later; two tones, var 2, was the site 2026-10-07 morning)
const okTone = t => TONES.some(([k]) => k === t);
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); if (!o || !Number.isFinite(o.dx) || !Number.isFinite(o.cx)) return null;
  const r = { dx: o.dx, cx: o.cx }; if (o.al === 'left' || o.al === 'right') r.al = o.al; if (okTone(o.tone)) r.tone = o.tone;
  if (typeof o.copy === 'string') r.copy = o.copy; else if (/^(three|neo|1x):/.test(o.grp || '')) r.copy = siteCopy(o.grp);   // the old GROUPING menu → text
  return r; } catch { return null; } };
const save = () => { if (BARE) { if (typeof S.copy === 'string') texts[pol.name] = S.copy; bareSave(); return; } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };   // SWAP: its own store ({ cur, copy }) — the lab's state over it lost the variant

/* ---------- the site's own values (Reset): its openDx, and where its band puts the caption (the ::before / ::after split) ---------- */
const SITE = { dx: pol.openDx, a: 1, b: 2, ba: 0, bb: 0,
               al: root.dataset.align === 'hug' ? 'right' : 'left', tone: okTone(root.dataset.ma) ? root.dataset.ma : 'site' };   // the URL's own align / tone (?ma=5 = the site's one ink)   // the site's openDx and its band's spacers: grow a : b, bases ba / bb in em of the caption (read at boot, before the lab's CSS; &align=hug = 1 : 0 + 3.6em)
function siteDefaults() {                                    // at the current size: the band at the site's openDx (eff.left moves 1 : 1 with openDx × W), laid out as its flex spacers do
  const W = vrect().width, e = pol.eff, tw = block().offsetWidth, fs = parseFloat(getComputedStyle(capEl).fontSize) || 16;
  const band = Math.max(0, (e ? e.left : 0) - (pol.openDx - SITE.dx) * W), a = SITE.a, b = SITE.b, ba = SITE.ba * fs, bb = SITE.bb * fs;
  const free = Math.max(0, band - tw - ba - bb);
  return { dx: SITE.dx, cx: (ba + (a + b > 0 ? free * a / (a + b) : 0)) / W, al: SITE.al, tone: SITE.tone, copy: null };
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
  if (!editing) renderCopy();
}
/* ---------- TEXT: the caption as typed — lines (<p>) and spaces (.pl-sp, half a line each), in the site's own type box ---------- */
const spEl = () => { const d = document.createElement('div'); d.className = 'pl-sp'; d.contentEditable = 'false'; d.title = 'Click to remove this half line of space'; return d; };
const lnEl = t => { const q = document.createElement('p'); if (t) q.textContent = t; else q.append(document.createElement('br')); return q; };
function renderCopy() {
  const inner = block(), txt = S.copy;
  root.classList.toggle('pl-txt', txt != null);
  if (txt == null) { if ('pl' in inner.dataset) { inner.innerHTML = SITE_HTML_OF.get(pol); delete inner.dataset.pl; } return; }
  if (inner.dataset.pl === txt) return;
  inner.replaceChildren(...txt.split('\n').map(t => t === '' ? spEl() : lnEl(t)));
  classify(); inner.dataset.pl = txt;
}
function classify() {                                         // the tones' hooks: the first line = the title (.ma-title), the lines after the last space = the names (.credits)
  const kids = [...block().children], ps = kids.filter(k => k.tagName === 'P');
  let last = -1; kids.forEach((k, i) => { if (k.classList.contains('pl-sp')) last = i; });
  ps.forEach(q => { q.classList.toggle('ma-title', q === ps[0]); q.classList.toggle('credits', last >= 0 && kids.indexOf(q) > last); });
}
function readCopy() {                                         // the edited box → text ('' = a space); empty lines drop, stray text nodes count as lines
  const out = [];
  for (const n of block().childNodes) {
    if (n.nodeType === 1 && n.classList.contains('pl-sp')) { out.push(''); continue; }
    const t = (n.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+$/, '');
    if (t.trim()) out.push(...t.split('\n').filter(x => x.trim()));
  }
  return out.join('\n');
}
let editing = false;
function startEdit(x, y) {                                    // double-click on the caption (x, y: the caret there) or Edit text (the caret at the end)
  if (editing || !S || !live()) return;
  if (S.copy == null) { S.copy = siteCopy(); renderCopy(); }  // the site's caption as text (no visible change)
  const inner = block();
  editing = true; hov = drag = null; syncCursor(); root.classList.add('pl-edit');
  inner.contentEditable = 'true'; inner.spellcheck = false; inner.focus({ preventScroll: true });
  const sel = getSelection(), r = x != null && document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
  sel.removeAllRanges();
  if (r && inner.contains(r.startContainer)) sel.addRange(r);
  else { const e = document.createRange(); e.selectNodeContents(inner.lastElementChild || inner); e.collapse(false); sel.addRange(e); }
  apply();
}
function endEdit() {
  if (!editing) return;
  const inner = block();
  editing = false; root.classList.remove('pl-edit'); inner.contentEditable = 'false'; inner.blur(); getSelection().removeAllRanges();
  S.copy = readCopy(); delete inner.dataset.pl; renderCopy();
  if (BARE) { texts[pol.name] = S.copy; bareSave(); }                                    // SWAP: this stack's text (both variants share it); the place is the LOCK's
  commit(); apply();
}
const lineOf = () => { const s = getSelection(); if (!s.rangeCount) return null; let n = s.getRangeAt(0).startContainer; while (n && n.parentNode !== block()) n = n.parentNode; return n; };   // the box's child holding the caret
const caretTo = (q, end) => { const r = document.createRange(); r.selectNodeContents(q); r.collapse(!end); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
const edgeOf = (q, r, end) => { const t = document.createRange(); if (end) { t.setStart(r.endContainer, r.endOffset); t.setEnd(q, q.childNodes.length); } else { t.setStart(q, 0); t.setEnd(r.startContainer, r.startOffset); } return t.toString() === ''; };
function asLine(n) {                                          // a stray text node / <br> at the box's top level → a <p> (the caret goes to its end)
  if (!n || (n.nodeType === 1 && n.tagName === 'P')) return n;
  const q = document.createElement('p'); n.before(q); q.append(n); caretTo(q, true); return q;
}
function newLine() {                                          // Enter: the line splits at the caret, the caret at the new line's start
  const s = getSelection(); if (!s.rangeCount) return null;
  s.getRangeAt(0).deleteContents();
  const q = asLine(lineOf()); if (!q) return null;
  const r = s.getRangeAt(0), tail = document.createRange();
  tail.setStart(r.startContainer, r.startOffset); tail.setEnd(q, q.childNodes.length);
  const nq = document.createElement('p'); nq.append(tail.extractContents());
  if (!nq.textContent) nq.replaceChildren(document.createElement('br'));
  if (!q.textContent) q.replaceChildren(document.createElement('br'));
  q.after(nq); caretTo(nq, false); return nq;
}
function addSpace() {                                         // ⇧Enter: half a line of space — after the line (caret at its end), before it (at its start), or between its halves
  const s = getSelection(); if (!s.rangeCount) return;
  s.getRangeAt(0).deleteContents();
  const q = asLine(lineOf()); if (!q) return;
  const r = s.getRangeAt(0), atStart = edgeOf(q, r, false), atEnd = edgeOf(q, r, true);
  if (atStart) { q.before(spEl()); caretTo(q, false); }
  else if (atEnd) { q.after(spEl()); caretTo(q, true); }
  else { const nq = newLine(); if (nq) { nq.before(spEl()); caretTo(nq, false); } }
}
function dropSpace(back) {                                    // Backspace at a line's start / Delete at its end: one space less
  const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return false;
  const q = lineOf(); if (!q || q.nodeType !== 1) return false;
  const r = s.getRangeAt(0), sib = back ? (edgeOf(q, r, false) ? q.previousSibling : null) : (edgeOf(q, r, true) ? q.nextSibling : null);
  if (sib && sib.nodeType === 1 && sib.classList.contains('pl-sp')) { sib.remove(); return true; }
  return false;
}
for (const st of CAPS) { const el = blockOf(st), mine = () => editing && el === block();   // every caption's type (the SWAP page switches them)
el.addEventListener('keydown', e => {
  if (!mine()) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endEdit(); return; }
  if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) addSpace(); else newLine(); classify(); apply(); return; }
  if ((e.key === 'Backspace' || e.key === 'Delete') && dropSpace(e.key === 'Backspace')) { e.preventDefault(); classify(); apply(); }
});
el.addEventListener('input', () => { if (mine()) { classify(); apply(); } });
el.addEventListener('paste', e => {                         // plain text only, one line
  if (!mine()) return;
  e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').replace(/\s*\n\s*/g, ' '));
});
el.addEventListener('focusout', () => setTimeout(() => { if (mine() && !block().contains(document.activeElement)) endEdit(); }, 0));
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
  let line, best = [], run = [];                                    // the rulers' y: in the longest run of spaces (TEXT), else between the title lines and the credits
  for (const k of block().children) { if (k.classList.contains('pl-sp')) run.push(k); else { if (run.length > best.length) best = run; run = []; } }
  if (run.length > best.length) best = run;
  if (best.length) line = (best[0].getBoundingClientRect().top + best[best.length - 1].getBoundingClientRect().bottom) / 2 - v.top;
  else { const [b1, b2] = [...block().children].map(c => c.getBoundingClientRect()); line = b1 && b2 ? (b1.bottom + b2.top) / 2 - v.top : (text.t + text.b) / 2; }
  return { W: v.width, H: v.height, lh: lineH(), text, print, pile, line, margin: text.l, gap: print.l - text.r, edge: v.width - pile.r };
}
function hitAt(x, y) {                                       // viewer px → 'text' | 'pile' | null (the text wins where they overlap)
  const g = geom(), inR = (r, p) => x >= r.l - p && x <= r.r + p && y >= r.t - p && y <= r.b + p;
  return inR(g.text, 10) ? 'text' : inR(g.pile, 0) ? 'pile' : null;
}

/* ---------- the overlay: the rulers on the caption's line + the dragged / hovered outline ---------- */
const css = document.createElement('style');
css.textContent = `
  html.pl:not(.pl-bare) .caption::before { flex: 0 0 var(--pl-x, 0px) !important; }   /* the POSITION lab drags the x; the SWAP page never moves it (the LOCK) */
  html.pl:not(.pl-bare) .caption::after  { flex: 1 1 0 !important; }
  html.pl-live #zoneL, html.pl-live #zoneR, html.pl-live .nzone { pointer-events: none !important; }
  html.pl-ew, html.pl-ew * { cursor: ew-resize !important; }
  html.pl-ibeam, html.pl-ibeam * { cursor: text !important; }
  .pl-tag { position: fixed; left: 50%; top: 18px; translate: -50% 0; z-index: 2147483001; padding: 4px 11px; border-radius: 8px; background: rgba(29, 29, 31, .8);
            color: #fff; font: 500 12px/16px -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; opacity: 0; transition: opacity .4s; pointer-events: none; white-space: nowrap; }
  .pl-tag.on { opacity: 1; transition: opacity .12s; }
  html.pl-al-left .caption > div { text-align: left !important; }
  html.pl-al-right .caption > div { text-align: right !important; }
  html.pl .caption .pl-sp { height: .6em; }
  html.pl-txt .caption .credits { margin-top: 0 !important; }
  html.pl-edit .caption > div, html.pl-edit .caption > div * { pointer-events: auto !important; -webkit-user-select: text !important; user-select: text !important; cursor: text !important; }   /* the type box only: the .caption itself is the band's full height */
  html.pl-edit #shield, html.pl-edit #row { pointer-events: none !important; }   /* #row: the caption sits behind the row's own plane in its 3D context (z −.5 px), so the row's box takes the hit (elementFromPoint) */
  html.pl-edit .caption > div { outline: 1px solid rgba(0, 122, 255, .6); outline-offset: 8px; caret-color: #007AFF; }
  html.pl-edit .caption .pl-sp { background: rgba(0, 122, 255, .07); box-shadow: inset 0 -1px rgba(0, 122, 255, .22); }
  html.pl-edit .caption .pl-sp:hover { background: rgba(255, 45, 85, .16) !important; box-shadow: inset 0 -1px rgba(255, 45, 85, .45) !important; cursor: pointer !important; }
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
  const v = vrect(), on = !BARE && !!g && (pinned || !!drag || !!hov || performance.now() < nudgeUntil);
  const ox = v.left, oy = v.top;                             // viewer px → the overlay (the window)
  const sh = r => g && { l: r.l + ox, r: r.r + ox, t: r.t + oy, b: r.b + oy };
  const y = g ? g.line + oy : 0;
  const lh = g ? g.lh : 20;
  setRuler(rul.margin, ox, g ? g.text.l + ox : 0, y, on, lh);
  setRuler(rul.gap, g ? g.text.r + ox : 0, g ? g.print.l + ox : 0, y, on, lh);
  setRuler(rul.edge, g ? g.pile.r + ox : 0, ox + (g ? g.W : 0), y, on, lh);
  const both = !!drag?.both, cur = drag?.id || hov;
  setBox(box.text, sh(g?.text || {}), !BARE && !!g && (cur === 'text' || both), !!drag);
  setBox(box.pile, sh(g?.pile || {}), !BARE && !!g && (cur === 'pile' || both), !!drag);
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
const centreBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Centre', title: 'C — the text + polaroids centred as one block (the gap kept)' });
centreBtn.onclick = () => centrePair();
const openBtn = h('button', { class: 'pl-btn', type: 'button' });
openBtn.onclick = () => { if (live()) pol.collapse(); else if (pol.state === 'home' && !(window.__stacks || []).some(s => s.state !== 'home')) pol.expand(); };
const undoBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Undo', title: '⌘Z (⇧⌘Z redo)' }); undoBtn.onclick = undo;
const resetBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Reset', title: 'back to the site as it is' });
resetBtn.addEventListener('pointerdown', e => e.preventDefault());
resetBtn.onclick = () => { endEdit(); flush(); DEF = siteDefaults(); S = { ...DEF }; commit(); apply(); };
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
const editBtn = h('button', { class: 'pl-btn', type: 'button', textContent: 'Edit text', title: 'or double-click the text · Enter a new line · ⇧Enter half a line of space · Esc done' });
editBtn.addEventListener('pointerdown', e => e.preventDefault());   // keeps the caret in the text (Done would otherwise blur it first)
editBtn.onclick = () => { if (editing) endEdit(); else startEdit(); };
function setType(o) { flush(); Object.assign(S, o); commit(); apply(); }
const sep = () => h('span', { class: 'pl-sep' });
const liveBits = [strip, sep(), h('label', { title: 'S — the text ↔ print gap in whole caption lines' }, snapBox, 'Snap'), h('label', {}, rulersBox, 'Rulers'), centreBtn, sep(), alSeg, toneSel, editBtn];
const bar = h('div', { class: 'pl-bar' }, ...liveBits, sep(), openBtn, undoBtn, resetBtn, copyBtn);
const hint = h('div', { class: 'pl-hint', textContent: 'Drag sideways · ⌘-drag both · ← → one line · S snap · C centre · A align · T tone · double-click the text: Enter line, ⇧Enter space, click a space to remove · ⌘Z · G rulers · H' });
const hud = h('div', { class: 'pl-hud' }, bar, hint);
document.body.appendChild(hud);
if (BARE) hud.hidden = true;
function syncHud(g) {
  const on = !!g;
  for (const b of liveBits) b.style.display = on ? '' : 'none';
  openBtn.textContent = live() ? 'Close' : 'Open polaroids';
  undoBtn.disabled = !hist.length && lastSnap === JSON.stringify(S);
  for (const c of chips) c.classList.toggle('on', c.dataset.id === sel);
  if (S) { for (const b of alSeg.children) b.classList.toggle('on', b.dataset.v === S.al); if (toneSel.value !== S.tone) toneSel.value = S.tone; }
  editBtn.textContent = editing ? 'Done' : 'Edit text'; editBtn.classList.toggle('pri', editing);
  if (!on) return;
  for (const [el, v] of [[gm, g.margin], [gg, g.gap], [ge, g.edge]]) el.innerHTML = `${r0(v)}<small>${lines(v, g.lh)} ln</small>`;
}
function fmt() {
  const g = geom(), em = parseFloat(getComputedStyle(root).getPropertyValue('--em')) || 0, f = v => r0(v);
  const split = g.margin + g.gap > 0 ? g.margin / (g.margin + g.gap) : 0;
  const L = v => `${f(v)} (${lines(v, g.lh)} ln)`, align = getComputedStyle(block()).textAlign === 'right' ? 'flush right' : 'flush left';
  const tone = (TONES.find(([k]) => k === S.tone) || TONES[0])[2];
  const txt = (S.copy ?? siteCopy()).split('\n').reduce((a, t) => { if (t === '') { const m = /^⟨(\d+)⟩$/.exec(a[a.length - 1] || ''); if (m) a[a.length - 1] = `⟨${+m[1] + 1}⟩`; else a.push('⟨1⟩'); } else a.push(t); return a; }, [])
    .map(t => { const m = /^⟨(\d+)⟩$/.exec(t); return m ? `[+${+m[1] / 2} ln]` : t; }).join(' / ');
  return `Polaroid position lab · ${f(g.W)}×${f(g.H)} · em ${+em.toFixed(2)} px · caption line ${g.lh.toFixed(2)} px · ${align} · tone ${tone}\n` +
         `text${S.copy == null ? ' (the site)' : ''}: ${txt}\n` +
         `margin ${L(g.margin)} · text ${f(g.text.r - g.text.l)} · gap ${L(g.gap)} · print ${f(g.print.r - g.print.l)} · fan → edge ${L(g.edge)} px\n` +
         `openDx ${S.dx.toFixed(4)} · caption left ${S.cx.toFixed(4)} W · split ${split.toFixed(3)}` +
         (g.margin > 0 ? ` (margin : gap = 1 : ${(g.gap / g.margin).toFixed(2)})` : '');
}

/* ---------- input: presses in the open page are the lab's (window capture: before the page's own routing) ---------- */
const inViewer = e => e.target instanceof Node && viewer.contains(e.target);
const local = e => { const v = vrect(); return [e.clientX - v.left, e.clientY - v.top]; };
function syncCursor() { root.classList.toggle('pl-ew', !BARE && !!(drag || hov)); root.classList.toggle('pl-ibeam', BARE && hov === 'text' && !editing); }
addEventListener('pointerdown', e => {
  swallow = false;
  if (editing && e.button === 0 && !hud.contains(e.target)) {                              // TEXT: a press in the text places the caret (native), anywhere else finishes
    const sp = e.target.closest?.('.pl-sp');
    if (sp && capEl.contains(sp)) { e.preventDefault(); sp.remove(); classify(); apply(); }   // a click on a space removes it (the ones under the last line have no line to Backspace from)
    else if (!block().contains(e.target)) endEdit();
    if (inViewer(e)) { e.stopPropagation(); swallow = true; }
    return;
  }
  if (!S || !live() || !inViewer(e) || e.button !== 0) return;
  e.stopPropagation(); swallow = true;                      // no flip, no close, no camera move: the open page is the lab's
  const hit = hitAt(...local(e)); if (!hit) return;
  e.preventDefault();
  if (BARE) { if (hit === 'text') startEdit(e.clientX, e.clientY); return; }            // SWAP: one click types, nothing drags
  const now = performance.now();                                                           // a double press on the text: type in it
  if (hit === 'text' && now - lastDown.t < 400 && Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 6) { lastDown.t = 0; startEdit(e.clientX, e.clientY); return; }
  lastDown = { t: now, x: e.clientX, y: e.clientY };
  sel = hit; drag = { id: hit, both: e.metaKey, x0: e.clientX, from: { ...S }, W: vrect().width, g0: geom() };
  syncCursor(); apply();
}, true);
let lastDown = { t: 0, x: 0, y: 0 };
addEventListener('pointermove', e => {
  if (editing) return;
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
  if (BARE) {                                                                              // SWAP: ← → the variants, ↑ ↓ / 1 2 3 the captions, C copies; nothing else
    const d = { arrowleft: -1, arrowright: 1 }[k], p = { arrowup: -1, arrowdown: 1 }[k], n = /^[1-9]$/.test(k) ? +k - 1 : -1;
    if (d) { e.preventDefault(); e.stopPropagation(); setVar(cur + d); }
    else if (p) { e.preventDefault(); e.stopPropagation(); setPile(CAPS.indexOf(pol) + p); }
    else if (n >= 0 && n < CAPS.length) setPile(n);
    else if (k === 'c') copyBare();
    return;
  }
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

/* ---------- SWAP: the variants (the tone), the captions (↑ ↓), each caption's text, the tag ---------- */
const VARS = window.__polVars || {}, VLIST = Object.keys(VARS).sort((a, b) => a - b);
let cur = 0, texts = {}, pileName = 'polaroids', switching = false;
function bareLoad() { try { const o = JSON.parse(localStorage.getItem(KEY)); if (!o) return;
  if (typeof o.copy === 'string') texts.polaroids = o.copy;                                // the store before 2026-10-07: the polaroids' text alone
  else if (o.copy && typeof o.copy === 'object') for (const [k, v] of Object.entries(o.copy)) if (typeof v === 'string') texts[k] = v;
  if (Number.isInteger(o.cur)) cur = Math.max(0, Math.min(VLIST.length - 1, o.cur));
  if (CAPS.some(st => st.name === o.pile)) pileName = o.pile; } catch {} }
function bareSave() { try { localStorage.setItem(KEY, JSON.stringify({ cur, pile: pol.name, copy: texts })); } catch {} }
function bareState() {                                         // the open caption as the lab's state: no place of its own (the LOCK), the variant's tone, its text
  const v = VARS[VLIST[cur]] || {};
  return { dx: pol.openDx, cx: 0, al: 'left', tone: v.tone && okTone(v.tone) ? v.tone : 'site', copy: texts[pol.name] ?? null };
}
const varName = () => { const n = VLIST[cur], t = (TONES.find(([k]) => k === (VARS[n]?.tone || 'site')) || TONES[0])[1]; return `Var ${n} · ${t.toLowerCase()}`; };
const capName = () => CAP_NAME[pol.name] || pol.name;
function setVar(i) {                                          // a swap is navigation, not an edit: no undo step
  if (editing || !VLIST.length || !live()) return;
  cur = (i + VLIST.length) % VLIST.length;
  S = bareState(); lastSnap = JSON.stringify(S); hist.length = 0; redo.length = 0;
  bareSave(); apply(); flashTag(varName());
}
const allHome = () => (window.__stacks || []).every(st => st.state === 'home');
function whenHome(f) { (function w() { if (allHome()) setTimeout(f, 80); else requestAnimationFrame(w); })(); }
function setPile(i) {                                         // close the open caption's stack, open the next one (its text as last typed)
  if (switching || CAPS.length < 2) return;
  if (editing) endEdit();
  const next = CAPS[(i + CAPS.length) % CAPS.length]; if (next === pol && live()) return;
  switching = true;
  if (pol.state !== 'home') pol.collapse();
  whenHome(() => {
    pol = next; capEl = next.capEl; S = bareState(); lastSnap = JSON.stringify(S); hist.length = 0; redo.length = 0;
    bareSave(); apply(); pol.expand(); whenOpen(() => { switching = false; flashTag(capName()); });
  });
}
const tag = document.createElement('div'); tag.className = 'pl-tag'; document.body.appendChild(tag);
function flashTag(t, ms = 1200) { tag.textContent = t; tag.classList.add('on'); clearTimeout(flashTag.t); flashTag.t = setTimeout(() => tag.classList.remove('on'), ms); }
async function copyBare() {                                   // every caption's text as the site writes it (a JS string), the variant
  const t = `Swap · ${varName()} · ${r0(vrect().width)}×${r0(vrect().height)}\n` +
    CAPS.map(st => `${CAP_NAME[st.name] || st.name}: ${JSON.stringify(texts[st.name] ?? siteCopy(null, st))}${texts[st.name] == null ? ' (the site)' : ''}`).join('\n');
  try { await navigator.clipboard.writeText(t); } catch { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  flashTag('Copied');
}
function whenOpen(f) { (function w() { if (live()) setTimeout(f, 250); else requestAnimationFrame(w); })(); }

/* ---------- boot: the site's values (Reset), the stored ones, then open the polaroids ---------- */
function start() {
  const sp = s => getComputedStyle(capEl, s), fs = parseFloat(getComputedStyle(capEl).fontSize) || 16;
  SITE.a = parseFloat(sp('::before').flexGrow) || 0; SITE.b = parseFloat(sp('::after').flexGrow) || 0;
  SITE.ba = (parseFloat(sp('::before').flexBasis) || 0) / fs; SITE.bb = (parseFloat(sp('::after').flexBasis) || 0) / fs;
  DEF = siteDefaults();
  if (BARE) { bareLoad(); const qc = new URLSearchParams(location.search).get('cap'); if (CAPS.some(st => st.name === qc)) pileName = qc;   // ?cap=NAME: open that caption (2026-10-13: &cap=trianglebob)
              pol = CAPS.find(st => st.name === pileName) || pol; capEl = pol.capEl; S = bareState(); }
  else S = { ...DEF, ...(load() || {}) };
  lastSnap = JSON.stringify(S);
  root.classList.add('pl'); if (BARE) { root.classList.add('pl-bare'); whenOpen(() => flashTag(`${capName()} · ↑ ↓ caption · ← → tone · click the text to type`, 2600)); }
  apply();
  const open = () => { if (pol.state === 'home' && !(window.__stacks || []).some(s => s.state !== 'home')) pol.expand(); };
  if (BARE) requestAnimationFrame(() => requestAnimationFrame(() => {                   // SWAP: the stored text is in now, then open (the place is the LOCK's)
    apply(); requestAnimationFrame(() => requestAnimationFrame(open));
  }));
  else requestAnimationFrame(() => requestAnimationFrame(open));
}
const ready = () => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(start, 400));
if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
window.__poslab = { get state() { return S; }, get defaults() { return DEF; }, geom, fmt, set(o) { flush(); Object.assign(S, o); commit(); apply(); }, reset() { flush(); DEF = siteDefaults(); S = { ...DEF }; commit(); apply(); } };
})();
