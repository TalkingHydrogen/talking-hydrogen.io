# 02 — Hover "card stack" (fan-out on hover)

Source: `ref/2-stack.mov` (60 fps, 1112x978 px, Retina 2x capture, 5.57 s, 333 decoded frames).
All values below are in **CSS px at 1x** (recording px / 2) unless marked "2x".
Per-frame measurements: scratchpad `ref/frames2/track.csv` (tracker script `ref/frames2/track.py`).
Contact sheets: `spec/ref/02-a-enter.png`, `02-b-cursor-move.png`, `02-c-leave.png`, `02-d-rest-vs-hover.png`.

Legend: **[M]** = measured from frames, **[E]** = estimated / inferred, **[?]** = unknown.

---

## 1. Overview

A "photo stack" thumbnail: four photo cards (each a product photo with its own light-grey studio
background, ~#e9e9e9, on a #f2f2f2 page) piled on top of each other, all centred on one point,
with the three back cards peeking out by a few px and tilted by well under 1 degree. A caption
("Design Inspiration", ~14 px, near-black) sits ~18 px below the 340x340 stack box.

**Key finding: this is NOT a cursor-tracking tilt/parallax.** It is a binary hover state.
On `pointerenter` the whole component (cards + caption) scales to 1.10 about its own centre and the
back cards' offsets and rotations double ("fan out"); on `pointerleave` it springs back. While the
cursor moves inside the stack nothing changes (frames 157–170: cursor moves 80 px, all edges static
to ±0.2 px). Everything is 2D (translate / rotate / scale); no perspective, no skew, no aspect change
(front card ratio 1.495 at rest and 1.495 at hover). The cursor is the hand (`cursor: pointer`) over
the union of the card boxes. Both transitions follow the same critically-damped spring, settling in
~400 ms, no overshoot.

Layer diagram (front to back, z-order confirmed from which card casts a shadow on which):

```
  z=4  ┌──────────────────────────────┐  F   front card, typewriter photo, 339x227 (3:2), offset 0, rot 0
  z=3  │ C2  ┌───────────────────┐    │      4:3 landscape, 337x255, offset x -9, rot -0.2 deg
  z=2  │     │ C3 ┌────────────┐ │    │      ~5:4 landscape, 338x267, offset x +18, rot +0.5 deg
  z=1  │     │    │ C4 (tall)  │ │    │      portrait 261x340, offset x +15, rot +0.4 deg
       │     │    │            │ │    │
       └─────┴────┴────────────┴─┴────┘
                 "Design Inspiration"        caption, ~18 px below the 340x340 stack box

  All four cards share ONE centre (the 340x340 box centre); each is "contain"-fitted so its longest
  side = 340. Only x-offsets and tiny rotations distinguish them. Top view (rest, 1x, not to scale):

        C4 tall  ─┐        ┌─ C3 (right +18)
     C2 (left -9)─┼──┐  ┌──┼──
                  ▼  ▼  ▼  ▼
              ┌──────────────────┐   y 45
              │   ┌──────────┐   │
          ┌───┼───┤          ├───┼────┐
          │ ┌─┴───┴──────────┴───┴─┐  │   F: x 96.5..435.5, y 102..328.5
          │ │      F (front)       │  │
          │ └─────────────────────┘  │
          └──────────────────────────┘
              └──────────────────┘   y 385
```

---

## 2. Rest layout [M]

Frame reference: 556x489 (1x). Stack box: 340x340 centred at (266, 215). Front-card width W = 339.

| card | z | content | size 1x (w x h) | aspect | size / W | centre offset from F (x, y) | offset / W | rotation | opacity / shadow |
|---|---|---|---|---|---|---|---|---|---|
| F  (front) | 4 | red Olivetti Valentine, landscape | 339 x 227 | 1.495 (3:2) | 1.000 x 0.669 | ( 0.0, 0.0) | 0 | 0.0 deg | 1.0 ; shadow same as all |
| C2 | 3 | unknown (hidden), landscape | 337 x 255 | 1.32 (4:3) | 0.994 x 0.752 | ( -9.3, +0.9) | -0.027 | -0.2 deg (CCW) | 1.0 ; same shadow |
| C3 | 2 | unknown (hidden), landscape | 338 x 267 | 1.27 (~5:4) | 0.997 x 0.788 | (+17.7, +1.6) | +0.052 | +0.5 deg (CW) | 1.0 ; same shadow |
| C4 | 1 | tall object photo (grey knob visible at top, dark base at bottom), portrait | 261 x 340 | 0.768 (~3:4) | 0.770 x 1.003 | (+15.2, +0.2) | +0.045 | +0.4 deg (CW) | 1.0 ; same shadow |

Notes
- Rotation sign: + = clockwise on screen. Rotation is about each card's own centre (centres do not
  move with rotation; parallel opposite edges of C4 measure the same tilt).
