/* §10 "PARAMETRIC GEOMETRY TESTING" — extreme, invalid and adversarial
   inputs must never crash the app or produce impossible geometry (negative
   sizes, NaN dimensions) even when they arrive somewhere other than the
   measurement boxes (e.g. a corrupted autosave, or an AI recognition result
   with an absurd door count). */
const {boot,toStep3,suite}=require('./harness');
const t=suite('05-boundary-values · extreme and invalid input never corrupts geometry');
const h=boot(),{$,$$,click,setIn,doc,W}=h;
const mm=v=>Math.round(v*10);

const svgHasNaN=svg=>svg&&/NaN/.test(svg);
const allBoxesFinite=res=>res.parts.every(p=>p.boxes.every(b=>
  [b.x,b.y,b.z,b.w,b.h,b.d].every(v=>Number.isFinite(v))));
const noNegativeSizes=res=>res.parts.every(p=>p.boxes.every(b=>b.w>=0&&b.h>=0&&b.d>=0));

/* ── UI-level: extreme, boundary, negative, decimal, empty and garbage text
   in the measurement fields, through the real inputs ── */
toStep3(h,{shape:'tallmix'});
const cases=[
  ['minimum', {wT:200,wM:200,wB:200,hL:200,hC:200,hR:200}],
  ['maximum', {wT:12000,wM:12000,wB:12000,hL:5000,hC:5000,hR:5000}],
  ['negative', {wT:-500,wM:-500,wB:-500,hL:-100,hC:-100,hR:-100}],
  ['zero',     {wT:0,wM:0,wB:0,hL:0,hC:0,hR:0}],
  ['decimal',  {wT:1234.6,wM:1234.4,wB:1234.5,hL:2000.9,hC:1999.1,hR:2000.5}],
  ['empty',    {wT:'',wM:'',wB:'',hL:'',hC:'',hR:''}],
  ['garbage',  {wT:'abc',wM:'--',wB:'12,,34',hL:'NaN',hC:'∞',hR:'  '}],
];
for(const [label,vals] of cases){
  for(const id in vals)setIn(id,vals[id]);
  h.assertNoErrors();
  const svg=$('#fitdraw svg')&&$('#fitdraw svg').outerHTML;
  t.ok(`${label}: no uncaught error rendering step 3`, h.errors.length===0);
  t.ok(`${label}: drawing has no NaN in its geometry`, !svgHasNaN(svg));
  const {res}=W.VAN.build();
  t.ok(`${label}: every part box is finite`, allBoxesFinite(res));
  t.ok(`${label}: no negative-size box reached the cut list`, noNegativeSizes(res));
}
/* restore sane values so later assertions in this file aren't fighting a
   blocked step */
setIn('wT',2000);setIn('wM',1998);setIn('wB',1996);setIn('hL',2400);setIn('hC',2398);setIn('hR',2401);
for(let i=0;i<10;i++){const e=$('#fitmsgs .msg.err [data-fk]');if(!e)break;click(e);}
h.assertNoErrors();

/* ── model-level: a door/drawer/shelf count far outside anything the UI's
   own +/- buttons could ever produce (e.g. a corrupted autosave, or a
   mis-parsed AI recognition) must not go negative or crash generate() ── */
const fit={W:mm(900),H:mm(2000),D:mm(560),scribe:0,fillerW:0,wOut:0,hOut:0};
const extreme=[
  ['absurd door count', {columns:[{w:1,zones:[{type:'doors',ratio:1,count:500}]}]}],
  ['absurd drawer count', {columns:[{w:1,zones:[{type:'drawers',ratio:1,count:500}]}]}],
  ['zero-count doors', {columns:[{w:1,zones:[{type:'doors',ratio:1,count:0}]}]}],
  ['negative-count drawers', {columns:[{w:1,zones:[{type:'drawers',ratio:1,count:-5}]}]}],
  ['negative shelves', {columns:[{w:1,zones:[{type:'open',ratio:1,shelves:-3}]}]}],
  ['absurd shelves', {columns:[{w:1,zones:[{type:'open',ratio:1,shelves:500}]}]}],
  ['20 sections', {columns:Array.from({length:20},()=>({w:1,zones:[{type:'open',ratio:1,shelves:1}]}))}],
  ['pinned width bigger than the whole cabinet', {columns:[{w:1,wmm:mm(9000),zones:[{type:'open',ratio:1,shelves:1}]},{w:1,zones:[{type:'open',ratio:1,shelves:1}]}]}],
];
for(const [label,cfg] of extreme){
  cfg.zones=cfg.columns[0].zones;
  let res,threw=null;
  try{res=W.generate(cfg,fit);}catch(e){threw=e;}
  t.ok(`${label}: generate() does not throw`, !threw, threw&&threw.message);
  if(res){
    t.ok(`${label}: every box is finite`, allBoxesFinite(res), label);
    t.ok(`${label}: no negative-size box`, noNegativeSizes(res), label);
  }
}

t.report();
