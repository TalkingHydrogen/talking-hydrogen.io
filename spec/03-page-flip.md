# 03 — Open card-stack viewer: "flip through the stack" transition

Source: `ref/3-flip.mov` (2122×1622 @ 2× DPR = **1061×811 CSS px viewport**, 60 fps, 788 frames, 13.1 s).
All px below are **CSS px (1×)** unless marked "full" (= recording px, 2×). Frame numbers are 1-based
(`ref/frames3/fNNNN.png`). Per-frame tracks: `spec/ref/03-track-{1,3,4,5}.csv`; contact sheets: `spec/ref/03-*.png`.

## 1. Overview

The opened viewer shows **4 cards** (Olivetti Valentine typewriter, Braun coffee maker, Sony Walkman, Olivetti
calculator), all centred on the same point, each sized so its **longer side is 680 px** (64 vw / 84 vh here).
Back cards are not a fan in the usual sense: they peek out only because their aspect ratios differ, plus a tiny
per-slot offset (±21.5 px, ±0.33° per step). A click in the **left 30 % → previous**, **right 30 % → next**
(wraps around: prev from card 0 shows card 3). Hovering those zones first makes the neighbouring card **peek**
sideways (≈ +65…107 px, 0.9…1.6°) as an affordance. A flip is not a swipe: every card springs to the slot of its
new relative index (single spring, ω≈14.2 rad/s, ζ≈0.89 ≈ tension 200 / friction 25), z-order swaps ≈80 ms after
the click, and the **incoming card holds its peek slot for ≈250 ms before it springs to centre**. Nothing fades,
scales or leaves the screen. "Prev" is the mirror image of "next" (not a time-reversal).

```
 z=4  ┌───────────────────────────┐   current card (rel 0)   x=0,  rot 0
 z=3  │ ┌─────────────────────┐   │   prev    (rel -1)       x=-21.5, rot -0.33°   (left, in FRONT of next)
 z=2  │ │  ┌────────────────┐ │   │   next    (rel +1)       x=+21.5, rot +0.33°
 z=1  │ │  │   ┌──────────┐ │ │   │   next+1  (rel +2)       x=+44.5, rot +0.66°
      │ │  │   │          │ │ │   │
      └─┼──┼───┼──────────┼─┼─┼───┘   all cards share one centre (532, 415.5); sizes differ per photo
        └──┴───┴──────────┴─┴─┘
 hovered zone: the rel ±1 card on that side additionally rotates/slides out ("peek").
 backdrop: #FCFCFC full-viewport (page behind is #F2F2F2 when closed);  close "×" top-right.
```

## 2. Open layout at rest (measured on frame 60, cursor outside the hover region)

Viewport 1061×811 (recording). Stack centre **(532, 415.5)** = (50.1 vw, 51.2 vh). The centre sits 10 px below
the viewport centre and the close button is cut off at the top, which suggests the capture lost ≈20 px at the
top; if so the true viewport is 1061×831 and the stack is exactly centred. Treat "centred in viewport" as the rule.

| element | size (px) | aspect | left, top (px) | centre offset | rotation | z | notes |
|---|---|---|---|---|---|---|---|
| card 0 typewriter (current) | 680 × 453 | 1.50 | 192, 189 | 0, 0 | 0° | 4 | longer side = 680 = 0.641 vw = 0.838 vh |
| card 1 coffee maker (rel +1) | 522 × 678 | 0.77 | 292, 76 | **+21.5**, 0 | **+0.35°** | 2 | portrait, peeks top & bottom |
| card 2 walkman (rel +2) | 677 × 534 | 1.27 | 241, 150 | **+44.5**, 0 | **+0.66°** | 1 | behind everything |
| card 3 calculator (rel −1 = prev) | 680 × 511 | 1.33 | 171, 160 | **−21.5**, 0 | **−0.35°** | 3 | in front of rel +1 |
| card fill | — | — | — | — | — | — | **#EBEBEB** (235); photo background is identical, so use transparent PNG/WebP or matching bg |
| card shadow | — | — | — | — | — | — | symmetric, no offset: ≈5 % darkening at the edge fading over ≈4 px → `0 0 4px rgba(0,0,0,.12)`; unchanged during motion |
| backdrop | full viewport | — | — | — | — | 0 | **#FCFCFC** (252). Closed page (`2-stack.mov` frame 1) is #F2F2F2 (242) → opening lightens the page ≈75 % towards white. No blur detectable (flat bg). |
| close button | Ø 35 circle | — | centre ≈ (1000, ~5) | right edge 44 px from viewport right | — | top | fill #F2F2F2, "×" glyph ≈ 8.5 px, ~1 px stroke, #6C6C6C. Half cut off by the capture (see note above); assume `top≈8–10px; right≈44px`. |

