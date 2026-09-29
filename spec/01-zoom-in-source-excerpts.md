# 01 zoom-in - source excerpts (mikematas.com bundle)

Raw excerpts from `index-43dcbcd528862093.js` (page bundle) and `335-e2a1792788fc4ff6.js` (react-spring), lightly re-indented (strings preserved, otherwise verbatim). Identifier legend: `E` = constants, `i` = geometry module, `r` = point/vector helpers, `u.V` = project data, `Be.q_` = useSpring, `Be.Qr` = spring Controller, `Be.q.div` = animated.div, `Ie` = useSelector, `Re` = useDispatch, `ce` = shallow merge, `h` = lodash, `Z` = range-interpolation helper, `Q`/`K` = easings.

## 1. Initial state shape (`Ee`) and store wiring

Redux Toolkit store; reducer = lookup table keyed by `action.type`. `r.zero()` = {x:0,y:0}; `i.zero()` = {width:0,height:0}; `G()` = empty rect pair {container,image}.

```js
var Ee={
  gallery:{
    index:0,isOpen:!1,offset:r.zero(),scale:1,size:i.zero()
  },
  timeline:{
    scale:1,offset:r.zero(),rememberedX:0,_maxScrollX:0,locked:!1,size:i.zero(),date:(new Date).getFullYear(),shine:{
      from:{
        m:1,b:0
      },
      to:{
        m:1,b:0
      }
    },
    animation:{
      delta:r.zero(),offset:r.zero(),_interruptOffset:r.zero(),drag:{
        distYDown:0,distYUp:0,offsetXDown:0,offsetXUp:0,mx:0
      },
      onRails:!1
    }
  },
  about:{
    scale:1,isOpen:!1,size:i.zero()
  },
  carousel:{
    isOpen:!1,index:0,size:i.zero()
  },
  transforms:u.V.projects().map((function(){return{image:r.zero(),text:r.zero(),scale:1}})),scroll:r.zero(),cursor:{
    scale:1,hidden:!0
  },
  window:{
    size:i.zero()
  },
  geometry:{
    rects:{
      gallery:u.V.projects().map((function(){return G()})),timeline:u.V.projects().map((function(){return G()}))
    }
  },
  drag:{
    isDragging:!1,origin:r.zero(),delta:r.zero(),prevDelta:r.zero(),velocity:r.zero(),_startPos:r.zero(),_slip:r.zero()
  }
},
ze=function(e){
  for(var t=1;t<arguments.length;t++){
    var n=null!=arguments[t]?arguments[t]:{
    },
    r=Object.keys(n);
    "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){Pe(e,t,n[t])}))
  }
  return e
}
({"Geometry.Update":function(e,t){return fe(ce(e,{geometry:ce(e.geometry,{rects:t})}))}},me,be,xe,_e,we,ke,Me),Ae=function(e,t){
  return function(){
    var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:e(),r=arguments.length>1?arguments[1]:void 0;
    return c(t,n,r)
  }
}
((function(){return Ee}),ze),Fe=(0,l.xC)({reducer:Ae,middleware:function(e){return e({serializableCheck:{ignoredActions:["Timeline.OnDragStart","Timeline.OnDragEnd","Gallery.OnDragStart","Gallery.OnDragEnd"]}})}}),
```

## 2. Reducer helpers: `ce` (merge), `ue` (rect + offset), `fe` (transforms), `de` (drag end), `he` (EXPAND), `ge`, `pe`

`he(e,index)` is `Gallery.Expand`. `fe` recomputes per-project `transforms[i] = {image:{x,y}, scale}` from `geometry.rects` (timeline container vs gallery image). `ge(e, clampToScroll)` = timeline x that centers the current item.

```js
function ce(e,t){
  return function(e){
    for(var t=1;t<arguments.length;t++){
      var n=null!=arguments[t]?arguments[t]:{
      },
      r=Object.keys(n);
      "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){se(e,t,n[t])}))
    }
    return e
  }
  ({},e,t)
}
function ue(e,t,n,r){
  var i=e.geometry.rects[n][t];
  return{
    container:ee(i.container,r),image:ee(i.image,r)
  }
}
function fe(e){
  return ce(e,{transforms:u.V.projects().map((function(t,n){return function(e,t){var n=ue(e,t,"timeline",{x:e.gallery.isOpen?e.timeline.offset.x:-document.body.scrollLeft,y:0}),r=ue(e,t,"gallery",{x:e.gallery.offset.x,y:0}),o=n.container,a=r.image,l=a.height/o.height;return{image:{x:i.center(a).x-i.center(o).x,y:a.bottom-o.bottom},scale:l}}(e,n)}))})
}
function de(e){
  var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:r.zero();
  return ce(e,{drag:ce(e.drag,{isDragging:!1,delta:r.zero(),prevDelta:e.drag.delta,velocity:t})})
}
function he(e,t){
  oe.track("Project View",{title:u.V.project(t).title});
  var n=e.timeline.locked?e.timeline.offset.x:-document.body.scrollLeft;
  return fe(ce(e,{timeline:ce(e.timeline,{locked:!0,rememberedX:-n,offset:{x:n,y:0},_maxScrollX:e.timeline.locked?e.timeline._maxScrollX:document.body.scrollWidth-document.body.clientWidth,animation:ce(e.timeline.animation,{delta:r.zero(),offset:r.zero()})}),gallery:ce(e.gallery,{index:t,isOpen:!0,offset:{x:i.Gallery.offset(t),y:0}}),drag:ce(e.drag,{delta:r.zero()}),carousel:ce(e.carousel,{index:t!==e.gallery.index?0:e.carousel.index})}))
}
function ge(e,t){
  var n=ue(e,e.gallery.index,"timeline").container,r=i.center(n).x-i.screen().width/2,o=t?(0,h.clamp)(r,0,e.timeline._maxScrollX):r;
  return{
    offsetX:o,deltaX:o+e.timeline.offset.x
  }
}
function pe(e,t,n,r){
  var o=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{
    x:0,y:0
  },
  a=ue(e,t,"timeline",{x:-e.scroll.x,y:0}).container,l=ue(e,t,"gallery",{x:i.Gallery.offset(t),y:0}).image,s=n(t,"timeline").image,c=s.height/l.height,u=i.screen().width/2+o.x/2,f=(0,h.clamp)(r.x,s.x,s.right),d=f-i.center(s).x,g=f-i.center(l).x,p=((0,h.clamp)(r.y,s.y,s.bottom)-s.y)/s.height,m=(f-i.center(s).x)/(s.width/2),y=e.gallery.isOpen?u:i.center(a).x;
  return{
    mx:m,distYUp:s.y+p*s.height-(l.y+p*l.height),distYDown:a.y+p*a.height-(s.y+p*s.height),offsetXUp:d/c-g,offsetXDown:s.width<=a.width+1?0:f-(y+m*(a.width/2))-o.x/2
  }
}
```

## 3. Reducers: About / Window / Grid.Resize / Carousel / Cursor / Drag

`Grid.Resize` stores per-grid `scale` and `size` (from the layout function in section 7). `Cursor.Contract` = scale .5, `Cursor.Expand` = scale 1.

```js
var me={
  "About.Open":function(e){
    return oe.track("About View"),ce(e,{timeline:ce(e.timeline,{locked:!0,rememberedX:e.timeline.locked?e.timeline.offset.x:document.body.scrollLeft,offset:{x:e.timeline.locked?e.timeline.offset.x:-document.body.scrollLeft,y:0}}),about:ce(e.about,{isOpen:!0}),cursor:ce(e.cursor,{scale:1})})
  },
  "About.Close":function(e){
    return ce(e,{about:ce(e.about,{isOpen:!1}),timeline:ce(e.timeline,{locked:!1,offset:{x:e.timeline.rememberedX,y:0}})})
  }
};
function ye(e,t,n){
  return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e
}
function ve(e){
  for(var t=1;t<arguments.length;t++){
    var n=null!=arguments[t]?arguments[t]:{
    },
    r=Object.keys(n);
    "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){ye(e,t,n[t])}))
  }
  return e
}
var be={
  "Window.Scroll":function(e){
    return ce(e,{scroll:i.scroll()})
  },
  "Window.Resize":function(e){
    return ce(e,{window:{size:i.screen()},scroll:i.scroll()})
  },
  "Grid.Resize":function(e,t){
    var n=t.timeline,r=t.gallery,o=t.about,a=t.carousel;
    return ce(e,{about:ce(e.about,o),timeline:ce(e.timeline,n),gallery:ce(e.gallery,r?ve({offset:{x:i.Gallery.offset(e.gallery.index),y:0}},r):void 0),carousel:ce(e.carousel,a)})
  }
},
xe={
  "Carousel.Open":function(e){
    return ce(e,{carousel:ce(e.carousel,{isOpen:!0}),cursor:ce(e.cursor,{scale:1})})
  },
  "Carousel.Close":function(e){
    return ce(e,{carousel:ce(e.carousel,{isOpen:!1})})
  },
  "Carousel.PageRight":function(e,t){
    var n,r,i=t.closes,o=u.V.project(e.gallery.index);
    if(e.carousel.index>=(null!==(r=null===(n=o.videos)||void 0===n?void 0:n.length)&&void 0!==r?r:0)-1)return i?ce(e,{carousel:ce(e.carousel,{isOpen:!1})}):e;
    var a=e.carousel.index+1;
    return ce(e,{carousel:ce(e.carousel,{index:a})})
  },
  "Carousel.PageLeft":function(e,t){
    var n=t.closes;
    if(e.carousel.index<=0)return n?ce(e,{carousel:ce(e.carousel,{isOpen:!1})}):e;
    var r=e.carousel.index-1;
    return ce(e,{carousel:ce(e.carousel,{index:r})})
  }
},
_e={
  "Cursor.Hide":function(e){
    return ce(e,{cursor:ce(e.cursor,{hidden:!0})})
  },
  "Cursor.Show":function(e){
    return ce(e,{cursor:ce(e.cursor,{hidden:!1})})
  },
  "Cursor.Expand":function(e){
    return ce(e,{cursor:ce(e.cursor,{scale:1})})
  },
  "Cursor.Contract":function(e){
    return ce(e,{cursor:ce(e.cursor,{scale:E.Cursor.ScaleSmall})})
  }
},
we={
  "Drag.Start":function(e,t){
    var n=t.origin;
    return ce(e,{drag:ce(e.drag,{origin:n,isDragging:!0,delta:r.zero(),velocity:r.zero()})})
  },
  "Drag.Move":function(e,t){
    var n=t.delta;
    return ce(e,{drag:ce(e.drag,{delta:r.add(e.drag.delta,n)})})
  },
  "Drag.End":function(e,t){
    return de(e,t.velocity)
  }
};
```

## 4. Line helpers (`Oe` = y=mx+b, `Se` = two-segment piecewise line) and Timeline reducers (click detection in `Timeline.OnDragEnd`)

Click = `Timeline.OnDragEnd` with |delta| < 2px and not locked -> `he(de(e), nearestCurrentProjectIndex(origin))`.

```js
var Ce,Oe=function(){
  function e(){
    var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;
    je(this,e),this._m=0,this._b=0,this._m=t,this._b=n
  }
  var t=e.prototype;
  return t.f=function(e){
    return this._m*e+this._b
  },
  t.solve=function(e){
    return(e-this._b)/this._m
  },
  t.eq=function(){
    return{
      m:this._m,b:this._b
    }
  },
  e.from=function(t,n){
    var r=(n.y-t.y)/(n.x-t.x||1);
    return new e(r,t.y-r*t.x)
  },
  e
}
(),Se=function(){
  function e(t,n,r){
    je(this,e),this._l1=new Oe,this._l2=new Oe,this._b=0,this._l1=t,this._l2=n,this._b=r
  }
  var t=e.prototype;
  return t.f=function(e){
    return e<=this._b?this._l1.f(e):this._l2.f(e)
  },
  t.eq=function(){
    return{
      l1:this._l1.eq(),l2:this._l2.eq(),b:this._b
    }
  },
  e.from=function(t,n,r){
    return new e(Oe.from(t,n),Oe.from(n,r),n.x)
  },
  e
}
();
!function(e){
  var t=function(e){
    var t=e.width,n=e.height,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,o=t>n,a=t<n,l=(n-t)/2,s=(t-n)/2;
    return Oe.from({x:(o?s:0)+r,y:(a?n-l:n)+i},{x:(o?t-s:t)+r,y:(a?l:0)+i})
  };
  e.getGlobalLine=function(){
    return t({width:window.innerWidth,height:window.innerHeight})
  },
  e.getLine=t
}
(Ce||(Ce={}));
var ke={
  "Timeline.UpdateShine":function(e,t){
    var n=t.height,r=Ce.getGlobalLine().eq(),o=r.m,a=r.b,l=(i.screen().width-e.timeline.size.width)/2,s=(i.screen().height-e.timeline.size.height)/2,c=l,u=i.screen().height-s-n,f=i.screen().width-l,d=u-o*c,h=i.screen().height-s-o*f;
    return ce(e,{timeline:ce(e.timeline,{shine:{from:{m:o,b:d-a},to:{m:o,b:h-a}}})})
  },
  "Timeline.OnDragStart":function(e,t){
    var n=t.origin,r=t.getRect,o=t.onRails,a=i.nearestCurrentProjectIndex(n,e.gallery.index,r),l=pe(e,a,r,n);
    return o&&(l.offsetXUp=0),fe(ce(e,{gallery:ce(e.gallery,{index:a,offset:{x:i.Gallery.offset(a),y:0}}),timeline:ce(e.timeline,{animation:ce(e.timeline.animation,{delta:{x:l.offsetXUp,y:0},drag:l,onRails:o})}),drag:ce(e.drag,{isDragging:!0,origin:n})}))
  },
  "Timeline.OnDrag":function(e,t){
    var n=t.delta;
    return e.drag.isDragging?ce(e,{drag:ce(e.drag,{delta:r.add(e.drag.delta,n)})}):e
  },
  "Timeline.OnDragEnd":function(e,t){
    var n=t.locked,r=t.velocity,o=t.origin,a=t.getRect;
    if(n)return de(e);
    if(Math.abs(e.drag.delta.y)<2&&Math.abs(e.drag.delta.x)<2){
      var l=i.nearestCurrentProjectIndex(o,e.gallery.index,a);
      return he(de(e),l)
    }
    return e.drag.isDragging&&r.y>-E.Pageable.DragVelocityThreshold&&(r.y>E.Pageable.DragVelocityThreshold||e.drag.delta.y/e.timeline.animation.drag.distYUp>.5)?he(de(e),e.gallery.index):de(e)
  },
  "Timeline.SetDate":function(e,t){
    var n=t.date;
    return ce(e,{timeline:ce(e.timeline,{date:n})})
  },
  "Timeline.OnAboutResize":function(e,t){
    var n=t.x;
    return ce(e,{timeline:ce(e.timeline,{offset:{x:n,y:0},rememberedX:-n})})
  }
},
```

