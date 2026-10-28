/* pillshow.js — THE PILL SHOWCASE, right of the MacBook (owner 2026-10-21: "right next to a MacBook, there'll be a pill floating with a
   shadow … rendered natively in HTML in the highest resolution possible to show off that curve … when I click on [it], it zooms in to
   roughly the scale of the photos … then it will be a sequence … the things change when I click on the screen"). site.html builds it as
   a SCENE (cfg.scene → PillShow.create(canvas)): every outline is brew's squircle generator (squircle-fit/grow-on-lift.html's
   unifiedOutline2, as combcard.js ports it), filled live on a canvas at the screen's own pixels — never a bitmap scaled up.

   The sequence — each step a click anywhere on the open page (or SPACE); a click while a step still moves is kept for its end:
     pill   → panel   the pill grows DOWN into the measured panel (squircle-fit/ref/shortcut-panel-ref.png, the owner's reference:
                      W / H 1.2987 and r = .2098 H on this generator, rms .77 px over its 1346 px panel) — its height alone, on one
                      critically damped spring: no lift, no pop, no bow (owner: "only like vertical expansion … just pure morphing");
                      its corners on THE ROOM LAW (below): the radius holds while the cap opens into two corners, never squeezed
     panel  → corner  the camera zooms into its top-right corner at the corner shot's scale (brew comb-shots/02-corner: the corner
                      point at (.62, .22) of a 16:9 frame covering the screen, the corner's radius 351 / 1920 of that frame)
     corner → circle  the camera zooms back out, and THE GENIE plays at once (owner 2026-10-22: "retract from the panel to circle must
                      be genie animation"): the panel is pulled up into the bubble on its top line — brew's genie minimize, as the app
                      runs it (below)
     circle → pill    the comb comes on over the bare circle, then grow-on-lift's OPEN plays under it (anticipation, body springs, the
                      lift, the balloon) — one click (owner 2026-10-22: "click on the cirlce will turn the comb on and then animate") —
                      and it rests there
     pill   → out     and a click zooms the page out (owner 2026-10-22: "dont zoom out automatically click will zoom it out on the pill
                      with combs"), the comb fading as it goes (onend → site.html: the close at endMs)
   PHONE (site.html passes these on a phone only, 2026-10-28; owner: "progression like the genie effect must all like that be triggered
   with tap only … on the final cirlce tap, it must immediately turn on the comb and start animating"): every step is its own tap —
   the corner → panel zoom out RESTS on the panel and the genie waits for the next tap (opt.stepGenie: 'panelout'); the tap on the circle
   puts the comb on at once and the open starts the same frame (opt.combNow); the corner shot draws its one corner's comb only
   (opt.oneCorner: cornerRun()).
   The camera's moves: the site's iOS 7 zoom curve, cubic-bezier(.37, .14, .32, 1), SLOW × slower (owner: "3 times slower, or even 4":
   3.5 — in 540 → 1890 ms, out 450 → 1575 ms), linear in scale about the move's fixed point (Core Animation lerps a scale). While it
   is in the corner the page's neighbours slide out of the frame (out → site.html's filmOut), and back with it.

   World units are the DI's points (the pill 256 × 80), the origin the shape's TOP-centre: every shape hangs from that line (grow-on-lift's
   island law). At OPEN the pill is B wide (the photos' open size: site.html's pageB) and the panel it grows into is centred on the
   screen; the card is the pill's own box (its HOME hit area), seated above the screen's centre by PillShow.dy × B (site.html: openDy).
   Three canvases ride the card: the SHAPE twice — OPEN's at the OPEN page's device px, HOME's at HOME's (÷ S), swapped at the zoom's first
   frame, so neither state is a resampled bitmap (the drawing note); HOME's is re-drawn at the camera's scale while the pill peeks beside
   another open page (NEAR) — and the 07-26 float SHADOW on its own small one (¼ px per css px: a gaussian loses nothing upscaled) with
   the room its tail needs at HOME. */
