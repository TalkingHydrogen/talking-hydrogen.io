/* dbg.js — ?dbg=1 only (loaded by site.html's head, before mobile.js): an on-screen readout of what a real iPhone does with the touch model —
   the build, the stage / guard state, every pointer / touch / gesture event (where it landed, its touch-action, who prevented it), what the
   TOUCH block decided (ctx, onPic, lock, kind), the open stack, and every script error. pointer-events none: it never takes a finger. */
(function () {
  'use strict';
  const L = [], MAX = 16, t0 = performance.now();
  const ms = () => ((performance.now() - t0) / 1000).toFixed(2);
  const log = s => { L.push(ms() + ' ' + s); if (L.length > MAX) L.shift(); dirty = true; };
  let dirty = true, box = null, last = null, prevOpen = '';
  addEventListener('error', e => log('ERR ' + (e.message || e.type) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno), true);
  addEventListener('unhandledrejection', e => log('REJ ' + (e.reason && (e.reason.message || e.reason))));
  const short = el => !el || !el.tagName ? '-' : (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''));
  const ta = el => { try { return getComputedStyle(el).touchAction; } catch (e) { return '?'; } };
  const open = () => (window.__stacks || []).find(k => k.state !== 'home');
  const gsnap = () => { const g = window.__touch && window.__touch.gesture; return g ? `ctx=${g.ctx} pic=${g.onPic} lock=${g.lock || '-'} kind=${g.kind || '-'} dir=${g.dir}` : 'g=null'; };
  for (const t of ['pointerdown', 'pointerup', 'pointercancel']) addEventListener(t, e => {
    if (e.pointerType === 'mouse') return;
    let s = `${t.slice(7)} #${e.pointerId} ${e.pointerType} ${e.clientX | 0},${e.clientY | 0} ${short(e.target)} ta=${ta(e.target)}`;
    if (t === 'pointerdown') { const a = open(); if (a && a.zoneAt) { let z; try { z = a.zoneAt(e.clientX, e.clientY); } catch (er) { z = 'x'; } s += ' zone=' + z; } }
    else s += ' | ' + (last || gsnap());
    log(s);
    if (t !== 'pointerdown') last = null;
  }, { capture: true, passive: true });
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') last = gsnap(); }, { capture: true, passive: true });
  for (const t of ['touchstart', 'touchend', 'touchcancel']) addEventListener(t, e => {   // bubble phase: after every capture handler (prevented?)
    setTimeout(() => log(`${t} n=${e.touches.length} prev=${e.defaultPrevented} canc=${e.cancelable}`), 0);
  }, { passive: true });
  let tmN = 0, tmP = 0;
  addEventListener('touchmove', e => { tmN++; if (e.defaultPrevented) tmP++; }, { passive: true });
  for (const t of ['gesturestart', 'gestureend']) document.addEventListener(t, e => setTimeout(() => log(`${t} scale=${(+e.scale || 0).toFixed(2)} prev=${e.defaultPrevented}`), 0));
  addEventListener('popstate', e => log('popstate ' + JSON.stringify(e.state) + ' ua=' + !!e.hasUAVisualTransition));
  addEventListener('pageshow', e => log('pageshow persisted=' + e.persisted));
  function paint() {
    requestAnimationFrame(paint);
    const a = open(), on = a ? a.name + ':' + a.state : 'home';
    if (on !== prevOpen) { log('stack ' + on); prevOpen = on; }
    if (!dirty && performance.now() % 500 > 20) { /* the header refreshes below anyway */ }
    if (!document.body) return;
    if (!box) {
      box = document.createElement('pre');
      box.style.cssText = 'position:fixed;right:max(4px,env(safe-area-inset-right));top:4px;z-index:2147483647;margin:0;padding:4px 6px;max-width:58vw;' +
        'font:9px/1.25 ui-monospace,Menlo,monospace;color:#000;background:rgba(255,255,160,.88);pointer-events:none;white-space:pre-wrap;word-break:break-all';
      document.body.appendChild(box);
    }
    const M = window.__mobile || {}, S = M.stage, G = M.guard, vv = window.visualViewport, sc = document.querySelector('script[src^="mobile.js"]');
    const head = [
      'build ' + (sc ? (sc.getAttribute('src').split('v=')[1] || 'nov') : 'none') + ' | ' + (navigator.userAgent.match(/OS [\d_]+/) || ['?'])[0] + ' ' + innerWidth + 'x' + innerHeight + ' vv' + (vv ? vv.scale.toFixed(3) : '-'),
      'mobile=' + !!M.on + ' feed=' + !!M.feed + ' stage=' + !!S + (S ? ' lock=' + S.locked + ' bars=' + S.bars + ' entry=' + (S.entry.done ? 'done' : 'wait') : '') + ' cls=' + document.documentElement.className,
      G ? 'guard zoomed=' + G.zoomed + ' hist=' + G.entry + '/' + history.length + ' ' + JSON.stringify(G.stats) : 'guard -',
      'open ' + on + ' lift=' + (window.__touch && window.__touch.lift ? window.__touch.lift.state : '-') + ' tm=' + tmN + '/' + tmP + 'p ' + gsnap(),
      '—',
    ];
    box.textContent = head.concat(L).join('\n');
    dirty = false;
  }
  requestAnimationFrame(paint);
  log('dbg on ' + location.search);
})();
