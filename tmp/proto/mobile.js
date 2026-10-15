/* mobile.js — PHONE MODE v1, part 1: the LAYOUT (2026-10-13; spec/04-touch.md §5–§7, notes/touch-report-review.md #15–#17).

   The phone gets its own composition of the same page; the desktop never runs a line of it. Loaded by site.html right before the
   engine's inline <script> (the markup above it exists, the engine does not yet) and it only REGISTERS window.__mobile. The engine
   asks it for numbers through a few commented hooks (grep "MOBILE" in site.html):
     pageLayout()   if (__mobile.on) PG = __mobile.page(W, H, ctx)     the whole page geometry + its DOM writes (one early branch)
     makeStack()    cfg = __mobile.stackCfg(wrap, cfg)                  the clips' open box, no OPEN_DX, the digital card's width, the laptop's row size
     layoutSize()   G.dy = PG.seat(G, eff, cfg, capEl, groupCapEl)       the open item's vertical seat (portrait: item + caption block centred)
     layoutMeasure  G.iy += G.dy                                         … the zoom lands there
     capDx / capWrite                                                    below mode: no band offset, the member's own vertical place (capGroupDy)
     placePlay()    PG.playAt(...)                                       the disc under the item's right edge, top-aligned with the caption
     hover re-evaluation after a tap (enterHome / enterOpen / setDeck)    gated off for touch (a finger leaves no hover behind)

   WHEN: a phone = a coarse pointer without hover AND a small screen (short side ≤ 540 pt: every iPhone; an iPad mini is 744) —
   decided ONCE at load from the screen, so a rotation never swaps the mode (it swaps the composition). ?mobile=1 forces it (a
   desktop WebKit at phone size, a lab), ?mobile=0 keeps the desktop page on a phone.

   THE COMPOSITION (all CSS px = iOS pt; W × H = the VISIBLE viewport: .viewer is 100dvh here):
   PORTRAIT — HOME: the name top-left at the 20 pt margin (+ the safe area), 18 px (the 13" page's 18.5 px: the same pixel size reads
     the same); the row's baseline at .66 H, its height .56 W, the gap 40 pt (not 10.4 em); the closed laptop's row box .85 × the row
     height (its open box is the FILM's frame, ≈ .65 W in portrait — the film letterboxes — so a full-size laptop at HOME would zoom
     DOWN; at .85 it still zooms 1.37×), the room print cut by the right edge: the row continues.
     OPEN: the box B = W − 2·20 (every item the screen's width less the margins; the clips too: no 1.2×); item + caption block centred
     a little above the middle (CAP_BELOW.k of the free height above it); the caption BELOW the item in two columns squared off to the
     page — left column on the 20 pt margin (where the name and the row start), right column on the centre line — split at the text's
     longest run of blank lines (the designed "count in lines" gap), 15 px (iOS Subheadline), one line (18 px) under the item; the
     play disc under the item's right edge, top-aligned with the caption, 34 pt seen, 44 pt hit.
   LANDSCAPE — HOME: the desktop's composition (side margins ≥ 20 pt + the notch's safe area), the name 15 px, row .48 H, baseline .84 H.
     OPEN: B = .86 H, the caption in the band left of the item (the desktop's side mode, 15 px, kept off the notch), the disc beside the item.
   Every law is continuous in W and H: no cliff at 380 / 300 (the old law's), and the toolbar showing / hiding only re-seats.

   FEED (spec/05-vertical.md, 2026-10-14) — PORTRAIT is a VERTICAL FEED (the portrait composition above is v1's, kept for ?feed=0): HOME
     is the document's native scroll, one centred column — the name pinned top-left on a white scroll-edge fade with its age rolling, the
     objects down the column at .56 W row height (each its desktop size relation), 3 name-lines (65 pt) between visible papers, the
     sign-off centred; OPEN is a vertical pager — the item W − 40 wide, its caption a line under it, the neighbours' paper peeking 32 pt
     at the top and the bottom. Landscape keeps the horizontal row. ?fth ?fgap ?fname ?fpeek ?fpage tune it, ?feed=0 = v1's portrait.
   Knobs (URL, for the owner's eye; defaults = the values above): ?pth= row height ÷ W · ?pbase= baseline ÷ H · ?pgap= row gap pt ·
   ?pmac= laptop row size · ?ptop= the name's top pt · ?pk= the OPEN block's share of the free height above it · ?pcap= caption px */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const num = (k, d) => { const v = parseFloat(Q.get(k)); return Number.isFinite(v) ? v : d; };
  const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  const force = Q.get('mobile');
  const phone = force === '1' ? true : force === '0' ? false
              : mm('(pointer: coarse)') && !mm('(hover: hover)') && Math.min(screen.width, screen.height) <= 540;
  if (!phone) { window.__mobile = { on: false }; return; }

  const root = document.documentElement;
  root.classList.add('phone');
  /* FEED (spec/05-vertical.md, 2026-10-14): a phone held in PORTRAIT is a vertical feed — the document scrolls natively (a centred
     column, the name pinned with its age), a tap zooms, OPEN is a vertical pager. Decided before the first paint (html.feed) and again
     only by mode(W, H), which layoutAll() calls on every re-layout (a rotation switches it). ?feed=0: v1's horizontal portrait (A/B). */
  const FEED_OK = Q.get('feed') !== '0';
  let FEED = FEED_OK && innerHeight >= innerWidth;
  if (FEED) root.classList.add('feed');
  function mode(W, H) {
    const f = FEED_OK && H >= W;
    if (f !== FEED) { FEED = f; root.classList.toggle('feed', f); }      // a rotation only: one class on <html>
    return f;
  }

  /* ---------- the knobs ---------- */
  const P = {
    m: 20,                         // the side margin, pt (+ the safe area)
    em: 17.5,                      // portrait type em: the name = 1.03 em = 18 px; the sign-off .64 em = 11.2 px
    emLand: [14.6, 17.5],          // landscape: H / 23 within these (name 15 … 18 px)
    th: num('pth', .56),           // portrait row height ÷ W
    base: num('pbase', .66),       // portrait baseline ÷ H
    top: num('ptop', 20),          // the name's top, pt below the safe area
    gap: num('pgap', 40),          // the row's column gap, pt
    mac: num('pmac', .85),         // the closed laptop's row box ÷ the row height (data-size, desktop 1.15)
    thLand: .48, baseLand: .84, topLand: .1, bLand: .86,
    capPx: num('pcap', 15),        // the caption type, px (15 = iOS Subheadline)
    k: num('pk', .42),             // OPEN portrait: the block's top = this share of the free height (.5 = centred; less = optically up)
    thF: num('fth', .56),          // FEED: the column's row height ÷ W (a print .56 W wide; its zoom to B = W − 40 is ×1.6)
    gapName: num('fname', 1),      // FEED: the name → the first object (the MacBook's card top), name lines
    gapF: num('fgap', 3),          // FEED: between two objects' visible papers, name lines (3 × 21.6 = 65 pt)
    peek: num('fpeek', 32),        // FEED, OPEN: the neighbours' paper peeking at the top / bottom edge, pt (a 44 pt band with NB.pad 12)
    pageMs: num('fpage', 420),     // FEED, OPEN: a page snap's duration, ms (iOS-7 bezier; UIPageViewController ≈ 350, TikTok ≈ 300)
    home: Q.get('phome') || 'box', // HOME portrait — 'box': the desktop's content box (the name, the desktop's interval .69 × the row, the row), centred: the
                                   // approved page's proportions · 'top': the name at the top margin, the row's baseline at ?pbase (.66 H)
  };

  /* ---------- the CSS (phone only) ---------- */
  const css = `
  html.phone { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
               touch-action: manipulation; }
  html.phone img, html.phone video { -webkit-user-drag: none; -webkit-touch-callout: none; }
  /* the visible viewport: the toolbar's height is not the page's (spec 7: 100dvh, 100vh where unknown) */
  html.phone .viewer { height: 100vh; height: 100dvh; }
  /* no double-tap zoom anywhere (pinch-zoom excludes it, keeps the pinch: accessibility); the scroller is already pinch-zoom */
  html.phone .shield, html.phone .zone, html.phone .nzone, html.phone .play, html.phone .eff { touch-action: pinch-zoom; }
  /* OPEN: every finger motion is the page's (part 2, the TOUCH block in site.html: swipe = walk, swipe down = close, the rubber bands) —
     no page pinch / pan / double-tap there (spec 04 §6: the touch-action map); HOME keeps the pinch (the .scroller's pinch-zoom) */
  html.phone .viewer.open .shield, html.phone .viewer.open .zone, html.phone .viewer.open .nzone, html.phone .viewer.open .play { touch-action: none; }
  /* the play disc: a 44 pt target, a 34 pt disc (spec 6: hit ≥ 44, seen ≥ 30) */
  html.phone .play { background: transparent; }
  html.phone .play::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--play-gray); }
  html.phone .play svg { width: 43.3%; height: 43.3%; }
  /* captions: the phone's type size; landscape (side mode) keeps the band, off the notch */
  html.phone .caption { font-size: var(--cap-fs, 15px); }
  html.phone .caption::before { flex-basis: var(--cap-safe, 0px); }
  /* BELOW mode (portrait): the caption is the viewport's width, its type one line under the item (--cap-t, viewport y), in two columns */
  html.cap-below .caption { align-items: flex-start; width: var(--cap-w) !important; }
  html.cap-below .caption::before { flex: 0 0 var(--cap-l, 20px); }
  html.cap-below .caption::after { flex: 1 1 0; }
  html.cap-below .caption > div { margin-top: var(--cap-t, 0px); }
  html.cap-below .caption > div > :not(.cap-cols) { display: none; }
  /* the sign-off, portrait (fix D3 2026-10-13): one line is 534 pt of tracked caps, wider than the 353 pt content box — the row's end
     (its right edge on the margin) cut its first words off the left edge. Wrapped to the content width, balanced, its left edge on the
     20 pt margin where the name and the row start; the leading opened for two lines (1.3), the padding less the added half-leading so
     the last line keeps the desktop's baseline. Landscape: --sign-w none, one line as the desktop's. */
  html.phone .sign { max-width: var(--sign-w, none); white-space: var(--sign-ws, nowrap); text-wrap: balance; }
  /* fix R2-3 2026-10-14: its size floored at 11 px (the legibility floor) — landscape's em (H / 23, 14.9 px on a 343 pt screen) set it at
     9.5 px, smaller than portrait's 11.2; the padding keeps its baseline where .825em of the unfloored size put it (SF at line-height 1:
     the baseline .1445em above the line box's bottom). The grey and the tracking are the owner's (Ma pass; never letter-spacing here). */
  html.phone:not(.sign-wrap) .sign { font-size: max(11px, .64em); padding-bottom: max(0px, calc(var(--em) * .6205 - .1445em)); }
  html.phone.sign-wrap .sign { line-height: 1.3; padding-bottom: .675em; }
  .caption .cap-cols { display: none; }
  html.cap-below .caption .cap-cols { display: flex; align-items: flex-start; }
  html.cap-below .cap-cols > .cap-c1 { flex: 0 0 var(--cap-c1w, 160px); }
  html.cap-below .cap-cols > .cap-c2 { flex: 0 0 auto; }
  `;
  /* FEED (portrait): the document is the scroller; every overlay that was 'the viewer' is the viewport (position: fixed); the row is a
     centred column; the name's scroll-edge fade (iOS 26's soft edge: the passing work dissolves under the name instead of running into it) */
  const cssFeed = `
  html.phone.feed { overflow-x: hidden; overflow-y: auto; }
  html.phone.feed, html.phone.feed body { overscroll-behavior-y: auto; overscroll-behavior-x: none; }
  html.phone.feed .viewer { height: auto; }
  html.phone.feed .backdrop, html.phone.feed .shield, html.phone.feed .zone, html.phone.feed .nzone, html.phone.feed .eff, html.phone.feed .ghost,
  html.phone.feed .keep, html.phone.feed .hdr-root { position: fixed; }
  html.phone.feed .scroller { touch-action: manipulation; }
  html.phone.feed .row { flex-direction: column; align-items: center; }
  html.phone.feed .row > .wrap, html.phone.feed .row > .sign { align-self: center; }
  html.phone.feed .sign { text-align: center; }
  /* the name's scroll edge: NOT a band — white on the white page (no edge, line or tint: owner 2026-10-14 "no extra ui - clean design");
     the passing work only dissolves under the name. Its alpha eases out on smoothstep stops (a linear ramp's start would read as a faint
     line, the Mach band); it fades with the name in OPEN (the .hdr's opacity) */
  html.phone.feed .hdr::before { content: ''; position: absolute; left: calc(-1 * var(--fe-l)); top: calc(-1 * var(--fe-t)); width: 100vw; height: var(--fe-h);
    background: linear-gradient(#fff 0, #fff var(--fe-s), rgba(255,255,255,.98) calc(var(--fe-s) + (var(--fe-h) - var(--fe-s)) * .1),
      rgba(255,255,255,.84) calc(var(--fe-s) + (var(--fe-h) - var(--fe-s)) * .25), rgba(255,255,255,.5) calc(var(--fe-s) + (var(--fe-h) - var(--fe-s)) * .5),
      rgba(255,255,255,.16) calc(var(--fe-s) + (var(--fe-h) - var(--fe-s)) * .75), rgba(255,255,255,.02) calc(var(--fe-s) + (var(--fe-h) - var(--fe-s)) * .9),
      rgba(255,255,255,0) 100%); z-index: -1; pointer-events: none; }
  html.phone.feed .hdr .name { position: relative; }
  `;
  const st = document.createElement('style'); st.id = 'mobile-css'; st.textContent = css + cssFeed;
  document.head.appendChild(st);

  /* the viewport: cover the notch bands (the viewer paints them, so OPEN's #FCFCFC reaches the edges); the pinch stays (no maximum-scale) */
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/viewport-fit/.test(vp.content)) vp.content += ', viewport-fit=cover';

  /* a long press on a picture: no callout / Save Image / Look Up (spec 6; phone only — the desktop keeps right-click → Save Image) */
  document.addEventListener('contextmenu', e => { if (e.target.closest?.('.viewer')) e.preventDefault(); });

  /* ---------- the safe area (env() read off a probe; 0 where unknown) ---------- */
  let probe = null;
  function safe() {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(probe);
    }
    const s = getComputedStyle(probe);
    return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
  }

  /* the SMALL viewport's height (100svh: constant while Safari's toolbar comes and goes) — the feed's open box B is computed from it, so
     the toolbar never changes B (a B change re-rasters every card); 100vh where svh is unknown */
  let svhProbe = null;
  function svh() {
    if (!svhProbe) {
      svhProbe = document.createElement('div');
      svhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
      document.body.appendChild(svhProbe);
    }
    return svhProbe.offsetHeight || innerHeight;
  }
  /* ---------- one source of truth for the phone's open box ---------- */
  const portrait = (W, H) => H >= W;
  function margins(W, H, sa) {
    if (portrait(W, H)) return { l: P.m + sa.l, r: P.m + sa.r };
    const g = Math.max(P.m, .05 * W);                                   // landscape: the desktop's air, at least 20 pt off the notch
    return { l: Math.max(g, P.m + sa.l), r: Math.max(g, P.m + sa.r) };
  }
  function phoneB(W, H, sa = SA) {
    const mg = margins(W, H, sa);
    if (portrait(W, H)) return Math.max(0, Math.min(W - mg.l - mg.r, .62 * (FEED ? Math.min(H, svh()) : H)));   // the width less the margins (a short screen: ≤ .62 H, so the caption fits; FEED: of the small viewport)
    return Math.min(P.bLand * H, .5 * (W - mg.l - mg.r), W - 2 * bandMin(sa));   // landscape: .86 H, the side band wide enough for the caption
  }
  /* landscape: the band left of the item must hold the caption's widest line (≈ 8.6 em of 15 px type: "Christoph Kohstall") with the
     band's split (.caption CSS: margin : gap = 646 : 354) leaving ≥ 16 px of gap — else the item narrows (both sides, it stays centred) */
  const bandMin = sa => sa.l + 12 + 8.6 * P.capPx + 16 / .354;
  /* OPEN_EXT — a pile whose OPEN pose reaches past its front card (a fan, the drawings' slots): its visible extents beyond the
     effective rect, as fractions of B (a: the eff's width ÷ B), MEASURED at p = 1 with resp/mobile/extents.mjs (iPhone 15 Pro, 2026-10-13;
     the poses scale with B, so the fractions hold at every size — re-measure after retuning a fan / DRAW_HOVER). On a phone the pile's
     WHOLE picture is fitted between the margins and centred (its B and its x shift, extB() / page()), and the caption goes under its
     lowest card (seat()). On a desktop nothing reads this. */
  const OPEN_EXT = {
    polaroids: { a: .8225, h: 1,     l: 0,     r: .2051, t: .0275, b: .122 },
    drawings:  { a: 1,     h: .7054, l: .0802, r: .027,  t: .0647, b: .0406 },
    digital:   { a: .953,  h: 1,     l: 0,     r: 0,     t: 0,     b: .029 },
  };
  const NOEXT = { a: 1, h: 1, l: 0, r: 0, t: 0, b: 0 };
  const extB = (name, W, H) => {                                         // the pile's B: its whole picture within the margins (portrait)
    const B = phoneB(W, H), x = OPEN_EXT[name];
    if (!x) return B;
    if (!portrait(W, H)) {                                              // landscape: the whole picture within the height
      const vh = x.h + x.t + x.b, fit = Math.min(B, .94 * H / vh);
      if (x.a <= x.h) return fit;                                       // a tall pile (the polaroids, the digital) is height-bound: as before
      return Math.max(fit, Math.min(P.bLand * H / vh, (W - 2 * bandMin(SA)) / (x.a + 2 * x.l)));   // a wide one (the drawings, fix D2): the
    }                                                                   // band's width, less what its fan reaches into the band (x.l, both sides: centred)
    const mg = margins(W, H, SA);
    return Math.min(B, (W - mg.l - mg.r) / (x.a + x.l + x.r));
  };
  const clipB = (W, H) => portrait(W, H) ? phoneB(W, H) : Math.min(1.2 * phoneB(W, H), .58 * (W - 2 * P.m), W - 2 * bandMin(SA));   // a clip: the width in portrait (no 1.2×)
  /* LANDSCAPE, a wide item (fix D2 2026-10-13): the square B (.86 H) fitted a wide print into its width — turning the phone made it
     SMALLER (the room 353 → 295 pt wide on an 852 pt screen, 46 % of the height). As Photos: the item's own rectangle — .86 H tall at
     its effective aspect, as wide as the side band allows (W − 2 · bandMin: the caption still fits left of it, the item centred) —
     never below the square's fit. Portrait: unchanged (the width is the bound there). */
  const med = a => { a = a.slice().sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 1; };
  const aspectOf = c => {                                               // the engine's effAspect(effRatios()) (block-scoped there): the median
    const r = (c.images || []).filter(m => m.eff !== 0 && m.w && m.h).map(m => m.w / m.h), l = r.filter(v => v > 1);   // landscape ratio, else
    return l.length ? med(l) : med(r);                                  // the median of all
  };
  const wideB = (base, ar) => (W, H) => {
    const b = base(W, H);
    return portrait(W, H) ? b : Math.max(b, Math.min(P.bLand * H * ar, W - 2 * bandMin(SA)));
  };
  let SA = { t: 0, r: 0, b: 0, l: 0 };
  let below = false, LAY = null, TH_F = 0;
  /* FEED, the BAND CAP (spec 05 §3.2: B "capped so the block fits the band"; fix VR2-1 2026-10-14): each stack's open B so its item +
     its caption block fits the band between the peeks — B ≤ (band − 1 line − the caption's height) ÷ (the item's height ÷ B). Before,
     only phoneB's .62 · svh bit, which never does for the polaroids (1.15 B + 18 + 7 lines): at 393 × 600 their last credits ran 30 pt
     under the trees' peek (and into its tap band). The band is taken from the SMALL viewport and this orientation's first bottom inset
     (SAB, per W), so Safari's toolbar never changes B (a B change re-rasters every card); the seat still uses the live H. FITK: per stack,
     its item's height ÷ B (a fan's whole picture, OPEN_EXT; else the contain-fit of its effective aspect), from stackCfg(); FIT: per
     stack, the cap at this layout (page()); the MacBook (the film's frame decides its box) is never capped. */
  const FITK = {}, SAB = { W: -1, b: 0 };
  let FIT = {};
  const fitOf = (name, W, H) => FEED && portrait(W, H) && FIT[name] > 0 ? FIT[name] : Infinity;

  /* ---------- pageLayout()'s phone branch: returns PG, writes the page's DOM (as the desktop branch does) ---------- */
  function page(W, H, c) {
    SA = safe();
    const por = portrait(W, H), mg = margins(W, H, SA);
    const em = por ? P.em : Math.min(P.emLand[1], Math.max(P.emLand[0], H / 23));
    const TH = por ? P.th * W : P.thLand * H;
    let base = por ? P.base * H : P.baseLand * H;
    let top = por ? SA.t + P.top : Math.max(SA.t + P.top * .6, P.topLand * H);
    if (por && P.home === 'box') {                                      // ?phome=box: the desktop's content box, scaled — name over the row at the desktop's interval, the box centred
      const nameH = 1.2 * 1.03 * em, ch = nameH + .69 * TH + TH;
      top = Math.max(SA.t + P.top, (H - ch) / 2); base = top + ch;
    }
    if (FEED && por) {                                                   // FEED: the column (the name pinned at the top)
      TH_F = P.thF * W; const nameH = 1.2 * 1.03 * em; top = SA.t + P.top;
      base = top + nameH + P.gapName * nameH + TH_F;                     // (unused by the column; contentBottom)
    }
    const B = phoneB(W, H, SA), KB = B / c.STACK.refBox, KV = B / c.FLIP.refBox;
    const contentLeft = mg.l, contentW = W - mg.l - mg.r, contentTop = top, contentBottom = base, contentH = base - top;
    LAY = { W, H, por, mg, em, TH, base, B };
    below = por;
    if (root.classList.contains('cap-below') !== below) root.classList.toggle('cap-below', below);   // at boot and at a rotation only (a style change on <html>)
    // writes (the desktop branch's, with the phone's numbers)
    root.style.setProperty('--em', em + 'px');
    root.style.setProperty('--cap-fs', P.capPx + 'px');
    root.style.setProperty('--cap-w', W + 'px');
    root.style.setProperty('--cap-l', mg.l + 'px');
    root.style.setProperty('--cap-c1w', Math.max(0, W / 2 - mg.l) + 'px');
    root.style.setProperty('--cap-safe', (por ? 0 : SA.l + 12) + 'px');
    root.style.setProperty('--sign-w', por ? contentW + 'px' : 'none');   // the sign-off wraps to the content box in portrait (fix D3)
    root.style.setProperty('--sign-ws', por ? 'normal' : 'nowrap');
    if (root.classList.contains('sign-wrap') !== por) root.classList.toggle('sign-wrap', por);
    c.hdrRoot.style.cssText = `left:${contentLeft}px;top:${contentTop}px;width:${contentW}px;height:${contentH}px`;
    if (FEED && por) {
      const nameH = 1.2 * 1.03 * em;
      c.hdrRoot.style.cssText = `left:${contentLeft}px;top:${top}px;width:${contentW}px;height:${nameH}px`;
      root.style.setProperty('--fe-l', contentLeft + 'px'); root.style.setProperty('--fe-t', top + 'px');
      root.style.setProperty('--fe-s', (top + nameH + 4) + 'px'); root.style.setProperty('--fe-h', (top + 2 * nameH + 4) + 'px');
      c.row.style.top = (top + nameH + P.gapName * nameH) + 'px'; c.row.style.height = ''; c.row.style.width = W + 'px';
      c.row.style.paddingLeft = c.row.style.paddingRight = '0px'; c.row.style.columnGap = '0px';
    } else {
    c.row.style.top = (base - TH) + 'px'; c.row.style.height = TH + 'px';
    c.row.style.paddingLeft = contentLeft + 'px'; c.row.style.paddingRight = mg.r + 'px';
    c.row.style.columnGap = (por ? P.gap : Math.max(P.gap, .07 * W)) + 'px';
    }
    c.ghost.style.cssText = `left:${(W - B) / 2}px;top:${(H - B) / 2}px;width:${B}px;height:${B}px`;
    FIT = {};
    if (FEED && por) {                                                   // the BAND CAP (its note at FITK), after the caption's CSS above
      if (SAB.W !== W) { SAB.W = W; SAB.b = SA.b; }
      const band = svh() - SA.t - SAB.b - 2 * P.peek - 2.5 * lineH();   // [peek.top + 1 line, peek.bot − 1.5 lines] of the small viewport (seat())
      for (const s of c.stacks) {
        const f = FITK[s.name]; if (!f) continue;
        const cap = s.capEl || (s.capGroup ? c.stacks.find(o => o.capEl && o.capGroup === s.capGroup)?.capEl : null);   // its own, or its group's
        const cc = cap ? cols(cap) : null, ch = cc ? cc.offsetHeight + lineH() : 0;
        const ea = s.eff?.aspect || f.ea, x = OPEN_EXT[s.name];
        const k = x ? x.t + x.h + x.b : (ea >= 1 ? 1 / ea : 1);
        FIT[s.name] = Math.max(0, (band - ch) / k);
      }
    }
    for (const s of c.stacks) {                                          // OPEN_EXT: a fan's picture centred (the stack's OPEN_DX, a share of W)
      const x = OPEN_EXT[s.name];
      if (x) s.openDx = por ? -(x.r - x.l) / 2 * Math.min(extB(s.name, W, H), fitOf(s.name, W, H)) / W : 0;
    }
    const THo = FEED && por ? TH_F : TH;
    return { W, H, bx: 1, by: 1, scale: 1, C: em / 20, em, hMargin: mg.l, vMargin: top, contentW, contentH, contentLeft, contentTop, contentBottom,
             TH: THo, bRest: THo, B, K: KB, KV, padRight: mg.r, zonePadY: 0,   // (the GROW stage's g / sL … : pageLayout() sets their no-op values for every profile)
             phone: por ? 'portrait' : 'landscape', capBelow: below, seat, playAt, capLine };
  }

  /* ---------- makeStack(): the phone's per-stack config ---------- */
  function stackCfg(wrap, cfg) {
    const c = Object.assign({}, cfg);
    if (c.openDx) c.openDx = 0;                                          // the polaroids' optical shift is a side-band nicety: centred on a phone
    if (c.openB && !c.film) c.openB = clipB;                             // the clips (and the still trailer): the phone's box (spec 7: capped at the width)
    if (OPEN_EXT[c.name]) c.openB = (W, H) => extB(c.name, W, H);        // a fan: its whole picture within the margins
    else if (!c.film) { const ar = aspectOf(c); if (ar > 1) c.openB = wideB(c.openB || ((W, H) => phoneB(W, H)), ar); }   // a wide item, landscape: its own rectangle (fix D2)
    if (c.images && c.images.some(m => m.scale > 1))                    // the digital 136 card (1.25 B) would be wider than the screen
      c.images = c.images.map(m => m.scale > 1 ? Object.assign({}, m, { scale: 1 }) : m);
    if (c.name === 'macbook' && wrap) wrap.dataset.size = String(P.mac);
    if (!c.film) {                                                       // the BAND CAP (its note at FITK): the feed's B never taller than its band
      FITK[c.name] = { ea: aspectOf(c) };
      const base = c.openB || ((W, H) => phoneB(W, H));                  // (no own box: the page's B, which the ghost holds — the same rect)
      c.openB = (W, H) => Math.min(base(W, H), fitOf(c.name, W, H));
    }
    return c;
  }

  /* ---------- captions in BELOW mode: two columns, split at the longest run of blank lines ---------- */
  function cols(capEl) {
    const inner = capEl.firstElementChild; if (!inner) return null;
    let cc = inner.querySelector(':scope > .cap-cols');
    if (cc) return cc;
    const src = inner.querySelector(':scope > .cap-live') || inner;
    const kids = [...src.children].filter(k => !k.classList.contains('cap-ref') && !k.classList.contains('cap-cols'));
    let a = kids, b = [];
    const sp = k => k.classList.contains('cap-sp');
    if (kids.some(sp)) {                                                 // a TEXT caption: lines and half-line spaces
      let best = -1, len = 0;
      for (let i = 0; i < kids.length; ) {
        if (!sp(kids[i])) { i++; continue; }
        let j = i; while (j < kids.length && sp(kids[j])) j++;
        if (j - i > len) { len = j - i; best = i; }
        i = j;
      }
      if (best >= 0) { a = kids.slice(0, best); b = kids.slice(best + len); }
    } else if (kids.length > 1) { a = kids.slice(0, 1); b = kids.slice(1); }   // blocks: the lines | the credits
    const trim = l => { while (l.length && sp(l[0])) l.shift(); while (l.length && sp(l[l.length - 1])) l.pop(); return l; };
    cc = document.createElement('div'); cc.className = 'cap-cols'; cc.setAttribute('aria-hidden', 'true');
    for (const [cls, list] of [['cap-c1', trim(a)], ['cap-c2', trim(b)]]) {
      const d = document.createElement('div'); d.className = cls;
      for (const k of list) { const n = k.cloneNode(true); n.classList.remove('credits'); if (!sp(n)) n.style.marginTop = '0'; d.appendChild(n); }
      cc.appendChild(d);
    }
    inner.appendChild(cc);
    return cc;
  }
  const LINES = {};                                                      // per stack: its caption's top line (viewport y; capGroupDy())
  const capLine = name => LINES[name] || 0;
  const lineH = () => P.capPx * 1.2;                                     // one caption line (the .caption's line-height 1.2)

  /* layoutSize(): the open item's vertical offset from the viewer's centre (and its caption's top). Portrait: the item + its caption
     (its own, or its group's: the same text beside every member) as one block, CAP_BELOW.k of the free height above it; landscape: centred. */
  function seat(G, eff, cfg, capEl, groupCap) {
    const x = OPEN_EXT[cfg.name] || NOEXT, up = x.t * G.B, dn = x.b * G.B;
    if (!LAY || !LAY.por) return (up - dn) / 2;                          // landscape: the whole picture centred on the height
    const H = G.H, cap = capEl || groupCap || null;
    let ch = 0;
    if (cap) { const cc = cols(cap); ch = cc ? cc.offsetHeight + lineH() : 0; }
    const block = up + eff.height + dn + ch, minTop = SA.t + 16;
    let top;
    if (FEED) { const pk = peek(), T0 = pk.top + lineH(), T1 = pk.bot - 1.5 * lineH(); top = T0 + Math.max(0, (T1 - T0 - block) * P.k) + up; }   // FEED: the block in the band between the peeks — 1 line under the top one, 1.5 above the bottom one (the caption belongs to its item, never to the next peek), k of its free height
    else top = Math.max(minTop, (H - block) * P.k) + up;               // the eff's top
    const line = top + eff.height + dn + lineH();                         // the caption's first line box (viewport y)
    LINES[cfg.name] = line;
    if (capEl) capEl.style.setProperty('--cap-t', line + 'px');
    return top - eff.top;
  }

  /* placePlay(): portrait — under the item at its right edge, its disc's top on the caption's first line (item px: B square, the card
     contain-fit centred: (B + cw) / 2 = the card's right edge, (B + ch) / 2 its bottom). Landscape: the desktop's place, the 44 pt target. */
  function playAt(B, cw, ch, d, gap) {
    const D = 44, inset = 5;                                              // the target and the disc's inset (the .play::before CSS)
    if (LAY && LAY.por) return { d: D, l: (B + cw) / 2 - D + inset, t: (B + ch) / 2 + lineH() - inset + 1 };
    return { d: D, l: (B + cw) / 2 + gap - inset, t: (B + ch) / 2 - D + inset };
  }

  /* FEED, OPEN: the neighbours' peek edges (viewport y): the previous object's lowest visible point, the next one's highest */
  function peek() { const H = innerHeight; return { top: SA.t + P.peek, bot: H - SA.b - P.peek }; }
  /* FEED, HOME: the column's rhythm — each object's margin so its VISIBLE paper (homeBox(…, vis): the cards, the fans, no shadow; the
     MacBook: its card box, the lid's reach, so the load hint opens into white) stands gapF name-lines under the one above; each centred on
     the column's axis by its visible bbox (a fan's centre, not its box's); the document ends 4 lines under the sign-off (+ safe-bottom).
     layoutAll() calls it after the stacks' first measure (the margins need their arranged poses), then measures again. */
  function column({ stacks, row, viewer }) {
    if (!LAY || !LAY.por) return;
    const nameH = 1.2 * 1.03 * LAY.em, G = P.gapF * nameH;
    const els = [...row.children].filter(el => el.classList.contains('wrap') || el.classList.contains('sign'));
    let prevB = null;
    for (const el of els) {
      const st = stacks.find(s => s.wrap === el), h = el.offsetHeight;
      let t = -h, b = 0, l = 0, r = 0;
      if (st) { const v = st.name === 'macbook' ? st.homeBox(false) : st.homeBox(false, false, true); t = v.t; b = v.b; l = v.l; r = v.r; }
      el.style.marginTop = (prevB === null ? -(h + t) : G + prevB - h - t) + 'px';
      el.style.left = (-(l + r) / 2).toFixed(2) + 'px';
      prevB = b;
    }
    viewer.style.height = Math.ceil(row.offsetTop + row.offsetHeight + 4 * nameH + SA.b) + 'px';
  }
  /* a rotation out of the feed: the inline styles the column wrote go (the row model writes its own) */
  function uncolumn({ row, viewer }) {
    viewer.style.height = ''; row.style.width = '';
    for (const el of row.children) if (el.style.marginTop || el.style.left) { el.style.marginTop = ''; el.style.left = ''; }
    for (const k of ['--fe-l', '--fe-t', '--fe-s', '--fe-h']) root.style.removeProperty(k);
  }
  window.__mobile = { on: true, get feed() { return FEED; }, mode, P, page, stackCfg, seat, playAt, phoneB, clipB, column, uncolumn, peek,
                      vh: () => innerHeight, svh, safe: () => SA, lineH, get layout() { return LAY; } };
})();