- y-offsets are within ±1.5 px of 0 and are probably 0 (measurement bias from the soft shadow is
  ~±1 px). Treat as 0, or use (0, +1, +2, 0) if you want to match the frames exactly [E].
- No opacity difference between cards (all card surfaces read 233/255, page 242/255). Cards are
  NOT white: the photos carry their own light-grey background. Page bg #f2f2f2, card/photo bg
  ≈ #e9e9e9, caption near-black (#000–#111).
- Shadow, identical on all four cards, fitted to the 1-D profiles: Gaussian sigma 2 px (1x),
  y-offset 1 px, peak alpha ~0.10 → `box-shadow: 0 1px 4px rgba(0,0,0,.10)` [M/E]. There is also a
  faint 1-px darker rim at the card edge (~229 vs 233): either `outline: 1px solid rgba(0,0,0,.02)`
  or just the shadow's inner falloff — cosmetic.
- Corner radius ≈ 2 px [M, coarse].
- Caption: text glyph box x 211.5–320.5 (109 px wide), cap top y 406.5, descender bottom 419;
  'D' cap-height 10 px → font-size ≈ 14 px, regular weight, system sans (SF-Pro-like), centred on
  the stack box centre x (265 vs 266). Cap top is 21.5 px below the stack box bottom (385) → with a
  ~20 px line box the caption margin-top ≈ 16–18 px [E].
- Component box (used as the scale origin, see §3): stack box top (45) to caption line box bottom
  (~421) → centre y ≈ 233, i.e. 18 px below the stack-box centre. The x origin is the stack/front
  card centre (266) — the caption and F do not move horizontally on hover.

---

## 3. Hover mapping [M]

There is no dependence on cursor position. Fitted "mapping":

```
rotateX  = 0
rotateY  = 0
parallax = 0            (cursor x/y coefficients are zero within noise: ±0.2 px over 80 px of travel)
```

What happens instead — one scalar `p` goes 0 → 1 on enter, 1 → 0 on leave:

```
groupScale(p)   = 1 + 0.10 p              measured 1.100 (F width 339→373, C4 height 340→374)
spread(p)       = 1 + 1.0 p               back-card offsets AND rotations ×2 at p=1
card_i.transform = translate(dx_i·spread, dy_i·spread) rotate(rot_i·spread)     (dx in the un-scaled frame)
group.transform  = scale(groupScale)      origin = centre of (stack box + caption)  → F moves up ~2 px, caption down 18 px
```

Hover state, measured:

| card | centre offset from F, hover (1x) | ÷1.1 (pre-scale) | ratio to rest | rotation hover | ratio |
|---|---|---|---|---|---|
| F  | (0, 0) | (0, 0) | – | 0.0 | – |
| C2 | (-19.5, +1.8) | -17.7 | 1.9 | -0.5 deg | ~2.4 (tiny angle, ±0.15) |
| C3 | (+38.5, +3.5) | +35.0 | 1.98 | +1.0 deg | 2.0 |
| C4 | (+33.5, +0.6) | +30.5 | 2.0 | +0.85 deg | 2.1 |