## 5. Gallery reducers: `Gallery.Expand`, `Gallery.Collapse` (`De`), drag/paging (`Gallery.OnDrag*`, `Te`)

`De(e, offset, dragging)`: for a click collapse `offset`/`dragging` are undefined -> s = c = 0; the timeline scroll target is `ge(e,true).offsetX` (centers the item, clamped to the scroll range) and `animation.delta.x` = that target minus the scroll position at expand time.

```js
Me={
  "Gallery.Expand":function(e,t){
    return he(e,t.index)
  },
  "Gallery.Collapse":function(e,t){
    return De(e,t.offset,t.dragging)
  },
  "Gallery.OnDragStart":function(e,t){
    var n=t.origin,i=t.getRect,o=t.offset,a=t.onRails,l=ge(e,!1),s=l.deltaX,c=l.offsetX,u=pe(e,e.gallery.index,i,n,o);
    return a&&(u.offsetXDown=Math.min(0,c),c>e.timeline._maxScrollX&&(u.offsetXDown=c-e.timeline._maxScrollX)),ce(e,{timeline:ce(e.timeline,{animation:ce(e.timeline.animation,{delta:{x:s,y:0},_interruptOffset:null!==o&&void 0!==o?o:r.zero(),drag:u,onRails:a})}),drag:ce(e.drag,{isDragging:!0,origin:n,_startPos:e.gallery.offset,delta:a?e.drag.delta:r.zero()})})
  },
  "Gallery.OnDrag":function(e,t){
    var n=t.delta,o=i.Gallery.bounds(),a=o.min,l=o.max,s=function(e,t,n,r){
      var i=e+t;
      return(i<n||i>r?E.Pageable.SpringConstant:1)*t
    }
    (e.gallery.offset.x,-n.x,a,l);
    return ce(e,{timeline:ce(e.timeline,{offset:{x:e.timeline.offset.x+s,y:0}}),gallery:ce(e.gallery,{offset:{x:e.gallery.offset.x+s,y:0}}),drag:ce(e.drag,{delta:r.add(e.drag.delta,n)})})
  },
  "Gallery.OnDragEnd":function(e,t){
    var n=Te(e,t.velocity);
    return t.dismiss?De(n,t.offset,t.hasMoved):"left"===t.direction?function(e){
      var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:r.zero();
      if(!e.gallery.isOpen||e.gallery.index<=0)return Te(e);
      var n=e.gallery.index-1;
      return oe.track("Project View",{title:u.V.project(n).title}),Te(ce(e,{timeline:ce(e.timeline,{date:u.V.project(n).date}),gallery:ce(e.gallery,{index:n}),carousel:ce(e.carousel,{index:0})}),t)
    }
    (n,t.velocity):"right"===t.direction?function(e){
      var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:r.zero();
      if(!e.gallery.isOpen||e.gallery.index>=u.V.last())return Te(e);
      var n=e.gallery.index+1;
      return oe.track("Project View",{title:u.V.project(n).title}),Te(ce(e,{timeline:ce(e.timeline,{date:u.V.project(n).date}),gallery:ce(e.gallery,{index:n}),carousel:ce(e.carousel,{index:0})}),t)
    }
    (n,t.velocity):n
  }
};
function Te(e){
  var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:r.zero(),n=i.Gallery.offset(e.gallery.index),o=n-e.gallery.offset.x,a=e.gallery.offset.x+e.drag.delta.x-e.drag._startPos.x;
  return ce(e,{timeline:ce(e.timeline,{offset:{x:e.timeline.offset.x+o,y:0}}),gallery:ce(e.gallery,{offset:{x:n,y:0}}),drag:ce(e.drag,{isDragging:!1,delta:r.zero(),prevDelta:e.drag.delta,velocity:t,_slip:{x:a,y:0}})})
}
function De(e,t,n){
  var r,i=ge(e,!n),o=i.offsetX,a=i.deltaX,l=null!==(r=null===t||void 0===t?void 0:t.x)&&void 0!==r?r:0,s=n?-e.timeline.animation.drag.offsetXDown+e.drag.prevDelta.x-e.drag._slip.x:0,c=n?l+s+2*e.timeline.animation._interruptOffset.x+(e.timeline.animation.onRails?0:e.drag._slip.x):0;
  return fe(ce(e,{timeline:ce(e.timeline,{locked:!1,date:u.V.project(e.gallery.index).date,offset:{x:o+s,y:0},animation:ce(e.timeline.animation,{delta:{x:a+c,y:0},offset:{x:l,y:0}})}),gallery:ce(e.gallery,{isOpen:!1}),scroll:ce(e.scroll,{x:o})}))
}
```

## 6. Geometry module `i` (screen, Gallery.size/offset/bounds, margins, center, nearestCurrentProjectIndex) + `C()` responsive scale

`Gallery.size()` = {innerWidth*1.5, innerHeight}; `Gallery.offset(i)` = -1.5*innerWidth*i. `C(s)` = MinScale + (1-MinScale)*s is the font/em scale.

```js
function C(e){
  if(i.screen().height<E.window().WindowMinHeight)return e;
  var t=E.window().MinScale;
  return t+(1-t)*e
}
function O(){
  var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];
  return Ie((function(t){return C(e?t.gallery.scale:t.timeline.scale)}))
}
// ---- module i ----
function(e){
  var t,n=function(){
    return function(e){
      for(var t=1;t<arguments.length;t++){
        var n=null!=arguments[t]?arguments[t]:{
        },
        r=Object.keys(n);
        "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){g(e,t,n[t])}))
      }
      return e
    }
    ({},s)
  },
  r=function(){
    return{
      width:window.innerWidth,height:window.innerHeight
    }
  },
  o=function(e,t){
    var n,r;
    return(null!==(r=null===(n=e.offset)||void 0===n?void 0:n.left)&&void 0!==r?r:0)*t/e.size.width
  },
  a=function(e,t){
    var n,r,i=(null!==(r=null===(n=e.offset)||void 0===n?void 0:n.right)&&void 0!==r?r:1)*(t?E.MobileTimelineImageMargin:E.DesktopTimelineImageMargin);
    return"".concat(i/2,"em")
  },
  l=function(e,t){
    return Math.min(Math.abs(e.left-t),Math.abs(e.right-t))
  },
  s=e.ZERO=Object.freeze({width:0,height:0});
  e.zero=n,function(e){
    function t(){
      var e=r(),t=e.width,n=e.height;
      return{
        width:t*E.GalleryWidthMultiplier,height:n
      }
    }
    function n(e){
      return-t().width*e
    }
    e.size=t,e.offset=n,e.bounds=function(){
      return{
        min:n(u.V.last()),max:0
      }
    }
  }
  (t=e.Gallery||(e.Gallery={})),e.gallery=function(){
    return t.size()
  },
  e.screen=r,e.scroll=function(){
    return{
      x:document.body.scrollLeft,y:document.body.scrollTop
    }
  },
  e.margins=function(e,t,n){
    var r=u.V.project(e).image,l=t*i.aspect(r.size),s=e>0?u.V.project(e-1).image:void 0;
    return{
      marginLeft:0===e?o(r,l):a(s,n),marginRight:e===u.V.projects().length-1?o(r,l):a(r,n)
    }
  },
  e.center=function(e){
    return{
      x:e.x+e.width/2,y:e.y+e.height/2
    }
  },
  e.aspect=function(e){
    return e.width/e.height
  },
  e.nearestCurrentProjectIndex=function(e,t,n){
    var r=t,i=t,o=void 0,a=e.x;
    for(o=l(n(i,"timeline").image,a),i=t-1;i>=0;){
      var s=l(n(i,"timeline").image,a);
      if(s>=o)break;
      o=s,r=i,i--
    }
    for(i=t+1;i<u.V.projects().length;){
      var c=l(n(i,"timeline").image,a);
      if(c>=o)break;
      o=c,r=i,i++
    }
    return r
  }
}
(i||(i={}));
```

## 7. Grid layout function (`Wt`) - content box size, margins, font size, grid template

Called for each grid type ('fixed' header, 'timeline', 'gallery', 'carousel'). NOTE the cross-wiring: content HEIGHT is lerped by the WIDTH progress `b`, content WIDTH by the HEIGHT progress `x` (verbatim from the bundle).

```js
var Wt=function(e){
  var t,n=e.fixed,r=e.locked,i=e.type,l=e.children,s=Re(),c=(0,a.useState)(),u=c[0],f=c[1],d=j(),g=(0,a.useCallback)((function(){var e=function(e,t){var n=E.window(),r=n.WindowMinHeight,i=n.WindowBreakWidth,o=n.WindowMinWidth,a=n.WindowBreakHeight,l=n.ContentHorizontalMargin,s=n.ContentVerticalMargin,c=n.ContentMinHeight,u=n.ContentMaxHeight,f=n.ContentMaxWidth,d=n.ContentMinWidth,g=n.ContentHorizontalMinMargin,p=n.ContentVerticalMinMargin,m=n.FontSize;window.innerHeight<r&&(r=0,c=0,p=0);window.innerWidth<o&&(o=0,d=0,g=0);var y=["gallery","about"].includes(t)&&e,v=y?E.MobileGalleryBreakHeight:a,b=(0,h.clamp)((window.innerWidth-o)/(i-o),0,1),x=(0,h.clamp)((window.innerHeight-r)/(v-r),0,1),_=Math.min(b,x),w=f+0,j=X(b,g,l),O=X(x,p,s),S=X(b,c,u),k=X(x,d,w),M=Math.min(y?window.innerHeight:S,window.innerHeight-2*O),T=Math.min("gallery"===t?window.innerWidth:k,window.innerWidth-2*j);return{scale:_,fontSize:m*C(_),size:{width:T,height:M},height:window.innerHeight,gridTemplateColumns:Bt(T),gridTemplateRows:Ht(M,"gallery"===t&&e&&E.IsTouchDevice?E.MobileGalleryVerticalOffset:1)}}(d,i),t=e.scale,n=e.size,r=It(e,["scale","size"]);f(r),"fixed"!==i&&s({type:"Grid.Resize",gallery:"gallery"===i?{scale:t,size:n}:void 0,timeline:"timeline"===i?{scale:t,size:n}:void 0,about:"about"===i?{scale:t,size:n}:void 0,carousel:"carousel"===i?{size:n}:void 0})}),[s,d,i]);
  return b(g),(0,o.jsx)("main",{className:W()(Ft().grid,(t={},Rt(t,Ft()["grid--fixed"],n),Rt(t,Ft()["grid--locked"],r),t)),style:u,children:(0,o.jsx)("div",{className:Ft().content,children:l})})
};
function Bt(e){
  return"\n    [full-start] 1fr\n    [content-start]\n    ".concat(e,"px\n    [content-end]\n    1fr [full-end]")
}
function Ht(e){
  var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1;
  return"\n    [full-start] 1fr\n    [content-start]\n    ".concat(e,"px\n    [content-end]\n    ").concat(t,"fr [full-end]")
}
```

## 8. Constants object `E` (built from the CSS-module config, all `parseFloat`)

Only the parts used by the zoom are relevant: `SpringConfig`, `ChainConfig`, `ChainDecay`, `DateSpringConfig`, `Cursor`, `Animation.Timeline.*`, `Animation.BackButton`, `Animation.Gallery.SpringConfig`, `GalleryTextFadeInDelay`, `GalleryWidthMultiplier`, `BackButtonOpacity`.

