# 01 — Click-to-zoom transition (reverse-engineered from mikematas.com)

Companion file with verbatim code: `01-zoom-in-source-excerpts.md` (section numbers referenced below as *Ex.N*).
Video validation sheet: `ref/1-zoom-transition-sheet.png` (scratchpad `ref/`).

## 1. Overview

* It is a **shared-element zoom with one progress value**. The item you see in the home row is the *same DOM node* you see in the detail view. It is laid out at its **expanded** size inside a small container and rendered at rest with `scale(1/S)` about its bottom-centre; expanding animates one spring `p: 0 → 1` and every property (item translate/scale, header fade, text fade, back button) is a fixed function of `p`.
* A second, **invisible copy of the expanded layout** ("gallery" strip, `visibility:hidden`, one 150vw slot per item) exists only so the target rectangles can be *measured* with `getBoundingClientRect` — no hand-computed target geometry (Ex.13, Ex.2 `fe`).
* Master spring: **tension 300, friction 35, mass 1, precision 1e-4** (ζ ≈ 1.01, critically damped, no overshoot). Collapse and mid-flight interruptions **retarget the same spring**, keeping velocity.
* Siblings (every other item) move **on the same frame** as the leader with the same `p`; they fly to their own (off-screen) slot and grow to full size too. The "chain" springs (1500/60, decay .1) are only engaged while the user is *dragging* (section 4).
* Text column, header, back button and cursor are separate opacity/scale layers; only the items use `transform`.

```
body (horizontal native scroll of the home row: overflow-x:auto, overflow-y:hidden, scrollbars hidden)
├─ .images         preload of every project image (1×1 px, opacity 0)                         [static]
├─ .header_root    position:fixed; grid (content box centred)                                 z: DOM order
│   └─ animations_timelineHeader   ← opacity 1→0, scale 1→.9925 over p∈[0,.333]  (origin: centre of content box)
│       └─ header: name + date (date spring 400/30) | nav (About/Twitter/Instagram, cursor targets)
├─ .gallery_root   position:fixed, full-screen, pointer-events only while open
│   └─ pageable_root (mouse/keyboard/wheel capture while open; click-anywhere = dismiss)
│       └─ grid (type "gallery") → strip (translate3d(gallery.offset.x)) [visibility:hidden = MEASURE ONLY]
│           └─ galleryItem_container ×N (width 150vw)  →  centerer(min-width = content width, centred)
│               └─ inner [ galleryContent (text, margin-right 7.5em) | projectImage(gImgW×gImgH) ]  ← rects.gallery[i].image
├─ grid (type "timeline"; class grid--locked = position:fixed while open)
│   └─ translate container (timeline offset; = −scrollLeft while locked, immediate)
│       └─ timeline_root  flex row, align-items:flex-end, height 530·C(scale), padding-right = grid margin
│           └─ timelineImage_wrapper ×N (z-index 20−|i−index|)
│               └─ timelineImage_container (d_i × cw_i, margins)  ← rects.timeline[i].container
│                   └─ animations_timelineImage  ← transform: translate3d(x,y,0) scale(s)   origin: bottom center
│                       └─ (carousel wrapper, static)  →  galleryItem (timeline variant)
│                           └─ inner(max-width = image width) [ animations_timelineGalleryContent ← opacity | projectImage ]
├─ carousel / about (not part of this transition)
├─ backButton_root  position:fixed; top-left 6em×6em; z 200  ← opacity by its own 300/35 spring, mapped [.5,1]→[0,1]
└─ cursor_root      position:fixed; 50×50; z 1000; translate3d(mouse−25)  ← scale springs (section 5)
```

## 2. Geometry

All units CSS px. `W = innerWidth`, `H = innerHeight`, `lerp(t,a,b) = clamp(a + t·(b−a), a, b)`. Constants: section 7. Source: Ex.6, Ex.7, Ex.15, Ex.18.

### 2.1 Responsive grid (desktop; `mobile` = `W ≤ 600 && W < H`)

```
bx = clamp((W − windowMinWidth ) / (windowBreakWidth  − windowMinWidth ), 0, 1)    // 380 → 1300
by = clamp((H − windowMinHeight) / (windowBreakHeight − windowMinHeight), 0, 1)    // 300 → 1000
scale    = min(bx, by)                       // stored as timeline.scale / gallery.scale
C(scale) = minScale + (1 − minScale)·scale   // = .3 + .7·scale   (if H < 300: C = scale)
em       = fontSize · C(scale)               // 20·C  → grid font-size; every "em" below uses this
hMargin  = lerp(bx, minHMargin, maxHMargin)  // 35 → 150
vMargin  = lerp(by, minVMargin, maxVMargin)  // 35 → 130
contentH = min(lerp(bx, contentMinHeight, contentMaxHeight), H − 2·vMargin)   // 200 → 740   ← lerped by bx (sic)
contentW = min(lerp(by, contentMinWidth,  contentMaxWidth ), W − 2·hMargin)   // 400 → 1000  ← lerped by by (sic)
   (gallery grid uses contentW_gallery = W − 2·hMargin; the header grid uses the timeline values)
grid: columns "1fr contentW 1fr", rows "1fr contentH 1fr", width 100vw, height 100vh, pointer-events:none
   → content box: left = (W − contentW)/2, bottom = (H + contentH)/2
(if H < windowMinHeight: windowMinHeight, contentMinHeight, minVMargin := 0; same for width)
```
The cross-wiring (height driven by the *width* progress and vice versa) is verbatim from the bundle (Ex.7) — copy it for fidelity or fix it; it only changes how the box breathes on resize.