- Front card F: size ×1.100, centre x unchanged (266.0 → 266.0), centre y 215.1 → 213.2 (-1.9 px:
  consequence of the scale origin being 18 px below the stack centre, not a separate translate).
- Back cards move MORE than the front card, but purely because their offsets are multiplied; there
  is no depth ordering / translateZ. Depth factor per layer if you want to express it that way:
  F 0, C2 1, C3 1, C4 1 (all back cards scale their own offset by the same factor 2).
- Max excursion: F +17 px on each side (scale), C3 centre +21 px, C4 +18 px, C2 -10 px, caption
  +18 px down; rotations ≤ 1 deg. Nothing changes aspect ratio → it is 2D, no `perspective` needed.
- Follow lag: not applicable (no cursor following). The enter/leave motion is a spring, see §4.
- Hit area: the hand cursor appears when the hotspot crosses x ≈ 452–455 at rest (C3's right edge
  is 453) and reverts when it crosses ≈ 490 in the hover state (C3's right edge is 490). So the
  hover target is the union of the card elements in their *current transformed* geometry, not just
  the front card and not a fixed box. Whether the caption is part of the target is unknown [?].

---

## 4. Enter / leave behaviour [M]

Timeline (frame = 1/60 s):
- f98→f99 cursor becomes a hand (enters target). First visible change f104 (spring fit says motion
  started ≈ f102, i.e. ~50 ms after the cursor change — consistent with render/capture latency, so
  **no intentional delay** [E]).
- f104–f126 fan-out; f127 snaps to the final state; static f127–f174 (cursor moves inside, nothing
  changes).
- f170→f171 cursor becomes an arrow (leaves target at the right edge). First visible change f175
  (fit: ≈ f174). f175–f198 return; f199 snaps to rest.
- Both transitions take 23–24 frames (≈ 400 ms) from first motion to the snap, and their progress
  curves are identical to ±0.01 (enter vs leave shifted by 72 frames) → same easing both ways,
  symmetric.

Progress p (mean of caption y, F width, F height, C4 height; 1.0 = full hover):

| ms from start | 0 | 17 | 33 | 50 | 67 | 83 | 100 | 117 | 133 | 150 | 167 | 200 | 233 | 267 | 300 | 333 | 367 | 383 | 400 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| enter | 0 | – | .09 | – | .20 | .28 | .35 | .41 | .48 | .55 | .61 | .69 | .77 | .84 | .88 | .92 | .94 | .96 | 1 (snap) |
| leave | 0 | .01 | .07 | .13 | .20 | .27 | .35 | .42 | .48 | .54 | .60 | .69 | .76 | .82 | .87 | .90 | .92 | .94 | 1 (snap) |

Least-squares fits (joint fit on enter + leave, 47 samples):

| model | parameters | RMSE |
|---|---|---|
| **spring, mass 1** | stiffness/tension **150**, damping/friction **25.2** → zeta 1.03 (critically damped), omega0 12.3 rad/s | **0.009** |
| free cubic-bezier | cubic-bezier(0.39, 0.63, 0.33, 0.77), 421 ms (non-standard; needs y2<1 to reproduce the end snap) | 0.011 |
| `ease` | 535 ms | 0.020 |
| ease-out-cubic (0.33,1,0.68,1) | 549 ms | 0.018 |
| `ease-out` | 395 ms | 0.041 |

Spring in react-spring semantics: `{ tension: 150, friction: 25, mass: 1 }` (practically the
react-spring default `{170, 26}`; that default gives zeta 1.0, omega0 13.0 and is an acceptable
substitute). Framer Motion: `{ type: 'spring', stiffness: 150, damping: 25, mass: 1 }`.
Closed form for zeta≈1: `p(t) = 1 − e^(−ωt)(1 + ωt)`, ω = 12.3 s⁻¹ →
t50 = 137 ms, t63 = 175 ms, t90 = 317 ms, t95 = 387 ms, t99 = 541 ms.

Overshoot: none (0.0 — monotonic approach, hold value = final value).
End snap: at ~95 % of travel (≈ 385 ms) the rendered value jumps to the target (visible in both
directions: 0.956 → 1.0). That is the spring's rest threshold: about 5 % of travel (0.005 in scale
units). Reproduce it with `restDelta ≈ 0.05·|Δ|`, or just run the spring for 400 ms and snap.
Interrupting mid-flight was not exercised in the clip [?]; a spring follower handles it naturally.