```js
!function(e){
  var t=e.Window=Object.freeze({Desktop:Object.freeze({FontSize:parseFloat(A().desktopFontSize),MinScale:parseFloat(A().desktopMinScale),WindowBreakWidth:parseFloat(A().desktopWindowBreakWidth),WindowBreakHeight:parseFloat(A().desktopWindowBreakHeight),WindowMinWidth:parseFloat(A().desktopWindowMinWidth),WindowMinHeight:parseFloat(A().desktopWindowMinHeight),ContentHorizontalMinMargin:parseFloat(A().desktopMinHorizontalMargin),ContentHorizontalMargin:parseFloat(A().desktopMaxHorizontalMargin),ContentVerticalMinMargin:parseFloat(A().desktopMinVerticalMargin),ContentVerticalMargin:parseFloat(A().desktopMaxVerticalMargin),ContentMinWidth:parseFloat(A().desktopContentMinWidth),ContentMaxWidth:parseFloat(A().desktopContentMaxWidth),ContentMinHeight:parseFloat(A().desktopContentMinHeight),ContentMaxHeight:parseFloat(A().desktopContentMaxHeight),TimelineHeight:parseFloat(A().desktopTimelineHeight),HeaderHeight:parseFloat(A().desktopHeaderHeight)}),Mobile:Object.freeze({FontSize:parseFloat(A().mobileFontSize),MinScale:parseFloat(A().mobileMinScale),WindowBreakWidth:parseFloat(A().mobileWindowBreakWidth),WindowBreakHeight:parseFloat(A().mobileWindowBreakHeight),WindowMinWidth:parseFloat(A().mobileWindowMinWidth),WindowMinHeight:parseFloat(A().mobileWindowMinHeight),ContentHorizontalMinMargin:parseFloat(A().mobileMinHorizontalMargin),ContentHorizontalMargin:parseFloat(A().mobileMaxHorizontalMargin),ContentVerticalMinMargin:parseFloat(A().mobileMinVerticalMargin),ContentVerticalMargin:parseFloat(A().mobileMaxVerticalMargin),ContentMinWidth:parseFloat(A().mobileContentMinWidth),ContentMaxWidth:parseFloat(A().mobileContentMaxWidth),ContentMinHeight:parseFloat(A().mobileContentMinHeight),ContentMaxHeight:parseFloat(A().mobileContentMaxHeight),TimelineHeight:parseFloat(A().mobileTimelineHeight),HeaderHeight:parseFloat(A().mobileHeaderHeight)})}),n=(e.window=function(e){var n=(0,h.isUndefined)(e)?w():e;return t[n?"Mobile":"Desktop"]},e.DesktopShineWidth=parseFloat(A().desktopTimelineShineWidth),e.MobileShineWidth=parseFloat(A().mobileTimelineShineWidth),e.ShineOpacity=parseFloat(A().timelineShineOpacity),e.VideoLoaderDelay=500,e.IsTouchDevice=ne());
  e.Pageable=Object.freeze({EnableYAxisThreshold:parseFloat(A().pageableEnableYAxisThreshold),LockYAxisThreshold:parseFloat(A().pageableLockYAxisThreshold),WheelExpandCollapseDistance:200,BottomBoundarySlipCoefficient:parseFloat(A().pageableBottomBoundarySlip),TopBoundarySlipCoefficient:parseFloat(A().pageableTopBoundarySlip),BottomAsymptoteConstant:5,WheelStartThreshold:10,DragDismissDistance:200,DragDismissDistanceMultiplier:parseFloat(A().dragDismissWindowMultiplier),DragDismissAnimationMultiplier:parseFloat(A().dragDismissAnimationMultiplier),MinDragDistance:parseFloat(A().pageableMinDragDistance),MaxTossVelocityDown:parseFloat(A().pageableMaxTossVelocityDown),MaxTossVelocityUp:parseFloat(A().pageableMaxTossVelocityUp),SpringConstant:parseFloat(A().pageableSpringConstant),WindowThreshold:parseFloat(A().pageableWindowThreshold),DragVelocityThreshold:parseFloat(A().pageableDragVelocityTrehshold),WheelVelocityThreshold:parseFloat(A().pageableWheelVelocityTrehshold),SwipeVelocityMultiplier:parseFloat(A().pageableSwipeVelocityMultiplier)}),e.Timeline=Object.freeze({CollapseRubberbandLength:1e3,CollapseRubberbandMultiplier:30}),e.MobileBreakpoint=parseFloat(A().mobileBreakpoint),e.MobileImageHeight=parseFloat(A().mobileGalleryImageMaxHeight),e.MobileGalleryBreakHeight=parseFloat(A().mobileGalleryWindowBreakHeight),e.MobileAboutImageMaxWidth=parseFloat(A().mobileAboutImageMaxWidth),e.SpringConfig=Object.freeze({tension:parseFloat(A().animationSpringTension),friction:parseFloat(A().animationSpringFriction),precision:parseFloat(A().animationSpringPrecision)}),e.ChainConfig=Object.freeze({tension:parseFloat(A().animationChainSpringTension),friction:parseFloat(A().animationChainSpringFriction)}),e.ChainDecay=parseFloat(A().animationChainSpringDecay),e.MobileSpringConfig=Object.freeze({tension:parseFloat(A().animationMobileSpringTension),friction:parseFloat(A().animationMobileSpringFriction),precision:parseFloat(A().animationSpringPrecision)}),e.OverscrollSpringConfig=Object.freeze({tension:parseFloat(A().overscrollSpringTension),friction:parseFloat(A().overscrollSpringFriction),precision:parseFloat(A().animationSpringPrecision)}),e.DateSpringConfig=Object.freeze({tension:parseFloat(A().headerDateSpringTension),friction:parseFloat(A().headerDateSpringFriction),clamp:!0}),e.DesktopTimelineImageMargin=parseFloat(A().desktopTimelineImageMargin),e.MobileTimelineImageMargin=parseFloat(A().mobileTimelineImageMargin),e.GalleryTextFadeInDelay=parseFloat(A().galleryTextFadeInDelay),e.GalleryWidthMultiplier=parseFloat(A().galleryWidthMultiplier),e.MobileGalleryVerticalOffset=parseFloat(A().mobileGalleryVerticalOffset),e.CarouselItemMargin=parseFloat(A().carouselItemMargin),e.CarouselBlurRadius=parseFloat(A().carouselBackgroundBlurRadius),e.CarouselVideoInactiveOpacity=parseFloat(A().carouselItemInactiveOpacity),e.CarouselDotInactiveOpacity=parseFloat(A().carouselDotInactiveOpacity),e.DesktopCarouselWindowMargin=parseFloat(A().desktopCarouselWindowMargin),e.MobileCarouselWindowMargin=parseFloat(A().mobileCarouselWindowMargin),e.EdgePagingHotzone=parseFloat(A().pageableEdgeHotzone),e.DragDecayMultiplier=parseFloat(A().timelineDragFriction),e.AboutPageImageVerticalMargin=parseFloat(A().desktopAboutImageVerticalMargin),e.Cursor=Object.freeze({ShouldRender:!n,Size:parseFloat(A().cursorSize),ScaleSmall:parseFloat(A().cursorScaleSmall),ScaleDown:parseFloat(A().cursorScaleDown),ScaleSpring:Object.freeze({tension:parseFloat(A().cursorScaleSpringTension),friction:parseFloat(A().cursorScaleSpringFriction),clamp:!0}),DownSpring:Object.freeze({tension:parseFloat(A().cursorDownSpringTension),friction:parseFloat(A().cursorDownSpringFriction),clamp:!0}),EdgeDistance:100}),e.VideoControlsHideTimeout=parseFloat(A().videoControlsHideTimeout),e.VideoControlsScrubberHeight=parseFloat(A().videoControlsScrubberHeight),e.VideoControlsButtonOpacity=parseFloat(A().videoControlsButtonOpacity),e.VideoControlsProgressOpacity=parseFloat(A().videoControlsProgressOpacity),e.BackButtonOpacity=parseFloat(A().backButtonOpacity),e.Animation=Object.freeze({BackButton:Object.freeze({start:parseFloat(A().animationBackButtonStart),end:parseFloat(A().animationBackButtonEnd)}),Timeline:Object.freeze({Header:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationTimelineHeaderStart),end:parseFloat(A().animationTimelineHeaderEnd)}),Scale:parseFloat(A().animationTimelineHeaderScale),MobileScale:parseFloat(A().animationMobileTimelineHeaderScale),Delay:parseFloat(A().animationTimelineHeaderDelay)}),GalleryContent:Object.freeze({start:parseFloat(A().animationTimelineGalleryContentStart),end:parseFloat(A().animationTimelineGalleryContentEnd)})}),Gallery:Object.freeze({SpringConfig:Object.freeze({tension:parseFloat(A().animationGalleryPagingSpringTension),friction:parseFloat(A().animationGalleryPagingSpringFriction),precision:parseFloat(A().animationSpringPrecision)}),MobileSpringConfig:Object.freeze({tension:parseFloat(A().animationMobileGalleryPagingSpringTension),friction:parseFloat(A().animationMobileGalleryPagingSpringFriction),precision:parseFloat(A().animationSpringPrecision)})}),Carousel:Object.freeze({Background:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationCarouselBackgroundStart),end:parseFloat(A().animationCarouselBackgroundEnd)}),Blur:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationCarouselBlurStart),end:parseFloat(A().animationCarouselBlurEnd)}),Radius:parseFloat(A().carouselBackgroundBlurRadius)})}),ProjectText:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationCarouselProjectTextStart),end:parseFloat(A().animationCarouselProjectTextEnd)}),Delay:parseFloat(A().animationCarouselProjectTextDelay)}),GalleryScale:parseFloat(A().animationCarouselGalleryScale),MobileGalleryScale:parseFloat(A().animationMobileCarouselGalleryScale),Content:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationCarouselContentStart),end:parseFloat(A().animationCarouselContentEnd)}),Scale:parseFloat(A().animationCarouselContentScale),MobileScale:parseFloat(A().animationMobileCarouselContentScale),BlurRadius:parseFloat(A().carouselContentBlurRadius)})}),About:Object.freeze({Background:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationAboutBackgroundStart),end:parseFloat(A().animationAboutBackgroundEnd)}),Blur:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationAboutBlurStart),end:parseFloat(A().animationAboutBlurEnd)}),Radius:parseFloat(A().carouselBackgroundBlurRadius)})}),Header:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationAboutHeaderStart),end:parseFloat(A().animationAboutHeaderEnd)}),Delay:parseFloat(A().animationAboutHeaderDelay)}),TimelineScale:parseFloat(A().animationAboutTimelineScale),MobileTimelineScale:parseFloat(A().animationMobileAboutTimelineScale),ContentScale:parseFloat(A().animationAboutContentScale),MobileContentScale:parseFloat(A().animationMobileAboutContentScale),Text:Object.freeze({Timing:{start:parseFloat(A().animationAboutTextStart),end:parseFloat(A().animationAboutTextEnd)},BlurTiming:{start:parseFloat(A().animationAboutTextBlurStart),end:parseFloat(A().animationAboutTextBlurEnd)},BlurRadius:parseFloat(A().aboutContentBlurRadius),Delay:parseFloat(A().animationAboutTextDelay)}),Image:Object.freeze({Timing:Object.freeze({start:parseFloat(A().animationAboutImageStart),end:parseFloat(A().animationAboutImageEnd)}),BlurTiming:{start:parseFloat(A().animationAboutImageBlurStart),end:parseFloat(A().animationAboutImageBlurEnd)},BlurRadius:parseFloat(A().aboutContentBlurRadius),Delay:parseFloat(A().animationAboutImageDelay)})})})
}
(E||(E={}));
```

## 9. Interpolation helper `Z` and the easing curves

`R = bezier-easing`. `Q = cubic-bezier(.7,0,.84,0)` = easeInExpo, `K = cubic-bezier(.5,1,.89,1)` = easeOutQuad. `Z(v, {start,end}, [out0,out1], easing)` = clamp-remap v from [start,end] to [0,1], ease, then map to [out0,out1] (numbers or strings like 'scale(1)').

```js
function X(e,t,n){
  return(0,h.clamp)(t+e*(n-t),t,n)
}
function q(e,t){
  var n=!(arguments.length>2&&void 0!==arguments[2])||arguments[2];
  return W()(e,t?d().locked:n?d().unlocked:"")
}
function Y(e,t,n){
  return e<t?e+E.Pageable.SpringConstant*(t-e):e>n?e-E.Pageable.SpringConstant*(e-n):e
}
function U(e){
  return e.width/e.height
}
function Z(e,t,n,r){
  var i=t.start,o=t.end,a=L(n,2),l=a[0],s=a[1];
  return e.to([0,i,o,1],[0,0,1,1]).to((function(e){return r?r(e):e})).to([0,1],[l,s])
}
var Q=R()(.7,0,.84,0),K=R()(.5,1,.89,1);
R()(.11,0,.5,0);
```

## 10. Item controller `$e` (per project): x / y / scale maps, `endDrag` line rebuild, `_updateScale`, `_settle`

`x(e)`: e = chain-spring value (= master progress on a click). `posX()` returns the item's OWN 300/35 spring value for the current item while open. `scale(e)` = (1-1/S)*e + 1/S. `y(e)` = min(0, e*image.y).

