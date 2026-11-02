/* combcard.js — the CURVATURE COMB, rendered live on the site (owner 2026-10-17: "can we better bake it into the html? If the code
   tool is anyway natively displaying on the website, why not just render it there right away, with click to play and go to the next
   state"). The two comb cards right of the MacBook draw themselves on a <canvas> over their blank card instead of showing baked
   pixels: crisp at every zoom, no video.

     CombCard.grow(canvas)   brew/squircle-fit/grow-on-lift.html's engine, ported 1 : 1 (its &comb look, its 720 × 405 stage, the
                             shape at x .47, its top line at y .33): the squircle generator (unifiedOutline2 with the weld and in-ramp
                             fixes), the OPEN (anticipation, body springs, the lift, the balloon), the RETEXT (the frame + the
                             bouncier bottom's bow, its lift) and the CLOSE (the collapse's scale ring + egg). Three rests — the
                             circle (64), the pill (256 × 80, "Operating Your Computer"), the two-row panel (266 × 102) — and next()
                             plays to the following one: circle → pill (the open) → panel (the retext) → circle (the close).
                             hint() is the scroll-in: the open from the circle. { next, hint, playing, state, onchange }
     CombCard.still(canvas)  brew/squircle-fit/comb-shots.html ?shot=squircle: the Apple 1:1 square (r = .26 side) under the comb,
                             drawn once per size.

   Both draw TRANSPARENT on the page itself (owner, the same day: "not even a card itself, make it as just a ui piece floating in that
   white space"): the card is an invisible frame (a transparent poster, no paper, no edge, no table shadow) and the canvas OVERSCANS it
   (pad: right and below, where the float shadow's tail runs past the card's box — clipped there it would draw a line on the white).
   The 07-26 float shadow goes on as black alpha, which over the page is the lab's multiply exactly. Sizes are the stage's (design px), so
   the comb reads as it does in the videos at any box; the canvas's backing follows its layout box × devicePixelRatio (a card is
   laid out at its OPEN size and scaled down at HOME, so OPEN is 1 : 1). Line widths are the videos' (0.7 / 0.85 / 0.95 px of a
   1920 px frame) floored at .75 device px. */