Slot rule (fits all rest states, 4 cards): `rel = (i − current + N) mod N`, mapped to signed `−1` for `N−1`.
`x = PIVOT·sin(rot)`, `rot = rel · 0.33°`, `PIVOT ≈ 3800 px` (i.e. the fan is a rotation about a point far below the
stack; `translateX(21.5px) rotate(0.33deg)` is equivalent at this size). Vertical offset ≈ 0 (≤1.5 px).
Z-order: `current > prev(−1) > next(+1) > next+1(+2)` (verified in frames 60, 320, 450).
No caption, index dots or counter anywhere in the frame. Cursor is the plain arrow everywhere (no hand).

Hover "peek" (secondary but needed for the pre-flip state): pointer in the left/right zone → the rel ∓1 card on that
side moves to `rot = ±(0.33° + 1.0°·(h/w))`, `x = PIVOT·sin(rot)` with the same spring. Measured totals from centre:
coffee (0.77 aspect→h/w 1.30) ±106.5 px / ±1.63°; walkman +75 / +1.1°; calculator −71 / −1.1°; typewriter −65.5 / −0.9°.
(The aspect rule reproduces all four within 2 px / 0.1°; the site's actual formula is unknown.) Other cards do not move.
Zone boundaries observed: left zone x < 0.30 vw (peek at 311, none at 326), right zone x > 0.70 vw (peek at 743, none at 731).
The pointer must also be over the viewer's central region: hovering at x = 902 (0.85 vw, over the back card) kept the peek,
x = 988 (0.93 vw) ended it → hover region ≈ ±450 px from centre (≈85 vw), **estimated from one leave event**.

## 3. Transition table

t0 = spring onset of the outgoing card (click, sub-frame from the fit). "settled" = within 1 CSS px of final.

| # | direction | cards | t0 (frame) | z-swap | incoming starts | outgoing settled | incoming settled | click pos (px / vw) |
|---|---|---|---|---|---|---|---|---|
| T1 | next 0→1 | typewriter → coffee | 256.3 (f258 first visible) | f261 (+83 ms) | f271.5 (+250 ms) | f273 (+283 ms) | f292 (+600 ms) | (902, 464) = 0.85 vw |
| T2 | next 1→2 | coffee → walkman | 334.0 | f339 (+83 ms) | f349.5 (+258 ms) | f352 (+300 ms) | f369 (+583 ms) | (902, 464) = 0.85 vw |
| T3 | prev 2→1 | walkman → coffee | 506.3 | f511 (+78 ms) | f521 (+245 ms) | f525 (+312 ms) | f543 (+612 ms) | (291, 450) = 0.27 vw |
| T4 | prev 1→0 | coffee → typewriter | 580.0 | f585 (+83 ms) | f595.5 (+258 ms) | f598 (+300 ms) | f614 (+567 ms) | (290, 450) = 0.27 vw |
| T5 | prev 0→3 (wrap) | typewriter → calculator | 652.9 | f658 (+85 ms) | f668.5 (+260 ms) | f672 (+318 ms) | f688 (+585 ms) | (290, 450) = 0.27 vw |

Direction is decided by click x: both "next" clicks are at 0.85 vw, all "prev" clicks at 0.27 vw, i.e. the same
zones that trigger the peek. The cursor never moved between hover and click, so every flip starts from a peeked state.
Frames 733+ show the macOS recording toolbar (ignored). The recording has at least two duplicated frames (531, 581) and
a late first paint after two clicks (T1, T4); the fits below account for this with a free onset offset.

## 4. Motion spec

### 4.1 One spring for everything
Every measured curve (peek in/out, outgoing, incoming, fan re-slot) fits the same **spring from rest, mass 1**:

| series | Δ (px full) | spring ω (rad/s) | ζ | tension | friction | RMS (of Δ) | best cubic-bezier | dur | RMS |
|---|---|---|---|---|---|---|---|---|---|
| hover peek-in (coffee, right) | 169 | 14.29 | 0.888 | 204 | 25.4 | 0.19 % | (.27,.35,.29,1) | 380 ms | 0.28 % |
| hover peek-out | −169 | 14.05 | 0.868 | 197 | 24.4 | 0.13 % | (.27,.34,.32,1) | 365 ms | 0.22 % |
| hover peek-in (coffee, left) | −170 | 14.52 | 0.893 | 211 | 25.9 | 0.8 %* | (.35,.64,.30,1) | 414 ms | 0.8 %* |
| T1 incoming coffee | −213 | 14.15 | 0.884 | 200 | 25.0 | 0.12 % | (.29,.43,.32,1) | 381 ms | 0.24 % |
| T3 incoming coffee | +213 | 14.32 | 0.894 | 205 | 25.6 | 0.14 % | (.29,.43,.29,1) | 393 ms | 0.23 % |
| T2 outgoing coffee | −43 | 14.33 | 0.897 | 205 | 25.7 | 0.19 % | (.28,.43,.31,1) | 387 ms | 0.29 % |
| T5 outgoing typewriter | +44 | 14.22 | 0.886 | 202 | 25.2 | 0.15 % | (.27,.34,.29,1) | 381 ms | 0.18 % |
| T1 / T4 outgoing (late first paint) | ∓44 | 14.65 / 14.69 | 0.90 | 215 | 26.5 | 0.5 % | — | — | — |

\* one dropped frame inside the window. **Use: ω = 14.2 rad/s, ζ = 0.89 → react-spring `{tension: 200, friction: 25, mass: 1}`**
(Framer `stiffness 200, damping 25`). Time to 1 % ≈ 350 ms, to 0.1 % ≈ 450 ms; theoretical overshoot 0.2 % (0.2 px on
107 px) — visually none. The spring beats every bezier by ~2×; if you must use CSS, `cubic-bezier(.28,.40,.30,1) 385ms`
is within 0.3 % of Δ. Velocity peaks at 70–90 ms (frames 4–6) — the ramp is visible, so do not use a pure ease-out.

### 4.2 "next" (click right zone, T1 = typewriter → coffee, pre-state: coffee peeked right at +106.5 px / +1.63°)
Per card, all translate-x from the stack centre (px), rotation (deg), starting at t0 unless noted:

| card | role | from | to | starts | notes |
|---|---|---|---|---|---|
| typewriter | outgoing, rel 0 → −1 | x 0, rot 0 | **x −21.5, rot −0.33°** | t0 | 44 px(full) travel, settled ≈ 280 ms. Drops to z 3 at the swap (+83 ms). No scale/opacity change. |
| coffee | incoming, rel +1 → 0 | x +106.5, rot +1.63° (peek) | **x 0, rot 0** | **t0 + 250 ms** | raised to z 4 at t0+83 ms while still sitting in its peek slot; holds there ~167 ms more, then springs to centre (≈350 ms). |
| calculator | prev → rel +2 | x −21.5, rot −0.35° | x +44.5, rot +0.66° | t0 | slides right *behind* the typewriter (66 px) |
| walkman | rel +2 → +1 (hovered side) | x +44.5, rot +0.66° | x +75, rot +1.1° (peek, cursor still in zone) | t0 | i.e. straight to the new hover slot; would be +21.5/+0.33° if the pointer had left |

If the click happens without a preceding hover (touch / fast click) the incoming card starts from +21.5 px / +0.33°; the
recording never shows this case.

### 4.3 "prev" (click left zone, T3 = walkman → coffee, pre-state: coffee peeked left at −106.5 px / −1.63°)

| card | role | from | to | starts | notes |
|---|---|---|---|---|---|
| walkman | outgoing, rel 0 → +1 | x 0, rot 0 | **x +21.5, rot +0.33°** | t0 | mirror of "next"; z 4 → 2 at +78 ms |
| coffee | incoming, rel −1 → 0 | x −106.5, rot −1.63° | **x 0, rot 0** | **t0 + 245 ms** | raised to z 4 at +78 ms; springs to centre ≈ 350 ms |
| typewriter | rel +2 → −1 (hovered side) | x +44.5, rot +0.66° | x −65.5, rot −0.9° (left peek) | t0 | 110 px leftwards, passes *behind* the coffee card and re-emerges on the left (frames 511–535) |
| calculator | rel +1 → +2 | x +21.5, rot +0.33° | x +44.5, rot +0.66° | t0 | |

T4 (coffee → typewriter) and T5 (typewriter → calculator, wrap) follow the same pattern with the landscape incoming card
starting from its left peek (−65.5 / −0.9° and −71 / −1.1°). "prev" is therefore the **mirror** of "next" (signs
flipped), not the reverse playback: the outgoing card always moves *away* from the click side by one slot and the
incoming card arrives *from* the click side.

Outgoing card destiny: it never leaves the viewport and never fades; it becomes the neighbour on the opposite side
(z 3 for prev, z 2 for next). Incoming card origin: its fan slot (peek slot when hovered) — never off-screen, never scaled.
No breathe/bounce after settling (top edge y constant to ±0.5 px through all flips); shadow constant.

## 5. Interaction model

* **Shown by the recording**: pointer in the right 30 % of the viewport (and over the viewer region) → next-card peek;
  click there → next. Left 30 % → prev peek / prev. Direction is decided by pointer x, not by which card is under it
  (the x=902 click was outside the current card). Wraps in both directions (0 → 3 observed; assume 3 → 0).
  Same behaviour with the cursor kept still between clicks (T2) — no re-hover needed. Arrow cursor everywhere.
* **Not shown / unknown**: whether the trigger is `pointerdown` or `click` (t0 is 3–5 frames before the z-swap either
  way), the middle-40 % click (nothing? close?), the close "×" (never clicked; it exists at top-right), keyboard arrows,
  drag/swipe, wheel, Escape, and what happens on repeated clicks mid-flight (springs retarget naturally).
* **Recommendation**: `pointerdown` on the overlay → decide by `e.clientX / innerWidth` (<0.3 prev, >0.7 next), middle
  = close; ArrowLeft/Right = prev/next; Escape = close; re-clicks while animating just update targets.

## 6. Constants (ready to paste; M = measured, E = estimated)

```js
export const FLIP = {
  // sizing / layout (M unless noted)
  cardMaxSide: 680,            // px at 1061×811 viewport = 0.641 vw = 0.838 vh (which one drives it is unknown; use min(64vw, 84vh))
  centerX: 0.5,                // fraction of viewport width  (M)
  centerY: 0.5,                // fraction of viewport height (E: 0.512 in a capture that likely lost ~20 px at top)
  cardBg: '#EBEBEB',           // M
  backdropBg: '#FCFCFC',       // M (closed page is #F2F2F2)
  cardShadow: '0 0 4px rgba(0,0,0,0.12)', // E from ~5 % edge darkening over ~4 px (M)
  closeBtn: { size: 35, top: 8, right: 44, bg: '#F2F2F2', glyph: 8.5, color: '#6C6C6C' }, // top E, rest M

  // fan slots: x = pivot * sin(rot), rot = rel * slotDeg   (M; pivot fitted)
  slotDeg: 0.33,               // per relative index step
  pivot: 3800,                 // px below the stack centre → 21.5 px for ±1, 44.5 px for +2
  zOrder: (rel) => ({0: 4, [-1]: 3, 1: 2, 2: 1}[rel] ?? 0), // current > prev > next > next+1 (M for N=4)

  // hover peek of the rel ±1 card on the pointer side (M values; aspect rule E)
  peekDeg: (h, w) => 0.33 + 1.0 * (h / w),   // coffee 1.63°, walkman/calc 1.1°, typewriter 0.9–1.0°
  zoneLeft: 0.30, zoneRight: 0.70,           // fractions of viewport width (M ±0.01)
  hoverRegionHalfWidth: 450,                 // px from centre; pointer beyond this = no hover (E, one sample)

  // timing (M)
  spring: { tension: 200, friction: 25, mass: 1 },  // ω 14.2 rad/s, ζ 0.89; ~350 ms to 1 %
  bezierFallback: { curve: [0.28, 0.40, 0.30, 1], duration: 385 },
  zSwapDelay: 83,              // ms after t0: incoming raised to top, outgoing dropped
  incomingDelay: 250,          // ms after t0: incoming card starts its spring (±10)
  fanDelay: 0,                 // outgoing + all other back cards start immediately
  settleMs: 350,               // per spring; whole flip ≈ 600 ms
  cardCount: 4,                // M (typewriter, coffee maker, walkman, calculator); wraps
};
```

## 7. Implementation notes (vanilla JS/CSS)

**DOM**
```html
<div class="viewer" data-open>            <!-- fixed, inset:0, background:#FCFCFC, z-index above page -->
  <button class="viewer__close">×</button>
  <div class="viewer__stage">             <!-- absolutely centred point; cards positioned from its centre -->
    <figure class="card" data-i="0"><img src="typewriter.png"></figure>
    <figure class="card" data-i="1"><img src="coffee.png"></figure>
    …
  </div>
</div>
```
* `.card { position:absolute; left:50%; top:50%; background:#EBEBEB; box-shadow:0 0 4px rgba(0,0,0,.12); will-change:transform; }`
  Size each card from the image's natural ratio: longer side = `min(64vw, 84vh)` (both equal 680 here). Set width/height
  explicitly once images are loaded (or from a known manifest) so layout never jumps.
* Position purely with transforms: `transform: translate(-50%,-50%) translateX(${x}px) rotate(${rot}deg)`;
  `transform-origin: 50% 50%`. (Equivalent to rotating about a pivot 3800 px below; the explicit translate is
  easier to drive.) Keep every card in the DOM at all times — the outgoing card just gets a new target.
* z-order: set `style.zIndex` from `zOrder(rel)` in one place; change it on a timer at `t0 + zSwapDelay`, not at t0.
  Only the incoming/outgoing pair actually changes value (others can be re-applied, no visual effect).

**State & driver**
* State: `current`, per-card `{x, rot, vx, vrot, targetX, targetRot}`, `hoverSide ∈ {-1,0,+1}`, `pendingSwap`.
* `targetsFor(i)`: `rel = signedRel(i, current, N)`; `rot = rel*slotDeg`; if `rel === hoverSide` (±1) use
  `rot = sign*peekDeg(h,w)`; `x = pivot*sin(rot)`. Incoming card (rel 0 after a flip) keeps its *old* target until
  `t0 + incomingDelay`, then targets `(0,0)`.
* Spring step in `requestAnimationFrame` (dt clamped to ≤ 32 ms, sub-step at 1–2 ms like react-spring for stability):
  `a = -tension*(x - target) - friction*v; v += a*dt; x += v*dt` per property (x and rot share the same spring so they
  stay in phase; you can spring `rot` alone and derive `x = pivot*sin(rot)` to guarantee the arc). Stop when
  |x−target|<0.01 and |v|<0.01 for all cards; then drop `will-change` is optional (keep it while the viewer is open).
* `flip(dir)`: `t0 = now; current = (current+dir+N)%N; setTargets(); setTimeout(swapZ, 83); setTimeout(releaseIncoming, 250)`.
  Re-entrant: another flip mid-flight just recomputes targets and restarts the two timers; springs carry their velocity.
* Hover: on `pointermove` compute `side = x<0.3W ? -1 : x>0.7W ? +1 : 0`, only while the pointer is within
  ±hoverRegionHalfWidth of centre; on change → `setTargets()` (same spring). On `pointerleave` of the viewer → side 0.
  Touch devices: no hover, incoming starts from the plain ±21.5 slot.
* Images: preload all N images (`new Image()` / `<link rel=preload>`) before the viewer opens; decode with
  `img.decode()` so the first flip doesn't hitch. Photos have a background identical to #EBEBEB — use transparent PNG/WebP
  or bake the same grey so no edge shows.
* Reduced motion: `prefers-reduced-motion` → jump to targets (still keep the 250 ms incoming delay short or zero).

**Hooks for the zoom-in entry (spec 01/02 territory, not covered here)**
* The viewer's rest state is fully described by `{current, hoverSide:0}` → `targetsFor()`; the zoom-in transition should
  end by handing over card elements already positioned at these targets (x = pivot·sin(rel·0.33°), rot = rel·0.33°,
  z from `zOrder`) so the spring driver can take over with zero velocity.
* Expose `viewer.open(index, {from: rectOfClosedStack})` and `viewer.close()`; the closed stack's own hover behaviour is a
  separate spec. Backdrop goes #F2F2F2 → #FCFCFC on open (animate opacity of an overlay).

## 8. Open questions / uncertainty

* **Trigger event** (pointerdown vs click) and what a click in the middle 40 % does — not observable. Close behaviour
  never exercised. Keyboard/drag unknown.
* **Peek amount rule** (`0.33° + 1°·h/w`, pivot 3800 px) is a fit to four cards; the real site may use per-card constants or a
  height-based translate. Neutral slot values (21.5 px / 0.33°, 44.5 px / 0.66°) are solid (±1 px, ±0.05°).
* **Hover region extent** (±450 px) comes from a single pointer-leave event and could instead be a ~50 ms debounce.
* **Card size rule**: 680 px equals both 64.1 vw and 83.8 vh in this capture — cannot tell which dimension governs.
* **Vertical centring** / close-button `top`: capture appears to have lost ~20 px at the top (button half cut off, stack 10 px low).
* **Incoming delay (250 ms) and z-swap (83 ms)** are consistent across all five flips (±8 ms) but their cause (CSS
  transition-delay vs. timer) is unknown; behaviourally identical.
* **Z-order beyond |rel| = 2** not observable with 4 cards; the rule `current > prev > next > others` is the safest extrapolation.
* Two duplicated frames and two late first paints exist in the capture; onsets are therefore ±1 frame (±17 ms).
* Whether the photos are transparent PNGs or JPEGs with a matched background cannot be told (identical grey).

## Decisions from the site owner (2026-09-23)

These resolve the open questions above and override any guesses in this document:

- **No keyboard support.** Arrow keys and Escape do nothing in the viewer.
- **Flips fire on click** (pointer up on the same element), not on pointer down.
- **Middle zone does nothing.** Only the left 30 % (prev) and right 30 % (next) of the viewport are active.
- **No buttons whatsoever.** There is no close "×". Clicking outside the stack (anywhere that is not a prev/next zone or the card) closes the viewer, the same way the zoom-in collapses.

## Owner decisions (2026-09-23, from Viktor)
These settle the open questions above and override any conflicting guesses in this spec:
- No keyboard support at all.
- A flip fires on `click` (release), not on pointerdown.
- The middle zone (between the left and right 30 % click zones) does nothing.
- There is no close button and no buttons of any kind in the viewer. Clicking outside the card stack closes the viewer.