```js
var $e=function(e){
  !function(e,t){
    if("function"!==typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");
    e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&Ze(e,t)
  }
  (n,e);
  var t=Ke(n);
  function n(e,i){
    var o;
    return function(e,t){
      if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")
    }
    (this,n),(o=t.call(this))._line=new Se(new Oe(0,0),new Oe(0,0),0),o._scale=new Se(new Oe(0,0),new Oe(0,0),0),o._isDragging=!1,o._point=r.zero(),o._offsetXDown=0,o._isOpen=!1,o.f=function(){
      return 0
    },
    o._index=e,o._chain=i,o._spring=new Be.Qr({v:0,config:E.SpringConfig}),o
  }
  var o=n.prototype;
  return o.set=function(e){
    this._chain.set(this._index,e)
  },
  o.unlink=function(){
    this._chain.unlink(this._index)
  },
  o.spring=function(){
    return this._chain.spring(this._index)
  },
  o.onResize=function(){
    this._isOpen&&(this._updateLine(),this._spring.set({v:this._expanded().y})),this._updateScale()
  },
  o.internal=function(){
    return this._spring.springs.v
  },
  o.x=function(e){
    var t=this.getState(),n=t.timeline,r=t.gallery,o=t.geometry.rects,a=t.transforms;
    if(this._point={x:e,y:this.f(e)},e<0){
      this._point.y=this._offsetXDown+(r.isOpen?-n.animation.delta.x:0);
      var l=o.timeline[this._index].container,s=o.timeline[r.index].container,c=i.center(s).x-i.center(l).x,u=1/a[this._index].scale,f=this.scale(e)/u,d=n.animation.drag.mx*(s.width/2)*(1-f);
      this._point.y+=d+(this._isCurrent()?0:c*(1-f))
    }
    if(e>1&&this._isCurrent()&&n.animation.onRails){
      var h=o.gallery[this._index].image,g=i.center(h).x+r.offset.x,p=i.screen().width/2,m=(this.scale(e)-1)*h.width,y=g-p-n.animation.drag.offsetXDown;
      n.animation.drag.offsetXDown<=0&&(y+=m/2),this._point.y=a[this._index].image.x+(e-1)*y
    }
    return(this._isDragging||n.animation.onRails)&&this._spring.set({v:r.isOpen?this._point.y:0}),this.posX()
  },
  o.posX=function(){
    var e=this.getState().gallery;
    return this._isCurrent()&&e.isOpen?this._spring.springs.v.get():this._point.y
  },
  o.x2=function(e){
    return this.getState().gallery.isOpen?0:e
  },
  o.y=function(e){
    var t=this.getState().transforms;
    return Math.min(0,e*t[this._index].image.y)
  },
  o.scale=function(e){
    return this._scale.f(this._restrict(e))
  },
  o.startDrag=function(){
    var e=this.getState().timeline;
    this._offsetXDown=e.animation.drag.offsetXDown,this._spring.pause(),this._isDragging=!0,this._isOpen&&this._isCurrent()&&(this._point.y=this._spring.springs.v.get()),this._updateLine(this._offsetXDown-(this._isOpen?e.animation.delta.x:0),-e.animation.drag.offsetXUp)
  },
  o.endDrag=function(){
    var e=this.getState(),t=e.timeline,n=e.drag,r=e.gallery;
    if(this._isDragging=!1,this._isOpen!==r.isOpen)this._isOpen=r.isOpen,this._isOpen||(this._offsetXDown=0,this._point.y+=t.animation.offset.x+t.animation.delta.x+n.prevDelta.x),this._spring.set({v:this._isOpen?this._point.y:Number.EPSILON}),this._updateLine(0,0,!this._isOpen);
    else if(!this._isOpen&&t.animation.drag.distYDown>1&&0!==n.prevDelta.y){
      this._point.y-=this._offsetXDown;
      var i=document.body.scrollLeft-this._offsetXDown,o=document.body.scrollWidth-document.body.clientWidth;
      i<0?this._spring.set({v:-i}):i>o&&this._spring.set({v:o-i}),this._isCurrent()&&document.body.scrollBy({left:-this._offsetXDown}),this._offsetXDown=0,this._updateLine()
    }
    this.x(this._point.x),this._settle()
  },
  o.isInViewport=function(){
    var e=this.getState(),t=e.geometry.rects.timeline,n=e.scroll,i=e.transforms,o=ee(t[this._index].container,r.invert(n)),a=this.x(this.spring().get()),l=this.scale(this.spring().get())*i[this._index].scale,s=function(e){
      for(var t=1;t<arguments.length;t++){
        var n=null!=arguments[t]?arguments[t]:{
        },
        r=Object.keys(n);
        "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){qe(e,t,n[t])}))
      }
      return e
    }
    ({},o);
    return s.width=s.width*l,s.height=s.height*l,s=ee(s,{x:a+(o.width-s.width)/2,y:0}),te(o)||te(s)
  },
  o._restrict=function(e){
    return this._isCurrent()?e:Math.min(1,e)
  },
  o._isCurrent=function(){
    var e=this.getState().gallery;
    return this._index===e.index
  },
  o._expanded=function(){
    var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,t=this.getState().transforms,n=t[this._index].image;
    return{
      x:1,y:n.x+e
    }
  },
  o._collapsed=function(){
    var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;
    return{
      x:0,y:e
    }
  },
  o._updateLine=function(){
    var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,n=arguments.length>2&&void 0!==arguments[2]&&arguments[2],r=this,i=this._point,o=this._collapsed(e),a=this._expanded(i.x>1?0:t);
    i.x<0?this._line=Se.from(i,o,a):i.x>1?this._line=Se.from(o,n?o:a,i):this._line=Se.from(o,i,n?i:a),this.f=function(e){
      var t=r._isCurrent()?e:Math.min(1,e);
      return r._line.f(t)
    },
    this._updateScale()
  },
  o._updateScale=function(){
    var e=this.getState(),t=e.transforms,n=e.gallery,r=1/t[this._index].scale,i=1-r,o=1/t[n.index].scale,a=1-o;
    this._scale=new Se(new Oe(a*(r/o),r),new Oe(i,r),0)
  },
  o._settle=function(){
    var e=this.getState(),t=e.gallery,n=e.drag;
    this._spring.resume(),this._spring.start({v:t.isOpen?this._expanded().y:0,config:{velocity:n.velocity.x}})
  },
  n
}
(Ne);
```

## 11. Chain classes `lt` (chain) and `st` (per-item chain spring, ChainConfig 1500/60, ChainDecay .1)

`onMasterChange`: if NOT dragging and the previous drag did not move (>2px), EVERY chain spring is `.set()` to the master value (no lag). Otherwise only the leader is set and neighbours are `.start()`ed toward their inner neighbour each frame (cascade of 1500/60 springs).

```js
var lt=function(e){
  nt(n,e);
  var t=at(n);
  function n(){
    var e;
    return et(this,n),(e=t.call(this))._springs=u.V.projects().map((function(e,t){return new st(t)})),e._springs.forEach((function(t){return t.link(e._springs)})),e
  }
  var i=n.prototype;
  return i.forceUpdate=function(){
    this._springs.forEach((function(e){return e.set(e.value()+Number.EPSILON)}))
  },
  i.onMasterChange=function(e){
    var t=this.getState(),n=t.gallery,i=t.drag;
    i.isDragging||r.hasMoved(i.prevDelta)?this._springs[n.index].set(e.value.v):this._springs.forEach((function(t){return t.set(e.value.v)}))
  },
  i.spring=function(e){
    return this._springs[e].spring()
  },
  i.set=function(e,t){
    this._springs[e].set(t)
  },
  i.unlink=function(e){
    this._springs[e].unlink()
  },
  i.relinkAll=function(){
    this._springs.forEach((function(e){return e.relink()}))
  },
  n
}
(Ne),st=function(e){
  nt(n,e);
  var t=at(n);
  function n(e){
    var r;
    return et(this,n),(r=t.call(this))._value=0,r._isLinked=!0,r._index=e,r._spring=new Be.Qr({v:0,config:E.ChainConfig,onChange:r.onChange.bind(Je(r))}),r
  }
  var r=n.prototype;
  return r.link=function(e){
    this._index>0&&(this._left=e[this._index-1]),this._index<e.length-1&&(this._right=e[this._index+1])
  },
  r.onChange=function(e){
    var t,n,r=this.getState().gallery,i=r.index-this._index,o=Math.min(1,E.ChainDecay*Math.abs(i)),a=0;
    if(this._index<r.index)a=this._right.value(),(null===(t=this._left)||void 0===t?void 0:t.isLinked())&&(null===(n=this._left)||void 0===n||n.start(e.value.v));
    else if(this._index>r.index){
      var l,s;
      a=this._left.value(),(null===(l=this._right)||void 0===l?void 0:l.isLinked())&&(null===(s=this._right)||void 0===s||s.start(e.value.v))
    }
    else{
      var c,u,f,d;
      (null===(c=this._left)||void 0===c?void 0:c.isLinked())&&(null===(u=this._left)||void 0===u||u.start(e.value.v)),(null===(f=this._right)||void 0===f?void 0:f.isLinked())&&(null===(d=this._right)||void 0===d||d.start(e.value.v))
    }
    this.isLinked()&&(this._value=(1-o)*e.value.v+o*a)
  },
  r.start=function(e){
    this._spring.start({v:e})
  },
  r.set=function(e){
    this._spring.set({v:e}),this._value=e
  },
  r.spring=function(){
    return this._spring.springs.v
  },
  r.value=function(){
    return this._value
  },
  r.unlink=function(){
    this._isLinked=!1
  },
  r.relink=function(){
    this._isLinked=!0
  },
  r.isLinked=function(){
    return this._isLinked
  },
  n
}
(Ne);
```

## 12. Master controller `xt` (master spring pause/resume/onDrag/onResize) and the `wt`/`Ct` provider that starts the master spring on `gallery.isOpen`

`resume()` -> `master.start({v: isOpen?1:0, config:{velocity}})`. `Ct` runs `resume()` in a layout effect whenever `isGalleryOpen` or `isDragging` changes.

```js
var gt=E.Pageable,pt=gt.MinDragDistance,mt=gt.BottomBoundarySlipCoefficient,yt=gt.TopBoundarySlipCoefficient,vt=gt.MaxTossVelocityDown,bt=gt.MaxTossVelocityUp,xt=function(e){
  !function(e,t){
    if("function"!==typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");
    e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&ft(e,t)
  }
  (n,e);
  var t=ht(n);
  function n(e){
    var r;
    return function(e,t){
      if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")
    }
    (this,n),(r=t.call(this))._value=0,r._chain=new lt,r._history=new Xe,r._line=new Oe,r._acc=0,r._prev=0,r._spring={
      v:e[0].v,api:e[1]
    },
    r._controllers=u.V.projects().map((function(e,t){return new $e(t,r._chain)})),r
  }
  var r=n.prototype;
  return r.onTimelineDrag=function(){
    this._controllers.forEach((function(e){e.isInViewport()||(e.set(0),e.unlink())}))
  },
  r.controller=function(e){
    return this._controllers[e]
  },
  r.onResize=function(){
    this._controllers.forEach((function(e){return e.onResize()})),this._spring.v.isAnimating||this._spring.api.set({v:this._spring.v.get()+Number.EPSILON})
  },
  r.onChange=function(e){
    this._chain.onMasterChange(e)
  },
  r.pause=function(){
    this._spring.api.pause(),this._value=this._spring.v.get(),this._history.reset({x:this._value,y:0}),this._controllers.forEach((function(e){return e.startDrag()})),this._chain.relinkAll(),this._acc=0,this._prev=0;
    var e=this.getState().timeline.animation.drag,t=e.distYDown,n=e.distYUp,r={
      x:0,y:this._value
    },
    i={
      x:Math.max(pt,n),y:1
    },
    o={
      x:-Math.max(pt,t),y:0
    };
    this._line=Oe.from(r,n>=t?i:o)
  },
  r.resume=function(){
    var e=this.getState().gallery;
    this._controllers.forEach((function(e){return e.endDrag()})),this._spring.api.start({v:e.isOpen?1:0,config:{velocity:this._velocity()}}),this._spring.api.resume(),this._chain.forceUpdate(),this._history.reset()
  },
  r.onDrag=function(e){
    if(0!==e.y){
      var t=e.y-this._prev;
      this._prev=e.y;
      var n=this._spring.v.get();
      if(n>1){
        var r=this._line.f(this._acc+t*yt);
        this._acc+=r<1?this._intercept(1,t,yt,!0):t*yt
      }
      else if(n<0){
        var i=this._line.f(this._acc+t*mt);
        this._acc+=i>0?this._intercept(0,t,mt,!0):t*mt
      }
      else{
        var o=this._line.f(this._acc+t);
        this._acc+=o<0?this._intercept(0,t,mt,!1):o>1?this._intercept(1,t,yt,!1):t
      }
      this._spring.api.set({v:this._line.f(this._acc)}),this._history.push({x:this._spring.v.get(),y:0})
    }
  },
  r.canUpdateScrollP=function(){
    return!this.getState().about.isOpen
  },
  r._velocity=function(){
    var e=this._history.velocity(!1).x;
    return(0,h.clamp)(e,-vt,bt)
  },
  r._intercept=function(e,t,n,r){
    var i=(this._line.solve(e)-this._acc)/(r?n:1);
    return r?i*n+(t-i):i+(t-i)*n
  },
  n
}
(Ne),_t=a.createContext(null),wt=function(e){
  var t,n=e.children,r=(0,a.useRef)(0),i=(0,a.useCallback)((function(){return r.current=document.body.scrollLeft/(document.body.scrollWidth-window.innerWidth)}),[]),l=(0,a.useCallback)((function(){return null!==(t=r.current)&&void 0!==t?t:0}),[]),s=(0,a.useCallback)((function(e){d.current.onChange(e),d.current.canUpdateScrollP()&&i()}),[i]),c=(0,Be.q_)((function(){return{v:0,config:E.SpringConfig,onChange:s}})),u=(0,Be.q_)((function(){return{v:0,config:E.SpringConfig}})),f=(0,Be.q_)((function(){return{v:0,config:E.SpringConfig}})),d=(0,a.useRef)(new xt(c)),h=(0,a.useRef)(new He(f)),g=(0,a.useRef)(new He(u)),p=(0,a.useMemo)((function(){return{about:u,carousel:f,timeline:c,controller:d,carouselController:h,aboutController:g,updateScrollP:i,getScrollP:l}}),[u,f,c,d,i,l]);
  return(0,o.jsxs)(_t.Provider,{value:p,children:[(0,o.jsx)(Ct,{controller:d,carouselController:h,aboutController:g}),n]})
},
jt=a.memo(wt),Ct=function(e){
  var t=e.controller,n=e.carouselController,r=e.aboutController,i=Ie((function(e){return{delta:e.drag.delta,isDragging:e.drag.isDragging,isGalleryOpen:e.gallery.isOpen,isCarouselOpen:e.carousel.isOpen,isAboutOpen:e.about.isOpen,geometry:e.geometry}}),s.wU),o=i.delta,l=i.isDragging,c=i.isCarouselOpen,u=i.isAboutOpen,f=i.isGalleryOpen,d=i.geometry,h=!c&&!u;
  (0,a.useLayoutEffect)((function(){var e,n;h&&(l?null===(e=t.current)||void 0===e||e.pause():null===(n=t.current)||void 0===n||n.resume())}),[t,l,h,f]),(0,a.useLayoutEffect)((function(){var e;h&&l&&(null===(e=t.current)||void 0===e||e.onDrag(o))}),[t,l,o,h]);
  var g=(0,a.useCallback)((function(){var e;return null===(e=t.current)||void 0===e?void 0:e.onResize()}),[t]);
  return(0,a.useEffect)((function(){return g()}),[d]),Ot(r,u,l,o),Ot(n,c,l,o),null
};
function Ot(e,t,n,r){
  (0,a.useLayoutEffect)((function(){var n;return null===(n=e.current)||void 0===n?void 0:n.start(t)}),[e,t]),(0,a.useLayoutEffect)((function(){var r,i;t&&(n?null===(r=e.current)||void 0===r||r.onDragStart():null===(i=e.current)||void 0===i||i.onDragEnd(t))}),[e,t,n]),(0,a.useLayoutEffect)((function(){var i;t&&n&&(null===(i=e.current)||void 0===i||i.onMove(r))}),[e,t,n,r])
}
function St(e,t){
  return Mt((0,a.useContext)(_t).aboutController,Ie((function(e){return e.about.isOpen})),e,t)
}
function kt(e,t){
  return Mt((0,a.useContext)(_t).carouselController,Ie((function(e){return e.carousel.isOpen})),e,t)
}
function Mt(e,t,n,r){
  var i=(0,Be.q_)((function(){return{v:0,config:E.SpringConfig}}));
  return(0,a.useEffect)((function(){if(n){var o=e.current,a=o.register(i,r);return function(){return o.deregister(a)}}i[1].start({v:t?1:0,delay:r?t?r.in:r.out:0})}),[e,i,r,n,t]),i
}
```

