/* colorlab.js — the polaroids' COLOUR lab (site.html?color=1; owner 2026-10-01: "lets try adjusting the color of the polaroids
   on web. Put under the page that control the rgb values to adjust the color of it. I think its too yellowish").

   Loaded by site.html only with ?color. One R / G / B gain per channel (100 % = the print as baked), applied to every polaroid
   card's <img> as an SVG feColorMatrix in sRGB (out = in × gain per channel, alpha untouched) — the same arithmetic a bake of
   the card webps would do, so the values port 1:1. The paper readout is the median of each print's bottom band (sampled from the
   card files: the band is the plainest paper on an SX-70), before → after. Nothing here touches the normal page: the state lives
   in localStorage under ?color only; the site keeps its colours until the values are baked into assets/neo/*-card*.webp. */
(() => {
'use strict';
const pol = (window.__stacks || []).find(s => s.name === 'polaroids');
if (!pol) return;
const KEY = 'site.colorlab.v1', CH = ['r', 'g', 'b'], NAME = { r: 'Red', g: 'Green', b: 'Blue' };
const DEF = { r: 100, g: 100, b: 100 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r1 = v => Math.round(v * 10) / 10;
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); return o && CH.every(k => isFinite(o[k])) ? o : null; } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
let S = { ...DEF, ...(load() || {}) };
let bypass = false;

/* ---------- the filter: one feColorMatrix for every polaroid card ---------- */
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.setAttribute('aria-hidden', 'true');
svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
svg.innerHTML = '<filter id="cl-rgb" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feColorMatrix type="matrix"/></filter>';
document.body.appendChild(svg);
const mat = svg.querySelector('feColorMatrix');
const imgs = () => [...pol.wrap.querySelectorAll('.card > img')];
function apply() {
  const g = CH.map(k => S[k] / 100);
  mat.setAttribute('values', `${g[0]} 0 0 0 0  0 ${g[1]} 0 0 0  0 0 ${g[2]} 0 0  0 0 0 1 0`);
  const neutral = CH.every(k => S[k] === 100);
  for (const im of imgs()) im.style.filter = bypass || neutral ? '' : 'url(#cl-rgb)';
}

/* ---------- the paper: each print's bottom band, median per channel (sampled once per card file) ---------- */
const papers = new Map();                                          // img → [r, g, b] | 'tainted'
function readBand(im) {                                            // null: nothing drawn yet (not decoded)
  const w = 164, h = 200, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0, w, h);
  const d = cx.getImageData(Math.round(w * .12), Math.round(h * .84), Math.round(w * .76), Math.round(h * .11)).data;
  const ch = [[], [], []];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) for (let c = 0; c < 3; c++) ch[c].push(d[i + c]);
  return ch[0].length ? ch.map(a => { a.sort((x, y) => x - y); return a[a.length >> 1]; }) : null;
}
function sample(im, tries = 0) {
  const src = im.currentSrc || im.src; if (!src || papers.has(im) || (im._cl && !tries)) return;
  im._cl = true;
  (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => {
    let p;
    try { p = readBand(im); } catch { papers.set(im, 'tainted'); syncPanel(); return; }
    if (p) { papers.set(im, p); syncPanel(); }
    else if (tries < 8) setTimeout(() => sample(im, tries + 1), 400);
  });
}
const sampleAll = () => { for (const im of imgs()) sample(im); };
const okPapers = () => [...papers.values()].filter(p => p !== 'tainted');
function paperBefore() {                                           // the mean of the prints' band medians
  const P = okPapers(); if (!P.length) return null;
  return [0, 1, 2].map(c => P.reduce((s, p) => s + p[c], 0) / P.length);
}
const after = (p, c) => clamp(p * S[CH[c]] / 100, 0, 255);
const rgb = p => `rgb(${p.map(v => Math.round(v)).join(', ')})`;