(function(){
  'use strict';
  /* ============================================================
     The generator — grow-on-lift.html's, verbatim (combcard.js's copy: weld fix, in-ramp floor)
     ============================================================ */
  const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
  const lerp =(a,b,t)=>a+(b-a)*t;
  function smoothstep(t){ t=clamp(t,0,1); return t*t*(3-2*t); }
  function smootherstep(t){ t=clamp(t,0,1); return t*t*t*(t*(t*6-15)+10); }
  let carveEase="G3";
  function easeRamp(t,name){
    name=name||carveEase;
    if(name==="G2") return clamp(t,0,1);
    if(name==="G4") return smootherstep(t);
    return smoothstep(t);
  }
  function rampFullness(p,ease){
    if(ease==="G2") return 1/(p+1);
    if(ease==="G4") return 6/(5*p+1)-15/(4*p+1)+10/(3*p+1);
    return 3/(2*p+1)-2/(3*p+1);
  }
  function marchQuadrant(K,m,Lm,Tout,p,ease,N,kOuter){
    kOuter=kOuter||0;
    const HP=Math.PI/2, I=rampFullness(p,ease);
    const Tin=Math.max(0,HP-Tout-m*K*Lm);
    const Li=Tin /(K*(m+(1-m)*I));
    const outAvg=kOuter+(K-kOuter)*I;
    const Lo=outAvg>1e-9 ? Tout/outAvg : 0;
    const segs=[];
    if(Lm>1e-9) segs.push(["mid",Lm]);
    if(Li>1e-9) segs.push(["in", Li]);
    if(Lo>1e-9) segs.push(["out",Lo]);
    const L=Lm+Li+Lo||1;
    let th=HP,x=0,y=0;
    const pts=[[0,0]];
    for(let s=0;s<segs.length;s++){
      const kind=segs[s][0],len=segs[s][1];
      const cnt=Math.max(16,Math.round(len/L*N)),ds=len/cnt;
      for(let i=0;i<cnt;i++){
        const t=(i+0.5)/cnt;
        const k = kind==="mid" ? m*K
                : kind==="in"  ? m*K+(1-m)*K*easeRamp(Math.pow(t,p),ease)
                :                kOuter+(K-kOuter)*easeRamp(Math.pow(1-t,p),ease);
        const dth=k*ds;
        th+=dth/2; x+=Math.cos(th)*ds; y+=Math.sin(th)*ds; th+=dth/2;
        pts.push([x,y]);
      }
    }
    return {pts:pts,ex:x,ey:y};
  }
  function geomM(W,H,r){
    const r0=Math.min(r,W/2,H/2);
    return 1-smoothstep((1-2*r0/Math.min(W,H))/0.30);
  }
  function unifiedOutline2(cx,cy,W,H,r,carve,ease,mOverride){
    ease=ease||"G4";
    const HP=Math.PI/2, half=H/2;
    const r0=Math.min(r,W/2,H/2);
    const m=(mOverride==null)?geomM(W,H,r):clamp(mOverride,0,1);
    const rampShare=clamp(lerp(1.00,0.60,m)*(carve==null?1:carve),0,1);
    const conc=lerp(0.04,0.00,m);
    const p=conc<=1e-9?1:1+conc*8;
    function fitH(Tout,kOuter,N){
      let K=1/r0;
      K*=Math.max(1, marchQuadrant(K,m,0,Tout,p,ease,260,kOuter).ey/half);
      // the in-ramp (mK → K) is the top (1−m) slice of the panel corner's own
      // ramp: keep it at least 1/0.3 of that slice's length (≤ 0.3× the panel's
      // steepness). A tall pose fits its height by growing the mid, and the mid ate
      // the ramp's turn — 1.5 px, 6× steep: a hook in the comb while the circle
      // opens to the panel (2026-10-17). 1.2× still left a ledge (a short ramp
      // between two long flats reads as a step); 0.3× hands the turn back to the
      // ramp and the ledge goes. A shape with no mid (every rest pose) is
      // untouched: this only caps Lm, and stays continuous in m.
      const Lpanel=(HP/2)/(K*rampFullness(1.32,ease));
      const TinMin=(1-m)*Lpanel/0.3*K*(m+(1-m)*rampFullness(p,ease));
      const LmMax=m>1e-4 ? Math.max(0,Math.min(0.94*(HP-Tout),HP-Tout-TinMin))/(m*K) : H*8;
      let Lm=0;
      if(marchQuadrant(K,m,0,Tout,p,ease,260,kOuter).ey < half-1e-6){
        let lo=0,hi=Math.min(H*3,LmMax);
        for(let it=0;it<24;it++){
          const md=(lo+hi)/2;
          if(marchQuadrant(K,m,md,Tout,p,ease,260,kOuter).ey<half) lo=md; else hi=md;
        }
        Lm=(lo+hi)/2;
      }
      const Q=marchQuadrant(K,m,Lm,Tout,p,ease,N,kOuter);
      const sc=Q.ey>1e-6 ? half/Q.ey : 1;
      return {pts:Q.pts,sc:sc,exr:-Q.ex*sc,K:K};
    }
    const Tout=Math.min(rampShare*HP*(1+m)/2, HP*0.96);
    let kOuter=0;
    let F=fitH(Tout,0,260);
    if(F.exr>W/2){
      let lo=0,hi=(1/r0)*0.999;
      for(let it=0;it<24;it++){
        const md=(lo+hi)/2;
        if(fitH(Tout,md,160).exr>W/2) lo=md; else hi=md;
      }
      kOuter=(lo+hi)/2;
    }
    F=fitH(Tout,kOuter,1400);
    const sc=F.sc;
    // a width-limited corner (the circle) must land ON the axis: kOuter is
    // bisected at N=160 but marched at 1400, so the quadrant overshot x=0 by
    // ~0.012 px and the mirror weld folded back — a sub-pixel kink the
    // curvature comb shows as a +2% spike at 12 and 6 o'clock. Scale x home.
    const fx=(kOuter>0 || F.exr>W/2) ? (W/2)/F.exr : 1;
    const q=F.pts.map(pt=>[pt[0]*sc*fx, pt[1]*sc]);
    const TR=q.map(pt=>[ W/2+pt[0], pt[1]]);
    const TL=TR.map(pt=>[-pt[0], pt[1]]).reverse();
    const BL=TR.map(pt=>[-pt[0],-pt[1]]);
    const BR=TR.map(pt=>[ pt[0],-pt[1]]).reverse();
    const out=TR.concat(TL,BL,BR).map(pt=>[cx+pt[0], cy-pt[1]]);
    out.rDrawn=sc/F.K;
    return out;
  }

  /* ---- THE ROOM LAW — the corner's character m on the pure morph (owner 2026-10-22: "currently it breaks by reducing the corner
     radius and then starting to move and expand hence increasing it again"). The generator's own m (geomM) hands the pill's cap to
     the panel's corner (m 1 → 0) by H = 2r / .7, but that corner, tail and all, is e(0) = 2.14 r tall: until the side has that room,
     fitH shrinks it to fit, so the pill → panel's radius ran 37.7 → 26.8 → 41.4 (H 80 → 115 → 197). Here m is the corner that FITS
     the room — e(m) = (H / 2) / r, e the unit corner's height (K 1, no mid) on the generator's own m-dependent preset — so K stays
     1 / r: the radius holds (37.7 → 40.1 → 41.4, never back) while the cap's plateau sinks into a valley between two corners (κ at
     the side's middle = m K), until the side is straight (m 0) and only grows. One blend, at the pill: its cap is squeezed already
     (e(1) = 1.062: r 37.65 drawn at r 40), so the plateau starts to sink only as that squeeze is spent — the radius's growth eased
     out over L = 2 (e(1) − 1) of room (C2), m leaving 1 with zero slope. A function of the pose alone: the rests are geomM's own
     (the pill 1, the panel 0), and the way back is the way there. ---- */
  function unitHeight(m){                                               // fitH's own check (N 260), at K = 1
    const HP = Math.PI/2, rampShare = clamp(lerp(1.00, 0.60, m), 0, 1), conc = lerp(0.04, 0.00, m), p = conc <= 1e-9 ? 1 : 1 + conc*8;
    return marchQuadrant(1, m, 0, Math.min(rampShare*HP*(1 + m)/2, HP*0.96), p, 'G4', 260, 0).ey;
  }
  const ROOM_E1 = unitHeight(1), ROOM_E0 = unitHeight(0), ROOM_L = 2*(ROOM_E1 - 1);   // 1.0624 · 2.1448 · .1249
  let _rmW = NaN, _rmH = NaN, _rmR = NaN, _rm = 1;
  function roomM(W, H, r){
    if(W === _rmW && H === _rmH && r === _rmR) return _rm;
    const x = (H/2) / Math.min(r, W/2, H/2), u = clamp((x - 1) / ROOM_L, 0, 1);   // the side's room, in radii
    const sig = Math.min(1, (1 + ROOM_L*(u - u*u*u + u*u*u*u/2)) / ROOM_E1);         // the radius drawn ÷ r: the pill's squeeze, spent
    const need = u <= 0 ? ROOM_E1 : x / sig;                             // the unit corner's height that fits
    let m = need <= ROOM_E1 ? 1 : need >= ROOM_E0 ? 0 : -1;
    if(m < 0){
      let lo = 0, hi = 1;                                               // e falls as m rises: e(0) = E0 > need > E1 = e(1)
      for(let i = 0; i < 30; i++){ const md = (lo + hi)/2; if(unitHeight(md) > need) lo = md; else hi = md; }
      m = (lo + hi)/2;
    }
    _rmW = W; _rmH = H; _rmR = r; _rm = m;
    return m;
  }

  /* ---- the GENIE's math — squircle-fit/genie-squircle.html's, as FloatingDot.swift's GenieTransit ports it ---- */
  function genieSpring(tau, z){                                         // unit step response of a damped spring (ωn = 1)
    if(tau <= 0) return 0;
    if(z >= 1) return 1 - Math.exp(-tau) * (1 + tau);
    const wd = Math.sqrt(1 - z*z);
    return 1 - Math.exp(-z*tau) * (Math.cos(wd*tau) + (z/wd)*Math.sin(wd*tau));
  }
  function leadEase(t, lead){                                           // SIGNED: + front-loads (rounds early) · − back-loads
    const a = 1 + 2*Math.abs(lead); t = clamp(t, 0, 1);
    return lead >= 0 ? 1 - Math.pow(1 - t, a) : Math.pow(t, a);
  }


  /* ---- identity plumbing: arc-length resample + bbox-normalise ---- */
  function resampleByArc(pts, N){
    const M = pts.length, cum = new Float64Array(M + 1);
    for(let i = 0; i < M; i++){
      const a = pts[i], b = pts[(i + 1) % M];
      cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const total = cum[M] || 1, out = new Array(N);
    let i = 0;
    for(let k = 0; k < N; k++){
      const target = total * k / N;
      while(i < M && cum[i + 1] < target) i++;
      const a = pts[i % M], b = pts[(i + 1) % M];
      const seg = cum[Math.min(i + 1, M)] - cum[i];
      const f = seg > 1e-9 ? (target - cum[i]) / seg : 0;
      out[k] = [ a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f ];
    }
    return out;
  }
  function toLocalUV(pts){
    let nx = Infinity, ny = Infinity, xx = -Infinity, xy = -Infinity;
    for(const p of pts){ if(p[0]<nx)nx=p[0]; if(p[0]>xx)xx=p[0]; if(p[1]<ny)ny=p[1]; if(p[1]>xy)xy=p[1]; }
    const w = (xx - nx) || 1, h = (xy - ny) || 1;
    return pts.map(p => ({ u: (p[0] - nx) / w, v: (p[1] - ny) / h }));
  }
  const N_VERTS = 2048;                      // the comb's identity density (grow-on-lift's &comb)
  function bulgeUV(id, W, H, bH, bV){
    const hw = W/2, hh = H/2, EPS = 1e-4;
    const phiV = bV*Math.PI/2, phiH = bH*Math.PI/2;
    const rV = phiV > EPS ? hw/Math.sin(phiV) : Infinity, cV = Math.cos(phiV);
    const rH = phiH > EPS ? hh/Math.sin(phiH) : Infinity, cH = Math.cos(phiH);
    const sagV = x => { if(!(phiV > EPS)) return 0; const t = clamp(x, -hw, hw); return Math.sqrt(Math.max(0, rV*rV - t*t)) - rV*cV; };
    const sagH = y => { if(!(phiH > EPS)) return 0; const t = clamp(y, -hh, hh); return Math.sqrt(Math.max(0, rH*rH - t*t)) - rH*cH; };
    // the push is weighted by the coordinate's own FRACTION (dx/hw, dy/hh), not
    // its sign: on the edges the two agree (the same circular-arc bow), but a
    // sign flip is a crease in the map. On a cap the outline crosses dy = 0 at
    // the nose, just inside x = hw where sagV is ~0 but its slope is tan φ, so
    // sign(dy)·sagV pushed by sign(y)·y² — κ stayed continuous (G2) but took a
    // |y| term: a V in dκ/ds, the pointed nose under the comb (2026-10-17). The
    // fraction makes the map a smooth stretch (x·(1 + sagH(y)/hw), y·(1 + sagV(x)/hh)),
    // and a smooth map cannot crease a smooth curve.
    return id.map(p => {
      const dx = (p.u - 0.5)*W, dy = (p.v - 0.5)*H;
      return { u: 0.5 + dx*(1 + sagH(dy)/hw) / W,
               v: 0.5 + dy*(1 + sagV(dx)/hh) / H };
    });
  }
  // the composite identity, cached on its dims — the reshape law: the shape
  // is REGENERATED at every (W, H, r) it passes through, never two outlines
  // blended (a two-pose vertex blend stays cornered then snaps at the end)
  let _gid = null, _gidKey = '';
  function growIdentity(W, H, r, bH, bV, m){                           // m: a driven corner (the room law), else the generator's geomM
    const key = W.toFixed(2)+'_'+H.toFixed(2)+'_'+r.toFixed(2)+'_'+bH.toFixed(4)+'_'+bV.toFixed(4)+(m == null ? '' : '_'+m.toFixed(6));
    if(key === _gidKey) return _gid;
    const o = unifiedOutline2(0, 0, W, H, Math.min(r, W/2, H/2), null, 'G4', m);
    let id = toLocalUV(resampleByArc(o, N_VERTS));
    if(bH > 1e-4 || bV > 1e-4) id = bulgeUV(id, W, H, bH, bV);
    _gidKey = key; _gid = id;
    return id;
  }

  /* ---- the lift's channel shapes (genie lab, verbatim) ---- */
  // 0→1 smoothstep over `lag` ms, then HELD — how long the target takes to
  // arrive, not a delay before the axis fires
  function lagRamp(el, lag){
    if(el <= 0) return 0;
    if(lag <= 0 || el >= lag) return 1;
    return smoothstep(el / lag);
  }
  // the one spring law both channels are built from — SwiftUI's own
  // (duration, bounce) parameterisation: ζ = 1 − b, so b = 0 is critical,
  // b > 0 rings, b < 0 is overdamped.
  function springKC(d, b){
    d = Math.max(0.05, d);
    return [ Math.pow(2*Math.PI / d, 2),
             b >= 0 ? (1 - b) * 4*Math.PI / d : 4*Math.PI / (d * (1 + b)) ];
  }

  function appTarget(el, lag, hold){
    if(el < 0) return 0;
    if(lag <= 0) return el < hold ? 1 : 0;
    if(el < lag) return smoothstep(el / lag);
    if(el < lag + hold) return 1;
    return 0;
  }

  /* ============================================================
     The shapes — world units (the DI's points)
     ============================================================ */
  const PANEL_WH = 1.29866, PANEL_RH = .20975;                          // the reference panel, fitted (cx, cy, W, H, r free; rms .77 px)
  const CIRCLE = { w: 64, h: 64, r: 32 }, PILL = { w: 256, h: 80, r: 40 };
  const PANEL = { w: 256, h: 256 / PANEL_WH, r: PANEL_RH * 256 / PANEL_WH };   // 256 × 197.13, r 41.35: the pill's width, grown down
  const STATES = [CIRCLE, PILL, PANEL];                                 // grow-on-lift's rests: circle · pill · (here) the measured panel

  /* the genie's reshape: 17 clean outlines from the panel to the circle at lerped (W, H, r) on THE ROOM LAW (the lab's geomM pinches
     the corner to r 22.7 three quarters through: the pill → panel's dip again), arc-length resampled so vertex i is the same share of
     the perimeter at every step, normalised to their boxes. ~85 ms in all: built a step per timer tick while the pill rests (warm) */
  const GENIE_STEPS = 16, GENIE_LUT = [];
  function genieLUTStep(){
    const k = GENIE_LUT.length;
    if(k > GENIE_STEPS) return false;
    const t = k / GENIE_STEPS, W = lerp(PANEL.w, CIRCLE.w, t), H = lerp(PANEL.h, CIRCLE.h, t), r = lerp(PANEL.r, CIRCLE.r, t);
    GENIE_LUT.push(toLocalUV(resampleByArc(unifiedOutline2(0, 0, W, H, Math.min(r, W/2, H/2), null, 'G4', roomM(W, H, r)), N_VERTS)));
    return k < GENIE_STEPS;
  }
  let warming = false;
  function warmGenie(){ if(warming) return; warming = true; (function go(){ if(genieLUTStep()) setTimeout(go, 16); else if(FADE_COMB) setTimeout(panelComb, 16); })(); }   // then the corner's comb

  /* THE CURVATURE COMB — comb-shots.html's &black look, as a91dd9c had it: blue hairs along the outward normal, length ∝ κ (800 · κ world
     px: half the radius at κ = 1 / r, the stills' CF .5), a red envelope through their tips, off the generator's own outline (κ over a
     1.2 world px span, the stills' combOf); hairs 1 / 320 of the screen's width apart, lines .7 / .95 css px whatever the zoom.
     It fades in on two shots (the create()'s CF):
       THE CORNER (owner 2026-10-22: "when it zooms in on the corner slowly start fading in the comb after its almost done zooming in"):
       on the panel at rest — it starts once the camera is 90% of the way in, fades in slowly past the landing, and leaves as the
       camera starts back out;
       THE CIRCLE'S OPEN (owner, same day: "comb on the expand from circle too … and then expand with comb, and fade out on zoom out"
       → "click on the cirlce will turn the comb on and then animate"): the genie's dot rests bare; the click fades the comb in on it
       (COMB_ON) and the open starts as it lands, the comb riding the live outline through it and the rest; it fades out with the
       page's own zoom out.
     ?pillcomb=0: never · ?pillcomb=1: on every step (the instrument) */
  const SHOW_COMB = /[?&]pillcomb=1(&|$)/.test(location.search), FADE_COMB = !/[?&]pillcomb=0(&|$)/.test(location.search);
  const COMB = { hair: 'rgba(52,132,172,0.78)', env: '#d9484a', wHair: .7, wEnv: .95, span: 1.2, scale: 800 };
  function combOf(outline){
    let P0 = 0;
    for(let i = 0; i < outline.length; i++){ const a = outline[i], b = outline[(i + 1) % outline.length]; P0 += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    const n = Math.min(24000, Math.ceil(P0 / 0.08));
    const pts = resampleByArc(outline, n);
    let A2 = 0;
    for(let i = 0; i < n; i++){ const a = pts[i], b = pts[(i + 1) % n]; A2 += a[0]*b[1] - b[0]*a[1]; }
    const o = A2 >= 0 ? 1 : -1, s = Math.max(1, Math.round(COMB.span / (P0 / n)));
    const raw = new Float64Array(n);
    for(let i = 0; i < n; i++){
      const a = pts[(i - s + n) % n], b = pts[i], c = pts[(i + s) % n];
      const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const ac = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const cr = (b[0] - a[0])*(c[1] - a[1]) - (b[1] - a[1])*(c[0] - a[0]);
      raw[i] = ab*bc*ac > 1e-12 ? o * 2*cr / (ab*bc*ac) : 0;
    }
    const k = new Float64Array(n), h = Math.max(1, s >> 1);
    for(let i = 0; i < n; i++){
      let acc = 0;
      for(let j = -h; j <= h; j++) acc += raw[(i + j + n) % n];
      k[i] = acc / (2*h + 1);
    }
    const tips = new Array(n);
    for(let i = 0; i < n; i++){
      const a = pts[(i - s + n) % n], c = pts[(i + s) % n];
      let tx = c[0] - a[0], ty = c[1] - a[1];
      const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const len = k[i] * COMB.scale;
      tips[i] = [ pts[i][0] + o*ty*len, pts[i][1] - o*tx*len ];
    }
    return { pts, tips, k, P: P0 };
  }
  let PANEL_COMB = null;                                                // the panel's comb, off its own generator outline (≈10 ms: warmed)
  function panelComb(){ return PANEL_COMB || (PANEL_COMB = combOf(unifiedOutline2(0, PANEL.h / 2, PANEL.w, PANEL.h, PANEL.r, null, 'G4'))); }
  function cornerRun(K){                                                // PHONE (oneCorner): the top-right corner's comb alone — the one run of
    if(K.run) return K.run;                                             // the panel's outline right of its axis, above its middle, with hairs
    const n = K.pts.length, on = i => { const p = K.pts[i], t = K.tips[i]; return p[0] > 0 && p[1] < PANEL.h / 2 && Math.hypot(t[0] - p[0], t[1] - p[1]) > .02; };
    let s = 0; while(s < n && !(on(s) && !on((s - 1 + n) % n))) s++;
    let len = 0; while(len < n && on((s + len) % n)) len++;
    return (K.run = { s, len });                                        // (measured: 1753 of 10247 points, (128, 80.9) → (47.1, 0))
  }

  /* the 07-26 float shadow (grow-on-lift / genie / combcard.js), world px */
  const SH = { ox: 93, oy: 109, blur: 80, spread: 7, alpha: 0.18, fall: 0.89, layers: 3 };
  const SHQ = .25;                                                     // the shadow canvas: px per css px of the OPEN page

  /* CSS cubic-bezier(x1, y1, x2, y2): s → y (Newton on x(t), bisection when flat) */
  function bezier(x1, y1, x2, y2){
    const cx = 3*x1, bx = 3*(x2 - x1) - cx, ax = 1 - cx - bx, cy = 3*y1, by = 3*(y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax*t + bx)*t + cx)*t, dX = t => (3*ax*t + 2*bx)*t + cx, Y = t => ((ay*t + by)*t + cy)*t;
    return s => {
      if(s <= 0) return 0; if(s >= 1) return 1;
      let t = s;
      for(let i = 0; i < 8; i++){ const e = X(t) - s, d = dX(t); if(Math.abs(e) < 1e-7) return Y(t); if(Math.abs(d) < 1e-6) break; t = clamp(t - e/d, 0, 1); }
      let lo = 0, hi = 1; t = s;
      for(let i = 0; i < 40; i++){ if(X(t) < s) lo = t; else hi = t; t = (lo + hi)/2; }
      return Y(t);
    };
  }
  function trace(c, pts){
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for(let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }

  function create(cv, opt){
    opt = opt || {};
    const SLOW = opt.slow > 0 ? opt.slow : 3.5;
    const IN_MS = (opt.inMs || 540) * SLOW, OUT_MS = (opt.outMs || 450) * SLOW;
    const ease = bezier.apply(null, opt.bez || [.37, .14, .32, 1]);
    const EXPAND_S = opt.expand > 0 ? opt.expand : .9;                 // the pure morph's spring (critically damped), s
    const END_MS = opt.endAt > 0 ? opt.endAt : 1100;                    // the OPEN's age from which a click zooms the page out (one before waits for it)
    /* THE SEQUENCE'S CLOCK (owner 2026-10-22: "slow all animations down like 30%"): every step plays TIME × slower — its springs, the
       camera's moves, the genie, grow-on-lift's open, and the page's own zoom out at the end (endMs) — one dilation, so nothing changes
       but the pace. ?pilltime= (1.43 = 70% speed). A leave stays on real time: its morph keeps step with the page's standard close */
    const TIME = opt.time > 0 ? opt.time : (parseFloat((/[?&]pilltime=([\d.]+)/.exec(location.search) || [])[1]) || 1.3);
    /* PHONE (owner 2026-10-27, iPhone 13 mini: "the comb looks too dense … you cant even see these hairs"): W / 320 is 1.2 css px on a
       375 pt screen — the .7 px hairs merge into a sheet. opt.combGap: the hairs' least spacing, css px (site.html: 3.5 on a phone ≈ the
       desktop's 4.5 px at 1440, seen from a phone's distance; ?pillgap=) */
    const GAP_MIN = opt.combGap > 0 ? opt.combGap : 0;
    const ONE_CORNER = !!opt.oneCorner, STEP_GENIE = !!opt.stepGenie, COMB_NOW = !!opt.combNow;   // PHONE: the header's PHONE note
    const ctx = cv.getContext('2d');
    const sh = document.createElement('canvas'), shx = sh.getContext('2d');
    sh.className = 'scene-sh'; sh.setAttribute('aria-hidden', 'true');
    sh.style.cssText = 'position:absolute;z-index:2;display:block;pointer-events:none';
    const G = { W: 0, H: 0, B: 0, S: 1, dpr: 1, rx: 1, ry: 1, sx: SHQ, sy: SHQ, shW: 0, shH: 0 };
    let mode = 'home', base = null, corner = null, fixed = null;

    /* ---- grow-on-lift's engine (combcard.js's CombCard.grow, verbatim but for the rests and the anchor: no retext here) ---- */
    let cur = 1;
    const GROW = {
      active: false, tMs: 0, h: 1/120,
      dur: 0.55, bounce: 0.15, lagW: 300, lagV: 0, hold: 270, liftDur: 1.13, liftBounce: 0.64,
      pop: 0.075, popBias: 0, peakBH: 0.04, peakBV: 0.04, antic: 0.12, anticMs: 130, anticOff: 0,
      retext: false, squashK: 0.11,
      pH: 0, pV: 0, vH: 0, vV: 0, pB: 0, vB: 0, qH: 0, qV: 0, wH: 0, wV: 0,
      W1: 0, H1: 0, r1: 40, W2: 0, H2: 0, r2: 40, ampW: 0, ampH: 0, ampR: 0, govIsH: true, dir: 1,
    };
    function peaks(){ return [GROW.peakBH, GROW.peakBV]; }
    function growStep(h){
      if(!GROW.active) return;
      GROW.tMs += h * 1000;
      const P = GROW;
      const [k, c]   = springKC(P.dur, P.bounce);
      const [kl, cl] = springKC(P.liftDur, P.liftBounce);
      const gT = GROW.tMs - GROW.anticOff;
      const lagWeff = GROW.dir < 0 ? GROW.lagV : GROW.lagW;
      const tX = lagRamp(gT, lagWeff), tY = lagRamp(gT, GROW.lagV);
      const aH = -k*(GROW.pH - tX) - c*GROW.vH;
      GROW.pH += (GROW.vH + aH*h)*h;  GROW.vH += aH*h;
      const aV = -k*(GROW.pV - tY) - c*GROW.vV;
      GROW.pV += (GROW.vV + aV*h)*h;  GROW.vV += aV*h;
      GROW.pB = GROW.pV; GROW.vB = GROW.vV;
      const sX = appTarget(gT, P.lagW, P.hold);
      const sY = appTarget(gT, GROW.lagV, P.hold);
      const gH = -kl*(GROW.qH - sX) - cl*GROW.wH;
      GROW.qH += (GROW.wH + gH*h)*h;  GROW.wH += gH*h;
      const gV = -kl*(GROW.qV - sY) - cl*GROW.wV;
      GROW.qV += (GROW.wV + gV*h)*h;  GROW.wV += gV*h;
      if(GROW.tMs >= GROW.anticOff + Math.max(P.lagW, GROW.lagV) + P.hold &&
         Math.abs(GROW.pH - 1) < 0.002 && Math.abs(GROW.pV - 1) < 0.002 &&
         Math.abs(GROW.vH) < 0.02 && Math.abs(GROW.vV) < 0.02 &&
         Math.abs(GROW.pB - 1) < 0.002 && Math.abs(GROW.vB) < 0.02){
        const [pBH, pBV] = peaks();
        const eW = Math.max(Math.abs(GROW.ampW), pBH * 0.2 * Math.abs(GROW.W2));
        const eH = Math.max(Math.abs(GROW.ampH), pBV * 0.2 * Math.abs(GROW.H2));
        const dPt = Math.max(Math.abs(GROW.qH)*eW, Math.abs(GROW.qV)*eH);
        const vPt = Math.max(Math.abs(GROW.wH)*eW, Math.abs(GROW.wV)*eH);
        if(dPt < 0.1 && vPt < 1.5){
          GROW.pH = GROW.pV = GROW.pB = 1; GROW.vH = GROW.vV = GROW.vB = 0;
          GROW.qH = GROW.qV = GROW.wH = GROW.wV = 0;
          GROW.active = false;
        }
      }
    }
    function growRest(){
      return { w: lerp(GROW.W1, GROW.W2, GROW.pH), h: lerp(GROW.H1, GROW.H2, GROW.pV),
               r: lerp(GROW.r1, GROW.r2, GROW.govIsH ? GROW.pV : GROW.pH) };
    }
    function anticScale(){
      const D = GROW.anticOff;
      if(D <= 0) return 1;
      const t = GROW.tMs, a = GROW.antic;
      if(t >= 2*D) return 1;
      if(t <= D) return 1 - a*smoothstep(t/D);
      return 1 - a*(1 - smoothstep((t-D)/D));
    }
    function growPose(){
      const R = growRest(), A = anticScale();
      let lW = GROW.qH * GROW.ampW, lH = GROW.qV * GROW.ampH;
      let lR = (GROW.govIsH ? GROW.qV : GROW.qH) * GROW.ampR;
      const [pBH, pBV] = peaks();
      let bH = clamp(GROW.qH * pBH, 0, 1), bV = clamp(GROW.qV * pBV, 0, 1);
      let scale = 1;
      const collapse = GROW.dir < 0;
      if(collapse){ lW = lH = lR = 0; bH = bV = 0; scale = 1 + GROW.qV * GROW.pop * GROW.dir; }
      const w = (R.w + lW) * A * scale, h = (R.h + lH) * A * scale;
      return { w, h, r: (R.r + lR) * A * scale, bH, bV,
               e: collapse ? -GROW.qV * GROW.squashK * Math.log(Math.max(1, GROW.W1/Math.max(1, GROW.H1))) : 0 };
    }
    function armGrow(to){
      const live = GROW.active;
      GROW.retext = false;
      const from = live ? growRest() : STATES[cur];
      const pxW = live ? (GROW.W2 - GROW.W1) * GROW.vH : 0;
      const pxH = live ? (GROW.H2 - GROW.H1) * GROW.vV : 0;
      const ampW0 = GROW.ampW, ampH0 = GROW.ampH;
      GROW.W1 = from.w; GROW.H1 = from.h; GROW.r1 = from.r;
      GROW.W2 = to.w;   GROW.H2 = to.h;   GROW.r2 = to.r;
      GROW.dir = Math.sign(GROW.H2 - GROW.H1) || Math.sign(GROW.W2 - GROW.W1) || 1;
      GROW.anticOff = (GROW.dir > 0 && GROW.antic > 1e-4 && GROW.anticMs > 0) ? GROW.anticMs : 0;
      const midW = (GROW.W1 + GROW.W2)/2, midH = (GROW.H1 + GROW.H2)/2, midR = (GROW.r1 + GROW.r2)/2;
      const P = GROW;
      const fracW = P.pop * (1 - P.popBias), fracH = P.pop * (1 + P.popBias);
      GROW.govIsH = midH <= midW;
      GROW.ampW = fracW * midW * GROW.dir;
      GROW.ampH = fracH * midH * GROW.dir;
      GROW.ampR = (GROW.govIsH ? fracH : fracW) * midR * GROW.dir;
      const trW = GROW.W2 - GROW.W1, trH = GROW.H2 - GROW.H1;
      GROW.pH = GROW.pV = GROW.pB = 0;
      GROW.vH = Math.abs(trW) > 1 ? clamp(pxW / trW, -20, 20) : 0;
      GROW.vV = Math.abs(trH) > 1 ? clamp(pxH / trH, -20, 20) : 0;
      GROW.vB = GROW.vV;
      if(live){
        const re = (q, w, a0, a1) => Math.abs(a1) > 1e-6 ? [ clamp(q*a0/a1, -4, 4), clamp(w*a0/a1, -40, 40) ] : [0, 0];
        [GROW.qH, GROW.wH] = re(GROW.qH, GROW.wH, ampW0, GROW.ampW);
        [GROW.qV, GROW.wV] = re(GROW.qV, GROW.wV, ampH0, GROW.ampH);
      } else {
        GROW.qH = GROW.qV = GROW.wH = GROW.wV = 0;
      }
      GROW.tMs = 0; GROW.active = true;
    }

    /* ---- the PURE MORPH (the pill growing into the panel; a leave's way back to the pill): (w, h, r) on one critically damped
       spring, the outline regenerated at every pose it passes (the reshape law), no identity bulge ---- */
    const MORPH = { active: false, a: PILL, b: PILL, p: 1, v: 0, dur: EXPAND_S, dm: 0 };
    function morphTo(a, b, dur){                                         // a pose drawn on another m (a leave from the close: geomM's) eases
      const dm = a.m == null ? 0 : a.m - roomM(a.w, a.h, a.r);           // onto the room law on the morph's own clock — no pop at its start
      Object.assign(MORPH, { active: true, a, b, p: 0, v: 0, dur, dm, ghost: null });
    }
    function morphStep(h){
      if(!MORPH.active) return;
      const [k, c] = springKC(MORPH.dur, 0);
      const a = -k*(MORPH.p - 1) - c*MORPH.v;
      MORPH.p += (MORPH.v + a*h)*h; MORPH.v += a*h;
      if(Math.abs(MORPH.p - 1) < 1e-4 && Math.abs(MORPH.v) < 1e-3){ MORPH.p = 1; MORPH.v = 0; MORPH.active = false; }
    }

    /* ---- THE GENIE — the panel's retract into the circle (owner 2026-10-22: "retract from the panel to circle must be genie
       animation"): brew's genie minimize as the app runs it (FloatingDot.swift's GenieTransit, the lab's defaults): the circle shares
       the panel's top line and centre — the island law, and the dot the pill grows back out of — so the funnel pulls UP. Only the four
       box corners have clocks, riding straight rails to the circle's box: the near (top) row leads by the 6% stagger, the far (bottom)
       row whips through after it; every vertex sits bilinearly in their quad, so the walls stay straight (the corner-clock keystone).
       Each clock is the lab's ring settle on raw time over 1.95 s (a critical backbone at twice the rate + 18% of a ζ .32 spring: the
       body lands ~.3 s in, passes the circle by ~1.9%, comes back, a hairline third); the reshape rides the two clocks' mean through the
       lab's +.47 lead (rounds early). It ends at its perceptual settle — every corner within .1 world px of the circle's — not at the
       clock's: the ring's tail past that is invisible, and a click waiting for the open would wait on it. No bubble skin (the film's
       call: the circle opens into the pill next). ---- */
    const GENIE = { active: false, t: 0, dur: 1950, spread: 0.06, bounce: 0.18, lead: 0.47, endMs: 1950 };
    function genieRowT(v, prog){                                         // v 0 = the top row (nearer the circle: it leads)
      const mag = Math.abs(GENIE.spread), w = GENIE.spread > 0 ? v : 1 - v;
      const uc = clamp((prog - w * mag) / Math.max(1 - mag, 1e-4), 0, 1);
      const T = 5.5 / 0.32, A = 0.30 * GENIE.bounce;                     // SPRING_T / RING_Z · the ring's share
      const mix = tau => { const B = genieSpring(2 * tau, 1); return B + A * (genieSpring(tau, 0.32) - B); };
      return mix(uc * T) / mix(T);
    }
    function genieCorner(u, v, prog){                                    // a box corner on its straight rail: the panel's → the circle's
      const t = genieRowT(v, prog), sx = (u - 0.5) * PANEL.w, sy = v * PANEL.h, ex = (u - 0.5) * CIRCLE.w, ey = v * CIRCLE.h;
      return [ sx + (ex - sx) * t, sy + (ey - sy) * t ];
    }
    function genieOutline(prog){
      while(genieLUTStep());                                             // warm already (landed()); finished here if not
      const TL = genieCorner(0, 0, prog), TR = genieCorner(1, 0, prog), BR = genieCorner(1, 1, prog), BL = genieCorner(0, 1, prog);
      const tSh = leadEase((genieRowT(0, prog) + genieRowT(1, prog)) / 2, GENIE.lead);
      const x = tSh * GENIE_STEPS, lo = Math.min(Math.floor(x), GENIE_STEPS), hi = Math.min(lo + 1, GENIE_STEPS), f = x - lo;
      const A = GENIE_LUT[lo], B = GENIE_LUT[hi], out = new Array(A.length);
      for(let i = 0; i < A.length; i++){
        const u = A[i].u + (B[i].u - A[i].u) * f, v = A[i].v + (B[i].v - A[i].v) * f;
        const a = (1 - u)*(1 - v), b = u*(1 - v), c = u*v, d = (1 - u)*v;
        out[i] = [ a*TL[0] + b*TR[0] + c*BR[0] + d*BL[0], a*TL[1] + b*TR[1] + c*BR[1] + d*BL[1] ];
      }
      return out;
    }
    function startGenie(){
      const travel = [ Math.hypot((PANEL.w - CIRCLE.w) / 2, 0), Math.hypot((PANEL.w - CIRCLE.w) / 2, PANEL.h - CIRCLE.h) ];   // top · bottom row
      const settle = eps => {                                            // the last instant a corner is still eps off: marched back from the end
        for(let i = 1024; i >= 0; i--){
          const prog = i / 1024;
          if(travel[0] * Math.abs(genieRowT(0, prog) - 1) >= eps || travel[1] * Math.abs(genieRowT(1, prog) - 1) >= eps) return Math.min(GENIE.dur, (i + 1) / 1024 * GENIE.dur);
        }
        return 0;
      };
      Object.assign(GENIE, { active: true, t: 0, endMs: settle(.1) || GENIE.dur });   // the perceptual settle
    }

    /* ---- the corner's comb: its opacity, tweened (ease in-out) on the sequence's clock — in once the camera is COMB_AT of the way into
       the corner, over COMB_IN; out over COMB_OUT from the click that starts the camera back ---- */
    const COMB_AT = .9, COMB_IN = 1200, COMB_OUT = 600, COMB_ON = 600;   // COMB_ON: the click on the circle — on, then the open
    const CF = { a: 0, from: 0, to: 0, t: 0, T: 1 };
    function combFade(to, ms){ if(CF.to !== to) Object.assign(CF, { from: CF.a, to, t: 0, T: Math.max(1, ms) }); }
    function combStep(ms){
      if(CF.a === CF.to) return false;
      CF.t = Math.min(CF.T, CF.t + ms);
      CF.a = CF.t >= CF.T ? CF.to : lerp(CF.from, CF.to, smoothstep(CF.t / CF.T));
      return true;
    }

    /* ---- the CAMERA: u 0 = the open framing, 1 = the corner; tweened on the iOS 7 curve ---- */
    /* PHONE (owner 2026-10-27: "port the pill animation and everything the pill is doing to the phone version … it fills the certain
       ratio of the phone. Instead of the laptop"): on a portrait screen the 16:9 frame's centre crop put the corner point on the screen's
       right edge, its comb cut off — so the corner is composed on the phone's own frame, the zoom solved from the top corner's comb
       (panelComb(), measured: it starts CB_L = 78.7 world px left of the corner point along the top edge, and its envelope reaches
       CB_R = 10.8 past the top and right edges): its left end .06 W in, its right .08 W in, its top .08 H under the screen's top —
       kc = .86 W / 89.5. 2026-10-28 (owner: "zoom in on the panel so the bottom corner is not even visible" → "zoom in on the corner cuts
       off the left a bit, so just zoom out now just dont turn on the comb on the bottom"): this framing, the whole corner's comb on the
       screen, and the bottom corner — partly in view on a tall screen — bare (opt.oneCorner). ?pillcorner=left,right,top (W, W, H) */
    const CORNER_Q = ((/[?&]pillcorner=([\d.,]+)/.exec(location.search) || [])[1] || '').split(',');
    const CORNER_P = [.06, .08, .08].map((d, i) => +CORNER_Q[i] >= 0 && CORNER_Q[i] !== '' ? +CORNER_Q[i] : d);
    const CB_L = 78.7, CB_R = 10.8;
    const CAM = { active: false, u: 0, u0: 0, u1: 0, t: 0, T: 1 };
    function camTo(u1, ms){ Object.assign(CAM, { active: true, u0: CAM.u, u1, t: 0, T: Math.max(1, ms) }); }
    function camStep(ms){
      if(!CAM.active) return;
      CAM.t = Math.min(CAM.T, CAM.t + ms);
      CAM.u = lerp(CAM.u0, CAM.u1, ease(CAM.t / CAM.T));
      if(CAM.t >= CAM.T){ CAM.u = CAM.u1; CAM.active = false; }
    }
    function cams(){
      const { W, H, B } = G, k0 = B / PILL.w;
      base = { k: k0, x: W / 2, y: G.top != null ? G.top : H / 2 - PANEL.h * k0 / 2 };   // the panel centred on the screen, every shape on its top line (a phone: the card's own seat, G.top — PHONE)
      if(H > W){                                                         // PHONE, portrait: the top corner's whole comb on the screen
        const [mL, mR, mT] = CORNER_P, kc = (1 - mL - mR) * W / (CB_L + CB_R);
        corner = { k: kc, x: (1 - mR) * W - CB_R * kc - kc * PANEL.w / 2, y: mT * H + CB_R * kc };
      } else {
      const F = Math.max(W / 1920, H / 1080), fx = (W - 1920 * F) / 2, fy = (H - 1080 * F) / 2;   // the corner shot's 16:9 frame, covering
      const kc = 351 * F / PANEL.r;                                      // its corner radius: 70.2 × 2.5 × 2 = 351 frame px
      corner = { k: kc, x: fx + 1190.4 * F - kc * PANEL.w / 2, y: fy + 237.6 * F };   // the panel's corner point at (.62, .22) of the frame
      }
      const Z = corner.k / k0;
      fixed = Math.abs(Z - 1) > 1e-9 ? { x: (corner.x - Z * base.x) / (1 - Z), y: (corner.y - Z * base.y) / (1 - Z) } : { x: 0, y: 0 };
    }
    function camAt(u){                                                   // a zoom about the fixed point, linear in scale
      if(u <= 0) return base;
      if(u >= 1) return corner;
      const s = 1 + (corner.k / base.k - 1) * u;
      return { k: base.k * s, x: fixed.x + s * (base.x - fixed.x), y: fixed.y + s * (base.y - fixed.y) };
    }

    /* ---- the pose and its outline (world: x about 0, y down from the top line) ---- */
    function pose(){
      if(MORPH.active){
        const t = MORPH.p, a = MORPH.a, b = MORPH.b, w = lerp(a.w, b.w, t), h = lerp(a.h, b.h, t), r = lerp(a.r, b.r, t);
        return { w, h, r, bH: 0, bV: 0, e: 0, m: clamp(roomM(w, h, r) + MORPH.dm * (1 - smoothstep(t)), 0, 1),   // the room law
                 ghost: MORPH.ghost ? t : null };
      }
      if(GENIE.active){                                                  // its box (the top row never leaves the line) and its corner
        const prog = GENIE.t / GENIE.dur, TL = genieCorner(0, 0, prog), TR = genieCorner(1, 0, prog), BR = genieCorner(1, 1, prog), BL = genieCorner(0, 1, prog);
        const tSh = leadEase((genieRowT(0, prog) + genieRowT(1, prog)) / 2, GENIE.lead);
        return { w: Math.max(TR[0] - TL[0], BR[0] - BL[0]), h: Math.max(BL[1], BR[1]), r: lerp(PANEL.r, CIRCLE.r, tSh), bH: 0, bV: 0, e: 0, genie: prog };
      }
      if(GROW.active) return growPose();
      const R = STATES[cur]; return { w: R.w, h: R.h, r: R.r, bH: 0, bV: 0, e: 0 };
    }
    let lastKey = '', lastPts = null, lastComb = null;
    function outline(P){
      const key = P.w.toFixed(4) + '_' + P.h.toFixed(4) + '_' + P.r.toFixed(4) + '_' + P.bH.toFixed(5) + '_' + P.bV.toFixed(5) + '_' + (P.e || 0).toFixed(5)
                + (P.m == null ? '' : '_' + P.m.toFixed(6)) + (P.genie == null ? '' : '_g' + P.genie.toFixed(7)) + (P.ghost == null ? '' : '_h' + P.ghost.toFixed(6))
                + (SHOW_COMB || liveComb() ? '_c' : '');
      if(key === lastKey) return lastPts;
      if(P.genie != null) lastPts = genieOutline(P.genie);
      else if((SHOW_COMB || liveComb()) && P.ghost == null && !(P.bH > 1e-4 || P.bV > 1e-4 || Math.abs(P.e || 0) > 1e-6))   // a comb reads the generator's own outline (1400 a quadrant): the stills'
        lastPts = unifiedOutline2(0, P.h / 2, P.w, P.h, Math.min(P.r, P.w/2, P.h/2), null, 'G4', P.m);
      else {
        const id = growIdentity(P.w, P.h, Math.min(P.r, P.w/2, P.h/2), P.bH, P.bV, P.m);
        const s = 1 + (P.e || 0), cy = P.h / 2;                          // top-pinned (anchor 0): the island law
        lastPts = id.map(q => [ (q.u - 0.5) * P.w * s, cy + (q.v - 0.5) * P.h / s ]);
        if(P.ghost != null && MORPH.ghost){                               // a leave out of the genie: the morph starts ON its keystone and
          const g = MORPH.ghost, b = smoothstep(P.ghost / 0.5);          // leaves it over the first half (vertex i: the same share of the
          lastPts = lastPts.map((q, i) => [ g[i][0] + (q[0] - g[i][0]) * b, g[i][1] + (q[1] - g[i][1]) * b ]);   // perimeter in both)
        }
      }
      lastKey = key; lastComb = null;
      return lastPts;
    }
    function combFor(pts){ if(!lastComb || pts !== lastPts) lastComb = combOf(pts); return lastComb; }
    function liveComb(){ return FADE_COMB && !SHOW_COMB && CF.a > 1e-3 && (phase === 'combing' || phase === 'opening' || phase === 'rest' || phase === 'ending'); }   // the circle's: on the live outline

    /* ---- drawing ---- */
    /* the SHAPE canvases, two: OPEN's at the OPEN page's device px and HOME's at HOME's (OPEN ÷ S) — each 1 : 1 where it shows, so the
       curve is never a resampled bitmap (a minified OPEN canvas at HOME stair-steps the cap, compared 2026-10-21). Both stay composited
       (the idle one at opacity .002: Safari paints no layer at 0) and the zoom's first frame only swaps them: a canvas re-allocated just
       before a page zoom costs Safari 50–110 ms on its first frame (measured 1440 × 900 @2: a re-allocation on the press 69–153 ms,
       none 24–38, the room print's 23–32). OPEN's covers only what the step needs — 'pill' (the page's zooms), 'panel' (its growth,
       grow-on-lift's close and open), 'full' (the screen: the corner; 5.2 MP costs ~50 ms even allocated long before) — grown while
       nothing moves: the landing, a rest before the next step. */
    const MARGIN = SHOW_COMB || FADE_COMB ? 48 : 24;                     // world px round the shape: the grow's pop and balloon, the edge's AA, the comb's hairs (the circle's 25)
    const cvH = document.createElement('canvas'), ctxH = cvH.getContext('2d');
    cvH.className = 'scene-home'; cvH.setAttribute('aria-hidden', 'true');
    cvH.style.cssText = 'position:absolute;z-index:3;display:block;pointer-events:none';
    const OPENC = { el: cv, ctx, box: null, rx: 1, ry: 1 }, HOMEC = { el: cvH, ctx: ctxH, box: null, rx: 1, ry: 1 };
    let landed = false;
    function boxOf(name){                                                // its rect in the OPEN page's viewport px (whole px: device-aligned)
      const { W, H } = G;
      if(name === 'full') return { name, x: 0, y: 0, w: W, h: H };
      const hh = name === 'panel' ? PANEL.h : PILL.h, m = MARGIN;
      const x = Math.max(0, Math.floor(base.x - base.k * (PILL.w / 2 + m))), y = Math.max(0, Math.floor(base.y - base.k * m));
      return { name, x, y, w: Math.min(W, Math.ceil(base.x + base.k * (PILL.w / 2 + m))) - x, h: Math.min(H, Math.ceil(base.y + base.k * (hh + m))) - y };
    }
    function setBox(C, name, res){                                       // true: re-allocated (its pixels to draw)
      const b = boxOf(name);
      if(C.box && C.box.name === b.name && C.box.x === b.x && C.box.y === b.y && C.box.w === b.w && C.box.h === b.h && C.res === res) return false;
      C.box = b; C.res = res;
      const L = -(G.W / 2 - G.B / 2), T = -base.y;                      // the viewport's corner, seen from the card's px (OPEN: 1 : 1)
      Object.assign(C.el.style, { left: (L + b.x) + 'px', top: (T + b.y) + 'px', width: b.w + 'px', height: b.h + 'px' });
      let w = Math.max(2, Math.round(b.w * res)), h = Math.max(2, Math.round(b.h * res));
      const cap = 16.7e6;                                                // past ~16.7 MP: Safari's canvas limit — scaled under it
      if(w * h > cap){ const f = Math.sqrt(cap / (w * h)); w = Math.round(w * f); h = Math.round(h * f); }
      if(C.el.width !== w || C.el.height !== h){ C.el.width = w; C.el.height = h; }
      C.rx = w / b.w; C.ry = h / b.h;
      return true;
    }
    /* the pill as a NEIGHBOUR (owner 2026-10-26: "the pill in this one looks low rez in zoomed in preview … on the left"): the page's
       camera on another stack magnifies this HOME card by that stack's scale (1440 × 900: the room print's 1.78, the MacBook's 2.06) —
       HOME's canvas showed that much upscaled, its edge a 3 px blur. NEAR (site.html: nearSync() → near()): null, every stack at HOME ·
       'zoom', the camera on its way there from HOME — OPEN's canvas shows (drawn ahead: minified, never upscaled) · k, that page landed
       and nothing moving — HOME's canvas re-drawn at k × HOME's px, 1 : 1 again (re-allocated at rest only: the stall note above), and
       kept through the next camera move or the zoom out; HOME's px again once every stack is HOME */
    let NEAR = null;
    const resOpen = () => G.dpr, resHome = () => G.dpr * (typeof NEAR === 'number' ? NEAR : 1) / Math.max(1, G.S);
    function need(){                                                     // OPEN's box for now (and the next step, when this one rests)
      if(mode === 'home') return 'pill';
      switch(phase){
        case 'pill':    return landed ? 'panel' : 'pill';               // landed: ready for the growth
        case 'expand':  return 'panel';
        case 'panel':   case 'zoomin': case 'corner': case 'zoomout': case 'panelout': return 'full';   // resting as the panel: ready for the corner
        case 'closing': return OPENC.box ? OPENC.box.name : 'full';      // straight after the zoom out: no resize while it moves
        case 'circle':  case 'opening': return 'panel';
        default:        return OPENC.box ? OPENC.box.name : 'pill';     // the end's / a leave's zoom out: as it was
      }
    }
    function adopt(){ if(cv.parentNode){ if(!sh.parentNode) cv.parentNode.insertBefore(sh, cv); if(!cvH.parentNode) cv.parentNode.insertBefore(cvH, cv.nextSibling); } }
    function placeShadow(){                                              // the shadow canvas: the screen + the tail's room at HOME (¼ px per css px)
      const { W, H, B } = G, k0 = B / PILL.w, L = -(W / 2 - B / 2), T = -base.y;
      G.shW = Math.max(W, W / 2 + (PILL.w / 2 + 340) * k0);             // the shadow's tail at HOME: ≈ 300 world px right / below the pill
      G.shH = Math.max(H, base.y + (PILL.h + 340) * k0);
      Object.assign(sh.style, { left: L + 'px', top: T + 'px', width: G.shW + 'px', height: G.shH + 'px' });
      const sw = Math.max(2, Math.round(G.shW * SHQ)), shh = Math.max(2, Math.round(G.shH * SHQ));
      if(sh.width !== sw || sh.height !== shh){ sh.width = sw; sh.height = shh; }
      G.sx = sw / G.shW; G.sy = shh / G.shH;
    }
    function shows(){                                                    // which shape canvas is seen: a compositor-only swap
      const open = mode === 'open' || (NEAR === 'zoom' && !(HOMEC.res > G.dpr / Math.max(1, G.S) * 1.001));   // a neighbour's zoom from HOME: OPEN's (NEAR)
      OPENC.el.style.opacity = open ? '1' : '.002';
      HOMEC.el.style.opacity = open ? '.002' : '1';
    }
    function shadow(pts, C){
      const n = pts.length, sp = SH.spread;
      let A2 = 0; for(let i = 0; i < n; i++){ const a = pts[i], b = pts[(i + 1) % n]; A2 += a[0]*b[1] - b[0]*a[1]; }
      const o = A2 >= 0 ? 1 : -1;
      const path = new Path2D();
      for(let i = 0; i < n; i++){
        const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
        const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
        const x = pts[i][0] + o*ty/L*sp, y = pts[i][1] - o*tx/L*sp;     // the caster inflated along its outward normal
        if(i) path.lineTo(x, y); else path.moveTo(x, y);
      }
      path.closePath();
      const ks = G.sx * C.k;                                             // shadow px per world px
      const OFF = sh.width + 4 * SH.blur * ks + 400;                      // drawn off the canvas: only the shadow lands
      shx.setTransform(1, 0, 0, 1, 0, 0); shx.clearRect(0, 0, sh.width, sh.height);
      shx.setTransform(ks, 0, 0, G.sy * C.k, G.sx * C.x - OFF, G.sy * C.y);
      shx.fillStyle = '#000';
      let wsum = 0;
      for(let i = 1; i <= SH.layers; i++) wsum += 1 - 0.65 * (i / SH.layers);
      for(let i = 1; i <= SH.layers; i++){
        const f = i / SH.layers, m = Math.pow(f, SH.fall);
        shx.shadowColor = `rgba(0,0,0,${SH.alpha * (1 - 0.65*f) / wsum})`;
        shx.shadowBlur    = SH.blur * m * ks;
        shx.shadowOffsetX = OFF + SH.ox * m * ks;
        shx.shadowOffsetY = SH.oy * m * ks;
        shx.fill(path);
      }
    }
    function paint(C, pts, cam){
      const c = C.ctx, b = C.box;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, C.el.width, C.el.height);
      c.setTransform(C.rx * cam.k, 0, 0, C.ry * cam.k, C.rx * (cam.x - b.x), C.ry * (cam.y - b.y));
      trace(c, pts); c.fillStyle = '#000'; c.fill();
      if(SHOW_COMB) drawComb(c, combFor(pts), C.rx * cam.k, 1);
      else if(liveComb()) drawComb(c, combFor(pts), C.rx * cam.k, CF.a);                     // the circle's and its open: the live outline's
      else if(CF.a > 1e-3 && cur === 2 && !MORPH.active && !GENIE.active && !GROW.active) drawComb(c, panelComb(), C.rx * cam.k, CF.a, ONE_CORNER ? cornerRun(panelComb()) : null);   // the corner's: the panel at rest
    }
    function drawComb(c, K, u, alpha, run){                              // u: canvas px (= device px where it shows) per world px · run: { s, len } — only that run (oneCorner)
      const cssW = u / G.dpr, gap = Math.max(G.W / 320, GAP_MIN), n = K.pts.length;   // GAP_MIN: a phone's floor (PHONE)
      const nh = Math.max(8, Math.round(K.P * cssW / gap)), lw = px => px * G.dpr / u;
      c.globalAlpha = alpha; c.lineCap = 'butt';
      c.beginPath();
      for(let j = 0; j < nh; j++){
        const i = Math.round(j * n / nh) % n;
        if(run && (i - run.s + n) % n >= run.len) continue;
        if(Math.abs(K.k[i]) * COMB.scale * cssW < .5) continue;          // under half a px: not a hair (a butt stroke of ~0 length still dots)
        c.moveTo(K.pts[i][0], K.pts[i][1]); c.lineTo(K.tips[i][0], K.tips[i][1]);
      }
      c.strokeStyle = COMB.hair; c.lineWidth = lw(COMB.wHair); c.stroke();
      c.lineJoin = 'round';
      if(run){ c.beginPath(); for(let q = 0; q < run.len; q++){ const t = K.tips[(run.s + q) % n]; if(q) c.lineTo(t[0], t[1]); else c.moveTo(t[0], t[1]); } }   // its envelope open: edge to edge
      else trace(c, K.tips);
      c.strokeStyle = COMB.env; c.lineWidth = lw(COMB.wEnv); c.stroke();
      c.globalAlpha = 1;
    }
    let dirty = true;
    function draw(){                                                     // the seen canvas + the shadow (the pose / camera of now)
      dirty = false;
      if(!base || !OPENC.box || !HOMEC.box) return;
      const pts = outline(pose()), C = camAt(CAM.u);
      paint(mode === 'open' ? OPENC : HOMEC, pts, C);
      shadow(pts, C);
    }
    function regrow(){                                                   // OPEN's box for the step; its pixels again if it re-allocated
      if(mode !== 'open' || !base) return;
      if(setBox(OPENC, need(), resOpen())) dirty = true;
    }
    function readyBoth(){                                                // HOME: both canvases hold the pill (OPEN's for the next zoom)
      setBox(HOMEC, 'pill', resHome()); setBox(OPENC, 'pill', resOpen());
      const pts = outline(pose()), C = camAt(CAM.u);
      paint(HOMEC, pts, C); paint(OPENC, pts, C); shadow(pts, C); dirty = false;
    }

    /* ---- the sequence ---- */
    let phase = 'pill', queued = false, tOpen = 0;
    function after(){ if(queued){ queued = false; tap(); } }
    function tap(){
      if(phase === 'pill'){ phase = 'expand'; morphTo(PILL, PANEL, EXPAND_S); }
      else if(phase === 'panel'){ phase = 'zoomin'; camTo(1, IN_MS); }
      else if(phase === 'corner'){ phase = 'zoomout'; camTo(0, OUT_MS); combFade(0, COMB_OUT); }
      else if(phase === 'panelout'){ phase = 'closing'; startGenie(); cur = 0; }   // PHONE (stepGenie): the genie, on its own tap
      else if(phase === 'circle'){
        if(FADE_COMB && COMB_NOW){ Object.assign(CF, { a: 1, from: 1, to: 1, t: 0, T: 1 }); startOpen(); }   // PHONE: the comb on at once, the open with it
        else if(FADE_COMB){ phase = 'combing'; combFade(1, COMB_ON); } else startOpen();   // the comb on first, then the open
      }
      else if(phase === 'rest' || (phase === 'opening' && tOpen >= END_MS)) finish();   // the pill under its comb: out
      else if(phase === 'expand' || phase === 'zoomin' || phase === 'zoomout' || phase === 'closing' || phase === 'combing' || phase === 'opening') queued = true;
      regrow();
      dirty = true;
    }
    let acc = 0;
    function startOpen(){ phase = 'opening'; tOpen = 0; armGrow(STATES[1]); cur = 1; dirty = true; }   // grow-on-lift's open: circle → pill
    function finish(){ phase = 'ending'; queued = false; combFade(0, COMB_OUT); if(api.onend) api.onend(); }   // the page's zoom out: the comb leaves with it
    function step(ms){                                                   // the page's frame (site.html's stack step): ms
      ms = Math.max(0, Math.min(64, ms || 0));
      const sms = phase === 'reset' ? ms : ms / TIME;                    // the sequence's clock (a leave: the page's)
      const moving = MORPH.active || GROW.active || CAM.active || GENIE.active;
      if(moving){
        const n = Math.max(1, Math.round(sms / (GROW.h * 1000))), h = sms / 1000 / n;   // the frame's own time in ~1/120 s substeps:
        for(let i = 0; i < n; i++){ growStep(h); morphStep(h); }        // a fixed 1/120 left 1 or 2 steps on alternate frames once the
                                                                         // clock was dilated (12.8 ms a 60 Hz frame) — a 2 : 1 judder
        camStep(sms);
        if(GENIE.active && (GENIE.t += sms) >= GENIE.endMs) GENIE.active = false;   // landed: the circle's rest from here
        dirty = true;
      } else acc = 0;
      if(FADE_COMB && phase === 'zoomin' && CAM.u >= COMB_AT) combFade(1, COMB_IN);   // almost in: the comb starts to show
      if(combStep(sms)) dirty = true;
      if(phase === 'expand' && !MORPH.active){ phase = 'panel'; cur = 2; after(); }
      else if(phase === 'zoomin' && !CAM.active){ phase = 'corner'; after(); }
      else if(phase === 'zoomout' && !CAM.active){ if(STEP_GENIE){ phase = 'panelout'; after(); } else { phase = 'closing'; startGenie(); cur = 0; } dirty = true; }   // PHONE: rests as the panel
      else if(phase === 'closing' && !GENIE.active){ phase = 'circle'; after(); }
      else if(phase === 'combing' && CF.a >= 1) startOpen();             // the comb is on: the open (a click meanwhile stays queued for the out)
      else if(phase === 'opening'){
        tOpen += sms;
        if(queued && tOpen >= END_MS) finish();                          // a click during the open: out once its cue has passed
        else if(!GROW.active){ phase = 'rest'; if(queued) finish(); }   // the pill under its comb, waiting for the click
      } else if(phase === 'reset' && !MORPH.active && !CAM.active) phase = 'held';
      regrow();
      if(dirty) draw();
    }
    function snapHome(){                                                 // the pill, still, at the open framing
      MORPH.active = false; GROW.active = false; CAM.active = false; GENIE.active = false; CAM.u = 0; CF.a = CF.to = 0;
      cur = 1; phase = 'pill'; queued = false; acc = 0; landed = false; dirty = true;
    }
    const api = {
      onend: null,
      endMs: OUT_MS * TIME,                                              // the page's own zoom out (site.html: closeNow's drive), on the sequence's clock
      get busy(){ return dirty || MORPH.active || GROW.active || CAM.active || GENIE.active || CF.a !== CF.to; },
      get out(){ return CAM.u; },                                        // the neighbours' slide out (site.html: filmOut)
      get state(){ return phase; },
      tap,
      step,
      layout(g){                                                         // site.html's layoutMeasure(): { W, H, B, S, dpr, top } (top: a phone's — the card's seat, viewport px)
        Object.assign(G, g);
        if(!(G.W > 0 && G.H > 0 && G.B > 0)) return;
        cams(); placeShadow(); adopt(); OPENC.box = HOMEC.box = null;
        if(mode === 'home') readyBoth(); else { setBox(HOMEC, 'pill', resHome()); setBox(OPENC, need(), resOpen()); draw(); }
        shows();
      },
      mode(m){                                                           // 'open' (the press / the zoom's start) · 'home' (HOME): the shape's backing
        if(m === mode) return;
        mode = m;
        shows();                                                         // OPEN's is drawn already (readyBoth()): only the swap
        if(base && m === 'open'){ regrow(); if(dirty) draw(); }
      },
      landed(){ landed = true; warmGenie(); regrow(); if(dirty) draw(); },   // + the genie's reshape, a step per tick, while the pill rests   // site.html's enterOpen(): the zoom is in — grown for the next step, nothing moving
      leave(own){                                                        // the page closes: its own end (own) or a move / close mid-way
        landed = false;
        if(own || phase === 'ending') return;
        const P = pose(), r0 = Math.min(P.r, P.w/2, P.h/2);
        const from = { w: P.w, h: P.h, r: r0, m: P.m != null ? P.m : P.genie != null ? roomM(P.w, P.h, r0) : geomM(P.w, P.h, r0) };   // its corner as drawn: the morph eases it home
        const ghost = P.genie != null ? outline(P).slice() : null;       // out of the genie: its keystone, which the morph starts on
        GROW.active = false; GENIE.active = false;
        if(Math.abs(from.w - PILL.w) > .01 || Math.abs(from.h - PILL.h) > .01 || Math.abs(from.r - PILL.r) > .01){ morphTo(from, PILL, .45); MORPH.ghost = ghost; }
        else MORPH.active = false;
        if(CAM.u > 0) camTo(0, opt.outMs || 450);
        combFade(0, 200);
        cur = 1; phase = 'reset'; queued = false; dirty = true;
      },
      home(){ snapHome(); mode = 'home'; if(base) readyBoth(); shows(); },   // (HOME's canvas at NEAR's px: a camera move away lands on a neighbour)
      near(v){                                                           // site.html's nearSync(): the page's camera on another stack (NEAR)
        if(v === NEAR) return;
        NEAR = v;
        if(mode === 'open' || !base) return;                             // the pill's own page: its canvases are the sequence's (home() takes NEAR up)
        if(v !== 'zoom' && setBox(HOMEC, 'pill', resHome())) paint(HOMEC, outline(pose()), camAt(CAM.u));   // landed / HOME: re-allocated → its pill again
        shows();
      },
      hit(x, y){                                                         // PHONE: is the viewport point (x, y) on the black as drawn now? (owner 2026-10-28:
        if(!base) return false;                                          // "every progression must be tap on the black area only" — no slack: the comb, the shadow, the white are off it)
        const pts = outline(pose()), C = camAt(CAM.u), wx = (x - C.x) / C.k, wy = (y - C.y) / C.k, n = pts.length;
        let inside = false;
        for(let i = 0, j = n - 1; i < n; j = i++){
          const a = pts[j], b = pts[i];
          if((b[1] > wy) !== (a[1] > wy) && wx < (a[0] - b[0]) * (wy - b[1]) / (a[1] - b[1]) + b[0]) inside = !inside;
        }
        return inside;
      },
      debug(){ const P = pose(); return { phase, cur, cam: +CAM.u.toFixed(4), morph: MORPH.active ? +MORPH.p.toFixed(4) : null, grow: GROW.active,
               genie: GENIE.active ? +(GENIE.t / GENIE.dur).toFixed(4) : null, comb: +CF.a.toFixed(4),
               pose: { w: +P.w.toFixed(3), h: +P.h.toFixed(3), r: +P.r.toFixed(3), m: P.m == null ? null : +P.m.toFixed(5) }, moving: MORPH.active || GROW.active || CAM.active || GENIE.active, mode, near: NEAR, box: OPENC.box && OPENC.box.name, canvas: [cv.width, cv.height], home: [cvH.width, cvH.height], shadow: [sh.width, sh.height] }; },   // window.__pillScene (site.html's BOOT)
    };
    return api;
  }

  window.PillShow = { create, PILL, PANEL, CIRCLE,
                      dy: (PANEL.h - PILL.h) / 2 / PILL.w };             // the open card's centre above the screen's, × B (site.html: openDy)
})();