### 2.2 Home row (timeline)

```
TH   = timelineHeight · C(scale)                       // 530·C  row height; row bottom = content bottom
for item i, source image (w_i, h_i), optional tuning offset {left, right, height, gallery, centered}:
  d_i  = TH · (h_i + (offset.height ?? 0)) / h_i        // container height (Instant Articles: height −400 → 0.733·TH)
  cw_i = d_i · w_i / h_i                                 // container width
  first item margin-left / last item margin-right = (offset.left ?? 0) · cw_i / w_i   (negative crops the laptop)
  gap between i and i+1 = 5em · (offset_i.right ?? 1)   (split 2.5em / 2.5em)
row: display:flex; align-items:flex-end; starts at content left; padding-right = (W − contentW)/2
row scrolls with document.body.scrollLeft (html overflow:hidden, body overflow:auto/overflow-y:hidden)
timeline container rect_i (screen) = { x: contentLeft + Σ_{k<i}(cw_k + gaps) + margin − scrollLeft, bottom: contentBottom, d_i × cw_i }
inside the container: the animated node is position:absolute; bottom:0; centred (flex static position),
  laid out at the EXPANDED size (2.3) and shown at rest as  translate3d(0,0,0) scale(1/S_i)  about bottom-centre
  → visually exactly d_i × cw_i.
```

### 2.3 Expanded layout (gallery strip) and where the text sits

```
gImgH_i = contentH · (1 − |offset.gallery ?? 0| / h_i)          // image height = content box height (desktop)
gImgW_i = gImgH_i · w_i / h_i
slot_i  = [contentLeft + 1.5·W·i, +1.5·W)      (galleryWidthMultiplier 1.5); strip translate = −1.5·W·index
inside the slot: centerer (min-width contentW_gallery, flex centre) → inner = [ text | 7.5em gap | image ]
  G_i        = textW_i + 7.5em + gImgW_i                       // group width (text column's natural width, nowrap)
  groupLeft  = (W − G_i)/2                                       // group centred on the viewport
  image rect = { left: groupLeft + textW_i + 7.5em, right: (W + G_i)/2, bottom: contentBottom, height: gImgH_i }
  text col   = { left: groupLeft, vertically centred on the image (align-items:center) }
  (offset.centered → text hidden/centred variant; mobile → column-reverse stack, image max 340·C)
S_i       = gImgH_i / d_i                                        // scale ratio (= contentH(1−a)/(TH(1+offH/h)))
image.x_i = center(imageRect_i).x − center(containerRect_i).x    // both measured in the SAME screen frame at expand time
image.y_i = imageRect_i.bottom − containerRect_i.bottom          // = 0 on desktop (both bottoms = contentBottom)
```
For the *leader* `image.x` is "how far its bottom-centre has to slide"; for **siblings** the same formula applies with their own slot (`1.5·W·(j − index)` further away), so they fly off-screen and also end at `scale(1)`.
The site measures `containerRect` (timeline) and `imageRect` (hidden gallery strip) with `getBoundingClientRect`, 50 ms after every resize, normalised to unscrolled coordinates, and recomputes `image.x/y, S` (`fe`, Ex.2) whenever geometry or `gallery.offset` changes.

**Worked check (recording viewport 1061×811):** bx=.74, by=.73, scale=.73, em=16.2, hMargin=120, vMargin=104, contentH=600, contentW=821, TH=430. Instant Articles (736×1500, height −400): d=315, cw=155; expanded 294×600; **S = 1.90**. Measured from the video: bee-image width 269 → 509 px → **S = 1.89** (0.6 % off), phone bottom stayed at y = 1402 device px in every frame (image.y = 0 confirmed).

### 2.4 Collapse geometry (scroll re-centring)

On collapse the row is scrolled so the item is centred, without a visible jump:
```
o  = clamp(center(containerRect_unscrolled).x − W/2, 0, maxScrollX)     // ge(e,true)
Δ  = o − scrollLeft_at_expand                                             // animation.delta.x
body.scrollTo(o) immediately (grid goes back to static; translate container → 0 immediately)
x_i(p) during collapse = (image.x_i + Δ)·p       (item's own compensation, see 3.2)
```

## 3. Motion architecture

### 3.1 One spring, many maps (confirmed)

`p` = master spring value (`useSpring({v:0, config: SpringConfig})`, Ex.12). On `gallery.isOpen` change a layout effect calls `controller.resume()` → `master.start({v: isOpen ? 1 : 0, config:{velocity: dragVelocity}})` (velocity is 0 for a click; ignored anyway when mid-flight). Each frame the master's `onChange` **sets** every item's chain spring to `p` (click mode), and every animated style is an interpolation of that value (`spring.to(...)`). Interpolation helper `Z` (Ex.9):

