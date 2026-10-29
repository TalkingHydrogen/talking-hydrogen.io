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
     only by mode(W, H), which layoutAll() calls on every re-layout (a rotation switches it). ?feed=0: v1's horizontal portrait (A/B).
     LANDSCAPE-FIRST (2026-10-15, owner: "push the version where it tells you to rotate the screen and then swipe up the entire desk of
     things, and then the name will appear"): the feed is now only for the in-app browsers that can't rotate (LinkedIn, Instagram,
     Facebook, any WKWebView without Safari's token: a portrait wall would trap a recruiter there) and ?feed=1; everywhere else the phone
     is the STAGE (its block below): upright a rotate prompt, in landscape the ENTRY and Safari's bars hidden. ?stage=0 / ?feed=0: the
     page as before the stage (v1's horizontal portrait, no prompt, no entry).
     PORTRAIT-FIRST (2026-10-15, later; owner: "so much to do before just seeing it might remove the accessibility of it"): the FEED is
     the phone's page again, in every browser — no rotate prompt, no entry: the work is one scroll away, rotation lock or not. Turned
     sideways it is the horizontal row (mode(): no prompt, no entry, Safari's bars as they are). The STAGE stays behind ?stage=1 (A/B;
     an in-app browser keeps the feed even then). */
  const UA = navigator.userAgent;
  const IN_APP = /LinkedInApp|Instagram|FBAN|FBAV|FB_IAB|FBIOS/i.test(UA) || (/iPhone|iPod/.test(UA) && !/Safari\//.test(UA));
  const FEED_Q = Q.get('feed');
  const FEED_OK = FEED_Q === '1' || (FEED_Q !== '0' && (IN_APP || Q.get('stage') !== '1'));
  const STAGE = !FEED_OK && FEED_Q !== '0' && Q.get('stage') === '1';
  if (STAGE) root.classList.add('stage');
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
    nmHide: Q.get('nmhide') !== '0',   // FEED: the name retracts on a scroll down (the NAME below) · ?nmhide=0: pinned
    nmNeg: Q.get('nmneg') !== '0',     // FEED: the name in NEGATIVE (difference over the work) · ?nmneg=0: plain ink
    nbar: Q.get('nbar') !== '0',       // FEED: the name's white STRIP under Safari's band (the BAR below) · ?nbar=0: the 10-18 retract + negative
    nbH: num('nbh', 28),               // FEED, the BAR: its minimal height below the top edge, pt (the name's line centred in it)
    nbS: num('nbs', .8),               // FEED, the BAR: the name's scale in the minimal strip (18 → 14.4 px)
    nbLine: num('nbline', .3),         // FEED, the BAR: the hairline's black alpha (UINavigationBar's shadow: black .3)
    home: Q.get('phome') || 'box', // HOME portrait — 'box': the desktop's content box (the name, the desktop's interval .69 × the row, the row), centred: the
                                   // approved page's proportions · 'top': the name at the top margin, the row's baseline at ?pbase (.66 H)
  };

  /* ---------- the CSS (phone only) ---------- */
  const css = `
  html.phone { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
               -webkit-user-select: none; user-select: none; }
  /* SAFARI GUARDS (2026-10-15, notes/safari-guards.md W1 — the owner's two-thumb zoom): EVERY element pan-y — touch-action is not
     inherited and resets at scroll containers, and Safari blocks its page pinch only when a finger's own value lacks pinch-zoom /
     manipulation (WKTouchActionGestureRecognizer, read once at the press in the UI process). pan-y keeps the STAGE's entry swipe and the
     FEED's column (a real document scroll); OPEN's layers stay none (below: every finger motion there is the page's, the LIFT's pinch) */
  html.phone, html.phone * { touch-action: pan-y; }
  html.sg-zoomed, html.sg-zoomed * { touch-action: auto !important; }   /* zoomed anyway (a restored zoom): the user's own pinch / double-tap may undo it (the guard) */
  html.phone img, html.phone video { -webkit-user-drag: none; -webkit-touch-callout: none; }
  /* Live Text / Visual Look Up / the image sheet: only an <img> under the press starts them (touch-callout does not) — the cards' images
     are not hit at all (the TOUCH block's hits are .closest('.cards'): the card's own box answers) */
  html.phone .cards img, html.phone .cards video { pointer-events: none; }
  /* the visible viewport: the toolbar's height is not the page's (spec 7: 100dvh, 100vh where unknown) */
  html.phone .viewer { height: 100vh; height: 100dvh; }
  /* OPEN: every finger motion is the page's (part 2, the TOUCH block in site.html: swipe = walk, swipe down = close, the rubber bands,
     two fingers = the LIFT) — no page pinch / pan / double-tap there (spec 04 §6: the touch-action map) */
  html.phone .viewer.open .shield, html.phone .viewer.open .zone, html.phone .viewer.open .nzone, html.phone .viewer.open .play { touch-action: none; }
  /* the LIFT (the TOUCH block): the copy above everything, the veil (the page's own colour) under it — permanent layers, never
     display-toggled (website-perf-pass: a positioned node shown over the composited row stalls the open frame); hit-tested by nothing */
  #lift { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 2147480000; pointer-events: none; touch-action: none; contain: strict; }
  #lift .lveil { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: var(--viewer-bg); opacity: 0; will-change: opacity; }
  #lift .lcopy { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; opacity: 0; will-change: transform, opacity; }
  #lift .lcard { left: 0; top: 0; margin: 0; transform: none; }
  #lift .lfl { position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform-origin: 0 0; will-change: opacity; }
  #lift .lfl > img { position: absolute; display: block; left: calc(-100% * var(--fx)); top: calc(-100% * var(--fy));
                     width: calc(100% * (1 + 2 * var(--fx))); height: calc(100% * (1 + 2 * var(--fy))); }
  #lift .lsh { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; will-change: opacity;
               box-shadow: 0 6px 18px rgba(0, 0, 0, .16), 0 2px 5px rgba(0, 0, 0, .08); }
  #lift img.lhi { position: absolute; z-index: 2; max-width: none; transform-origin: 0 0; opacity: 0; will-change: opacity; }
  /* the park (the stack's liftPark()): an opaque page-coloured patch in the pile's own 3D context, over its floor (z 0), under every card
     (z ≥ 1); the lifted card drops under it (translateZ(−5)): a depth change only, never opacity / visibility / z-index (the re-raster laws) */
  .liftpatch { position: absolute; left: 50%; top: 50%; background: var(--viewer-bg); opacity: 0; pointer-events: none; will-change: opacity; }
  /* the play disc: a 44 pt target, a 34 pt disc (spec 6: hit ≥ 44, seen ≥ 30) */
  html.phone .play { background: transparent; }
  html.phone .play::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--play-gray); }
  html.phone .play svg { width: 43.3%; height: 43.3%; }
  html.phone .keep > img { will-change: transform; }   /* 2026-10-18 KEEP PACE (site.html): each keepalive copy a layer of its own — in one shared layer, attaching or dropping any copy re-drew every kept picture (a page's first frames: 62–98 ms) */
  html.phone .play.vid, html.phone .play.scn { display: none; }   /* 2026-10-15 (owner: "no buttons on the videos"): a clip has no disc — a tap on its picture plays ↔ pauses it (site.html's TAP BACK); 2026-10-18: nor a SCENE (the comb cards) — a tap on the shape plays its next state (openTap(): the item → playKey()) */
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
     centred column; the name in negative over the work (the NAME) */
  const cssFeed = `
  html.phone.feed { overflow-x: hidden; overflow-y: auto; }
  html.phone.feed, html.phone.feed body { overscroll-behavior-x: none; overscroll-behavior-y: contain; }   /* iOS's own rubber band at both ends (owner 2026-10-17: "I just needed a natural rubberbanding of the page"); contain, not auto: no chaining (SAFARI GUARDS W3, 2026-10-15: auto turned the pull-to-refresh back on; none killed the bounce — the dead stop at the top) */
  html.phone.feed .viewer { height: auto; }
  html.phone.feed .backdrop, html.phone.feed .shield, html.phone.feed .zone, html.phone.feed .nzone, html.phone.feed .eff, html.phone.feed .ghost,
  html.phone.feed .keep, html.phone.feed .hdr-root { position: fixed; }
  html.phone.feed .row { flex-direction: column; align-items: center; }
  html.phone.feed .row > .wrap, html.phone.feed .row > .sign { align-self: center; }
  html.phone.feed .sign { text-align: center; }
  /* the NAME (owner 2026-10-18: "no white panel under it. For the contrast see waht this dude is using for his name https://povilas.grigas.co
     there is some negative stuff there"): no scroll-edge fade; the name is NEGATIVE — its layer composited by difference (that site's
     fixed header: mix-blend-mode difference) in the ink's complement (#E2E2E0 = #FFF − #1D1D1F), so it is the same ink on the white page
     and the work's negative where it passes over a paper or a picture. The retract's translate is on the same layer (the NAME, script) */
  html.phone.feed .hdr-root { will-change: transform; }
  html.phone.feed.nm-neg .hdr-root { mix-blend-mode: difference; }
  html.phone.feed.nm-neg .hdr .name { color: #E2E2E0; }
  html.phone.feed .hdr .name { position: relative; text-align: center; margin-left: 0; }   /* owner 2026-10-16: "center viktor dune on the top of the page" — the feed's name line centred (the desktop's .2em = the laptop's left edge: not here) */
  /* the BAR (owner 2026-10-28: "when up, then it just overlays it over whatever underneath … the retractable underbar … introduced in
     ios7 … adding some space under that cutoff in white, and put the viktor dune there"): a white sheet from the top edge (Safari's own
     band ends there; under the status bar too wherever the page reaches it: env(safe-area-inset-top)) to a hairline. At the top of the
     page it is invisible (white on white, no line) and the name is where it was; a scroll down shrinks it with the page (its bottom
     rides the first object's top, 1:1) to the minimal strip, the name scaling to .8 in it — iOS 7 Safari's bar → its domain strip —
     and the hairline comes in once the work passes under. A function of the scroll alone (no direction): a scroll up mid-page leaves
     the strip as it is, so the name never lies over the work. OPEN keeps it, minimal (owner 2026-10-28: "the space stays there even on
     zoom … treat the line there as effectively the page cutoff"): the open item, its neighbours' peeks and the pinch-lift lie under it.
     SAFARI 26+ (research 2026-10-28, WebKit fixedContainerEdges): the status bar's band takes the colour of the fixed element hit at the
     top centre, 4 px down, ignoring pointer-events — if it is ≥ 90 % wide, > 10 px tall and has an opaque background-color; a layer
     with none there (the .filmcap, the .shield) ends the search and the page shows under the clock. So .hdr-root IS the sheet (white,
     full width) and sits over every page layer but the pinch-lift (cut at the line). Safari ≤ 18: theme-color (boot). Script: the BAR */
  html.phone.feed.nb .hdr-root { background: #fff; z-index: 2147470000; }
  html.phone.feed.nb .nbline { position: absolute; left: 0; right: 0; bottom: 0; height: var(--nb-px, 1px); background: rgba(0, 0, 0, var(--nb-line, .3));
                               opacity: 0; }   /* one device pixel (1 / DPR) */
  html.phone.feed.nb #lift { clip-path: inset(var(--nb-cut, 0px) 0 0 0); }   /* the pinch-lift lies under the line too */
  html.phone.feed.nb .hdr .name { position: absolute; left: var(--nb-l, 0px); width: var(--nb-w, 100%); top: var(--nb-t, 0px);
                                  transform-origin: 50% 0; will-change: transform; }
  `;
  /* STAGE (landscape-first; its block below): the document is a tall invisible page under a FIXED stage (the viewer), so the visitor's
     first upward swipe is a real document scroll — the only thing that makes Safari collapse its bars — while nothing on screen scrolls.
     The stage is the LARGE viewport (100lvh: the screen once the bars are gone) anchored to the bottom: the row is laid out once for the
     bars-hidden screen and never re-laid when they come and go — with them showing, the stage's top band (the name's line) is under
     Safari's top bar, the desk whole above the bottom edge. No scroll indicator (scrollbar-width, Safari 18.2+). The rotate prompt
     (upright) and the swipe-up cue (the ENTRY) are the only added UI (owner-requested); upright the prompt covers the page (visibility +
     opacity only: never display on a layer over the row). Type: the caption's setting (15 px SF Regular, 1.2, no tracking), the ink and
     the page's quiet gray. */
  const cssStage = `
  html.phone.stage { overflow-x: hidden; overflow-y: auto; scrollbar-width: none; }
  html.phone.stage::-webkit-scrollbar { display: none; }
  html.phone.stage body { min-height: 2400vh; min-height: 2400lvh; }
  html.phone.stage .viewer { position: fixed; left: 0; right: 0; top: auto; bottom: 0; width: 100%; height: 100vh; height: var(--stage-h, 100lvh); }
  .st-type { margin: 0; font-size: 15px; line-height: 1.2; font-weight: 400; letter-spacing: 0; color: #1D1D1F; }
  .rot { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 2147483000; background: #fff; display: flex; flex-direction: column;
         align-items: center; justify-content: center; padding: 0 32px 3vh; text-align: center; visibility: hidden; opacity: 0;
         pointer-events: none; touch-action: pan-y; }
  .rot-i { display: block; width: 80px; height: 80px; margin-bottom: 14px; color: #1D1D1F; overflow: visible; }
  .rot-p { transform-box: fill-box; transform-origin: 50% 50%; }
  .rot-a { opacity: 0; }
  .rot-s { color: #868689; margin-top: 6px; opacity: 0; }
  @media (orientation: portrait) {
    html.phone.stage .rot { visibility: visible; opacity: 1; pointer-events: auto; }
    html.phone.stage .rot-p { animation: st-turn 3.6s infinite; }
    html.phone.stage .rot-a { animation: st-arc 3.6s infinite; }
    html.phone.stage .rot-s { animation: st-late .8s cubic-bezier(.25,.1,.25,1) 4s forwards; }
  }
  @keyframes st-turn {
    0%   { transform: rotate(0deg); opacity: 0; animation-timing-function: cubic-bezier(.25,.1,.25,1); }
    9%   { transform: rotate(0deg); opacity: 1; }
    26%  { transform: rotate(0deg); opacity: 1; animation-timing-function: cubic-bezier(.37,.14,.32,1); }
    52%  { transform: rotate(-90deg); opacity: 1; }
    86%  { transform: rotate(-90deg); opacity: 1; animation-timing-function: cubic-bezier(.42,0,.58,1); }
    97%, 100% { transform: rotate(-90deg); opacity: 0; }
  }
  @keyframes st-arc {
    0%, 6% { opacity: 0; } 16%, 30% { opacity: 1; animation-timing-function: cubic-bezier(.42,0,.58,1); } 46%, 100% { opacity: 0; }
  }
  @keyframes st-late { to { opacity: 1; } }
  .cue { position: fixed; left: 0; right: 0; top: 41%; z-index: 2147482000; display: flex; flex-direction: column; align-items: center;
         pointer-events: none; visibility: hidden; }
  html.phone.stage.e-wait .cue { visibility: visible; }
  .cue-in { display: flex; flex-direction: column; align-items: center; opacity: 0; }
  html.phone.stage.e-wait .cue-in { animation: st-late .7s cubic-bezier(.25,.1,.25,1) .5s forwards; }
  .cue-i { display: block; width: 26px; height: 15px; margin-bottom: 10px; color: #1D1D1F; overflow: visible; }
  html.phone.stage.e-wait .cue-i path { animation: st-bob 2.2s cubic-bezier(.42,0,.58,1) infinite; }
  @keyframes st-bob { 0%, 100% { transform: translateY(3px); opacity: .35; } 50% { transform: translateY(-3px); opacity: 1; } }
  .cue .st-type { color: #868689; }
  `;
  const st = document.createElement('style'); st.id = 'mobile-css'; st.textContent = css + cssFeed + (STAGE ? cssStage : '');
  document.head.appendChild(st);

  /* the viewport: cover the notch bands (the viewer paints them, so OPEN's #FCFCFC reaches the edges). SAFARI GUARDS (M5, 2026-10-15):
     maximum-scale=1 — Safari ignores it (it forces the limit to ≥ 5: ignoresViewportScaleLimits), the in-app WKWebViews (LinkedIn,
     Instagram: the FEED's browsers) obey it: no pinch, no double-tap, no focus zoom there at the scroll view's level. Phone only. */
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';

  /* a long press on a picture: no callout / Save Image / Look Up (spec 6; phone only — the desktop keeps right-click → Save Image) */
  document.addEventListener('contextmenu', e => { if (e.target.closest?.('.viewer')) e.preventDefault(); });

  /* ---------- the SAFARI GUARDS (2026-10-15; notes/safari-guards.md, lab fslab/guard) ----------
     Owner: "prevent anything that messes up with the safari itself, aka swiping on the left border will go back the page, and loading
     the page zoomed in or accidentally zooming in the page with two thumbs will mess everything up". Layers, cheapest first:
     1. CSS (above): every element pan-y (no page pinch, no zoom pan), OPEN's layers none; no callout / selection / drag / Live Text.
     2. WebKit's GestureEvents: prevented (non-passive).
     3. Two fingers: the second finger's touchstart and every touchmove with 2+ touches are prevented — the page never pinches, while the
        POINTER events keep flowing (the LIFT's two-finger pinch): WebKit cancels pointers only when its own zoom starts. Disjoint from
        the STAGE's one-finger lock below. claim(): the LIFT holding the picture with ONE finger left — its moves are the page's too.
     4. Double-tap: a second touchend within 350 ms / 40 pt is prevented and a dblclick listener exists — at the initial scale WebKit's
        double tap is a NON-BLOCKING recogniser that still zooms when the second tap hits no click target, and touch-action never sees
        it (bug 325368). The site's taps are pointer events: nothing of theirs is lost.
     5. HISTORY: Safari's edge swipe cannot be blocked (no page event defers it), so it is given somewhere harmless to land — every open
        view pushes ONE same-document entry inside its tap (viewOpened: expand(), a user activation, so WebKit's back list never skips
        it); a back swipe → popstate → the view closes (onBack; instantly when Safari already animated the swipe: hasUAVisualTransition,
        Safari 18+). ?back=both (the default): also ONE 'home' entry on the first tap, so a back swipe at HOME stays on the page too —
        re-armed only by a later tap: two deliberate back swipes in a row still leave the site (never a trap). ?back=view: the views
        only · ?back=0: none.
     6. ZOOM WATCH: visualViewport.scale ≠ 1 (a restored zoom, a pinch that slipped through, a rotation while zoomed) → every layer above
        stands down (html.sg-zoomed: touch-action auto) so the user's own pinch / double-tap can undo it, and `zoomed` tells the STAGE's
        bar test and layoutAll() not to measure (innerWidth / innerHeight shrink by the zoom and no resize fires). Back at ×1 they
        re-arm (onZoom). Safari has no script reset: a page RESTORED zoomed (reload, back / forward, a tab restore) is loaded once more
        at the same URL (FrameLoadType::Same restores no view state), once per tab.
     Test hooks: window.__sgEmu = { scale } stands in for visualViewport.scale (Playwright cannot zoom). */
  const guard = (() => {
    const NP = { passive: false, capture: true };
    const G = { zoomed: false, scale: 1, claim: null, onBack: null, onForward: null, onZoom: null, stats: {}, last: '' };
    const note = k => { G.stats[k] = (G.stats[k] || 0) + 1; G.last = k; };
    for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => {
      if (G.zoomed) return; if (e.cancelable) e.preventDefault(); if (t === 'gesturestart') note('gesture');
    }, NP);
    document.addEventListener('touchstart', e => { if (!G.zoomed && e.touches.length > 1 && e.cancelable) { e.preventDefault(); note('touch2'); } }, NP);
    document.addEventListener('touchmove', e => {
      if (G.zoomed || !e.cancelable) return;
      if (e.touches.length > 1 || G.claim?.()) e.preventDefault();
    }, NP);
    let lt = -1e9, lx = 0, ly = 0;
    document.addEventListener('touchend', e => {
      if (G.zoomed || e.touches.length || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0], now = e.timeStamp;
      if (now - lt < 350 && Math.hypot(t.clientX - lx, t.clientY - ly) < 40) { if (e.cancelable) e.preventDefault(); note('dbltap'); lt = -1e9; return; }
      lt = now; lx = t.clientX; ly = t.clientY;
    }, NP);
    document.addEventListener('dblclick', e => { if (!G.zoomed) e.preventDefault(); }, NP);
    document.addEventListener('dragstart', e => e.preventDefault(), NP);
    document.addEventListener('selectstart', e => e.preventDefault(), NP);

    /* 5. history */
    const MODE = Q.get('back') === '0' ? '' : Q.get('back') === 'view' ? 'view' : 'both';
    let cur = history.state && history.state.sg || null, expect = 0;
    if (cur === 'view' && MODE) {                                        // reloaded / restored on a view's entry: the page starts at HOME
      cur = MODE === 'both' ? 'home' : null;
      try { history.replaceState(cur ? { sg: 'home' } : null, ''); } catch (er) {}
    }
    /* 2026-10-18 (owner: "when i zoom in, scroll further and then zoom out, it doesnt zoom out on the one it was zoomed in … teleports me
       … likely to the beginning"): the way back to HOME is a history traversal (viewClosed's back(), or a back swipe), and WebKit restores
       the scroll it saved on the entry the view was pushed from — the tap's — right after the popstate, undoing HOME AIM's re-scroll to
       the item paged to (the TOUCH block's scroll listener then re-based the close onto it). So that entry is 'manual' while a view is
       up (the mode is per entry: set on the current one before the push), and gets its own mode back a task after the traversal back
       (WebKit reads it after the popstate's dispatch, in the same task): a reload at HOME restores as before. */
    let sr0 = null, srBack = null;                                       // the HOME entry's own scroll restoration mode while a view is up · … due back on it
    G.viewOpened = id => {                                               // in the tap that opens a view (a camera move: the same entry, re-named)
      if (!MODE) return;
      try {
        if (cur === 'view') history.replaceState({ sg: 'view', id }, '');
        else { if (sr0 === null) sr0 = srBack ?? history.scrollRestoration; srBack = null; history.scrollRestoration = 'manual'; history.pushState({ sg: 'view', id }, ''); }
        cur = 'view'; note('push view');
      } catch (er) {}
    };
    G.viewClosed = () => { if (!MODE || cur !== 'view') return; expect++; history.back(); };   // the page closed it itself (a tap, a pull): its entry goes
    if (MODE === 'both') addEventListener('pointerup', e => {           // capture: before the page's own tap pushes a view
      if (cur || e.pointerType === 'mouse') return;
      try { history.pushState({ sg: 'home' }, ''); cur = 'home'; note('push home'); } catch (er) {}
    }, { passive: true, capture: true });
    if (MODE) addEventListener('popstate', e => {
      const prev = cur, next = e.state && e.state.sg || null, instant = !!e.hasUAVisualTransition;
      cur = next;
      if (next !== 'view' && sr0 !== null) { srBack = sr0; sr0 = null; setTimeout(() => { try { if (srBack !== null) history.scrollRestoration = srBack; } catch (er) {} srBack = null; }); }   // back at HOME: its mode, once this traversal's restore is skipped (a view re-opened first takes it over)
      if (expect) { expect--; return; }                                  // our own history.back() after a tap-close
      if (next === 'view') { note('forward'); G.onForward?.(e.state.id); return; }
      if (prev === 'view') { note('back'); G.onBack?.({ instant }); return; }
      note('back home');                                                 // a back swipe at HOME: the page stayed (re-armed by the next tap)
    });
    Object.defineProperty(G, 'entry', { get: () => cur });

    /* 6. the zoom watch */
    const vv = window.visualViewport;
    const scaleNow = () => { const E = window.__sgEmu; return E && E.scale ? E.scale : vv ? vv.scale : 1; };
    G.check = () => {
      const s = scaleNow(), z = Math.abs(s - 1) > .01; G.scale = s;
      if (z === G.zoomed) return z;
      G.zoomed = z; root.classList.toggle('sg-zoomed', z); note(z ? 'zoomed' : 'unzoomed');
      try { G.onZoom?.(z, s); } catch (er) { setTimeout(() => { throw er; }); }
      return z;
    };
    const KEY = 'sg-zoom-replace';
    function boot(final) {                                               // a page restored zoomed: once more, at the same URL (once per tab)
      if (window.__sgEmu?.noReplace) { G.check(); return; }
      let done = false; try { done = sessionStorage.getItem(KEY) === '1'; } catch (er) {}
      if (G.check()) { if (!done) { try { sessionStorage.setItem(KEY, '1'); } catch (er) {} location.replace(location.href); } return; }
      if (final) try { sessionStorage.removeItem(KEY); } catch (er) {}
    }
    if (vv) { vv.addEventListener('resize', G.check); vv.addEventListener('scroll', G.check); }
    addEventListener('orientationchange', () => setTimeout(G.check, 400));
    addEventListener('pageshow', e => { if (e.persisted) boot(false); else G.check(); });
    addEventListener('load', () => { boot(false); setTimeout(() => boot(false), 300); setTimeout(() => boot(true), 1000); }, { once: true });
    G.check();
    return G;
  })();

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
    nmLaid(c.hdrRoot, 0);                                                 // (the cssText dropped the NAME's translate)
    if (FEED && por) {
      const nameH = 1.2 * 1.03 * em;
      if (P.nbar) nbLaid(c.hdrRoot, W, top, nameH, contentLeft, contentW); // the BAR: the name in its white strip (it never retracts)
      else {
      c.hdrRoot.style.cssText = `left:${contentLeft}px;top:${top}px;width:${contentW}px;height:${nameH}px`;
      nmLaid(c.hdrRoot, P.nmHide ? top + nameH + 1 : 0);                  // the NAME: its reach = off the top edge (the safe area, its margin, its line)
      }
      c.row.style.top = (top + nameH + P.gapName * nameH) + 'px'; c.row.style.height = ''; c.row.style.width = W + 'px';
      c.row.style.paddingLeft = c.row.style.paddingRight = '0px'; c.row.style.columnGap = '0px';
    } else {
    if (NB.on) nbOff();                                                   // a rotation out of the feed: the BAR goes (the row's name is the desktop's)
    c.row.style.top = (base - TH) + 'px'; c.row.style.height = TH + 'px';
    c.row.style.paddingLeft = contentLeft + 'px'; c.row.style.paddingRight = mg.r + 'px';
    c.row.style.columnGap = (por ? P.gap : Math.max(P.gap, .07 * W)) + 'px';
    }
    c.ghost.style.cssText = `left:${(W - B) / 2}px;top:${(H - B) / 2}px;width:${B}px;height:${B}px`;
    FIT = {};
    if (FEED && por) {                                                   // the BAND CAP (its note at FITK), after the caption's CSS above
      if (SAB.W !== W) { SAB.W = W; SAB.b = SA.b; }
      const band = svh() - cutY() - SAB.b - 2 * P.peek - 2.5 * lineH();   // [peek.top + 1 line, peek.bot − 1.5 lines] of the small viewport (seat())
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
    if (STAGE) stageLaid();                                              // the STAGE: the desk's travel re-measured at the next entry frame
    return { W, H, bx: 1, by: 1, scale: 1, C: em / 20, em, hMargin: mg.l, vMargin: top, contentW, contentH, contentLeft, contentTop, contentBottom,
             TH: THo, bRest: THo, B, K: KB, KV, padRight: mg.r, zonePadY: 0,   // (the GROW stage's g / sL … : pageLayout() sets their no-op values for every profile)
             phone: por ? 'portrait' : 'landscape', capBelow: below, seat, playAt, capLine };
  }

  /* ---------- makeStack(): the phone's per-stack config ---------- */
  function stackCfg(wrap, cfg) {
    const c = Object.assign({}, cfg);
    if (c.openDx) c.openDx = 0;                                          // the polaroids' optical shift is a side-band nicety: centred on a phone
    if (c.phoneB) c.openB = c.phoneB;                                    // 2026-10-27: its own phone box (the PILL SHOWCASE)
    else if (c.openB && !c.film) c.openB = clipB;                        // the clips (and the still trailer): the phone's box (spec 7: capped at the width)
    if (OPEN_EXT[c.name]) c.openB = (W, H) => extB(c.name, W, H);        // a fan: its whole picture within the margins
    else if (!c.film && c.name !== 'pillshow') { const ar = aspectOf(c); if (ar > 1) c.openB = wideB(c.openB || ((W, H) => phoneB(W, H)), ar); }   // a wide item, landscape: its own rectangle (fix D2) — not the PILL SHOWCASE: its 3.2 : 1 card is a hit frame, the panel it grows into needs the clips' box
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
    if (cfg.seatY > 0) return LAY && LAY.por ? cfg.seatY * G.H - (eff.top + eff.height / 2) : cfg.openDy ? cfg.openDy(G.W, G.H, G.B) : 0;   // 2026-10-27: an item seated on the screen's own grid (the PILL SHOWCASE: its centre at seatY × H in portrait; landscape: its desktop seat)
    const x = OPEN_EXT[cfg.name] || NOEXT, up = x.t * G.B, dn = x.b * G.B;
    if (!LAY || !LAY.por) return (up - dn) / 2;                          // landscape: the whole picture centred on the height
    const H = G.H, cap = capEl || groupCap || null;
    let ch = 0;
    if (cap) { const cc = cols(cap); ch = cc ? cc.offsetHeight + lineH() : 0; }
    const block = up + eff.height + dn + ch, minTop = cutY() + 16;
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
  function peek() { const H = innerHeight; return { top: cutY() + P.peek, bot: H - SA.b - P.peek }; }
  /* the page's top edge for OPEN (viewport y): the BAR's line where it is on (owner 2026-10-28: "treat the line there as effectively the
     page cutoff"), else the safe area */
  const cutY = () => NB.on ? NB.cut : SA.t;
  /* FEED, HOME: the column's rhythm — each object's margin so its VISIBLE paper (homeBox(…, vis): the cards, the fans, no shadow; the
     MacBook: the machine with the lid at its load hint's top, so the hint lifts into white) stands gapF name-lines under the one above; each centred on
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
      if (st) { const v = st.homeBox(false, false, true); t = v.t; b = v.b; l = v.l; r = v.r; }   // (the MacBook's vis = the lift's reach: site.html's MACBOOK; before 2026-10-16 its whole card box, the open lid's)
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
  }
  /* ---------- FEED: the NAME retracts (2026-10-18, owner: "the viktor dune must retract on scroll down") ----------
     The name rides the page: a scroll down carries it up and off the top 1:1 (at most its reach: off the top edge), a scroll up brings it
     back the same way, and it is never more hidden than the page has scrolled — at the top it is always whole, as part of the page. Only
     the scroll inside [0, max] counts: Safari's rubber band at either end moves nothing. Left part-way when the scroll stops (120 ms), it
     finishes the way the page last went (an exponential, τ 80 ms). The scroll is read once a frame (rAF, as the LAG's feedLag()); one
     translate on the fixed .hdr-root, written only when it changes. Away from HOME the document is frozen, so OPEN leaves it as it is. */
  const NM = { el: null, reach: 0, y: 0, sy: null, dir: 0, t: 0, f: 0, raf: 0, w: '' };
  function nmWrite() {
    const v = NM.y > .01 ? `translate3d(0, ${(-NM.y).toFixed(2)}px, 0)` : '';
    if (v !== NM.w && NM.el) { NM.w = v; NM.el.style.transform = v; }
  }
  function nmLaid(el, reach) {               // page(): .hdr-root's cssText was written (its transform gone) — this layout's reach
    NM.el = el; NM.reach = reach; NM.y = Math.min(NM.y, reach); NM.sy = Math.max(0, scrollY); NM.w = ''; nmWrite();   // (the scroll baseline NOW: a null one lost the next scroll — after an open / close's re-layout one scroll down left the name on the MacBook)
  }
  function nmStep(now) {
    NM.raf = 0;
    if (!NM.reach) return;
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight), y = Math.min(max, Math.max(0, scrollY));
    const dy = NM.sy === null ? 0 : y - NM.sy, dt = NM.f ? Math.min(64, now - NM.f) : 16.7;
    NM.sy = y; NM.f = now;
    if (dy) { NM.dir = Math.sign(dy); NM.t = now; NM.y = Math.min(NM.reach, Math.max(0, NM.y + dy)); }
    let to = NM.y;
    if (now - NM.t > 120 && NM.y > 0 && NM.y < NM.reach) {              // stopped part-way: on the way the page went
      to = NM.dir > 0 ? NM.reach : NM.dir < 0 ? 0 : NM.y > NM.reach / 2 ? NM.reach : 0;
      NM.y += (to - NM.y) * (1 - Math.exp(-dt / 80));
      if (Math.abs(to - NM.y) < .3) NM.y = to;
    }
    NM.y = Math.min(NM.y, y);                                           // near the top: never more hidden than scrolled
    nmWrite();
    if (now - NM.t < 160 || (NM.y > 0 && NM.y < NM.reach && Math.abs(Math.min(to, y) - NM.y) >= .3)) NM.raf = requestAnimationFrame(nmStep);
    else NM.f = 0;
  }
  /* ---------- FEED: the BAR (2026-10-28; its CSS: the html.nb rules) ----------
     The geometry, from the top edge of the layout viewport (0 = where Safari's band ends; under the status bar where the page reaches it,
     env(safe-area-inset-top) = SA.t, so the sheet starts at 0 either way): at rest the sheet reaches half-way down the gap between the
     name's line and the first object (h0), minimal it is SA.t + nbh (h1). The first D = h0 − h1 pt of scroll shrink it 1:1 (its bottom
     rides the column), the name going from its place (SA.t + ptop, 18 px) to the strip's centre at nbs; past D the hairline comes in
     over 8 pt. Read once a frame from scrollY in [0, max] (Safari's rubber band moves nothing); every write rounded to device pixels so
     the hairline lands on one row of them. */
  const NB = { on: false, el: null, ln: null, nm: null, D: 0, t0: 0, t1: 0, h0: 0, cut: 0, px: 1, raf: 0, b: 0, w: '', pp: 0 };
  function nbLaid(el, W, top, nameH, l, w) {
    const dpr = devicePixelRatio || 1, px = v => Math.round(v * dpr) / dpr;
    if (!NB.ln) {
      const hdr = el.querySelector('.hdr'); if (!hdr) return;
      NB.ln = document.createElement('div'); NB.ln.className = 'nbline'; NB.ln.setAttribute('aria-hidden', 'true');
      hdr.appendChild(NB.ln); NB.nm = hdr.querySelector('.name');
    }
    const h0 = px(top + nameH + P.gapName * nameH / 2), h1 = px(Math.min(h0, SA.t + P.nbH));
    NB.el = el; NB.D = h0 - h1; NB.h0 = h0; NB.cut = h1; NB.px = 1 / dpr;
    root.style.setProperty('--nb-cut', h1 + 'px');                      // (#lift: the pinch-lift is cut there too)
    NB.t0 = top; NB.t1 = SA.t + (P.nbH - P.nbS * nameH) / 2;
    el.style.cssText = `left:0px;top:0px;width:${W}px;height:${h0}px;--nb-px:${NB.px}px;--nb-line:${P.nbLine};` +
                       `--nb-l:${l}px;--nb-w:${w}px;--nb-t:${top}px`;
    nmLaid(el, 0);                                                      // (the cssText dropped any translate; the retract stays off)
    if (!NB.on) { NB.on = true; root.classList.add('nb'); }
    NB.w = ''; nbStep();
  }
  function nbOff() {
    NB.on = false; root.classList.remove('nb');
    if (NB.nm) NB.nm.style.transform = '';
    if (NB.el) NB.el.style.transform = '';
    if (NB.ln) NB.ln.style.opacity = '';
    NB.w = ''; NB.b = 0;
  }
  function nbStep() {
    NB.raf = 0;
    if (!NB.on) return;
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight), y = Math.min(max, Math.max(0, scrollY));
    const dpr = devicePixelRatio || 1, px = v => Math.round(v * dpr) / dpr;
    const pp = NB.pp, d = px(Math.max(Math.min(NB.D, y), pp * NB.D)), p = NB.D > 0 ? d / NB.D : 1;   // OPEN (pp, site.html's pageP): the minimal strip
    const o = Math.max(pp, Math.min(1, Math.max(0, (y - NB.D) / 8)));
    const k = `${d}|${o.toFixed(3)}`;
    if (k === NB.w) return;
    NB.w = k; NB.b = NB.h0 - d;
    NB.el.style.transform = d ? `translate3d(0, ${-d}px, 0)` : '';     // the sheet (.hdr-root) up by d, the name back down by d + its own move
    NB.nm.style.transform = p ? `translate3d(0, ${(d + (NB.t1 - NB.t0) * p).toFixed(3)}px, 0) scale(${(1 - (1 - P.nbS) * p).toFixed(4)})` : '';
    NB.ln.style.opacity = o ? o.toFixed(3) : '';
  }
  function nbOpen(v) {                                                  // site.html, per frame: the page's open progress (0 HOME … 1 OPEN)
    v = Math.min(1, Math.max(0, v)); if (Math.abs(v - NB.pp) < 1e-4) return;
    NB.pp = v; if (NB.on && !NB.raf) NB.raf = requestAnimationFrame(nbStep);
  }
  if (FEED_OK && P.nbar && !document.querySelector('meta[name="theme-color"]')) {   // Safari 15–18: its band in the strip's white (26+: the strip itself)
    const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#ffffff'; document.head.appendChild(m);
  }
  if (FEED_OK) {
    if (P.nmNeg && !P.nbar) root.classList.add('nm-neg');               // at boot only (a class on <html>) — the BAR's name is plain ink on its white
    addEventListener('scroll', () => {
      if (NB.on) { if (!NB.raf) NB.raf = requestAnimationFrame(nbStep); }
      else if (!NM.raf) NM.raf = requestAnimationFrame(nmStep);
    }, { passive: true });
  }
  /* ---------- the STAGE (landscape-first, 2026-10-15): the rotate prompt, the ENTRY, Safari's bars ----------
     The mechanism is the one proven on the owner's iPhone (iOS 18.3.1; resp notes landscape-fullscreen.md, lab v4): a fixed stage over
     a tall invisible document, the first upward swipe a REAL document scroll, then a touchmove lock.
     UPRIGHT: the rotate prompt (CSS: the .rot rules; its second line after 4 s — Portrait Orientation Lock can't be detected). The page
       under it takes no finger (hold()); a vertical swipe on it is the document's own (the bars minimise, and that carries into landscape).
     LANDSCAPE, first arrival — the ENTRY: white, the desk (the row) waiting below the screen, its papers' top edges peeking (?epeek= × H),
       and the swipe-up cue. The swipe is a real document scroll (never preventDefault-ed: Safari collapses its bars) and the desk follows
       the FINGER 1:1 in the stage's frame — not scrollY: the collapse moves the viewport and the bar's height is not in the scroll —
       a rubber band above its seat. Let go: a critically damped spring (?eresp= .5 s response) carries the finger's speed to the seat —
       a third of the way up or flicked up (≥ .3 pt/ms) — else back down. A tap lifts it too (no bars hidden then: the next upward swipe
       does it). LANDED: the cue goes, ?ename= 350 ms later the name fades in, then the page comes alive as on a desktop (then(): the lid's
       hint). Once a visit: a rotation back keeps the desk up, the row's place and an open object (the engine's layoutAll()).
     THE BARS: hidden when innerHeight reaches the LARGE viewport (a hidden 100lvh probe), 'fixed' when 100lvh − 100svh ≤ 4 (nothing to
       hide: an in-app view, a Home Screen app, Playwright). After the entry, in landscape, bars hidden or fixed = LOCKED: every one-finger
       touchmove is preventDefault-ed (non-passive: the lock that works on every iOS) and the scroller / OPEN layers allow no pan, so no
       scroll ever reaches Safari; the engine's recogniser (TOUCH) takes every gesture as before. Bars back (a tap on the top edge, the app
       switcher) = UNLOCKED: an upward one-finger swipe is the document's again (it hides them; the desk stays — no second entry), decided
       at the FIRST touchmove (WebKit defers its pan to that answer); every other gesture stays the site's. A pinch is never touched here.
     Hooks for the engine (site.html): hold() — TOUCH makes no gesture of its own (upright, during the entry); native(dx, dy) — this finger
     is the document's (TOUCH lets it go); then(fn) — fn after the landing (at once with no entry). ?entry=0: the desk up from the start
     (labs, harnesses). Test hook (Playwright has no bars): window.__barsEmu = { s, l, ih } stands in for the 100svh / 100lvh probes (and
     innerHeight) and sizes the stage l px tall, as Safari's 100lvh is. */
  const EN = { on: STAGE && Q.get('entry') !== '0', done: true, x: 0, D: 0, dirty: true, f: null, raf: 0, v: 0, cbs: [],
               peek: num('epeek', .06), resp: num('eresp', .5), nameMs: num('ename', 350) };
  EN.done = !EN.on;
  let T = null, locked = false, panOK = null, lvhProbe = null, pollN = 0, pollRaf = 0, scrollQ = 0, barsNow = '';
  const byId = id => document.getElementById(id);
  const isLand = () => innerWidth > innerHeight;
  function lvh() {                                                      // the LARGE viewport (the screen with Safari's bars gone)
    if (!lvhProbe) {
      lvhProbe = document.createElement('div');
      lvhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
      document.body.appendChild(lvhProbe);
    }
    return lvhProbe.offsetHeight || innerHeight;
  }
  function bars() {
    let s = svh(), l = lvh(), ih = innerHeight; const E = window.__barsEmu;
    if (E) { s = E.s ?? s; l = E.l ?? l; ih = E.ih ?? ih; }
    return l - s <= 4 ? 'fixed' : ih >= l - 1 ? 'hidden' : 'showing';
  }
  const rb = (o, dim) => (1 - 1 / (o * .55 / Math.max(1, dim) + 1)) * dim;   // the row's rubber band (ROWPHYS.edge.c)
  function stageLaid() {                                                // page(): a new layout — the desk's travel is re-measured
    EN.dirty = true;
    if (EN.on && !EN.done && !EN.f && !EN.raf) requestAnimationFrame(() => { if (!EN.done && !EN.f && !EN.raf) { measureD(); put(EN.D); } });
  }
  function measureD() {                                                 // the travel: the papers' top edges EN.peek × H above the stage's bottom
    EN.dirty = false;
    const v = byId('viewer'), sc = byId('scroller'); if (!v || !sc) return;
    const H = v.clientHeight || innerHeight, W = v.clientWidth || innerWidth, top0 = v.getBoundingClientRect().top;   // (both rects carry the offset)
    let top = Infinity;
    for (const c of sc.querySelectorAll('.row > .wrap:not(#macbook) .card')) {   // (the closed laptop is a slab under an empty lid box)
      const r = c.getBoundingClientRect();
      if (r.width && r.height && r.right > 0 && r.left < W) top = Math.min(top, r.top - top0);
    }
    EN.D = Math.max(.25 * H, Number.isFinite(top) ? H - EN.peek * H - top : .6 * H);
  }
  /* the desk's offset is the whole VIEWER's translate (the name inside it is unseen until the landing): the engine measures every rect
     in the viewer's frame (minus its rect), so a layout during the entry stays exact — on the scroller, the stacks' home rects carried
     the offset and the first zoom after the landing aimed a stage height off */
  function put(x) {
    EN.x = x;
    const v = byId('viewer'); if (v) v.style.transform = x ? 'translate3d(0,' + x.toFixed(2) + 'px,0)' : '';
    const cue = EN.cue; if (cue) { const o = EN.D > 0 ? Math.max(0, Math.min(1, 1 - 2.6 * (1 - x / EN.D))) : 1; cue.style.opacity = o < 1 ? o.toFixed(3) : ''; }
  }
  const fy = t => t.clientY - byId('viewer').getBoundingClientRect().top + EN.x;   // the finger in the stage's frame (the viewer's rect less the desk's own offset)
  function grab(t, ts) {
    stopAnim(); if (EN.dirty) measureD();
    const y = fy(t); EN.f = { y0: y, x0: EN.x, q: [[ts, y]], m: 0, t0: ts, X0: t.clientX, Y0: t.clientY, ly: y, lt: performance.now(), sy: scrollY };
  }
  function follow(y, ts) {                                              // the finger at y (the stage's frame): the desk 1:1, rubber-banded past its ends
    const f = EN.f, H = byId('viewer').clientHeight || innerHeight;
    f.q.push([ts, y]); while (f.q.length > 2 && ts - f.q[0][0] > 100) f.q.shift();
    const raw = f.x0 + y - f.y0;                                        // + = down
    put(raw < 0 ? -rb(-raw, H) : raw > EN.D ? EN.D + rb(raw - EN.D, H) : raw);
  }
  function drag(t, ts) {
    const f = EN.f, y = fy(t);
    f.m = Math.max(f.m, Math.hypot(t.clientX - f.X0, t.clientY - f.Y0));
    f.ly = y; f.lt = performance.now(); f.sy = scrollY;
    follow(y, ts);
  }
  function scrolled() {                                                 // insurance: no touchmove for 60 ms while the document scrolls under the finger —
    const f = EN.f; if (!f || performance.now() - f.lt < 60) return;    // follow the scroll instead (finger up = scroll down; the bars' collapse not in it)
    const now = performance.now(); f.m = Math.max(f.m, 11); follow(f.ly - (scrollY - f.sy), now);
  }
  function release(cancel, ts) {
    const f = EN.f; EN.f = null; if (!f) return;
    const q = f.q, a = q[0], b = q[q.length - 1], span = b[0] - a[0];
    const v = !cancel && span > 0 && ts - b[0] < 60 ? (b[1] - a[1]) / span : 0;   // px/ms, + = down (the row's estimator: 0 after a rest)
    const tap = !cancel && f.m < 10 && ts - f.t0 < 500;
    const p = EN.D > 0 ? 1 - EN.x / EN.D : 1;
    spring(tap || (!cancel && ((p >= .33 && v < .15) || v <= -.3)) ? 0 : EN.D, tap ? 0 : v);
  }
  function stopAnim() { if (EN.raf) cancelAnimationFrame(EN.raf); EN.raf = 0; }
  function spring(tgt, v0) {                                            // critically damped, the finger's speed as its start
    stopAnim(); EN.v = Math.max(-4, Math.min(4, v0));
    const w = 2 * Math.PI / (EN.resp * 1000); let last = performance.now();
    const step = now => {
      const dt = Math.max(0, Math.min(32, now - last)); last = now;
      const n = Math.max(1, Math.ceil(dt)), h = dt / n; let x = EN.x, v = EN.v;
      for (let i = 0; i < n; i++) { v += (-w * w * (x - tgt) - 2 * w * v) * h; x += v * h; }
      EN.v = v;
      if (Math.abs(x - tgt) < .3 && Math.abs(v) < .02) { EN.raf = 0; put(tgt); if (tgt === 0) landed(); return; }
      put(x); EN.raf = requestAnimationFrame(step);
    };
    EN.raf = requestAnimationFrame(step);
  }
  function landed() {
    EN.done = true;
    const v = byId('viewer'); if (v) { v.style.transform = ''; v.style.willChange = ''; }
    root.classList.remove('e-wait'); if (EN.cue) EN.cue.style.opacity = '';
    setTimeout(() => {
      const n = document.querySelector('.hdr .name');
      if (n) { n.style.transition = 'opacity .6s cubic-bezier(.25,.1,.25,1)'; n.style.opacity = ''; setTimeout(() => { n.style.transition = ''; }, 700); }
      for (const fn of EN.cbs.splice(0)) { try { fn(); } catch (e) { setTimeout(() => { throw e; }); } }
    }, EN.nameMs);
    sync();
  }
  function decide(dx, dy) {                                             // this finger: the document's (true) or the site's (false)
    if (!isLand() || !EN.done) return true;                            // upright (the prompt) / the entry: the document's scroll
    if (locked) return false;
    return Math.abs(dy) > Math.abs(dx) && dy < 0;                       // the bars showing: an upward swipe hides them again
  }
  function sync() {                                                     // the lock follows the bars, the orientation and the entry
    if (guard.zoomed) return;                                          // SAFARI GUARDS: zoomed, innerHeight is the magnified view's — the last lock state stands (re-run at ×1: onZoom)
    const b = bars(); barsNow = b;
    locked = EN.done && isLand() && b !== 'showing';
    const pan = !locked;
    if (pan === panOK) return;
    panOK = pan;
    const sc = byId('scroller'); if (sc) sc.style.touchAction = pan ? 'pan-y' : '';   // (SAFARI GUARDS W1: never pinch-zoom; locked = the CSS's pan-y, the lock's touchmove prevents the pan)
    for (const id of ['shield', 'zoneL', 'zoneR', 'nzoneL', 'nzoneR']) { const el = byId(id); if (el) el.style.touchAction = pan ? 'pan-y' : ''; }
  }
  /* the invisible document is finite (2400 lvh) and every swipe that hides the bars again spends a swipe + its momentum (1–2 k px); at its
     end Safari would show the bars on a pull. So once LOCKED and still (no finger, no scroll for 450 ms) past 60 % of it, it is parked
     back at 1 lvh — a script scroll: Safari's bars only follow the visitor's scrolls, and the fixed stage shows nothing of it */
  let parkT = 0;
  function park() {
    if (!locked || T) return;
    const max = document.documentElement.scrollHeight - innerHeight, y0 = Math.round(lvh());
    if (max > 0 && scrollY > .6 * max) scrollTo(0, y0);
  }
  function pollStep() { pollRaf = 0; sync(); if (--pollN > 0) pollRaf = requestAnimationFrame(pollStep); }
  function poll() { pollN = 75; if (!pollRaf) pollRaf = requestAnimationFrame(pollStep); }   // ~1.2 s of frames: the sizes settle late after a turn
  const stage = STAGE ? {
    hold: () => !isLand() || !EN.done,
    native(dx, dy) { if (!T) return false; if (T.nat === null && (dx || dy)) T.nat = decide(dx, dy); return T.nat === true; },
    then(fn) { if (EN.done) fn(); else EN.cbs.push(fn); },
    get entry() { return { on: EN.on, done: EN.done, x: EN.x, D: EN.D, dragging: !!EN.f, anim: !!EN.raf }; },   // debug (the probes)
    get locked() { return locked; }, get bars() { return barsNow; }, sync,
  } : null;
  const zoomCbs = [];                                                   // SAFARI GUARDS: back at ×1 — the STAGE's lock, then the engine's deferred layout
  guard.onZoom = (z, s) => { for (const fn of zoomCbs) fn(z, s); };
  if (STAGE) zoomCbs.push(z => { if (!z) { panOK = null; sync(); } });
  if (STAGE) {
    const E = window.__barsEmu; if (E && E.l) root.style.setProperty('--stage-h', E.l + 'px');
    const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; document.body.appendChild(d); return d; };
    mk('rot', '<svg class="rot-i" viewBox="0 0 80 80" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
              '<g class="rot-p"><rect x="28.5" y="20" width="23" height="48" rx="6"/><rect x="36.4" y="23.3" width="7.2" height="2.3" rx="1.15" ' +
              'fill="currentColor" stroke="none"/><path d="M37.2 64.6h5.6" stroke-width="1.2"/></g>' +
              '<path class="rot-a" d="M66.85 28.5A31 31 0 0 0 21.78 18.92M21.78 18.92l5.5.4M21.78 18.92l1.3-5.3"/></svg>' +
              '<p class="st-type rot-t">Best in landscape</p><p class="st-type rot-s">Rotation locked? Turn it off in Control Center.</p>')
      .setAttribute('role', 'status');
    if (EN.on) {
      root.classList.add('e-wait');
      EN.cue = mk('cue', '<div class="cue-in"><svg class="cue-i" viewBox="0 0 26 15" aria-hidden="true"><path d="M3 12 L13 3.5 L23 12" fill="none" ' +
                         'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><p class="st-type">Swipe up</p></div>');
      const v = byId('viewer'), H0 = v?.clientHeight || innerHeight;      // below the stage until the first layout measures the peek
      if (v) { v.style.willChange = 'transform'; v.style.transform = 'translate3d(0,' + H0 + 'px,0)'; }
      EN.x = H0;
      const n = document.querySelector('.hdr .name'); if (n) n.style.opacity = '0';
    }
    addEventListener('touchstart', e => {
      if (e.touches.length !== 1) { T = null; if (EN.f) release(true, e.timeStamp); return; }   // a second finger: not the entry's
      const t = e.touches[0]; T = { x0: t.clientX, y0: t.clientY, nat: null };
      if (!EN.done && isLand()) grab(t, e.timeStamp);
    }, { passive: true, capture: true });
    addEventListener('touchmove', e => {
      if (!T || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (T.nat === null) { const dx = t.clientX - T.x0, dy = t.clientY - T.y0; if (dx || dy) T.nat = decide(dx, dy); }
      if (EN.f) drag(t, e.timeStamp);
      if (T.nat === false && e.cancelable) e.preventDefault();          // the LOCK (and every gesture of the site's while unlocked)
    }, { passive: false, capture: true });
    const tEnd = e => {
      if (e.touches.length) return;
      if (EN.f) { const t = e.changedTouches[0]; if (t && e.type === 'touchend') drag(t, e.timeStamp); release(e.type === 'touchcancel', e.timeStamp); }
      T = null; sync();
    };
    addEventListener('touchend', tEnd, { passive: true, capture: true });
    addEventListener('touchcancel', tEnd, { passive: true, capture: true });
    addEventListener('resize', poll);
    if (window.visualViewport) visualViewport.addEventListener('resize', poll);
    addEventListener('orientationchange', poll);
    addEventListener('pageshow', poll);
    addEventListener('scroll', () => {
      if (EN.f) scrolled();
      if (!scrollQ) scrollQ = requestAnimationFrame(() => { scrollQ = 0; sync(); });
      clearTimeout(parkT); parkT = setTimeout(park, 450);
    }, { passive: true });
    try { history.scrollRestoration = 'manual'; } catch (e) {}           // a reload starts at the document's top (not deep in it, near its end)
    sync();
  }

  window.__mobile = { on: true, get feed() { return FEED; }, mode, P, page, stackCfg, seat, playAt, phoneB, clipB, column, uncolumn, peek,
                      vh: () => innerHeight, svh, safe: () => SA, lineH, get layout() { return LAY; }, stage, guard,
                      get nm() { return { ...NM, el: undefined }; },   // FEED: the NAME's retract (debug)
                      barB: () => NB.on ? NB.b : 0,                     // FEED: the BAR's bottom edge now, viewport px (site.html's paperAt() / openTap(): no tap on the work under it)
                      get bar() { return NB.on; }, barOpen: nbOpen,     // FEED: the BAR is on (site.html keeps the name there in OPEN) · its open progress
                      get feedGap() { return LAY ? P.gapF * 1.2 * 1.03 * LAY.em : 0; },   // FEED: the gap between two papers, px (column(): site.html's feedLag() caps the lag by it)
                      onZoom: fn => zoomCbs.push(fn) };
})();