---

## 5. Caption behaviour [M]

- Text "Design Inspiration", ~14 px regular, near-black, centred under the stack.
- On hover it is scaled with the group (glyph box 109 → 120 px wide = ×1.10) and moves DOWN 18 px
  (412.8 → 430.7), which is exactly what a 1.10 scale about the component centre (18 px below the
  stack centre) produces. No horizontal movement.
- No colour, opacity or weight change: darkest pixels stay 0/255; the extra "ink" (×1.67 instead of
  the ×1.21 a pure scale would give) is bitmap-upscale blur of the GPU-composited text, i.e. the
  browser did not re-rasterise the text at 1.1 (composited layer). Matching that blur is not a
  goal; if crisp text is preferred, keep the caption out of the `will-change: transform` layer and
  animate it separately with `translateY(18px·p) scale(1 + 0.1p)` [E].
- Timing identical to the cards (same p).

---

## 6. Constants (ready to paste)

```js
// Units stripped: px at 1x, deg, ms.  [M] measured  [E] estimated  [?] unknown
export const STACK = {
  box: 340,                       // [M] stack layout box (square); every card 'contain'-fitted to it
  bg: '#f2f2f2',                  // [M] page
  cardBg: '#e9e9e9',              // [M] photo studio background (the photos are the cards; no white frame)
  radius: 2,                      // [M] (coarse) card corner radius
  shadow: '0 1px 4px rgba(0,0,0,.10)', // [M/E] fitted gaussian sigma 2, dy 1, alpha .10; same on all cards
  // Cards, back → front. dx/dy/rot are the REST values; hover = these × spread(1)=2.
  // fit: longest side = box. Aspect ratios measured.
  cards: [
    { id: 'c4', aspect: 0.768, dx: 15.2, dy: 0, rot: 0.4 },   // [M] portrait 261x340, z 1
    { id: 'c3', aspect: 1.266, dx: 17.7, dy: 0, rot: 0.5 },   // [M] 338x267, z 2   (dy ≈ +1.5 measured, ~0 [E])
    { id: 'c2', aspect: 1.322, dx: -9.3, dy: 0, rot: -0.2 },  // [M] 337x255, z 3   (dy ≈ +1 measured, ~0 [E])
    { id: 'f',  aspect: 1.495, dx: 0,    dy: 0, rot: 0 },     // [M] 339x227 front (typewriter), z 4
  ],
  // suggested "designer" rounding [E]: c4 (+15, .4), c3 (+18, .5), c2 (-9, -.2); hover ×2 → (+30,.8) (+36,1) (-18,-.4)

  hover: {
    scale: 1.10,                  // [M] whole component (cards + caption), transform-origin: centre of component
    spread: 2.0,                  // [M] multiplier on dx, dy, rot of back cards (rest = 1)
    originYOffset: 18,            // [M] scale origin is 18 px below the stack-box centre (= centre incl. caption)
    cursor: 'pointer',            // [M] hand over the union of the card boxes
    shadowChange: 0,              // [M] none
    captionOpacityChange: 0,      // [M] none
    delay: 0,                     // [E] ≤ 50 ms observed, attributed to latency
  },

  caption: {
    text: 'Design Inspiration',
    fontSize: 14,                 // [M] from 10 px cap height
    weight: 400,                  // [M] visual
    color: '#111',                // [M] near-black (measured 0/255 cores)
    marginTop: 17,                // [E] 16–18; cap top is 21.5 px below the stack box
    lineHeight: 20,               // [E]
  },

  // Motion: one progress value p∈[0,1]; both directions identical.
  spring: {
    tension: 150, friction: 25, mass: 1,   // [M] fit, zeta 1.03; react-spring default {170,26} also fine
    restDelta: 0.05,              // [M] fraction of travel at which the original snaps to target (~385 ms)
    settleMs: 400,                // [M] visible motion duration (t95 ≈ 387 ms, t99 = 541 ms)
  },
  // CSS fallback (no JS): transition 400ms linear(...) sampled from the fitted spring at 25 ms steps
  cssEasingLinear: '0, 0.038, 0.126, 0.235, 0.347, 0.453, 0.549, 0.632, 0.703, 0.762, 0.811, 0.85, 0.882, 0.908, 0.928, 0.944, 0.956, 1',
  cssFallbackBezier: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // [E] `ease` @ ~500 ms, RMSE .02 — acceptable if linear() unsupported

  // Cursor tracking: NONE in the recording. Kept as hooks in case a parallax variant is wanted later.
  parallax: { rotX: 0, rotY: 0, translatePerPx: 0 },   // [M] all zero
};
```