## 13. Geometry provider `Dt` (measures rects with getBoundingClientRect, 50 ms after each window resize; dispatches `Geometry.Update`)

Rects are normalised to unscrolled/unoffset coordinates via `J(rect, offset)`.

```js
Dt=function(e){
  var t=e.children,n=(0,a.useRef)({gallery:u.V.projects().map((function(){return N()})),timeline:u.V.projects().map((function(){return N()}))}),r=Re(),i=Ie((function(e){return{galleryOffsetX:e.gallery.offset.x,timelineOffsetX:e.timeline.locked?e.timeline.offset.x:-e.scroll.x}}),s.wU),l=i.galleryOffsetX,c=i.timelineOffsetX,f=(0,a.useRef)(-l),d=(0,a.useRef)(-c);
  D((function(){f.current=-l,d.current=-c}),[l,c]);
  var h=(0,a.useCallback)((function(e,t){return n.current[t][e]}),[]),g=(0,a.useCallback)((function(e,t,n){return{container:J(h(e,t).container.current.getBoundingClientRect(),n),image:J(h(e,t).image.current.getBoundingClientRect(),n)}}),[h]);
  b((0,a.useCallback)((function(){r({type:"Geometry.Update",timeline:u.V.projects().map((function(e,t){return g(t,"timeline",{x:-d.current,y:0})})),gallery:u.V.projects().map((function(e,t){return g(t,"gallery",{x:-f.current,y:0})}))})}),[g,r]),50);
  var p=(0,a.useMemo)((function(){return{refs:n,getRect:g}}),[g]);
  return(0,o.jsx)(Tt.Provider,{value:p,children:t})
},
```

## 14. Animated offset container `Ut` (timeline row / gallery strip translate; paging spring 450/50)



```js
var Ut=function(e){
  var t=e.offset,n=e.velocity,i=e.animate,l=e.locked,s=void 0===l||l,c=e.className,u=e.springConfig,f=e.interruptionId,d=e.name,h=e.axis,g=void 0===h?"xy":h,p=e.children,m=(0,a.useRef)(null),y=j(),v=(0,a.useMemo)((function(){return(null!==u&&void 0!==u?u:y)?E.Animation.Gallery.MobileSpringConfig:E.Animation.Gallery.SpringConfig}),[y,u]),b=(0,a.useMemo)((function(){return r.axis(t,g)}),[t,g]),_=(0,a.useMemo)((function(){return r.axis(null!==n&&void 0!==n?n:r.zero(),g)}),[n,g]),w=Yt((0,Be.q_)((function(){return{x:b.x,config:v,immediate:!i}})),2),C=w[0],O=w[1],S=Yt((0,Be.q_)((function(){return{y:b.y,config:v,immediate:!i}})),2),k=S[0],M=S[1],T=x(b);
  (0,a.useEffect)((function(){if(T.x!==b.x||T.y!==b.y)if(i){var e=_.x,t=_.y,n=Math.abs(e)>Math.abs(t);O.start({x:b.x,config:{velocity:n?e:0}}),M.start({y:b.y,config:{velocity:n?0:t}})}else O.set({x:b.x}),M.set({y:b.y})}),[i,b,O,M,_,d,T]);
  var D=function(e){
    var t=(0,a.useRef)(e);
    return(0,a.useEffect)((function(){t.current=e}),[e]),t
  }
  (b),P=(0,a.useContext)(Nt),z=P.register,A=P.deregister,F=(0,a.useCallback)((function(){var e=window.getComputedStyle(m.current),t=new WebKitCSSMatrix(e.transform);return{x:t.m41-D.current.x,y:t.m42-D.current.y}}),[D]);
  return(0,a.useEffect)((function(){if(f)return z(f,O,F),function(){return A(f)}}),[f,O,F,z,A]),(0,o.jsx)(Be.q.div,{className:W()(Lt().root,null!==c&&void 0!==c?c:Lt().default),style:{transform:i?C.x.to((function(e){return"translate3d(".concat(e,"px, ",0,"px, 0px)")})):"translate3d(".concat(b.x,"px, 0px, 0px)")},ref:m,children:(0,o.jsx)(Be.q.div,{className:q(Lt().content,s),style:{transform:i?k.y.to((function(e){return"translate3d(0px, ".concat(e,"px, 0px)")})):"translate3d(0px, ".concat(b.y,"px, 0px)")},children:p})})
},
```

## 15. Image sizing `On`/`Sn` (gallery-size image used in BOTH layers), timeline item `yi` (container size + margins + z-index)



```js
function On(e){
  var t=j(),n=Ie((function(e){return e.gallery.size})),r=O(!0);
  return(0,a.useMemo)((function(){var i,o,a=Math.abs((null!==(o=null===(i=e.offset)||void 0===i?void 0:i.gallery)&&void 0!==o?o:0)/e.size.height),l=E.MobileImageHeight*r,s=t?l*(1-a):n.height*(1-a);return{height:s,width:s*U(e.size)}}),[e,n,t,r])
}
var Sn=function(e){
  var t=e.index,n=e.project,r=e.imageRef,i=e.timeline,l=On(n.image),s=Ie((function(e){return 1/e.transforms[t].scale})),c=j(),u=(0,a.useMemo)((function(){var e,t,r=(null!==(t=null===(e=n.image.offset)||void 0===e?void 0:e.left)&&void 0!==t?t:0)*l.width/n.image.size.width;return{width:l.width,height:l.height,marginLeft:r,marginRight:i&&!c?void 0:r}}),[l,n,i,c]);
  return(0,o.jsx)("div",{style:u,children:(0,o.jsx)(wn,{image:n.image,size:l,imageRef:r,scale:i?s:void 0})})
},
// ---- timeline item ----
var yi=function(e){
  var t,n=e.index,r=e.project.image,l=e.itemRef,c=j(),u=(0,a.useContext)(qr).height,f=Ie((function(e){return{zIndex:20-Math.abs(n-e.gallery.index)}}),s.wU),d=(0,a.useMemo)((function(){var e;return u*((r.size.height+(null!==(t=null===(e=r.offset)||void 0===e?void 0:e.height)&&void 0!==t?t:0))/r.size.height)}),[u,r]),h=(0,a.useMemo)((function(){var e=d*i.aspect(r.size);return function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},r=Object.keys(n);"function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){mi(e,t,n[t])}))}return e}({height:d,width:e},i.margins(n,d,c))}),[r,n,c,d]),g=(0,a.useMemo)((function(){return(0,o.jsx)("div",{className:pi().container,style:h,ref:l.container,children:(0,o.jsx)(Fn,{index:n,children:(0,o.jsx)(Vn,{children:(0,o.jsx)(fr,{index:n,itemRef:l,timeline:!0})})})})}),[n,l,h]);
  return(0,o.jsx)("div",{className:pi().wrapper,style:f,children:g})
},
```

## 16. Animated wrappers: `zn` gallery-content opacity, `An` item transform, `Rn` header fade/scale, `Un` per-project text spring, `Ia` back button



```js
var zn=function(e){
  var t=e.children,n=En((0,a.useContext)(_t).timeline,1)[0].v;
  return(0,o.jsx)(Be.q.div,{className:Dn().timelineGalleryContent,style:{opacity:Z(n,E.Animation.Timeline.GalleryContent,[0,1],Q)},children:t})
},
An=function(e){
  var t=e.index,n=e.children,r=(0,a.useContext)(_t).controller,i=r.current.controller(t).spring(),l=r.current.controller(t).internal();
  return(0,o.jsx)(Be.q.div,{className:Dn().timelineImage,style:{transform:i.to((function(e){var n=r.current.controller(t).x(e),i=r.current.controller(t).y(e),o=r.current.controller(t).scale(e);return"translate3d(".concat(n,"px, ").concat(i,"px, 0px) scale(").concat(o,")")}))},children:(0,o.jsx)(Be.q.div,{style:{transform:l.to((function(e){var n=r.current.controller(t).x2(e);return"translate3d(".concat(n,"px, 0px, 0px)")}))},children:n})})
},
Fn=a.memo(An),Rn=function(e){
  var t=e.children,n=j(),r=En((0,a.useContext)(_t).timeline,1)[0].v;
  return(0,o.jsx)(Be.q.div,{className:Dn().timelineHeader,style:{opacity:Z(r,E.Animation.Timeline.Header.Timing,[1,0],K),transform:Z(r,E.Animation.Timeline.Header.Timing,["scale(1)","scale(".concat(n?E.Animation.Timeline.Header.MobileScale:E.Animation.Timeline.Header.Scale,")")],K)},children:t})
};
// ---- per-project text spring ----
Un=function(e){
  var t=e.index,n=e.children,r=Ie((function(e){return e.gallery.index===t})),i=(0,Be.q_)({opacity:r?1:0,config:E.SpringConfig,delay:E.GalleryTextFadeInDelay});
  return(0,o.jsx)(Be.q.div,{style:i,children:n})
},
Zn=function(e){
  var t=e.index,n=e.children;
  return(0,o.jsx)(zn,{index:t,children:(0,o.jsx)(Un,{index:t,children:(0,o.jsx)(Xn,{children:n})})})
},
// ---- back button ----
za=[E.Animation.BackButton.start,E.Animation.BackButton.end],Aa=[0,1],Fa=[0,1],Ra=[E.BackButtonOpacity,1],Ia=function(){
  var e=Re(),t=Ie((function(e){return{isCarouselOpen:e.carousel.isOpen,isGalleryOpen:e.gallery.isOpen,isAboutOpen:e.about.isOpen}}),s.wU),n=t.isAboutOpen,r=t.isCarouselOpen,i=t.isGalleryOpen,l=n||r||i,c=(0,a.useCallback)((function(){e({type:"Drag.End"}),r?e({type:"Carousel.Close"}):i?e({type:"Gallery.Collapse"}):n&&e({type:"About.Close"})}),[e,n,i,r]),u=O(),f=j(),d=(0,a.useMemo)((function(){return u*E.window(f).FontSize}),[u,f]),h=(0,Be.q_)({opacity:l?1:0,config:E.SpringConfig});
  return(0,o.jsx)(Be.q.div,{className:q(Ea().root,!l),style:{fontSize:d,opacity:h.opacity.to(za,Aa)},onClick:c,children:(0,o.jsx)(er,{enabled:l,children:function(e){return(0,o.jsx)(Be.q.button,{className:Ea().button,style:{opacity:e.to(Fa,Ra)},children:(0,o.jsx)(pn,{})})}})})
},
```

## 17. Gallery item DOM (`ir` content, `ar`, `ur`/`fr` galleryItem, `dr` strip) and gallery root/pageable (`Vr`, `Lr`)

`fr` is rendered inside BOTH the timeline item (timeline=true, animated text) and the hidden gallery strip (timeline=false, used only for measuring).