```
Z(p, {start,end}, [out0,out1], ease) = out0 + (out1−out0) · ease( clamp((p − start)/(end − start), 0, 1) )
```
(react-spring `to([0,start,end,1],[0,0,1,1])` with equal-output end segments ⇒ effectively clamped.) Easings: `easeOutQuad = cubic-bezier(.5,1,.89,1)`, `easeInExpo = cubic-bezier(.7,0,.84,0)`; numerically `easeOutQuad(t)=1−(1−t)²`, `easeInExpo(t)= t==0?0 : 2^(10(t−1))`.

### 3.2 Element → property table

| Element | Property | Input (p) range | Output | Easing | Spring | Delay |
|---|---|---|---|---|---|---|
| Item i (leader & siblings) — `animations_timelineImage` | `translate3d(x,·,0)` | [0,1] | `x = image.x_i · p` (collapse: `(image.x_i+Δ)·p`) | linear | master 300/35 (leader technically uses its own identical 300/35 spring 0→image.x, see note) | 0 |
| | `translate3d(·,y,0)` | [0,1] | `y = min(0, image.y_i · p)` (0 on desktop) | linear | master | 0 |
| | `scale(s)` | [0,1] (siblings clamp p≤1) | `s = 1/S_i + (1 − 1/S_i)·p` | linear | master | 0 |
| | `z-index` (wrapper) | – | `20 − |i − index|` | – | – | – |
| Text column inside item — `animations_timelineGalleryContent` | `opacity` | [.333, 1] | 0 → 1 | easeInExpo | master | 0 |
| Per-project text gate (nested div) | `opacity` | – | `index === i ? 1 : 0` | – | own 300/35 spring (`galleryTextFadeInDelay` 0) | 0 |
| Header — `animations_timelineHeader` | `opacity` | [0, .333] | 1 → 0 | easeOutQuad | master | 0 |
| | `transform` | [0, .333] | `scale(1)` → `scale(.9925)` (mobile .945); origin = centre of header content box (mobile: center left) | easeOutQuad | master | 0 |
| Back button root — `backButton_root` | `opacity` | b∈[.5, 1] | 0 → 1 (b<.5 → 0) | linear | **own** spring b: 300/35, 0↔1, started with the master | 0 |
| Back button inner | `opacity` | hover∈[0,1] | .3 → 1 | linear | cursor ScaleSpring 150.93/19.56 clamp | 0 |
| Back button root | `pointer-events` | – | none until open (`util_locked/unlocked`) | – | – | – |
| Header date number | text | – | old year → new year (rounded) | – | 400/30 clamp; `immediate` while locked | 0 |
| Timeline row translate container | `translate3d(tx,0,0)` | – | `−scrollLeft` while locked, else 0 — **immediate, not animated** | – | – | – |
| Shine overlay (feature flag `shine`, disabled on the live site) | `opacity` | [0,1] | .3 → 0 | linear | master | 0 |
| Cursor | – | – | independent of p (section 5) | | | |

No blur/background layer is involved in this transition (blur layers exist only for the carousel/about views: `carouselBackgroundBlurRadius 15px`, scale .93).

Notes:
* **Leader x**: while `isOpen`, `posX()` returns the item's *own* `SpringValue` (300/35) started at the same instant toward `image.x` (`_settle`, Ex.10) so that drag velocity can be injected; for a click both springs start from rest at t=0 with identical config, so `x ≡ image.x·p`. A port can drive x from `p` directly.
* Transform order is `translate3d(x,y,0) scale(s)` with `transform-origin: bottom center`; translate is in unscaled parent px, so the item's bottom-centre lands at `restBottomCentre + (x, y)` and its size is `expandedSize·s`.
* The text column is *inside* the scaled node, so it scales with the image and is invisible (`opacity 0`, scaled 1/S) at rest; the two opacities (range fade × index gate) multiply.
* `will-change: transform` on the item node and on the text node; `transform: translateZ(0)` on the image and on text blocks.

### 3.3 Timeline of one expand (predicted with the exact integrator; see section 8 for the measurement)

| t (ms) | p | item scale (S=1.9) | header opacity | text opacity (range × gate) |
|---|---|---|---|---|
| 16.7 | 0.038 | 0.544 | 0.78 | 0.00 |
| 60 | 0.289 | 0.663 | 0.02 | 0.00 |
| 100 | 0.523 | 0.774 | 0.00 | 0.00 |
| 200 | 0.858 | 0.933 | 0.00 | 0.20 |
| 300 | 0.963 | 0.982 | 0.00 | 0.65 |
| 400 | 0.991 | 0.996 | 0.00 | 0.90 |
| 500 | 0.998 | 0.999 | 0.00 | 0.97 |
| 600 | 0.999 | 1.000 | 0.00 | 0.99 |
| 717 | 1.000 | 1.000 | 0.00 | 1.00 |

(1 ms sub-steps; `done` at 717 ms; < 1 px of a 600 px travel at ≈ 517 ms.)

## 4. Chain spring (siblings following the leader) — exact behaviour (Ex.11)