(function(){
  'use strict';
  /* ============================================================
     The generator — grow-on-lift.html's, verbatim (weld fix, in-ramp floor)
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
  function growIdentity(W, H, r, bH, bV){
    const key = W.toFixed(2)+'_'+H.toFixed(2)+'_'+r.toFixed(2)+'_'+bH.toFixed(4)+'_'+bV.toFixed(4);
    if(key === _gidKey) return _gid;
    const o = unifiedOutline2(0, 0, W, H, Math.min(r, W/2, H/2), null, 'G4');
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
     The comb — grow-on-lift's combPass / drawComb (κ over a fixed physical span; hairs anchored to arc
     fraction; the odd half fading out on the small circle)
     ============================================================ */
  const LOOK = { hair: 'rgba(52,132,172,0.78)', env: '#d9484a', edge: '#4a4646', fill: '#efeee6' };
  function combTips(pts, span, scale){
    const n = pts.length;
    let P = 0, A2 = 0;
    for(let i = 0; i < n; i++){
      const a = pts[i], b = pts[(i + 1) % n];
      P += Math.hypot(b[0] - a[0], b[1] - a[1]);
      A2 += a[0]*b[1] - b[0]*a[1];
    }
    const o = A2 >= 0 ? 1 : -1;
    const s = Math.max(1, Math.round(span / (P / n)));
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
      const len = k[i] * scale;
      tips[i] = [ pts[i][0] + o*ty*len, pts[i][1] - o*tx*len ];
    }
    return { P, tips, k };
  }
  function trace(ctx, pts){
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  // hairs: [{ i, a }] sample indices with their alpha; w: { hair, edge, env } line widths (stage units); min: the length below which
  // a hair is not drawn (a butt-capped stroke of ~0 length still leaves a dot)
  function drawComb(ctx, pts, tips, hairs, w, min){
    ctx.save();
    ctx.lineCap = 'butt';
    const groups = new Map();
    for(const hr of hairs) if(hr.a > .003){ if(!groups.has(hr.a)) groups.set(hr.a, []); groups.get(hr.a).push(hr.i); }
    for(const [a, idx] of groups){
      ctx.beginPath();
      for(const i of idx){
        if(Math.hypot(tips[i][0] - pts[i][0], tips[i][1] - pts[i][1]) < min) continue;
        ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(tips[i][0], tips[i][1]);
      }
      ctx.globalAlpha = a; ctx.strokeStyle = LOOK.hair; ctx.lineWidth = w.hair; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineJoin = 'round';
    if(w.edge){ trace(ctx, pts); ctx.strokeStyle = LOOK.edge; ctx.lineWidth = w.edge; ctx.stroke(); }
    trace(ctx, tips); ctx.strokeStyle = LOOK.env; ctx.lineWidth = w.env; ctx.stroke();
    ctx.restore();
  }

  /* ============================================================
     The 07-26 float shadow (grow-on-lift / genie, constants) — on its own canvas at HALF the backing resolution (a gaussian
     loses nothing upscaled; the blur passes cost a quarter), drawn back under the shape as black alpha
     ============================================================ */
  const SH = { ox: 93, oy: 109, blur: 80, spread: 7, alpha: 0.18, fall: 0.89, layers: 3 };
  function shadow(ctx, shCv, pts, box){                                // box: the canvas's extent in stage px { x, y, w, h }
    const shx = shCv.getContext('2d'), ks = shCv.width / box.w;        // shadow-canvas px per stage px
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
    const OFF = box.w + 4 * SH.blur + 400;                              // stage px: drawn off-canvas, only the shadow lands
    shx.setTransform(1, 0, 0, 1, 0, 0); shx.clearRect(0, 0, shCv.width, shCv.height);
    shx.setTransform(ks, 0, 0, ks, -(OFF + box.x) * ks, -box.y * ks);
    shx.fillStyle = '#000';
    let wsum = 0;
    for(let i = 1; i <= SH.layers; i++) wsum += 1 - 0.65 * (i / SH.layers);
    for(let i = 1; i <= SH.layers; i++){
      const f = i / SH.layers, m = Math.pow(f, SH.fall);
      shx.shadowColor = `rgba(0,0,0,${SH.alpha * (1 - 0.65*f) / wsum})`;
      shx.shadowBlur    = SH.blur * m * ks;
      shx.shadowOffsetX = (OFF + SH.ox * m) * ks;
      shx.shadowOffsetY = SH.oy * m * ks;
      shx.fill(path);
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(shCv, box.x, box.y, box.w, box.h); ctx.restore();
  }

  // the canvas OVERSCANS its card by pad (fractions of the card: l, t, r, b) — its CSS box set here; its backing = that layout box
  // × devicePixelRatio. Returns { k: device px per stage px, box: the canvas's extent in stage px }, the context set to stage px.
  function place(cv, pad){
    const P = { l: 0, t: 0, r: 0, b: 0, ...pad };
    Object.assign(cv.style, { left: -P.l * 100 + '%', top: -P.t * 100 + '%', width: (1 + P.l + P.r) * 100 + '%', height: (1 + P.t + P.b) * 100 + '%' });
    return P;
  }
  function fit(cv, shCv, DW, DH, P){
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
    if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
    const sw = Math.max(2, w >> 1), sh = Math.max(2, h >> 1);
    if(shCv.width !== sw || shCv.height !== sh){ shCv.width = sw; shCv.height = sh; }
    const box = { x: -P.l * DW, y: -P.t * DH, w: (1 + P.l + P.r) * DW, h: (1 + P.t + P.b) * DH };
    return { k: w / box.w, box };
  }
  function begin(ctx, cv, k, box){
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
  }
  const W1920 = DW => DW / 1920;                                         // one px of the videos' 1920 frame, in stage px

  /* ============================================================
     CombCard.grow — the engine (grow-on-lift's GROW / RE / growStep / growPose / heroOutline / armGrow, minus the text, the
     swap, the scrub and the scope)
     ============================================================ */
  function grow(cv, opt){
    opt = opt || {};
    const ctx = cv.getContext('2d'), shCv = document.createElement('canvas');
    const DW = 720, DH = 405, CX = DW * (opt.x0 != null ? opt.x0 : .47), Y0 = DH * (opt.y0 != null ? opt.y0 : .33);
    const STATES = [ { w: 64, h: 64, r: 32 }, { w: 256, h: 80, r: 40 }, { w: 266, h: 102, r: 40 } ];   // circle · pill · panel
    const NEXT = [1, 2, 0];
    let cur = opt.start != null ? opt.start : 0;
    const PAD = place(cv, opt.pad || { r: .12, b: .24 });              // the panel's shadow tail runs to ≈ 1.1 × the stage's height
    const GROW = {
      active: false, tMs: 0, h: 1/120,
      dur: 0.55, bounce: 0.15, lagW: 300, lagV: 0, hold: 270, liftDur: 1.13, liftBounce: 0.64,
      pop: 0.075, popBias: 0, peakBH: 0.04, peakBV: 0.04, antic: 0.12, anticMs: 130, anticOff: 0,
      retext: false, squashK: 0.11,
      pH: 0, pV: 0, vH: 0, vV: 0, pB: 0, vB: 0, qH: 0, qV: 0, wH: 0, wV: 0,
      W1: 0, H1: 0, r1: 40, W2: 0, H2: 0, r2: 40, ampW: 0, ampH: 0, ampR: 0, govIsH: true, dir: 1,
    };
    const RE = { dur: 0.93, bounce: 0.00, botBounce: 0.55, botDur: 0.76, botAmt: 1.0, lagW: 0,
                 pop: 0.073, popBias: 0, hold: 150, liftDur: 0.72, liftBounce: 0.60, peakB: 0.03 };
    function peaks(){ return GROW.retext ? [RE.peakB, RE.peakB] : [GROW.peakBH, GROW.peakBV]; }
    function growStep(h){
      if(!GROW.active) return;
      GROW.tMs += h * 1000;
      const re = GROW.retext, P = re ? RE : GROW;
      const [k, c]   = springKC(P.dur, P.bounce);
      const [kl, cl] = springKC(P.liftDur, P.liftBounce);
      const gT = GROW.tMs - GROW.anticOff;
      const lagWeff = re ? RE.lagW : (GROW.dir < 0 ? GROW.lagV : GROW.lagW);
      const tX = lagRamp(gT, lagWeff), tY = lagRamp(gT, GROW.lagV);
      const aH = -k*(GROW.pH - tX) - c*GROW.vH;
      GROW.pH += (GROW.vH + aH*h)*h;  GROW.vH += aH*h;
      const aV = -k*(GROW.pV - tY) - c*GROW.vV;
      GROW.pV += (GROW.vV + aV*h)*h;  GROW.vV += aV*h;
      if(re){
        const [kb, cb] = springKC(RE.botDur, RE.botBounce);
        const aB = -kb*(GROW.pB - tY) - cb*GROW.vB;
        GROW.pB += (GROW.vB + aB*h)*h;  GROW.vB += aB*h;
      } else { GROW.pB = GROW.pV; GROW.vB = GROW.vV; }
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
      if(!GROW.active){ const R = STATES[cur]; return { w: R.w, h: R.h, r: R.r, bH: 0, bV: 0, e: 0, bb: 0 }; }
      const R = growRest(), A = anticScale();
      let lW = GROW.qH * GROW.ampW, lH = GROW.qV * GROW.ampH;
      let lR = (GROW.govIsH ? GROW.qV : GROW.qH) * GROW.ampR;
      const [pBH, pBV] = peaks();
      let bH = clamp(GROW.qH * pBH, 0, 1), bV = clamp(GROW.qV * pBV, 0, 1);
      let scale = 1;
      const collapse = GROW.dir < 0 && !GROW.retext;
      if(collapse){ lW = lH = lR = 0; bH = bV = 0; scale = 1 + GROW.qV * GROW.pop * GROW.dir; }
      const w = (R.w + lW) * A * scale, h = (R.h + lH) * A * scale;
      const bb = GROW.retext ? (GROW.pB - GROW.pV) * (GROW.H2 - GROW.H1) * RE.botAmt : 0;
      return { w, h, r: (R.r + lR) * A * scale, bH, bV, bb,
               e: collapse ? -GROW.qV * GROW.squashK * Math.log(Math.max(1, GROW.W1/Math.max(1, GROW.H1))) : 0 };
    }
    function heroOutline(){
      const p = growPose();
      const id = growIdentity(p.w, p.h, Math.min(p.r, p.w/2, p.h/2), p.bH, p.bV);
      const s = 1 + (p.e || 0), cx = CX, cy = Y0 + p.h/2;               // top-pinned (anchor 0): the island law
      const pts = id.map(q => [ cx + (q.u - 0.5)*p.w*s, cy + (q.v - 0.5)*p.h/s ]);
      const bb = p.bb || 0;
      if(Math.abs(bb) > 0.01){                                        // the retext's bottom bow (smoothstep-weighted: no nose crease)
        const hw = p.w*s/2, ab = Math.abs(bb), rr = (hw*hw + ab*ab)/(2*ab), sg = Math.sign(bb), hh = p.h/s/2;
        for(const q of pts){
          if(q[1] <= cy) continue;
          const dx = clamp(q[0] - cx, -hw, hw);
          q[1] += smoothstep((q[1] - cy) / hh) * sg * (Math.sqrt(Math.max(0, rr*rr - dx*dx)) - (rr - ab));
        }
      }
      return pts;
    }
    function armGrow(to, retext){
      const live = GROW.active;
      GROW.retext = !!retext;
      const from = live ? growRest() : STATES[cur];
      const pxW = live ? (GROW.W2 - GROW.W1) * GROW.vH : 0;
      const pxH = live ? (GROW.H2 - GROW.H1) * GROW.vV : 0;
      const ampW0 = GROW.ampW, ampH0 = GROW.ampH;
      GROW.W1 = from.w; GROW.H1 = from.h; GROW.r1 = from.r;
      GROW.W2 = to.w;   GROW.H2 = to.h;   GROW.r2 = to.r;
      GROW.dir = Math.sign(GROW.H2 - GROW.H1) || Math.sign(GROW.W2 - GROW.W1) || 1;
      GROW.anticOff = (!GROW.retext && GROW.dir > 0 && GROW.antic > 1e-4 && GROW.anticMs > 0) ? GROW.anticMs : 0;
      const midW = (GROW.W1 + GROW.W2)/2, midH = (GROW.H1 + GROW.H2)/2, midR = (GROW.r1 + GROW.r2)/2;
      const P = GROW.retext ? RE : GROW;
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

    let k = 1, raf = 0, last = 0, acc = 0;
    const api = { onchange: null, get playing(){ return GROW.active; }, get state(){ return cur; }, next, hint, render, step, outline: heroOutline };
    function render(){
      const F = fit(cv, shCv, DW, DH, PAD); k = F.k;
      begin(ctx, cv, k, F.box);
      const pts = heroOutline();
      shadow(ctx, shCv, pts, F.box);
      trace(ctx, pts); ctx.fillStyle = LOOK.fill; ctx.fill();
      const { P, tips } = combTips(pts, 1.2, 20 * 40), NH = 256, n = pts.length, step = n / NH;
      const odd = smoothstep((P / NH - 1.0) / 0.8), hairs = [];
      for(let j = 0; j < NH; j++) hairs.push({ i: Math.round(j * step) % n, a: j % 2 ? odd : 1 });
      const u = W1920(DW), floor = .75 / k;
      drawComb(ctx, pts, tips, hairs, { hair: Math.max(.7*u, floor), edge: Math.max(.85*u, floor), env: Math.max(.95*u, floor) }, .5*u);
    }
    function step(dt){                                                // the engine by dt seconds, fixed 120 Hz steps (headless / tests)
      acc += dt;
      while(acc >= GROW.h - 1e-9){ growStep(GROW.h); acc -= GROW.h; }
    }
    function tick(now){
      raf = 0;
      step(Math.min(0.05, (now - last) / 1000)); last = now;
      render();
      if(GROW.active) raf = requestAnimationFrame(tick);
      else if(api.onchange) api.onchange();
    }
    function go(to, retext){
      armGrow(STATES[to], retext); cur = to; acc = 0;
      if(!raf){ last = performance.now(); raf = requestAnimationFrame(tick); }
      if(api.onchange) api.onchange();
    }
    // the next rest: circle → pill is the OPEN, pill → panel the RETEXT (a panel standing reshapes), panel → circle the CLOSE
    function next(){ const to = NEXT[cur]; go(to, cur !== 0 && to !== 0); }
    // the scroll-in: from the circle, the open (a no-op unless parked as the circle)
    function hint(){ if(!GROW.active && cur === 0) next(); }
    new ResizeObserver(() => { if(!GROW.active) render(); }).observe(cv);
    render();
    return api;
  }

  /* ============================================================
     CombCard.still — comb-shots.html ?shot=squircle (960 × 540 stage, the square at (.47, .445), side 270, r = .26 side; the comb at
     κ = 1/r = r/2; hairs 3 stage px apart; the shadow kernel in world px)
     ============================================================ */
  function still(cv){
    const ctx = cv.getContext('2d'), shCv = document.createElement('canvas');
    const DW = 960, DH = 540, SIDE = 270, R = 0.26 * SIDE, X = .47 * DW, Y = .445 * DH;
    const PAD = place(cv, { r: .1, b: .2 });
    const shape = unifiedOutline2(X, Y, SIDE, SIDE, R, null, 'G4');
    let P0 = 0; for(let i = 0; i < shape.length; i++){ const a = shape[i], b = shape[(i + 1) % shape.length]; P0 += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    const pts = resampleByArc(shape, Math.ceil(P0 / 0.08));
    const C = combTips(pts, 1.2, 0.5 * R * R), n = pts.length, nh = Math.round(C.P / 3.0), hairs = [];
    for(let j = 0; j < nh; j++){ const i = Math.round(j * n / nh) % n; if(Math.abs(C.k[i]) * 0.5 * R * R >= .25) hairs.push({ i, a: 1 }); }
    function render(){
      const { k, box } = fit(cv, shCv, DW, DH, PAD);
      begin(ctx, cv, k, box);
      shadow(ctx, shCv, shape, box);
      trace(ctx, pts); ctx.fillStyle = LOOK.fill; ctx.fill();
      const u = W1920(DW), floor = .75 / k;
      drawComb(ctx, pts, C.tips, hairs, { hair: Math.max(.7*u, floor), edge: Math.max(.85*u, floor), env: Math.max(.95*u, floor) }, .5*u);
    }
    new ResizeObserver(render).observe(cv);
    render();
    return { render };
  }

  window.CombCard = { grow, still };
})();