---

## 7. Implementation notes (vanilla JS/CSS)

Structure

```html
<figure class="stack" data-stack>            <!-- 340 wide; transform-origin: 50% 50% (includes caption) -->
  <div class="stack__cards">                 <!-- 340x340, position: relative -->
    <img class="card" data-i="0" src="c4.jpg" alt="">   <!-- back-most (tall) -->
    <img class="card" data-i="1" src="c3.jpg" alt="">
    <img class="card" data-i="2" src="c2.jpg" alt="">
    <img class="card" data-i="3" src="front.jpg" alt=""> <!-- front (typewriter) -->
  </div>
  <figcaption class="stack__caption">Design Inspiration</figcaption>
</figure>
```

CSS essentials
- `.stack { width: 340px; cursor: pointer; transform-origin: 50% 50%; will-change: transform; }`
  Default origin is already the centre of the figure = stack box + caption, which is what the
  recording shows (F moves up 2 px, caption down 18 px). If the caption is placed outside the
  transformed element, add `translateY(18px·p)` to it and use `transform-origin: 50% calc(50% + 18px)`
  on the cards group.
- `.stack__cards { position: relative; width: 340px; height: 340px; }`
- `.card { position: absolute; inset: 0; margin: auto; max-width: 340px; max-height: 340px;
  border-radius: 2px; box-shadow: 0 1px 4px rgba(0,0,0,.10); will-change: transform;
  transform: translate(calc(var(--dx) * var(--spread) * 1px), calc(var(--dy) * var(--spread) * 1px))
             rotate(calc(var(--rot) * var(--spread) * 1deg)); }`
  Each card gets its own `--dx/--dy/--rot` inline; `--spread` lives on `.stack` (rest 1).
  DOM order = z-order (tall card first, front last). No `perspective`, no `preserve-3d`.
- Page bg `#f2f2f2`. Photos should include their own light background; no white frame.
- `@media (prefers-reduced-motion: reduce)` → jump to the state (or transition opacity only).

JS (spring follower)
- State: `target ∈ {0,1}`, `p`, `v`. On `pointerenter` (on `.stack`) set `target = 1`, on
  `pointerleave` set `target = 0`. `pointerleave` on the figure fires only when the pointer leaves
  the figure **and all descendants**, and hit-testing uses transformed geometry, so the hit area
  automatically equals the union of the (scaled, spread) cards as in the recording. Do not use
  `mouseover/mouseout` (they fire on child boundaries). Ignore pointers with `pointerType === 'touch'`
  or gate on `matchMedia('(hover: hover)')`.
- rAF loop (runs only while `|p - target| > eps || |v| > eps`):
  `a = k·(target − p) − c·v; v += a·dt; p += v·dt;` with `k = 150, c = 25`, `dt` clamped to ≤ 32 ms
  (sub-step if larger). When `|target − p| < 0.05` **and** `|v|` small, snap `p = target` (that is
  what the original does at ~385 ms). Then write:
  `stack.style.transform = scale(1 + 0.1p)`; `stack.style.setProperty('--spread', 1 + p)`.
  A single p keeps the cards' offsets, rotations, scale and caption in lock-step, which is what the
  frames show (all tracked quantities share one progress curve within ±0.02).