```js
ir=function(e){
  var t=e.index,n=Re(),r=u.V.project(t),i=Ie((function(e){return e.drag.isDragging})),l=(0,a.useContext)(tr),s=l.playAll,c=l.pauseAll,f=function(e){
    null===e||void 0===e||e.preventDefault(),null===e||void 0===e||e.stopPropagation(),n({type:"Carousel.Open"}),s(),setTimeout(c,1)
  };
  return(0,o.jsx)("div",{className:Mn().content,children:(0,o.jsxs)("div",{className:Mn().columns,children:[(0,o.jsxs)("div",{className:Mn().column,children:[(0,o.jsx)("h2",{className:Mn().title,children:r.title}),(0,o.jsxs)("h3",{className:Mn().subtitle,children:[r.subtitle.map((function(e,t){return(0,o.jsx)("span",{children:e},t)})),(0,o.jsx)("span",{className:Mn().date,children:r.date})]}),!!u.V.project(t).videos&&(0,o.jsx)(er,{enabled:!i,children:function(e){return(0,o.jsx)("div",{className:q(Mn().playButton,i,!1),onClick:f,children:(0,o.jsx)(on,{className:Mn().playIcon,hover:e})})}})]}),(0,o.jsxs)("div",{className:Mn().column,children:[(0,o.jsx)("h4",{className:Mn().team,children:"0"}),(0,o.jsx)("div",{className:Mn().text,children:r.contributors.map((function(e,t){return(0,o.jsx)("span",{children:e},t)}))})]})]})})
},
or=a.memo(ir);
var ar=function(e){
  var t,n,r,i,a=e.index,l=e.width,s=e.animated,c=(0,o.jsx)(or,{index:a});
  return(0,o.jsx)("div",{className:W()(Mn().container,(n={},r=Mn()["container--centered"],i=null===(t=u.V.project(a).image.offset)||void 0===t?void 0:t.centered,r in n?Object.defineProperty(n,r,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[r]=i,n)),style:{width:l},children:s?(0,o.jsx)(Qn,{index:a,children:c}):c})
},
lr=a.memo(ar);
var sr,cr,ur=function(e){
  var t,n,r,i,a=e.index,l=e.itemRef,c=e.timeline,f=Ie((function(e){return{galleryWidth:e.gallery.size.width,project:u.V.project(a)}}),s.wU),d=f.galleryWidth,h=f.project,g=On(h.image),p=j();
  return(0,o.jsxs)("div",{className:W()(Qt().container,(n={},r=Qt()["container--timeline"],i=c,r in n?Object.defineProperty(n,r,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[r]=i,n)),children:[(0,o.jsx)("div",{className:Qt().centerer,style:{minWidth:c?void 0:d,maxHeight:c?g.height:void 0,maxWidth:!c&&(null===(t=h.image.offset)||void 0===t?void 0:t.centered)?d:void 0},children:(0,o.jsxs)("div",{className:Qt().inner,ref:c?void 0:l.container,style:{maxWidth:c?g.width:void 0,maxHeight:c?g.height:void 0,justifyContent:c&&p?"flex-end":void 0},children:[(0,o.jsx)(lr,{index:a,animated:c}),(0,o.jsx)(Sn,{index:a,project:h,imageRef:l.image,timeline:c})]})}),(0,o.jsx)("div",{className:Qt().spacer})]})
},
fr=a.memo(ur),dr=function(){
  var e=(0,a.useContext)(Tt).refs,t=Ie((function(e){return{offset:e.gallery.offset,isGalleryOpen:e.gallery.isOpen,velocity:e.drag.velocity}}),s.wU),n=t.offset,r=t.isGalleryOpen,i=t.velocity,l=S(),c=k(),f=(0,a.useMemo)((function(){return u.V.projects().map((function(t,n){return(0,o.jsx)(fr,{index:n,itemRef:e.current.gallery[n]},n)}))}),[e]);
  return(0,o.jsx)(Ut,{offset:n,animate:c,velocity:i,interruptionId:"gallery",className:r&&l?void 0:zt().hidden,axis:"x",children:f})
},
// ---- gallery root ----
var Vr=function(e){
  var t=e.children,n=Re(),i=Hr((0,a.useContext)(_t).timeline,1)[0].v,l=(0,a.useContext)(Tt).getRect,c=Ie((function(e){return{isPagingActive:e.gallery.isOpen&&!e.carousel.isOpen,canPageLeft:e.gallery.index>0,canPageRight:e.gallery.index<u.V.projects().length-1,dismissY:e.timeline.animation.drag.distYDown/2}}),s.wU),f=c.isPagingActive,d=c.canPageLeft,g=c.canPageRight,p=c.dismissY,m=(0,a.useMemo)((function(){return{onStart:function(e){var t=e.origin,r=e.offset,i=e.context;return n({type:"Gallery.OnDragStart",origin:t,getRect:l,offset:r,onRails:"wheel"===i})},onDrag:function(e){return n({type:"Gallery.OnDrag",delta:r.invert(e)})},onEnd:function(e){return n(Br({type:"Gallery.OnDragEnd"},e))},canPageLeft:function(){return d},canPageRight:function(){return g},getThreshold:function(){return{x:0,y:(0,h.inRange)(i.get(),.1,.9)?0:E.Pageable.EnableYAxisThreshold}},dismissY:p}}),[n,d,g,p,l,i]);
  return(0,o.jsx)(Rr,Br({},m,{isActive:f,children:t}))
},
Lr=function(){
  var e=Ie((function(e){return e.gallery.isOpen&&!e.carousel.isOpen}));
  return(0,o.jsx)("div",{className:q(zt().root,!e),children:(0,o.jsx)(Vr,{children:(0,o.jsx)(Wt,{type:"gallery",children:(0,o.jsx)(hr,{})})})})
},
```

## 18. Timeline row `Yr`/`Zr` (height 530*C(scale), padding, locked offset), scroll sync `xi`, timeline drag/click binding `Vi`/`Ni`



```js
qr=a.createContext({height:0,containerRef:a.createRef()}),Yr=function(e){
  var t=e.children,n=O(),r=j(),i=(0,a.useMemo)((function(){return E.window(r).TimelineHeight*n}),[n,r]),l=(0,a.useRef)(null),s=(0,a.useMemo)((function(){return{height:i,containerRef:l}}),[i]);
  return(0,o.jsx)(qr.Provider,{value:s,children:t})
},
Ur=a.memo(Yr),Zr=function(e){
  var t=e.children,n=(0,a.useContext)(qr),l=n.height,c=n.containerRef,u=k(),f=S(),d=Ie((function(e){return{offset:e.timeline.locked?e.timeline.offset:r.zero(),paddingRight:(i.screen().width-e.timeline.size.width)/2,opacity:e.gallery.isOpen&&f?0:1,velocity:e.drag.velocity}}),s.wU),h=d.offset,g=d.paddingRight,p=d.opacity,m=d.velocity,y=P((0,a.useMemo)((function(){return{maxHeight:l,paddingRight:g,opacity:p}}),[l,g,p]),{});
  return(0,o.jsx)(Ut,{offset:h,animate:u,velocity:m,interruptionId:"timeline",name:"timeline",axis:"x",children:(0,o.jsx)("div",{className:Xr().root,style:y,ref:c,children:t})})
};
// ---- scroll sync ----
xi=function(){
  var e=Re(),t=(0,a.useContext)(bi).scrollTo,n=(0,a.useContext)(qr),r=n.height,i=n.containerRef,o=(0,a.useContext)(_t),l=o.updateScrollP,c=o.getScrollP,u=Ie((function(e){return{isTimelineLocked:e.timeline.locked,offsetX:e.timeline.offset.x,isAboutOpen:e.about.isOpen,size:e.timeline.size}}),s.wU),f=u.isTimelineLocked,d=u.offsetX,h=u.isAboutOpen,g=u.size,p=(0,a.useRef)(),y=function(e){
    var t=(0,a.useRef)(e);
    return(0,a.useEffect)((function(){t.current=e}),[e]),t
  }
  (h),v=x(f),_=!f&&v;
  D((function(){_&&t({x:d,y:0},!1,!0)}),[d,_,t]),m("scroll",(0,a.useCallback)((function(){e({type:"Window.Scroll"}),l(),clearTimeout(p.current),p.current=setTimeout(l,350)}),[e,l]),!f);
  var w=(0,a.useCallback)((function(){if(e({type:"Timeline.UpdateShine",height:r}),document.body.scrollTo({left:c()*(document.body.scrollWidth-window.innerWidth)}),y.current){var t,n,o=null!==(n=null===(t=i.current)||void 0===t?void 0:t.getBoundingClientRect().width)&&void 0!==n?n:0,a=Math.round(o+(window.innerWidth-g.width)/2);e({type:"Timeline.OnAboutResize",x:-c()*(a-window.innerWidth)})}}),[r,e,i,y,g,c]);
  return b(w),null
},
// ---- timeline drag binding ----
var Vi=function(e){
  var t=e.children,n=Re(),r=(0,a.useContext)(_t),i=Hi(r.timeline,1)[0].v,l=r.controller,s=(0,a.useContext)(Tt).getRect,c=Ie((function(e){return!e.gallery.isOpen&&!e.about.isOpen})),u=(0,a.useMemo)((function(){return{onStartImmediate:function(){var e;return null===(e=l.current)||void 0===e?void 0:e.onTimelineDrag()},onStart:function(e){var t=e.origin,r=e.context;return n({type:"Timeline.OnDragStart",origin:t,getRect:s,onRails:"wheel"===r})},onDrag:function(e){return n({type:"Timeline.OnDrag",delta:e})},onEnd:function(e){var t,r=e.locked,i=e.velocity,o=e.origin;null===(t=l.current)||void 0===t||t.onTimelineDrag(),n({type:"Timeline.OnDragEnd",locked:r,velocity:i,origin:o,getRect:s})},getThreshold:function(){return{x:0,y:(0,h.inRange)(i.get(),.1,.9)?0:E.Pageable.EnableYAxisThreshold}},axis:"y",scrollAxis:"x"}}),[n,s,i]);
  return(0,o.jsx)(Ii,function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},r=Object.keys(n);"function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){Bi(e,t,n[t])}))}return e}({target:document.body,isActive:c},u,{children:t}))
},
Li=a.memo(Vi),Ni=function(){
  var e=Ie((function(e){return e.timeline.locked}));
  return(0,o.jsx)(Ur,{children:(0,o.jsx)(Wt,{type:"timeline",locked:e,children:(0,o.jsx)(Zr,{children:(0,o.jsx)(ri,{children:(0,o.jsx)(Li,{children:(0,o.jsx)(ji,{})})})})})})
},
```

## 19. Mouse/touch binding `mr`, pageable `Fr` (keyboard: Escape/ArrowDown dismiss, ArrowLeft/Right page; wheel), swipe helper `sr`



```js
function mr(e){
  var t,n=e.target,i=e.onStart,o=e.onMove,l=e.onEnd,s=e.isActive,c=(0,a.useRef)(r.zero()),u=(0,a.useRef)(!1),f=(0,a.useCallback)((function(e){u.current=!1,l(e)}),[l]),d=(0,a.useCallback)((function(e){u.current=!0,c.current={x:e.clientX,y:e.clientY},s&&i(c.current,e)}),[i,s]),h=(0,a.useCallback)((function(e){if(u.current){var t={x:e.clientX,y:e.clientY},n=r.add(t,r.invert(c.current));o(n,e),c.current=t}}),[o]),g=(0,a.useCallback)((function(e){u.current=!0;var t=e.touches[0];c.current={x:t.clientX,y:t.clientY},i(c.current,e)}),[i]),m=(0,a.useCallback)((function(e){var t=e.touches[0],n={x:t.clientX,y:t.clientY},i=r.add(n,r.invert(c.current));o(i,e),c.current=n}),[o]),v=!E.IsTouchDevice&&s,b=E.IsTouchDevice&&s,x=null!==(t=null===n||void 0===n?void 0:n.current)&&void 0!==t?t:window;
  y("mousedown",d,x,v),p("mousemove",h,v),y("mouseup",f,x,v),y("mouseleave",f,x,v),y("touchstart",g,x,b),p("touchmove",m,b),y("touchend",f,x,b)
}
(cr=sr||(sr={})).shouldSwipe=function(e,t,n,r){
  return(e>n||t>r)&&t>-r
},
cr.dismissDist=function(){
  return i.screen().height*E.Pageable.DragDismissDistanceMultiplier
};
// ---- pageable ----
var Fr=function(e){
  var t=e.children,n=Ar(e,["children"]),i=(0,a.useRef)(null);
  return function(e){
    var t=e.isActive,n=e.onStart,i=e.onDrag,o=e.onEnd,l=e.canPageLeft,s=e.canPageRight,c=e.dismissY,u=void 0===c?0:c,f=e.shouldLock,d=e.getThreshold,h=void 0===d?function(){
      return{
        x:0,y:E.Pageable.EnableYAxisThreshold
      }
    }
    :d,g=e.target,m=(0,a.useRef)(new Er),y=(0,a.useContext)(Nt),v=y.interrupt,b=y.resume,x=(0,a.useCallback)((function(e,t){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"mouse";m.current.onStart({origin:e,threshold:null!==t&&void 0!==t?t:h(),offset:v(),callback:n,shouldLock:f,context:r})}),[n,v,h,f]),_=(0,a.useCallback)((function(e){if(!m.current.isDragging())return r.zero();var t=m.current.onDrag(e);return i(r.add(m.current.offset(),t)),t}),[i]),w=(0,a.useCallback)((function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:E.Pageable.DragVelocityThreshold,t=!(arguments.length>1&&void 0!==arguments[1])||arguments[1];if(m.current.isDragging()){var n=m.current.velocity(),r=m.current.delta(),i=m.current.offset(),a=t&&!m.current.hasMoved(),l="none";if(!m.current.lock().y&&sr.shouldSwipe(r.y,n.y,u,e))i={y:0,x:r.x},a=!0;else if(m.current.shouldPage(e)){l=(Math.abs(n.x)>e?n:r).x<0?"right":"left"}b(),m.current.onStop(),o({hasMoved:m.current.hasMoved(),offset:i,velocity:n,dismiss:a,direction:l})}}),[o,u,b]);
    mr((0,a.useMemo)((function(){return{onStart:function(e,t){return!ie(t.target,"data-clickable")&&x(e)},onMove:_,onEnd:function(e){return w(E.Pageable.DragVelocityThreshold,!ie(e.target,"data-undismissable"))},isActive:t,target:g}}),[x,_,w,t,g])),br((0,a.useCallback)((function(e,t,n){e.preventDefault(),e.stopPropagation(),m.current.isDragging()||x({x:window.innerWidth/2,y:0},{x:E.Pageable.WheelStartThreshold,y:E.Pageable.WheelStartThreshold},"wheel"),_({x:m.current.lock().x?0:t.x,y:t.y}),(m.current.shouldIgnoreWheel(l(),s())?m.current.shouldWheelBounce():m.current.shouldCollapse()||m.current.shouldPage())&&(w(E.Pageable.WheelVelocityThreshold),n.disableWheel())}),[_,x,w,l,s]),(0,a.useCallback)((function(){return w(E.Pageable.WheelVelocityThreshold)}),[w]),t,!0),p("keydown",(0,a.useCallback)((function(e){switch(e.key){case"ArrowRight":return o({direction:"right"});case"ArrowLeft":return o({direction:"left"});case"ArrowDown":case"Escape":return o({hasMoved:!1,offset:m.current.offset(),dismiss:!0})}}),[o]),t);
    var j=(0,a.useRef)(0);
    p("wheel",(0,a.useCallback)((function(e){return j.current+=e.deltaY+e.deltaX,j.current>200?(j.current=0,o({direction:"right"})):j.current<-200?(j.current=0,o({direction:"left"})):void 0}),[o]),t&&!re())
  }
  (function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},r=Object.keys(n);"function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){zr(e,t,n[t])}))}return e}({},n,{target:i})),(0,o.jsx)("div",{className:q(pr().root,!n.isActive),ref:i,children:t})
},
```