Each item owns a *chain* `SpringValue` (`ChainConfig` tension 1500, friction 60, mass 1). Items are linked left/right. `onMasterChange(p)` runs once per frame:

```
if (!drag.isDragging && !hasMoved(drag.prevDelta, 2px))      // plain click (expand or collapse)
    for every item: chain_i.set(p)                            // hard set → all items render exactly p, no lag, no stagger
else                                                           // dragging, or animating after a drag/toss
    chain_leader.set(p)                                       // only the leader is set
    // chain_i.onChange(v) then propagates outward:
    //   left  neighbours: chain_{i-1}.start(v)   (a 1500/60 spring re-targeted every frame to its inner neighbour)
    //   right neighbours: chain_{i+1}.start(v)
    //   bookkeeping only: _value_i = (1 − min(1, .1·|i − index|))·v + min(1, .1·|i−index|)·value(inner neighbour)
    //   (_value is used to re-seed springs on resize/drag-end via forceUpdate; the RENDERED value is the raw spring)
```
So: **decay .1 does not shape the visible motion; it only blends the seed value on re-sync.** The visible sibling lag comes from the 1500/60 spring tracking a moving target: steady-state lag per ring = friction/tension · 1000 = **40 ms** (each ring trails the previous by ≈40 ms; ζ = 60/(2√1500) = .77, slight overshoot when the leader stops).

Which items move: **all of them**, in the direction of their own slot (items left of the leader go left, right go right, by `image.x_j = 1.5·W·(j−index) + (their group offset) − (their container offset)`), and they **also scale to 1** (sibling scale map is the same formula with their own S_j, p clamped to ≤1). They are typically off-screen after p ≈ .1 (Nest moved ~5900 px in the recording; gone after 1 frame).

Worked example, 3 items, leader = item 1, drag mode, leader progress ramping 0→1 over 300 ms (simulated with the integrator in section 9):

```
t=100ms  leader=.278  item0/item2=.173  (2-ring case: next ring .086)
t=200ms  leader=.611  item0/item2=.510
t=300ms  leader=.944  item0/item2=.843
t=350ms  leader=1.000 item0/item2=.976 → peaks 1.003 at ~400ms, settled by ~450ms
```
For a plain click the same three items all render p on the same frame (verified in the video: laptop, Nest and phone all moved on the first changed frame).

## 5. Cursor (Ex.21, Ex.20 `Jn`)

* Rendered only when `!('ontouchstart' in window || navigator.maxTouchPoints > 0)`. Global CSS `* { cursor: none !important }` (`.window-inactive *` → default cursor).
* DOM: `.cursor_root` fixed 50×50, z 1000, pointer-events none, `will-change: transform`, `transform: translate3d(clientX−25, clientY−25, 0)` **set directly on every mousemove (no smoothing, no spring)**. Nested inside, in this order:
  1. edge-fly translate pair (x and y springs, `DownSpring` 129.69/8.24 clamp) — only used to fly in/out at window edges;
  2. `scale` spring (`ScaleSpring` tension 150.93265, friction 19.56007, clamp) target `1` normally, `.5` (`cursorScaleSmall`) while hovering any `[data-clickable]` target (`Cursor.Contract` on mouseenter / `Cursor.Expand` on mouseleave; About/Carousel open force 1). Settles in ≈330 ms, no overshoot (clamp).
  3. press spring: `scale(.9)` on `mousedown`, `scale(1)` on `mouseup` (`DownSpring` 129.69/8.24 clamp, ≈180 ms);
  4. the visible disc: `.cursor_cursor` 50×50, `border-radius:50%`, `backdrop-filter: invert(30%) blur(10px)`, `transform-origin: center`; visibility spring `{opacity 0↔1, scale(.1)↔scale(1)}` with react-spring default config (170/26).
* Enter/leave: on mousemove within 10 px of any window edge, on `blur` or `mouseleave` → hide: if the pointer is > 100 px (`EdgeDistance`) from the nearest edge and nearly still → pop out (opacity 0, scale .1); else fly out toward the nearest edge with the pointer's velocity. On re-entry (5 ms later): if < 100 px from an edge → appear instantly and fly in from the edge; else pop in.
* Cursor targets (`Jn`): nav items, play button, back button (not the images). They also expose a hover spring (ScaleSpring) that the child maps to colour (`rgba(0,0,0,.4)`→`#000`) or opacity (back button .3→1).
* `Cursor.Hide/Show` set `cursor.hidden`, which nothing reads (dead code). The cursor is *not* changed by the zoom itself except through the hover state of the back button.

## 6. Interaction states & events (Ex.4, Ex.5, Ex.12, Ex.19)

