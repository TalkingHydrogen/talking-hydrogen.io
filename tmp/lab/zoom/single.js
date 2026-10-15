/* single.js — Z1 (lift) and Z3 (stay, iOS Photos): one picture OPEN on the white page as the phone's landscape OPEN shows it — the
   print centred, the NEO caption in the band to its left, the neighbours' slivers peeking at both edges (tilted 4° clockwise).
   window.LAB = { name, mode: 'lift' | 'stay', twist }. ?img=room|neo|hand|drawing picks the picture. */
(function () {
'use strict';
const { Sim, makeLift, makeRouter, makeHud, Q } = Lift;
const LAB = window.LAB || { name: 'Z1', mode: 'lift' };
const PICS = {
  room:    { base: 'img/room-print', ext: 'webp', w: 2018, h: 1083 },
  neo:     { base: 'img/neo-card',   ext: 'webp', w: 1645, h: 2000, alpha: true },
  hand:    { base: 'img/hand-card',  ext: 'webp', w: 1645, h: 2000, alpha: true },
  drawing: { base: 'img/drawing-04', ext: 'jpg',  w: 1346, h: 2000 },
};
const VARS = [1000, 1400, 1800];
const srcset = p => VARS.map(L => `${p.base}-${L}.${p.ext} ${Math.round(p.w * L / Math.max(p.w, p.h))}w`).concat(`${p.base}.${p.ext} ${p.w}w`).join(', ');
const pic = PICS[Q.get('img')] || PICS.room;
const nbL = pic === PICS.neo || pic === PICS.hand ? PICS.room : PICS.neo, nbR = pic === PICS.drawing ? PICS.room : PICS.drawing;
const CAPTION = [['NEO', 1], null, ['Design'], ['Head & Body'], ['AI Companion'], null, null, null, ['1X'], null,
                 ['Bernt Børnich'], ['Dar Sleeper'], ['Christoph Kohstall'], ['Eric Jang'], ['Chris Tan'], ['Viktor Dune']];

const table = document.getElementById('table');
table.innerHTML = '<div class="cover"></div>';
function card(p, cls) {
  const el = document.createElement('div'); el.className = 'card ' + (cls || '') + (p.alpha ? ' alpha' : '');
  const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.decoding = 'async';
  el.appendChild(im); table.appendChild(el); return { el, im, p };
}
const L = card(nbL, 'nb'), R = card(nbR, 'nb'), F = card(pic, 'front');
const cap = document.createElement('div'); cap.className = 'caption';
cap.innerHTML = CAPTION.map(l => !l ? '<div style="height:9px"></div>' : l[1] ? `<div><b>${l[0]}</b></div>` : `<div>${l[0]}</div>`).join('');
table.appendChild(cap);

const NB = 27, TILT = 4 * Math.PI / 180;
let G = null;                                                     // the layout: { W, H, seat, w, h }
const css = (T, z) => `translate3d(${T.x}px,${T.y}px,${z}px) rotate(${T.r}rad) scale(${T.s})`;
function setSrc(c, w) {                                           // sizes BEFORE srcset (else the default 100vw fetches the largest file first), as the site's loadCard()
  c.im.sizes = Math.round(w) + 'px';
  if (!c.im.getAttribute('srcset')) { c.im.srcset = srcset(c.p); c.im.src = `${c.p.base}.${c.p.ext}`; }
}
function fit(p, bw, bh) { const r = p.w / p.h; return r >= bw / bh ? [bw, bw / r] : [bh * r, bh]; }
function layout() {
  const W = innerWidth, H = innerHeight, land = W > H;
  const [bw, bh] = land ? [.5 * W, .82 * H] : [W - 40, .55 * H];
  const [w, h] = fit(pic, bw, bh), cx = W / 2, cy = land ? H / 2 : .42 * H;
  const seat = Sim.box(cx, cy, w, h);
  F.el.style.width = w + 'px'; F.el.style.height = h + 'px'; setSrc(F, w);
  F.el.style.transform = css(seat, .2);
  for (const [N, side] of [[L, -1], [R, 1]]) {                    // a neighbour at its OPEN size, its most protruding corner NB inside the edge
    const [nw, nh] = fit(N.p, bw, bh), ext = nw / 2 * Math.cos(TILT) + nh / 2 * Math.sin(TILT);
    const ncx = side < 0 ? NB - ext : W - NB + ext;
    N.el.style.width = nw + 'px'; N.el.style.height = nh + 'px'; setSrc(N, nw);
    N.el.style.transform = css(Sim.box(ncx, cy, nw, nh, 1, TILT), -.5);
  }
  cap.style.display = land ? '' : 'none';
  const ch = cap.offsetHeight, left = Math.max(20, .06 * W);
  cap.style.transform = `translate3d(${left}px,${Math.round(cy - ch / 2)}px,-.3px)`;
  G = { W, H, seat, w, h };
}
layout();

const lift = makeLift({
  host: document.getElementById('lift'), mode: LAB.mode, twist: LAB.twist,
  target: () => ({ seat: G.seat, w: G.w, h: G.h, src: F.im.currentSrc || F.im.src, hi: `${pic.base}.${pic.ext}`, hiW: pic.w, alpha: pic.alpha,
                   park: on => { F.el.style.transform = css(G.seat, on ? -2 : .2); } }),
});
lift.prefetch(lift.target || { seat: G.seat, w: G.w, h: G.h, hi: `${pic.base}.${pic.ext}`, hiW: pic.w });
const onPic = (x, y, pad = 24) => Sim.hit(G.seat, G.w, G.h, x, y, pad);
makeRouter({
  lift,
  liftAt: (x, y) => onPic(x, y),
  dbltap: LAB.mode === 'stay' ? (x, y) => { if (lift.state !== 'idle' || onPic(x, y, 0)) lift.zoomTo(x, y, 2.5); } : null,
});
makeHud(document.getElementById('hud'), LAB.name + (lift.C.twist ? '·twist' : ''), lift);
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { lift.abort(); layout(); }, 60); });
window.__lab = { lift, get G() { return G; }, Sim, front: F };
})();