## 20. Header (`Yi` date spring 400/30 clamp, `to` header, `ro` root) and cursor target `Jn`



```js
Yi=function(){
  var e=function(){
    var e=Re(),t=Ie((function(e){return{scrollX:e.scroll.x,isTimelineLocked:e.timeline.locked,date:e.timeline.date,rects:e.geometry.rects.timeline}}),s.wU),n=t.scrollX,r=t.isTimelineLocked,o=t.date,l=t.rects,c=x(o),f=x(n);
    return(0,a.useEffect)((function(){if(n!==f)if(n<=0)e({type:"Timeline.SetDate",date:(new Date).getFullYear()});else{var t,r=function(e,t){var n=0,r=void 0,o=void 0,a=window.innerWidth/2+t;if(t<10)return u.V.project(0);if(t>document.body.scrollWidth-i.screen().width-10)return u.V.project(u.V.last());for(var l=0;l<e.length;l++){var s=e[l].container;s&&(r=Math.min(Math.abs(s.left-a),Math.abs(s.right-a)),(void 0===o||r<o)&&(o=r,n=l))}return u.V.project(n)}(l,n);e({type:"Timeline.SetDate",date:null!==(t=null===r||void 0===r?void 0:r.date)&&void 0!==t?t:0})}}),[n,f,e,l]),(0,Be.q_)({val:o,from:{val:c},immediate:r,config:E.DateSpringConfig})
  }
  ();
  return(0,o.jsx)(Be.q.div,{className:qi()["header-date"],children:e.val.to((function(e){return Math.round(e)}))})
};
var Ui=function(e){
  var t=e.title,n=e.href,r=e.className,i=e.target,l=e.onClick,s=e.inline,c=(0,a.useCallback)((function(e){n&&(null===e||void 0===e||e.stopPropagation(),window.open(n,i)),l&&l()}),[l,n,i]),u=(0,a.useCallback)((function(e){return(0,o.jsx)(Be.q.span,{className:r,onClick:c,"data-clickable":!0,style:{color:e.to([0,1],["rgba(0, 0, 0, 0.4)","rgba(0, 0, 0, 1)"])},children:t})}),[r,t,c]);
  return(0,o.jsx)(er,{inline:s,children:u})
},
Zi=a.memo(Ui);
function Qi(e,t,n){
  return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e
}
function Ki(e){
  for(var t=1;t<arguments.length;t++){
    var n=null!=arguments[t]?arguments[t]:{
    },
    r=Object.keys(n);
    "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){Qi(e,t,n[t])}))
  }
  return e
}
var $i=u.V.about().links,Ji=$i.Twitter,eo=$i.Instagram,to=function(){
  var e=Re(),t=Ie((function(e){return e.gallery.isOpen})),n=O(),r=j(),i=(0,a.useCallback)((function(){return e({type:"About.Open"})}),[e]),l=(0,a.useMemo)((function(){return r?{}:{transform:"scale(".concat(n,")")}}),[r,n]),s=(0,a.useMemo)((function(){return[{onClick:i,title:"About"},{title:"Twitter",href:Ji,target:"_twitter"},{title:"Instagram",href:eo,target:"_insta"}]}),[i]);
  return(0,o.jsxs)("div",{className:qi().header,children:[(0,o.jsxs)("div",{className:qi()["header-title-container"],style:l,children:[(0,o.jsx)("div",{className:qi()["header-title"],children:"Mike Matas"}),(0,o.jsx)(Yi,{})]}),(0,o.jsx)("div",{className:q(qi()["header-nav"],t),style:l,children:(0,o.jsx)("div",{className:qi()["header-nav-inner"],children:s.map((function(e,t){return(0,o.jsx)("div",{children:(0,o.jsx)(Zi,Ki({},e,{className:qi()["header-nav-item"]}))},t)}))})})]})
},
no=a.memo(to),ro=function(){
  return(0,o.jsx)("div",{className:qi().root,children:(0,o.jsx)(Wt,{type:"fixed",children:(0,o.jsx)(oi,{children:(0,o.jsx)(Rn,{children:(0,o.jsx)(no,{})})})})})
},
// ---- cursor target (hover -> Cursor.Contract) ----
var Jn=function(e){
  var t=e.enabled,n=void 0===t||t,r=e.inline,i=e.className,l=e.children,s=Re(),c=(0,a.useRef)(null),u=(0,a.useState)(!1),f=u[0],d=u[1],h=(0,a.useCallback)((function(){n&&(!E.IsTouchDevice&&d(!0),s({type:"Cursor.Contract"}))}),[n,s]),g=(0,a.useCallback)((function(){n&&(!E.IsTouchDevice&&d(!1),s({type:"Cursor.Expand"}))}),[n,s]);
  (0,a.useEffect)((function(){n||(d(!1),s({type:"Cursor.Expand"}))}),[n,s]);
  var p,m,y,v=(0,a.useCallback)((function(e){e.stopPropagation(),d(!0)}),[]),b=(0,a.useCallback)((function(){return d(!1)}),[]),x=M((0,a.useCallback)((function(){return d(!1)}),[])),_=(0,Be.q_)({hover:f?1:0,config:E.Cursor.ScaleSpring,immediate:!x});
  return(0,o.jsx)("span",{className:W()($n().target,i,(p={},m=$n()["target--inline"],y=r,m in p?Object.defineProperty(p,m,{value:y,enumerable:!0,configurable:!0,writable:!0}):p[m]=y,p)),onMouseEnter:h,onMouseLeave:g,onTouchStart:v,onTouchEnd:b,ref:c,"data-clickable":!0,children:!!l&&l(_.hover)})
},
```

## 21. Cursor (`va` scale/down springs, `xa` xy spring pair, `Ta` root follows pointer directly, `Da` edge vector)



```js
va=function(e){
  var t=e.visibility,n=Ie((function(e){return e.cursor.scale})),r=(0,a.useState)(!1),i=r[0],l=r[1],s=(0,a.useCallback)((function(){return l(!0)}),[]),c=(0,a.useCallback)((function(){return l(!1)}),[]),u=(0,Be.q_)({scale:n,config:E.Cursor.ScaleSpring}),f=(0,Be.q_)({transform:"scale(".concat(i?E.Cursor.ScaleDown:1,")"),config:E.Cursor.DownSpring});
  return p("mousedown",s),p("mouseup",c),(0,o.jsx)(Be.q.div,{className:$n().transform,style:u,children:(0,o.jsx)(Be.q.div,{className:$n().transform,style:f,children:(0,o.jsx)(Be.q.div,{className:$n().cursor,style:t})})})
},
ba=a.memo(va);
var xa=function(){
  function e(t){
    !function(e,t){
      if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")
    }
    (this,e),this._x=new Be.Qr({x:0,config:t}),this._y=new Be.Qr({y:0,config:t}),this._value={
      x:this._x.springs.x,y:this._y.springs.y
    }
  }
  var t=e.prototype;
  return t.set=function(e){
    this._x.set({x:e.x}),this._y.set({y:e.y})
  },
  t.start=function(e){
    var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:r.zero();
    this._x.start({x:e.x,config:{velocity:t.x}}),this._y.start({y:e.y,config:{velocity:t.y}})
  },
  t.pause=function(){
    this._x.pause(),this._y.pause()
  },
  t.resume=function(){
    this._x.resume(),this._y.resume()
  },
  t.value=function(){
    return this._value
  },
  e
}
(),_a=function(e){
  var t,n=e.spring,r=e.classNames,i=void 0===r?[]:r,a=e.children;
  return(0,o.jsx)(Be.q.div,{className:i[0],style:{transform:n.value().x.to((function(e){return"translate3d(".concat(e,"px, 0px, 0px)")}))},children:(0,o.jsx)(Be.q.div,{className:null!==(t=i[1])&&void 0!==t?t:i[0],style:{transform:n.value().y.to((function(e){return"translate3d(0px, ".concat(e,"px, 0px)")}))},children:a})})
},
wa=a.memo(_a);
function ja(e,t){
  (null==t||t>e.length)&&(t=e.length);
  for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];
  return r
}
function Ca(e,t,n){
  return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e
}
function Oa(e){
  for(var t=1;t<arguments.length;t++){
    var n=null!=arguments[t]?arguments[t]:{
    },
    r=Object.keys(n);
    "function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){Ca(e,t,n[t])}))
  }
  return e
}
function Sa(e,t){
  return function(e){
    if(Array.isArray(e))return e
  }
  (e)||function(e,t){
    var n=null==e?null:"undefined"!==typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];
    if(null!=n){
      var r,i,o=[],a=!0,l=!1;
      try{
        for(n=n.call(e);!(a=(r=n.next()).done)&&(o.push(r.value),!t||o.length!==t);a=!0);
      }
      catch(s){
        l=!0,i=s
      }
      finally{
        try{
          a||null==n.return||n.return()
        }
        finally{
          if(l)throw i
        }
      }
      return o
    }
  }
  (e,t)||function(e,t){
    if(!e)return;
    if("string"===typeof e)return ja(e,t);
    var n=Object.prototype.toString.call(e).slice(8,-1);
    "Object"===n&&e.constructor&&(n=e.constructor.name);
    if("Map"===n||"Set"===n)return Array.from(n);
    if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return ja(e,t)
  }
  (e,t)||function(){
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
  }
  ()
}
var ka=E.Cursor.Size/2,Ma=[$n().transform],Ta=function(){
  var e,t=M(),n=(0,a.useState)(r.zero()),i=n[0],l=n[1],s=(0,a.useRef)(i),c=(0,a.useRef)(new Xe),u=(0,a.useRef)(!1),f=(e=E.Cursor.DownSpring,(0,a.useRef)(new xa(e)).current),d=Sa((0,Be.q_)((function(){return{opacity:0,transform:"scale(".concat(.1,")")}})),2),h=d[0],g=d[1],y=(0,a.useCallback)((function(e){if(!u.current&&t){var n=Sa(Da(e),2),i=n[0],o=n[1];setTimeout((function(){Math.abs(i)<E.Cursor.EdgeDistance?(g.set({opacity:1,transform:"scale(1)"}),f.set(o),f.start(r.zero())):(g.set({opacity:0,transform:"scale(".concat(.1,")")}),f.set(r.zero()),g.start({opacity:1,transform:"scale(1)"}))}),5),u.current=!0,document.body.classList.remove("cursor-visible")}}),[g,f,t]),v=(0,a.useCallback)((function(){if(u.current){var e=c.current.velocity(),t=Sa(Da(c.current.last(),e),2),n=t[0],r=t[1];Math.abs(n)>E.Cursor.EdgeDistance&&Math.abs(e.x)<1&&Math.abs(e.y)<1?g.start({opacity:0,transform:"scale(".concat(.1,")")}):f.start(r,e),u.current=!1,document.body.classList.add("cursor-visible")}}),[f,g]),x=(0,a.useCallback)((function(e){s.current={x:e.clientX-ka,y:e.clientY-ka},l(s.current),c.current.push({x:e.clientX,y:e.clientY}),e.clientX<10||e.clientX>window.innerWidth-10||e.clientY<10||e.clientY>window.innerHeight-10?v():y({x:e.clientX,y:e.clientY})}),[y,v]);
  return b((0,a.useCallback)((function(e){(e.x>0&&s.current.x>0||e.y>0&&s.current.y>0)&&(s.current=r.add(s.current,e),l(s.current))}),[])),p("mousemove",x,t),p("blur",v),m("mouseleave",v),(0,o.jsx)("div",{className:$n().root,style:{transform:"translate3d(".concat(i.x,"px, ").concat(i.y,"px, 0px)")},children:(0,o.jsx)(wa,{spring:f,classNames:Ma,children:(0,o.jsx)(ba,{visibility:h})})})
};
function Da(e){
  var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:r.zero(),n=i.screen(),o=n.width,a=n.height,l={
    left:e.x,top:e.y,bottom:a-e.y,right:o-e.x
  },
  s=(0,h.minBy)(Object.keys(l),(function(e){return l[e]})),c=Oa({},r.zero());
  switch(s){
    case"right":c.x=l.right+ka,c.y=0===t.x?0:t.y/t.x*c.x;
    break;
    case"left":c.x=-l.left-ka,c.y=0===t.x?0:t.y/t.x*c.x;
    break;
    case"top":c.y=-l.top-ka,c.x=0===t.y?0:t.x/t.y*c.y;
    break;
    case"bottom":c.y=l.bottom+ka,c.x=0===t.y?0:t.x/t.y*c.y
  }
  return[l[s],c]
}
```