```
             ┌──────────────────────────────── HOME ────────────────────────────────┐
             │ gallery.isOpen=false · timeline.locked=false · body scrolls the row   │
             │ wheel/drag scroll (native scrollLeft; Mac: drag emulation + 550/50    │
             │ overscroll spring) · header date follows nearest item                  │
             └───────────────────────────────┬──────────────────────────────────────┘
   mousedown → mouseup on the row, |Δ| < 2 px, target not [data-clickable]
   (Timeline.OnDragStart: index := item whose container is nearest to pointer.x; Timeline.OnDragEnd → he(index))
                                             ▼
   state: gallery{index, isOpen:true, offset.x=−1.5W·index}, timeline{locked:true, offset.x=−scrollLeft,
          rememberedX=scrollLeft, _maxScrollX}, drag.delta=0, carousel.index=0 if index changed, transforms=fe()
   DOM (same frame, immediate): timeline grid → position:fixed; row translate → −scrollLeft; back button unlocked
   springs started (same frame): master p→1 · leader x→image.x · per-project text gate→1 (index) · back button b→1
                                             ▼
             ┌───────────────────────────── EXPANDED ───────────────────────────────┐
             │ p→1 (nothing else changes when it settles)                            │
             │ pageable_root captures mouse/keys/wheel over the whole viewport        │
             └───────────────────────────────┬──────────────────────────────────────┘
   back-button click ([data-clickable] → its onClick: Drag.End + Gallery.Collapse)
   | click anywhere else without moving ≥5 px (Gallery.OnDragEnd{dismiss})   | Escape | ArrowDown
   | drag down past dismiss threshold | (Mac) vertical wheel > 200 px           → De()
   ArrowLeft/ArrowRight, horizontal drag/wheel → paging (phase 2, 450/50 spring on the strip offset)
                                             ▼
   state: gallery.isOpen=false, timeline{locked:false, offset.x=o, date=project.date}, scroll.x=o, animation.delta.x=Δ
   DOM (immediate): body.scrollTo(o); grid → static; row translate → 0; item x path re-based by +Δ
   springs: master p→0 (same spring) · back button b→0 · header date animates to project.date
                                             ▼  HOME
```

* **Interruption:** any of the above can fire mid-animation. `Gallery.Collapse` at p = 0.4 calls `master.start({v:0})` on the *same* `SpringValue`; react-spring's `AnimatedValue.reset()` keeps `lastVelocity` when the value is not `done` (Ex.25), so momentum is preserved: simulated, p keeps rising to ≈.49 before turning back and rests at 0 ≈ 670 ms after the interrupt. Each item rebuilds its x-line from its current point (`endDrag → _updateLine`, Ex.10); since x is linear in p this is the same line. Confirmed: **same spring, retargeted.**
* **Resize while expanded:** `Window.Resize` → `Grid.Resize` (new sizes/scale/em) → 50 ms later `Geometry.Update` (rects re-measured) → `fe` → each open item: `_updateLine()`, own x-spring `.set(image.x)` (jump), `_updateScale()`; master nudged by `Number.EPSILON` to re-render. During the resize (200 ms debounce) the row gets `opacity:0` and the hidden gallery strip is made *visible* so the user sees the true layout; afterwards they swap back. Recommended to copy this trick.
* **Scroll/wheel while expanded:** captured by the pageable (drag emulation / paging / dismiss); body scroll is frozen by the fixed grids.
* **No history/`popstate` integration; no URL change.** Escape/ArrowDown = dismiss; ArrowLeft/Right = page; non-Mac wheel accumulates ±200 px → page.
* Phase 2 (drag/paging) hooks: `Gallery.OnDragStart/OnDrag/OnDragEnd`, `pageableDragVelocityThreshold .1`, `pageableWindowThreshold .33·W`, `pageableSpringConstant .5` (rubber-band factor outside `Gallery.bounds`), `dragDismissWindowMultiplier .3·H`, `dragDismissAnimationMultiplier 2·H`, `pageableMinDragDistance 200`, `pageableEnableYAxisThreshold 5`, `pageableLockYAxisThreshold 10`, `pageableMaxTossVelocityUp .1 / Down .01`, `timelineDragFriction .96` per 16.67 ms, `pageableTop/BottomBoundarySlip .25/.2`. While dragging the master spring is paused and `p` is *set* from the drag distance through a two-point line (`xt.onDrag`, Ex.12) with `E.Pageable` slip coefficients past 0/1; on release `resume()` starts the master toward 0/1 with the tossed velocity.

## 7. Constants (units stripped; ready to paste)