/* ---------- the panel, under the page ---------- */
const css = document.createElement('style');
css.textContent = `
  .cl-panel { --line: #E5E5EA; --dim: #8E8E93; --ink: #1D1D1F; --acc: #007AFF;
              background: #fff; color: var(--ink); border-top: 1px solid var(--line); padding: 16px 28px 28px;
              font: 12px/1.35 -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0; -webkit-user-select: text; user-select: text; accent-color: var(--acc); }
  .cl-panel * { box-sizing: border-box; }
  .cl-top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
  .cl-top h2 { font-size: 13px; font-weight: 600; margin: 0 4px 0 0; }
  .cl-top .hint { color: var(--dim); flex: 1 1 280px; }
  .cl-body { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 12px 28px; align-items: start; }
  @media (max-width: 900px) { .cl-body { grid-template-columns: 1fr; } }
  .cl-card { border: 1px solid var(--line); border-radius: 12px; padding: 10px 16px 12px; }
  .cl-card h3 { margin: 0 0 6px; font-size: 11px; font-weight: 600; color: var(--dim); text-transform: uppercase; letter-spacing: .04em; }
  .cl-row { display: grid; grid-template-columns: 46px minmax(0, 1fr) 64px 16px 56px; gap: 8px; align-items: center; min-height: 28px; }
  .cl-row > span { color: var(--dim); }
  .cl-row > i { color: #AEAEB2; font-style: normal; text-align: center; }
  .cl-row input[type=range] { width: 100%; margin: 0; }
  .cl-row.r input[type=range] { accent-color: #FF3B30; } .cl-row.g input[type=range] { accent-color: #34C759; } .cl-row.b input[type=range] { accent-color: #007AFF; }
  .cl-panel input[type=number] { font: inherit; font-variant-numeric: tabular-nums; color: var(--ink); border: 1px solid #D1D1D6; border-radius: 6px;
                                 background: #fff; padding: 2px 5px; width: 100%; min-width: 0; }
  .cl-head { display: grid; grid-template-columns: 46px minmax(0, 1fr) 64px 16px 56px; gap: 8px; color: #AEAEB2; font-size: 11px; }
  .cl-head b { font-weight: 400; grid-column: 3; } .cl-head b + b { grid-column: 5; }
  .cl-paper { display: flex; gap: 10px; align-items: center; margin: 2px 0 8px; }
  .cl-sw { width: 54px; height: 38px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
  .cl-paper .arr { color: #AEAEB2; }
  .cl-paper .num { font-variant-numeric: tabular-nums; color: var(--dim); line-height: 1.45; }
  .cl-paper .num b { color: var(--ink); font-weight: 500; }
  .cl-btns { display: flex; flex-wrap: wrap; gap: 6px; }
  .cl-btn { font: inherit; border: 1px solid #D1D1D6; background: #fff; border-radius: 7px; padding: 4px 11px; cursor: pointer; color: var(--ink); }
  .cl-btn.pri { background: var(--acc); border-color: var(--acc); color: #fff; }
  .cl-btn.hold:active, .cl-btn.hold.on { background: #1D1D1F; border-color: #1D1D1F; color: #fff; }
  .cl-vals { margin-top: 8px; font: 11px/1.45 ui-monospace, Menlo, monospace; color: var(--dim); white-space: pre; overflow-x: auto; }
  .cl-msg { color: var(--dim); font-size: 11px; min-height: 14px; margin-top: 4px; }
`;
document.head.appendChild(css);
const h = (tag, props = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') el.className = v; else if (k in el) el[k] = v; else el.setAttribute(k, v); } for (const c of kids) if (c != null) el.append(c); return el; };
const panel = h('section', { class: 'cl-panel' });
document.body.appendChild(panel);
const syncers = [];
function syncPanel() { for (const f of syncers) f(); }
function set(k, v, from) { S[k] = r1(clamp(v, 50, 150)); apply(); syncPanel(from); save(); }

// top bar
const openBtn = h('button', { class: 'cl-btn', type: 'button' });
openBtn.onclick = () => {
  if (pol.state === 'open') pol.collapse();
  else if (pol.state === 'home') { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => pol.expand(), 350); }
};
const syncOpen = () => { openBtn.textContent = pol.state === 'home' ? 'Open polaroids' : 'Close polaroids'; };
syncers.push(syncOpen); setInterval(syncOpen, 300);
panel.append(h('div', { class: 'cl-top' },
  h('h2', {}, 'Polaroid colour'), openBtn,
  h('span', { class: 'hint' }, 'Each slider multiplies one channel of every polaroid (100 % = as baked). Less yellow = Blue up, or Red + Green down. Hold Compare to see the original.')));

// gains
const gains = h('div', { class: 'cl-card' }, h('h3', {}, 'Channel gain'), h('div', { class: 'cl-head' }, h('b', {}, 'gain %'), h('b', {}, 'paper')));
for (const [c, k] of CH.entries()) {
  const range = h('input', { type: 'range', min: 80, max: 120, step: .1 });
  const num = h('input', { type: 'number', min: 50, max: 150, step: .5, title: 'gain, %' });
  const pap = h('input', { type: 'number', min: 0, max: 255, step: 1, title: 'the paper value after the gain (0–255): type one to set the gain from it' });
  range.oninput = () => set(k, +range.value);
  num.onchange = () => set(k, +num.value);
  pap.onchange = () => { const p = paperBefore(); if (p) set(k, 100 * clamp(+pap.value, 0, 255) / p[c]); };
  syncers.push(() => {
    range.value = S[k];
    if (document.activeElement !== num) num.value = S[k];
    const p = paperBefore(); pap.disabled = !p;
    if (document.activeElement !== pap) pap.value = p ? Math.round(after(p[c], c)) : '';
  });
  gains.append(h('div', { class: 'cl-row ' + k }, h('span', {}, NAME[k]), range, num, h('i', {}, '→'), pap));
}

