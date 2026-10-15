/* SafariGuard: keeps iPhone Safari's own gestures off a JavaScript-owned, full-screen stage.
   (notes/safari-guards.md has the why and the sources for each layer.)

   The layers, cheapest and most reliable first:
   1. CSS (static, never toggled except while zoomed): touch-action on <html> (pan-y: the native vertical swipe stays, for the
      bars-collapse scroll; no native pinch, no content back-swipe) and none on the site's own two-finger targets; overscroll-behavior:
      none (no rubber band, no pull-to-refresh); no callout / selection / drag / tap highlight / text inflation. Resolved in Safari's UI
      process from the layers' event regions, so it never waits for the page's main thread.
   2. WebKit GestureEvents (gesturestart / gesturechange / gestureend): preventDefault, non-passive.
   3. Touch events: a second finger's touchstart and every touchmove with 2+ touches are preventDefault-ed (non-passive), so the
      page never pinches or two-finger-pans, while POINTER events keep flowing to the site's own two-finger handler.
   4. Double-tap: a second touchend within 350 ms / 40 pt is preventDefault-ed, and a dblclick listener exists. At the initial scale
      WebKit swaps its double-tap recognizer for a non-blocking one that still zooms when the second tap hits no click target, and
      touch-action does not cover it (bug 325368, iOS 26.5 / 27.0): a prevented touchend fails it; the dblclick listener takes it.
   5. History: Safari's edge swipe cannot be blocked, so it is given somewhere harmless to land. Each opened view pushes one
      same-document entry inside its tap (viewOpened); back = popstate → onBack(): close the view (instantly when Safari already animated
      it: hasUAVisualTransition). Mode 'both' also pushes one 'home' entry on the first tap, so an edge swipe at home stays on the page;
      it is re-armed only by a later tap, so two deliberate back swipes in a row still leave the site: nobody is trapped.
   6. Zoom watch: visualViewport.scale. If the page ever is zoomed (a restored zoom, a pinch that slipped through, rotation while
      zoomed), every layer above stands down (html.sg-zoomed) so the user's own pinch / double-tap can bring it back to 1; at ×1 the
      layers re-arm. Safari ignores maximum-scale (WKWebViewConfiguration.ignoresViewportScaleLimits), so a script cannot reset it.

   API: SafariGuard.init(opts) → SafariGuard; .viewOpened(id) in the tap that opens a view, .viewClosed() when the page closes it.
   opts: { log(msg), onBack({instant}), onForward(id), onZoom(zoomed, scale), history ('both' | 'view' | false), doubleTap, gestures,
   touches, edgePD (lab only: preventDefault touchstarts in the outer 24 pt: proves it does not stop Safari's back swipe) }.
   State: SafariGuard.zoomed, .scale, .armed, .stats {kind: count}, .last. No dependencies, no UI. */