## 22. App root `La` (DOM order of layers)



```js
La=function(){
  var e=function(){
    var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:10,t=(0,a.useState)(!1),n=t[0],r=t[1];
    return(0,a.useEffect)((function(){var t=setTimeout((function(){return r(!0)}),e);return function(){return clearTimeout(t)}}),[e]),n
  }
  (250),t=M(),n=(0,a.useState)(!1),r=n[0],i=n[1],l=(0,Be.q_)({opacity:e?1:0}),s=(0,a.useState)(!1),c=s[0],u=s[1];
  return(0,a.useEffect)((function(){return u(E.Cursor.ShouldRender)}),[]),(0,a.useEffect)((function(){return oe.track("Page View")}),[]),(0,a.useEffect)((function(){return i(ne()&&navigator.userAgent.includes("Mac"))}),[]),(0,a.useEffect)((function(){re()&&document.body.classList.add("disable-overscroll")}),[]),(0,o.jsxs)(Be.q.div,{style:l,className:W()("",{"window-inactive":!t,"ios-device":r}),children:[(0,o.jsx)(Va,{}),c&&(0,o.jsx)(Ta,{}),(0,o.jsx)(io,{}),(0,o.jsxs)(rr,{children:[(0,o.jsxs)(Xt,{children:[(0,o.jsx)(Nr,{}),(0,o.jsx)(Gi,{})]}),(0,o.jsx)(ma,{})]}),(0,o.jsx)(Co,{}),(0,o.jsx)(Ia,{}),(0,o.jsx)(ya,{})]})
},
```

## 23. OPTIONAL phase 2: draggable timeline scroller `zi` (wheel/drag on body, overscroll spring 550/50)



```js
function zi(e){
  var t=e.target,n=e.isActive,o=e.onStart,l=e.onDrag,s=e.onEnd,c=e.onStartImmediate,u=e.dismissable,f=void 0!==u&&u,d=e.axis,h=void 0===d?"xy":d,g=e.scrollAxis,y=void 0===g?"xy":g,v=e.getThreshold,b=void 0===v?function(){
    return{
      x:0,y:E.Pageable.EnableYAxisThreshold
    }
  }
  :v,x=(0,a.useState)(!1),_=x[0],w=x[1],j=(0,a.useState)(r.zero()),C=j[0],O=j[1],S=(0,a.useState)(r.zero()),k=S[0],M=S[1],T=(0,a.useRef)(!0),D=(0,a.useRef)(0),P=(0,a.useRef)(new Ei(h)),z=(0,a.useRef)(!1),A=(0,a.useContext)(Nt),F=A.interrupt,R=A.resume,I=(0,a.useCallback)((function(e){var n=Ai(t),r=n.width,i=n.height;return"y"!==y&&(e.x<0||e.x>r)||"x"!==y&&(e.y<0||e.y>i)}),[t,y]),W=(0,a.useCallback)((function(e,n){var i=arguments.length>2&&void 0!==arguments[2]&&arguments[2],o=arguments.length>3&&void 0!==arguments[3]&&arguments[3];if(o||t.scrollTo({left:e.x,top:e.y}),!I(e))return r.zero();var a=n&&(!f||e.y>0),l=Ai(t),s=l.width,c=l.height,u=n?Y(e.x,0,s):e.x,d=a?Y(e.y,0,c):e.y,h={x:u>0?u-s:u,y:d>0?d-c:d};return O(r.directional(h,y)),i&&!r.isZero(h)&&(w(!0),setTimeout((function(){w(!1),O(r.zero())}),0)),h}),[t,I,y,f]),B=(0,a.useCallback)((function(e){var t=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],n=arguments.length>2&&void 0!==arguments[2]&&arguments[2];return W(r.add(P.current.pos(),e),t,!1,n)}),[W]),H=(0,a.useCallback)((function(e,t,n){var i=performance.now(),o=i-t,a=Fi(e,o),l=r.scale(a,i-n),s=Math.abs(a.x)>.01&&y.includes("x"),c=Math.abs(a.y)>.01&&y.includes("y");if((0===o||s||c)&&Math.sign(a.x)===Math.sign(e.x)){var u=B(l,!1);P.current.onDrag(l),0===u.x?D.current=requestAnimationFrame((function(){return H(e,t,i)})):D.current=requestAnimationFrame((function(){var n=Fi(e,performance.now()-t);M({x:-Math.abs(n.x/u.x),y:0}),w(!1),O(r.zero())}))}else w(!1),O(r.zero())}),[B,y]),V=(0,a.useCallback)((function(e,n){var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"mouse";P.current.onStart({origin:{x:t.scrollLeft,y:t.scrollTop},callbackOrigin:e,threshold:null!==n&&void 0!==n?n:b(),offset:r.scale(F("draggable"),1/E.Pageable.SpringConstant),context:i,callback:o}),M(r.zero()),z.current=f&&t.scrollTop<10,c&&c()}),[t,o,f,b,F,c]),L=(0,a.useCallback)((function(e){return P.current.isDragging()?(P.current.onDrag(r.add(e,r.invert(P.current.offset()))),!P.current.lock().y&&l(e),P.current.hasMoved()&&w(!0),"y"===y?r.invert(e):e):r.zero()}),[l,y]),N=(0,a.useCallback)((function(){var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(P.current.isDragging()){var t=!1;z.current?(t=sr.shouldSwipe(-P.current.delta().y,-P.current.velocity().y,sr.dismissDist(),E.Pageable.DragVelocityThreshold),M(r.directional(r.invert(P.current.velocity()),y)),O(t?{x:0,y:-i.screen().height}:r.zero())):(M(r.zero()),O(r.zero())),R(),P.current.onStop(),s({locked:P.current.lock().y||!P.current.lock().x&&Math.abs(P.current.initialVelocity().x)>1,velocity:P.current.velocity(),delta:P.current.delta(),origin:P.current.origin(),close:t||!P.current.hasMoved()}),w(e)}}),[s,R,y]);
  mr((0,a.useMemo)((function(){return{onStart:function(e,t){ie(t.target,"data-clickable")||(V(e),T.current=!0,cancelAnimationFrame(D.current))},onMove:function(e,t){if(P.current.isDragging()){var n=L(r.invert(e));t.type.includes("mouse")?(B(r.directional(n,y)),T.current=function(e){return e.clientX<0||e.clientX>window.innerWidth||e.clientY<0||e.clientY>window.innerHeight}(t)):z.current&&P.current.delta().y<0&&(t.preventDefault(),B(r.directional(n,y)))}},onEnd:function(e){if(P.current.isDragging()){var t=e.type.includes("mouse")&&!I(P.current.pos());if(N(t),t&&!P.current.lock().x&&P.current.hasMoved()){var n=performance.now(),r=P.current.velocity();H(r,n,n)}}},isActive:n}}),[n,V,L,N,I,H,B,y]));
  var G=(0,a.useRef)(!1),X=(0,a.useCallback)((function(e){var n=r.directional({x:e.deltaX,y:e.deltaY},y);if(cancelAnimationFrame(D.current),!re())return e.preventDefault(),void document.body.scrollBy(e.deltaX+e.deltaY,0);P.current.trackWheelPos({x:e.deltaX,y:e.deltaY}),f&&e.preventDefault(),P.current.wheelWillOverscroll(t,n,y)?(e.preventDefault(),G.current&&!P.current.isDragging()&&(O((function(e){return{x:e.x+Number.EPSILON,y:0}})),M({x:-P.current.wheelVelocity().x,y:0})),G.current=!1):(G.current||(O(r.zero()),M(r.zero())),G.current=!0)}),[t,y,f]);
  br((0,a.useCallback)((function(e,n,i){P.current.isDragging()||V({x:window.innerWidth/2,y:0},{x:E.Pageable.WheelStartThreshold,y:E.Pageable.WheelStartThreshold},"wheel");var o=P.current.wheelCanOverscrollX(t,n,y),a=L(r.invert(n));if((f||o)&&(B(a,!0,!0),o&&P.current.shouldWheelEnd()))return N(),void i.disableWheel();!P.current.lock().y&&0===P.current.threshold().y&&Math.abs(P.current.delta().y)>200&&(N(),i.disableWheel())}),[V,L,N,B,f,t,y]),N,n);
  var q=(0,a.useCallback)((function(){var e=P.current.pos();!P.current.isDragging()||T.current||r.equal(e,{x:document.body.scrollLeft,y:document.body.scrollTop})||document.body.scrollTo({left:e.x,top:e.y})}),[]);
  return(0,a.useEffect)((function(){n&&f&&(w(!0),O(r.zero()),M(r.zero()),t.scrollTo({left:0,top:0}))}),[n,f,t]),p("wheel",X,n),m("scroll",q,n),{
    isScrolling:_,overscroll:C,terminalVelocity:k,scrollTo:W,scrollBy:B
  }
}
function Ai(e){
  var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"xy";
  return{
    width:"y"===t?0:e.scrollWidth-e.clientWidth,height:"x"===t?0:e.scrollHeight-e.clientHeight
  }
}
function Fi(e,t){
  return r.scale(e,Math.pow(E.DragDecayMultiplier,t/16.666666666666668))
}
```

## 24. react-spring: default config `kt` and `advance()` integrator (335 bundle)

Force per 1 ms step: v += (1e-6*-tension*(pos-to) + .001*-friction*v)/mass; pos += v. Done when |v|<=restVelocity (= precision/10) AND |to-pos|<=precision. `clamp:true` => bounce=0 => on crossing the target: v=0, pos=to.

```js
var kt={
  tension:170,friction:26,mass:1,damping:1,easing:be.linear,clamp:!1
};
function Et(e,t){
  if(x.und(t.decay)){
    let r=!x
// ---- advance ----
advance(e){
      let t=!0,r=!1,n=this.animation,{
        config:o,toValues:i
      }
      =n,a=et(n.to);
      !a&&Se(n.to)&&(i=A(Oe(n.to))),n.values.forEach(((u,s)=>{if(u.done)return;let l=u.constructor==nt?1:a?a[s].lastPosition:i[s],c=n.immediate,f=l;if(!c){if(f=u.lastPosition,o.tension<=0)return void(u.done=!0);let t,r=u.elapsedTime+=e,i=n.fromValues[s],a=null!=u.v0?u.v0:u.v0=x.arr(o.velocity)?o.velocity[s]:o.velocity,d=o.precision||(i==l?.005:Math.min(1,.001*Math.abs(l-i)));if(x.und(o.duration))if(o.decay){let e=!0===o.decay?.998:o.decay,n=Math.exp(-(1-e)*r);f=i+a/(1-e)*(1-n),c=Math.abs(u.lastPosition-f)<=d,t=a*n}else{t=null==u.lastVelocity?a:u.lastVelocity;let r,n=o.restVelocity||d/10,s=o.clamp?0:o.bounce,p=!x.und(s),h=i==l?u.v0>0:i<l,y=!1,m=1,v=Math.ceil(e/m);for(let e=0;e<v&&(r=Math.abs(t)>n,r||(c=Math.abs(l-f)<=d,!c));++e){p&&(y=f==l||f>l==h,y&&(t=-t*s,f=l)),t+=(1e-6*-o.tension*(f-l)+.001*-o.friction*t)/o.mass*m,f+=t*m}}else{let n=1;o.duration>0&&(this._memoizedDuration!==o.duration&&(this._memoizedDuration=o.duration,u.durationProgress>0&&(u.elapsedTime=o.duration*u.durationProgress,r=u.elapsedTime+=e)),n=(o.progress||0)+r/this._memoizedDuration,n=n>1?1:n<0?0:n,u.durationProgress=n),f=i+o.easing(n)*(l-i),t=(f-u.lastPosition)/e,c=1==n}u.lastVelocity=t,Number.isNaN(f)&&(console.warn("Got NaN while animating:",this),c=!0)}a&&!a[s].done&&(c=!1),c?u.done=!0:t=!1,u.setValue(f,o.round)&&(r=!0)}));
```

## 25. react-spring: `AnimatedValue.reset()` (velocity kept when mid-flight), `SpringValue.set()`, `_merge` velocity handling, rafz frame dt clamp

`reset()`: `lastVelocity` is nulled only if the value was `done` -> a retarget mid-flight keeps momentum. `_merge`: `config.velocity` is reset to 0 when `to` changes, then overwritten by the passed config (only used as v0 when starting from rest). rafz: dt = min(64, now-last), first frame 16.667.

```js
reset(){
  let{
    done:e
  }
  =this;
  this.done=!1,x.num(this._value)&&(this.elapsedTime=0,this.durationProgress=0,this.lastPosition=this._value,e&&(this.lastVelocity=null),this.v0=nu
// ---- set ----
set(e){return o.batchedUpdates((()=>{this._stop(),this._focus(e),this._set(e)})),this}paus
// ---- _merge (velocity) ----
let y=Pt(t.to),{config:m}=s,{decay:v,velocity:g}=m;(n||i)&&(m.velocity=0),t.config&&!y&&function(e,t,r){r&&(Et(r={...r},t),t={...r,...t}),Et
// ---- rafz update loop ----
function g(){let e=d;d=o.now();let t=c(d);t&&(w(l.splice(0,t),(e=>e.handler())),p-=t),p?(a.flush(),n.flush(e?Math.min(64,d-e):16.667),u.flush(),i.flush(),s.flush()):d=-1}function b(){let e=new Set,t=e;return{add(r){p+=t!=e||e.has(
```