- CSS-only alternative: `.stack { transition: transform 400ms linear(<cssEasingLinear>) }`,
  `.card { transition: transform 400ms linear(<same>) }`, `.stack:hover { transform: scale(1.1);
  --spread: 2 }`. Note `--spread` itself cannot transition unless registered with
  `@property --spread { syntax: '<number>'; inherits: true; initial-value: 1; }` (Chrome/Safari/FF
  all support it now); then transition `--spread` instead of transforms on each card.
- Retarget on leave mid-flight: with the follower above the spring simply reverses from the
  current p and v; the recording never shows an interrupted transition, so no special casing.

Hooks for the later click-to-open (full-screen page viewer)
- Keep the hover follower in a small `Spring` class (`{k, c, target, p, v, onFrame}`) so the open
  transition can reuse it with different k/c.
- On `click`: freeze hover (`hoverSpring.target = 1` but stop listening to pointerleave), record
  `front.getBoundingClientRect()` (this is the *rendered* rect, including the 1.1 scale), then FLIP
  the front card into the viewer: fixed-position clone (or `view-transition-name: stack-front`)
  animated from that rect to the viewer rect. The back cards + caption should fade/scale down
  (`opacity 0`, `--spread` → 0) during the open so they do not fan out behind the viewer.
- Expose `data-state="rest|hover|opening|open"` on `.stack`; CSS can key `pointer-events: none`
  and `will-change` removal on `open`. Give the figure `role="button" tabindex="0"` and mirror
  hover on `:focus-visible` (same spring target = 1).
- After the viewer closes, run the leave spring from p=1 to 0 (unless the pointer is still inside).

---

## 8. Open questions / uncertainty

- **Cursor position dependence: none observed.** The only cursor path inside the target is
  stationary (f105–f156) then a straight move to the right edge (f157–f170) at y ≈ 300–320, i.e.
  the lower-right quadrant of the front card. A vertical or left-half sweep was never recorded; a
  tilt that depends only on the cursor's y, or one with a large dead-zone, cannot be strictly
  excluded, but 80 px of x-travel produced 0.0 ± 0.2 px of change on all edges, which rules out any
  practical parallax coefficient. [M]
- The multiplicative model (`offset × 2`, `rotation × 2`) is the simplest description of one
  measured state pair; an additive model (rest + fixed delta) fits the same data identically. The
  ratios are 1.9 / 1.98 / 2.0 for translation and ~2 for rotation across three different cards,
  which favours the multiplier. [E]
- Rest rotations are 0.2–0.5 deg: real (opposite edges of the same card agree, and they double on
  hover) but at the edge of measurability (±0.1 deg). C2's rotation could be 0. [M, low precision]
- y-offsets of the back cards (+1…+2 px measured) are within shadow-induced bias; treat as 0. [E]
- Scale origin: measured 18 ± 2 px below the stack centre in y, and at the stack centre in x.
  Interpreted as "default origin of a figure that contains the caption". [M/E]
- Snap at ~95 %: interpreted as the spring's rest threshold. It could also be a JS animation whose
  last frame writes the final value; visually identical. [E]
- The three back-card photos are unknown (C2/C3 are fully covered; C4 shows a grey cylindrical
  knob at the top and a dark base at the bottom — some tall object on a grey background). [?]
- Caption font family, exact colour, letter-spacing, and whether the caption is inside the hover
  target. [?]
- Shadow numbers are fitted from ±0.4 % luminance steps in a compressed screen recording:
  alpha ±0.03, blur ±1 px. [E]
- Card corner radius (2 px) read from a 30-px crop; could be 0–3 px. [E]
- Frame duplicates in the capture (f104/105, f197/198) and ~2–3 frames of cursor-vs-content
  latency put ±1 frame (17 ms) on all timings. [M]
- No touch, keyboard, click or interrupted-transition behaviour is in the clip. [?]