```js
export const ZOOM = {
  // responsive grid (2.1) — px unless noted
  desktop: { fontSize: 20, minScale: .3, windowBreakWidth: 1300, windowBreakHeight: 1000, windowMinWidth: 380, windowMinHeight: 300,
             minHMargin: 35, maxHMargin: 150, minVMargin: 35, maxVMargin: 130,
             contentMinWidth: 400, contentMaxWidth: 1000, contentMinHeight: 200, contentMaxHeight: 740,
             timelineHeight: 530, headerHeight: 114, itemGapEm: 5, headerScale: .9925 },
  mobile:  { fontSize: 13, minScale: .3, windowBreakWidth: 425, windowBreakHeight: 450, windowMinWidth: 100, windowMinHeight: 200,
             minHMargin: 20, maxHMargin: 60, minVMargin: 35, maxVMargin: 75,
             contentMinWidth: 300, contentMaxWidth: 480, contentMinHeight: 120, contentMaxHeight: 370,
             timelineHeight: 150, headerHeight: 142, itemGapEm: 2, headerScale: .945,
             galleryImageMaxHeight: 340, galleryWindowBreakHeight: 600, galleryVerticalOffset: 1 },
  mobileBreakpoint: 600,          // mobile = innerWidth <= 600 && portrait
  galleryWidthMultiplier: 1.5,    // slot width = 1.5 × innerWidth; strip offset = −1.5·W·index
  textGapEm: 7.5,                 // CSS margin-right of the text column (desktop)
  // springs (react-spring units: tension, friction; mass 1; velocity in units/ms)
  spring:      { tension: 300,  friction: 35, mass: 1, precision: .0001 },   // master p, leader x, text gate, back button
  chain:       { tension: 1500, friction: 60, decay: .1 },                    // drag mode only (section 4)
  paging:      { tension: 450,  friction: 50, precision: .0001 },             // strip offset (phase 2); mobile 800/80
  overscroll:  { tension: 550,  friction: 50, precision: .0001 },             // home-row rubber band (phase 2)
  headerDate:  { tension: 400,  friction: 30, clamp: true },
  // p → property ranges (3.2)
  timing: { header: { start: 0, end: .333, ease: 'easeOutQuad' },            // opacity 1→0, scale 1→headerScale
            galleryContent: { start: .333, end: 1, ease: 'easeInExpo' },     // text opacity 0→1
            backButton: { start: .5, end: 1 } },                             // on the button's own spring
  galleryTextFadeInDelay: 0, backButtonOpacity: .3,
  // cursor (section 5)
  cursor: { size: 50, scaleSmall: .5, scaleDown: .9, edgeDistance: 100,
            scaleSpring: { tension: 150.93265, friction: 19.56007, clamp: true },
            downSpring:  { tension: 129.69176, friction: 8.24223,  clamp: true } },
  // integrator
  maxFrameDt: 64,                 // ms; rafz clamps dt (first frame uses 16.667)
  clickMaxMove: 2,                // px: a "click" on the row (5 px for a click-anywhere dismiss)
};
```

## 8. Video validation (`ref/1-zoom-in.mov`, 60 fps, 2122×1622 = 2× 1061×811 CSS px)