// paper readout + actions
const swA = h('div', { class: 'cl-sw' }), swB = h('div', { class: 'cl-sw' }), numA = h('div', { class: 'num' }), numB = h('div', { class: 'num' });
const msg = h('div', { class: 'cl-msg' }), vals = h('div', { class: 'cl-vals' });
const note = t => { msg.textContent = t; clearTimeout(note.t); note.t = setTimeout(() => (msg.textContent = ''), 2600); };
syncers.push(() => {
  const p = paperBefore();
  if (!p) { numA.textContent = okPapers().length || !papers.size ? 'sampling…' : 'can’t read the files (open the page over http)'; numB.textContent = ''; return; }
  const q = p.map((v, c) => after(v, c));
  swA.style.background = rgb(p); swB.style.background = rgb(q);
  numA.innerHTML = `now<br><b>${p.map(v => Math.round(v)).join(' ')}</b>`;
  numB.innerHTML = `with the gains<br><b>${q.map(v => Math.round(v)).join(' ')}</b>`;
});
const json = () => `{ "gain": { "r": ${S.r / 100}, "g": ${S.g / 100}, "b": ${S.b / 100} }` +
  (paperBefore() ? `, "paper": [${paperBefore().map((v, c) => Math.round(after(v, c))).join(', ')}]` : '') + ' }';
syncers.push(() => { vals.textContent = json(); });

const cmpBtn = h('button', { class: 'cl-btn hold', type: 'button', textContent: 'Compare', title: 'hold: the prints as baked' });
const hold = on => { bypass = on; cmpBtn.classList.toggle('on', on); apply(); };
cmpBtn.addEventListener('pointerdown', e => { cmpBtn.setPointerCapture(e.pointerId); hold(true); });
cmpBtn.addEventListener('pointerup', () => hold(false));
cmpBtn.addEventListener('pointercancel', () => hold(false));
const neutralBtn = h('button', { class: 'cl-btn', type: 'button', textContent: 'Neutral paper', title: 'gains that turn the paper grey at its own brightness' });
neutralBtn.onclick = () => {
  const p = paperBefore(); if (!p) return note('No paper sample yet.');
  const L = (p[0] + p[1] + p[2]) / 3; CH.forEach((k, c) => (S[k] = r1(100 * L / p[c]))); apply(); syncPanel(); save(); note('Paper set to neutral grey.');
};
/* the PHOTO PRINT's paper (owner 2026-10-01: "can you do it the same color as that single pic there"): the room print's white
   border, median of a strip inside its left edge (past the cut-edge hairline), the gains that bring the polaroids' paper to it */
function printPaper() {
  const im = document.querySelector('#room .card .fr-front img') || document.querySelector('#room .card > img'); if (!im || !im.complete || !im.naturalWidth) return null;
  const w = 1000, hh = Math.round(w * 1083 / 2018), cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  try { cx.drawImage(im, 0, 0, w, hh); } catch { return null; }
  let d; try { d = cx.getImageData(5, Math.round(hh * .25), 8, Math.round(hh * .5)).data; } catch { return null; }
  const ch = [[], [], []]; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) ch[c].push(d[i + c]);
  return ch.map(a => { a.sort((x, y) => x - y); return a[a.length >> 1]; });
}
function matchPrint() {
  const p = paperBefore(), t = printPaper(); if (!p || !t) { note('No paper sample yet.'); return null; }
  CH.forEach((k, c) => (S[k] = r1(clamp(100 * t[c] / p[c], 50, 150)))); apply(); syncPanel(); save();
  note(`Paper set to the photo print's: ${t.join(' ')}.`); return t;
}
const matchBtn = h('button', { class: 'cl-btn', type: 'button', textContent: 'Match photo print', title: "gains that bring the paper to the room print's white" });
matchBtn.onclick = matchPrint;
const resetBtn = h('button', { class: 'cl-btn', type: 'button', textContent: 'Reset' });
resetBtn.onclick = () => { S = { ...DEF }; apply(); syncPanel(); save(); note('Back to the prints as baked.'); };
const copyBtn = h('button', { class: 'cl-btn pri', type: 'button', textContent: 'Copy values' });
copyBtn.onclick = async () => {
  const t = json();
  try { await navigator.clipboard.writeText(t); note('Copied — paste it to Claude to bake it into the cards.'); }
  catch { const ta = h('textarea', { value: t }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); note('Copied.'); }
};
const paperCard = h('div', { class: 'cl-card' }, h('h3', {}, 'Paper (bottom band, median)'),
  h('div', { class: 'cl-paper' }, swA, numA, h('span', { class: 'arr' }, '→'), swB, numB),
  h('div', { class: 'cl-btns' }, cmpBtn, matchBtn, neutralBtn, resetBtn, copyBtn), msg, vals);
panel.append(h('div', { class: 'cl-body' }, gains, paperCard));

/* ---------- boot ---------- */
apply(); sampleAll(); syncPanel();
new MutationObserver(() => { apply(); sampleAll(); syncPanel(); }).observe(pol.wrap, { subtree: true, attributes: true, attributeFilter: ['src'] });   // a lazily loaded card gets the filter + its sample
window.__colorlab = { get state() { return { ...S }; }, set, paper: paperBefore, printPaper, matchPrint, json };
})();
