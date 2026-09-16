/* §2 §5 — reported directly: "it suggests hinged doors at 1 metre?" A wide
   wardrobe-planner frame switched to hinged doors defaulted to frontCount:1
   — one door spanning the whole frame — because the sensible width-based
   default (generateWardrobePlanner's own "2 doors past 650 mm" heuristic)
   only ever ran at the moment a frame was FIRST created, never when an
   existing frame's front type changed. Every new frame is created with an
   explicit frontCount:1, so that heuristic's `||` fallback could never
   fire, and switching a 1000+ mm frame to "Hinged doors" always produced
   one door of the frame's full width — comfortably over R.maxDoorW (600 mm),
   immediately flagged by validate() as a hinge-straining door. */
const {boot,suite}=require('./harness');
const t=suite('10-planner-front-default · a wide frame does not default to a single oversized hinged door');
const h=boot(),{$,click,doc,W}=h;
const mm=v=>Math.round(v*10);

const cb=doc.getElementById('noPhoto'); cb.checked=true; cb.dispatchEvent(new h.W.Event('change',{bubbles:true}));
click($('[data-p="wardrobe"]'));
h.assertNoErrors();

/* make the frame comfortably wide — wider than the 650 mm threshold */
W.VAN.cfg.wardrobePlanner.frames[0].w=mm(1400);
W.VAN.cfg.wardrobePlanner.frames[0].frontCount=1;   /* the untouched default every frame starts with */
W.eval('WPSEL=null'); // force renderWardrobePlanner to resolve WPSEL to frame 0 again
click($('[data-wp-tab="fronts"]'));
h.assertNoErrors();

click($('[data-wp-front="hinged"]'));
h.assertNoErrors();
const f=W.VAN.cfg.wardrobePlanner.frames[0];
t.ok('a 1400 mm frame switched to hinged doors gets more than one front',
  f.frontCount>1, 'frontCount='+f.frontCount);

const {res,fit}=W.VAN.build();
const doorWarn=W.validate(W.VAN.cfg,fit,res).find(m=>m.l==='warn'&&/vDoorWide|too wide|Doors/.test(m.t));
t.ok('no "door too wide" warning fires for the resulting default',
  !doorWarn, doorWarn&&doorWarn.t);

/* an explicit, deliberate front count must NOT be silently overridden */
const f2=W.VAN.cfg.wardrobePlanner.frames[0];
f2.frontCount=3;
click($('[data-wp-front="sliding"]'));
click($('[data-wp-front="hinged"]'));
t.ok('an explicit front count survives switching front type back and forth',
  W.VAN.cfg.wardrobePlanner.frames[0].frontCount===3, W.VAN.cfg.wardrobePlanner.frames[0].frontCount);

t.report();