* Click located by frame differencing: last still frame n=183, first moved frame **n=184** (0-based); tracked the orange bee image (leader) and the Nest (blue) / laptop (dark) per full-res frame; `p` estimated from the bee width (269 → 509 px, S=1.89).
* Leader **and** siblings move on the **same first frame** (n=184: bee already 1.25×; Nest fully off-screen; laptop 90 % gone) — no stagger.
* Measured p per frame: .28, .32, .43, .52, .60, .67, .74, .78, .82, .85, .89, .91, .93, .94, .95, .96, .98 … 1.0. Consecutive frames fit the 300/35 critically-damped curve at 16–20 ms spacing **but the first presented frame is already at ≈ 60 ms of spring time** (estimate: React commit + rafz's first-frame dt; the recording shows a duplicated frame before it). A vanilla port without that stall will start ~3 frames "earlier"; do not compensate.
* Settle: bee bbox stops changing (< 1 px) at n=210 → **26 frames = 433 ms after the first moved frame (≈ 495 ms of spring time)**; predicted with the integrator: < 1 px of this 240 px growth at ≈ 440 ms, `done` (1e-4) at 717 ms. Collapse (n=279 → 307): 28 frames ≈ 467 ms, first frame at p=.95 (no head start).
* **No overshoot** in either direction (monotonic width; ζ≈1.01).
* Header: darkness in the name region 22.7 → 3.4 on the first moved frame (p≈.28 ⇒ predicted opacity .03 ✓); on collapse the header reappears from p≈.26 downward, matching 1−easeOutQuad(p/.333) within 0.5 units.
* Text column: appears late — measured relative opacity .12 at p=.82 and .51 at p=.94, predicted (easeInExpo range × index-gate spring) .13 and .50 ✓. So the text fades in while the image is within ~15 % of its final size, mostly in the last 150 ms.
* Phone bottom edge constant at y=1402 device px in all 189 tracked frames ⇒ y-translation 0, bottom-centre origin ✓. Back arrow becomes visible from p≈.5 ✓.
* Contact sheet of every 3rd frame n=183…216 (labelled with n, ms and p): `ref/1-zoom-transition-sheet.png`.

## 9. Vanilla JS implementation notes

### 9.1 `Spring` — 1:1 port of react-spring's integrator (tested: max |port − react-spring| < 1e-4, identical `done` frame)

```js
// Units as react-spring: tension/friction/mass; velocity in value-units per ms; dt in ms.
class Spring {
  constructor({ tension = 170, friction = 26, mass = 1, precision, restVelocity, clamp = false, value = 0, onChange } = {}) {
    Object.assign(this, { tension, friction, mass, precision, restVelocity, clamp, onChange });
    this.value = this.from = this.target = value; this.velocity = 0; this.done = true;
  }
  // Retarget. Mid-flight retargets keep the current velocity (react-spring AnimatedValue.reset()).
  // `velocity` (v0) is only applied when starting from rest — same as react-spring's config.velocity.
  set(target, { velocity } = {}) {
    this.target = target; this.from = this.value;
    if (this.done && velocity !== undefined) this.velocity = velocity;
    this.done = false; return this;
  }
  jump(value) { this.value = this.from = this.target = value; this.velocity = 0; this.done = true; this.onChange?.(value); return this; }
  setVelocity(v) { this.velocity = v; this.done = false; return this; }
  get isDone() { return this.done; }
  tick(dt) {                                   // dt = min(64, elapsed ms); returns true if the value changed
    if (this.done) return false;
    const to = this.target, from = this.from;
    const precision = this.precision || (from === to ? 0.005 : Math.min(1, Math.abs(to - from) * 0.001));
    const restVelocity = this.restVelocity || precision / 10;
    const bounce = this.clamp ? 0 : undefined;             // clamp:true ⇒ snap to target on first crossing
    const dirUp = from === to ? this.velocity > 0 : from < to;
    let pos = this.value, vel = this.velocity, finished = false;
    for (let i = 0, n = Math.ceil(dt); i < n; i++) {     // 1 ms sub-steps, semi-implicit Euler
      if (Math.abs(vel) <= restVelocity) { finished = Math.abs(to - pos) <= precision; if (finished) break; }
      if (bounce !== undefined && (pos === to || (pos > to) === dirUp)) { vel = -vel * bounce; pos = to; }
      vel += (-this.tension * 1e-6 * (pos - to) + -this.friction * 1e-3 * vel) / this.mass;
      pos += vel;
    }
    const changed = pos !== this.value;
    this.value = pos; this.velocity = vel;
    if (finished) { this.value = to; this.velocity = 0; this.done = true; }   // react-spring snaps to `to` when idle
    if (changed || finished) this.onChange?.(this.value);
    return changed;
  }
}
```
Sanity numbers for `{300, 35, 1, precision .0001}` from rest to 1: p(16.7 ms)=.042, p(100)=.528, p(200)=.864, p(300)=.965, p(500)=.998, done at 717 ms. Retarget to 0 at p=.4 keeps velocity (peaks .49). `ScaleSpring` (clamp) settles in 333 ms, `DownSpring` in 183 ms.

### 9.2 Frame loop (one loop, all springs)

```js
const springs = new Set();            // every Spring registers here when set() is called (or keep a fixed list)
let last = 0, rafId = 0;
function frame(now) {
  const dt = last ? Math.min(64, now - last) : 16.667;   // rafz semantics
  last = now;
  let active = false;
  for (const s of springs) { s.tick(dt); if (!s.isDone) active = true; }
  render();                             // ONE write pass: read spring values, write styles
  if (active) rafId = requestAnimationFrame(frame); else { rafId = 0; last = 0; }
}
function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }   // call after any spring.set()
```
`render()` writes: `item.style.transform`, `text.style.opacity`, `header.style.opacity/transform`, `back.style.opacity`. Never call `getBoundingClientRect` inside `frame`.

### 9.3 Transforms and layers

* Item node: `position:absolute; bottom:0; left:50%; transform-origin: bottom center; will-change: transform;` laid out at expanded size (`width: gImgW + textW + 7.5em`, or let flex size it) inside the container `d_i × cw_i`. Rest transform: `translate3d(-50%,0,0) scale(1/S_i)` — or, as the site does, let the flex static position centre it and write `translate3d(x px, y px, 0) scale(s)`.
* Per frame: `x = image.x·p (+Δ on collapse)`, `y = min(0, image.y·p)`, `s = 1/S + (1−1/S)·p`; `transform = translate3d(${x}px, ${y}px, 0) scale(${s})`.
* Text column inside the item: `opacity = easeInExpo(clamp((p−.333)/.667)) · gate_i` where `gate_i` is its own 300/35 spring (1 for the open item). `will-change: transform` (site) is optional; use `opacity` compositing.
* Header wrapper: `opacity = 1 − easeOutQuad(clamp(p/.333))`, `transform: scale(1 − .0075·easeOutQuad(clamp(p/.333)))`, origin = centre of the header's content box (desktop).
* Back button: its own spring b (300/35, 0↔1, started with p); `opacity = clamp((b − .5)/.5)`; `pointer-events` on only while open; hover → inner opacity .3→1 through a clamp spring 150.93/19.56.
* Give the row container `position:fixed` while open (plus `translate3d(−scrollLeft)`, immediate) so the native horizontal scroll is frozen; on collapse `scrollTo(o)` and unfix in the same frame, adding `Δ` to the item's x path.
* Compositing: images get `transform: translateZ(0)`; the item nodes are the only elements animating `transform`; opacity-only layers for header/text/back button. Keep z-index `20 − |i − index|` so the leader draws over neighbours during the first frames.

### 9.4 Keeping layout math out of the loop

1. `layout()` on load / resize (debounced ~50–200 ms): compute the grid numbers (2.1), size the row containers (2.2) and the hidden ghost strip (2.3) with CSS/inline styles, **then measure** `containerRect_i` (row) and `imageRect_i` (ghost) with `getBoundingClientRect`, normalise by `+scrollLeft` (row) and `+1.5·W·index` (ghost), and store `image.x_i, image.y_i, S_i` per item. Recompute `image.x_i` only when `index` changes (cheap: `imageRect_i.center − 1.5·W·index − (containerRect_i.center − scrollLeft)`).
2. On expand: read `scrollLeft` once, freeze the row, compute `image.x_i` for the current index, start springs.
3. In the loop: pure arithmetic from cached numbers → one style write per node.
4. Resize while open: re-run `layout()`; jump the leader's x target (`spring.jump`) if p is at rest, else `set` it; optionally swap in the ghost strip (visible) during the resize like the site.

### 9.5 Structure for 3 items (item 0 = image `2018 drawings/painting-17.jpg`)

```html
<main class="row" id="row">               <!-- flex, align-items:flex-end, height: TH -->
  <div class="wrap" style="--i:0"><div class="box" id="c0"><div class="item" id="i0">
      <div class="text" id="t0">…title / subtitle / body…</div>
      <div class="img" id="p0" style="background-image:url('2018 drawings/painting-17.jpg')"></div>
  </div></div></div>
  <div class="wrap" style="--i:1">…item 1…</div>
  <div class="wrap" style="--i:2">…item 2…</div>
</main>
<section class="ghost" aria-hidden="true">  <!-- visibility:hidden; 3 slots of 150vw; same inner markup for measuring -->
  <div class="slot"><div class="centerer"><div class="inner"><div class="text">…</div><div class="img" id="g0"></div></div></div></div> ×3
</section>
<header class="hdr" id="hdr">name / date | nav</header>
<button class="back" id="back" aria-label="Back">‹</button>
<div class="cursor" id="cursor"></div>
```
```js
const items = [0,1,2].map(i => ({ i, box: $(`#c${i}`), node: $(`#i${i}`), text: $(`#t${i}`), ghost: $(`#g${i}`), S: 1, ix: 0, iy: 0, gate: new Spring(ZOOM.spring) }));
const p = new Spring(ZOOM.spring), back = new Spring(ZOOM.spring);
let index = 0, open = false, scroll0 = 0, delta = 0;
function expand(i) { index = i; scroll0 = scrollX; layoutTargets(index); freezeRow(); open = true;
                     items.forEach(it => it.gate.set(it.i === index ? 1 : 0)); p.set(1); back.set(1); kick(); }
function collapse()  { const o = clamp(items[index].centerUnscrolled - innerWidth/2, 0, maxScroll); delta = o - scroll0;
                       unfreezeRow(); scrollTo(o, 0); open = false; p.set(0); back.set(0); kick(); }
function render() { const v = p.value;
  for (const it of items) { const q = it.i === index ? v : Math.min(1, v);
    it.node.style.transform = `translate3d(${(it.ix + (open ? 0 : delta)) * v}px, ${Math.min(0, it.iy * v)}px, 0) scale(${1/it.S + (1 - 1/it.S) * q})`;
    it.text.style.opacity = easeInExpo(clamp((v - .333) / .667, 0, 1)) * it.gate.value; }
  const h = easeOutQuad(clamp(v / .333, 0, 1)); hdr.style.opacity = 1 - h; hdr.style.transform = `scale(${1 - .0075 * h})`;
  backEl.style.opacity = clamp((back.value - .5) / .5, 0, 1); backEl.style.pointerEvents = open ? 'auto' : 'none'; }
```
Events: `pointerdown/pointerup` on `.row` with < 2 px movement → `expand(nearestItemTo(pointerX))`; back button, click on empty space (< 5 px move), `Escape`/`ArrowDown` → `collapse()`; `resize` → debounced `layout()`; pointer hover on `[data-clickable]` → cursor scale spring .5.

## 10. Open questions / estimates

* **Cross-wired content sizing** (contentH by width progress, contentW by height progress) is what the code does; unknown whether intentional. Cosmetic only.
* **First-frame head start (~45–60 ms)** seen in the recording is attributed to React's commit on click + rafz's dt; not verifiable from the bundle alone (estimate). The port will not have it.
* **Header transform-origin** during the .9925 scale is inferred from CSS (`width/height:100%` wrapper ⇒ origin at the centre of the header's content box); the scale is sub-pixel and could not be verified from video.
* **Drag-mode chain behaviour and the `_value`/decay bookkeeping** are derived from code only (the clip contains no drag); the 40 ms/ring lag is computed, not measured.
* **Mobile layout** (`column-reverse` item, `galleryVerticalOffset`, header scale .945, `transform-origin: top center` for the text) is read from CSS/constants but not validated (no mobile recording).
* Per-project tuning offsets (`offset.left/right/height/gallery/centered`) are data in `_app` (e.g. Instant Articles `{height:-400, right:.55}`, Lobe `{left:-247, right:1.2}`); the port should define its own per-image tweaks with the same semantics.
* The site re-measures geometry only on resize (50 ms delay), never on expand; if fonts load late the text width (and thus `image.x`) could be stale until the next resize — the port should re-measure after `document.fonts.ready`.
* Exact behaviour of the paging/toss (`Te`, `_slip`, `_interruptOffset`, `onRails` wheel mode) is documented in Ex.5/Ex.12/Ex.23 but not specified here (phase 2).