(function () {
  'use strict';
  const html = document.documentElement;
  const G = window.SafariGuard = { zoomed: false, scale: 1, armed: false, stats: {}, last: '', opts: {} };
  const note = (kind, detail) => {
    G.stats[kind] = (G.stats[kind] || 0) + 1;
    G.last = kind + (detail ? ' · ' + detail : '');
    if (G.opts.log) G.opts.log(G.last);
  };
  G.note = note;

  G.init = function (o = {}) {
    const opts = G.opts = Object.assign({ history: 'both', doubleTap: true, gestures: true, touches: true, edgePD: false }, o);
    const NP = { passive: false, capture: true };                         // non-passive: these listeners may cancel

    /* 2. WebKit's own GestureEvents (iOS only; macOS Safari fires them for trackpad pinches too) */
    if (opts.gestures) for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => {
      if (G.zoomed) return;
      if (e.cancelable) e.preventDefault();
      if (t !== 'gesturechange') note(t + ' blocked', 'scale ' + (+e.scale || 1).toFixed(2));
    }, NP);

    /* 3. two fingers: never the page's pinch or two-finger pan (pointer events still reach the site) */
    if (opts.touches) {
      document.addEventListener('touchstart', e => {
        if (G.zoomed) return;
        if (e.touches.length > 1) { if (e.cancelable) e.preventDefault(); note('2-finger touchstart blocked'); return; }
        if (opts.edgePD) {
          const x = e.touches[0].clientX;
          if (x < 24 || x > innerWidth - 24) { if (e.cancelable) e.preventDefault(); note('edge touchstart prevented', 'x ' + Math.round(x)); }
        }
      }, NP);
      let tm = 0;
      document.addEventListener('touchmove', e => {
        if (G.zoomed || e.touches.length < 2) return;
        if (e.cancelable) e.preventDefault();
        if (++tm % 20 === 1) note('2-finger touchmove blocked');
      }, NP);
    }

    /* 4. double-tap */
    if (opts.doubleTap) {
      let lt = -1e9, lx = 0, ly = 0;
      document.addEventListener('touchend', e => {
        if (G.zoomed || e.touches.length || e.changedTouches.length !== 1) return;
        const t = e.changedTouches[0], now = e.timeStamp;
        if (now - lt < 350 && Math.hypot(t.clientX - lx, t.clientY - ly) < 40) {
          if (e.cancelable) e.preventDefault();
          note('double-tap blocked'); lt = -1e9; return;
        }
        lt = now; lx = t.clientX; ly = t.clientY;
      }, NP);
      /* WebKit's second double-tap path: at the initial scale its main double-tap recognizer is off (fast taps) and a NON-BLOCKING one
         runs instead; when the second tap finds no click target it zooms (_didNotHandleTapAsClick), and touch-action never sees it
         (bug 325368). A prevented touchend fails it (above); a dblclick listener makes WebKit hand the double tap to the page instead. */
      document.addEventListener('dblclick', e => { if (!G.zoomed) { e.preventDefault(); note('dblclick blocked'); } }, NP);
    }

    /* 1b. the long press, belt and braces (the CSS does the work: -webkit-touch-callout, user-select, -webkit-user-drag) */
    document.addEventListener('contextmenu', e => { e.preventDefault(); note('contextmenu blocked'); }, NP);
    document.addEventListener('selectstart', e => { e.preventDefault(); }, NP);
    document.addEventListener('dragstart', e => { e.preventDefault(); note('drag blocked'); }, NP);

    /* a touch Safari took (edge back-swipe, Control Center, the home indicator, a native pan / zoom) */
    addEventListener('pointercancel', e => {
      if (e.pointerType !== 'touch') return;
      const x = Math.round(e.clientX), y = Math.round(e.clientY);
      const where = x < 30 ? 'left edge' : x > innerWidth - 30 ? 'right edge' : y > innerHeight - 30 ? 'bottom edge' : y < 30 ? 'top edge' : 'middle';
      note('pointercancel', 'Safari took a touch @' + where + ' ' + x + ',' + y);
    }, { passive: true, capture: true });

    /* 5. history: the back swipe lands on our own page. WebKit (iOS 16+) makes the swipe SKIP entries pushed without a recent user
       activation (≤ 10 s), so every push happens inside a tap. Modes: 'view' = one entry per opened view (back = close, like a modal);
       'both' = also one 'home' entry on the first tap, so a back swipe at home stays too (re-armed only by a later tap: never a trap) */
    let cur = history.state && history.state.sg || null, expect = 0;
    if (cur === 'view' && opts.history) {                                    // reloaded / restored on a view's entry: the page starts at home
      cur = opts.history === 'both' ? 'home' : null;
      try { history.replaceState(cur ? { sg: 'home' } : null, ''); } catch (er) { }
    }
    G.armed = cur === 'home';
    G.viewOpened = id => {                                                   // call synchronously in the tap that opens a view
      if (!opts.history) return;
      try { if (cur === 'view') history.replaceState({ sg: 'view', id }, ''); else history.pushState({ sg: 'view', id }, ''); cur = 'view'; note('history: view entry', 'length ' + history.length); }
      catch (er) { note('pushState failed', String(er)); }
    };
    G.viewClosed = () => {                                                   // the page closed a view itself (a tap): drop its entry
      if (!opts.history || cur !== 'view') return;
      expect++; history.back();
    };
    if (opts.history === 'both') addEventListener('pointerup', () => {       // capture: before the page's own tap handler pushes a view
      if (cur || G.armed) return;
      try { history.pushState({ sg: 'home' }, ''); cur = 'home'; G.armed = true; note('history armed', 'length ' + history.length); } catch (er) { note('pushState failed', String(er)); }
    }, { passive: true, capture: true });
    if (opts.history) addEventListener('popstate', e => {
      const prev = cur, next = e.state && e.state.sg || null, instant = !!e.hasUAVisualTransition;   // hasUAVisualTransition: iOS 18+, true after Safari's swipe animation
      cur = next; G.armed = next === 'home' || next === 'view';
      if (expect) { expect--; return; }                                      // our own history.back() after a tap-close
      if (next === 'view') { note('forward: view re-opened'); if (opts.onForward) opts.onForward(e.state.id); return; }
      if (prev === 'view') { note('back caught', 'closed the view' + (instant ? ' (Safari animated it)' : '')); if (opts.onBack) opts.onBack({ instant, home: next === 'home' }); return; }
      note('back caught', next === 'home' ? 'forward onto home' : 'stayed on the page (re-arms on the next tap)');
    });

    /* 6. zoom watch */
    const vv = window.visualViewport;
    const zoomCheck = why => {
      const E = window.__sgEmu;                                            // test hook (Playwright cannot pinch-zoom)
      const s = E && E.scale ? E.scale : vv ? vv.scale : 1;
      G.scale = s;
      const z = Math.abs(s - 1) > .01;
      if (z === G.zoomed) return;
      G.zoomed = z; html.classList.toggle('sg-zoomed', z);
      note(z ? 'page zoomed ×' + s.toFixed(2) : 'zoom back to ×1', z ? 'guards stand down so a pinch can undo it (' + why + ')' : 'guards re-armed');
      if (opts.onZoom) opts.onZoom(z, s);
    };
    G.zoomCheck = zoomCheck;
    if (vv) { vv.addEventListener('resize', () => zoomCheck('vv resize')); vv.addEventListener('scroll', () => zoomCheck('vv scroll')); }
    addEventListener('pageshow', e => zoomCheck(e.persisted ? 'pageshow from bfcache' : 'pageshow'));
    addEventListener('orientationchange', () => setTimeout(() => zoomCheck('rotation'), 400));
    zoomCheck('load');
    return G;
  };
})();
