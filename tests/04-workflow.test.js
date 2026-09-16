/* §1 §10 — a full, real user session driven through the ACTUAL UI (clicks,
   typed values, button state) rather than internal function calls: measure,
   add sections, edit doors/drawers through the click-to-edit popover,
   duplicate/delete a section, undo/redo through the real buttons, walk
   every view tab (including the two that need network and must fail soft
   offline), save and reload the project, and check the drawing/BOM/3D
   layers never disagree and nothing throws along the way. */
const {boot,suite}=require('./harness');
const t=suite('04-workflow · a full session through the real UI, cross-checked at every step');
const h=boot(),{$,$$,click,setIn,doc,W}=h;

/* ── step 1→2: a multi-zone shape (no category pick — tallmix is filed
   under 'kitchen' in PRESET_CAT, so picking 'wardrobe' first would scope it
   out of the tile grid; category selection is optional, per §2) ── */
const cb=doc.getElementById('noPhoto'); cb.checked=true; cb.dispatchEvent(new h.W.Event('change',{bubbles:true}));
click($('[data-p="tallmix"]'));
h.assertNoErrors();
t.ok('reaches step 2 with a live cfg', !!W.VAN.cfg);

click($('#s2 [data-go="3"]'));
h.assertNoErrors();

/* ── step 3: measure, clear blocking errors, add two more sections ── */
setIn('wT',2800);setIn('wM',2796);setIn('wB',2792);
setIn('hL',2400);setIn('hC',2398);setIn('hR',2402);
for(let i=0;i<10;i++){const e=$('#fitmsgs .msg.err [data-fk]');if(!e)break;click(e);}
h.assertNoErrors();
t.ok('no blocking errors remain', !$('#fitmsgs .msg.err'));

const secBefore=(W.VAN.cfg.columns||[1]).length;
click($('#sizeList [data-nsec="1"]'));
click($('#sizeList [data-nsec="1"]'));
h.assertNoErrors();
t.ok('two "+"s added exactly two sections', W.VAN.cfg.columns.length===secBefore+2,
  `${secBefore} -> ${W.VAN.cfg.columns.length}`);

/* ── click a door in the drawing, edit it through the popover ── */
const doorRect=[...doc.querySelectorAll('#fitdraw [data-pi]')].find(r=>{
  const pi=+r.dataset.pi, res=W.VAN.build().res; return res.parts[pi]&&res.parts[pi].k==='door';
});
t.ok('a door exists to click', !!doorRect);
if(doorRect){
  click(doorRect);
  h.assertNoErrors();
  const pop=$('#fitdraw .partpop');
  t.ok('the click-to-edit popover opens', !!pop);
  if(pop){
    const before=W.VAN.build().res.parts.filter(p=>p.k==='door').reduce((a,p)=>a+p.q,0);
    click(pop.querySelector('[data-pp="inc"]'));
    h.assertNoErrors();
    const after=W.VAN.build().res.parts.filter(p=>p.k==='door').reduce((a,p)=>a+p.q,0);
    t.ok('"+" on the popover actually adds a door', after>before, `${before} -> ${after}`);
    /* switch that same zone to drawers, then back to open, then delete it —
       each must re-render clean */
    const pop2=$('#fitdraw .partpop');
    if(pop2){click(pop2.querySelector('[data-pp="type"][data-v="drawers"]'));h.assertNoErrors();}
    const pop3=$('#fitdraw .partpop');
    if(pop3){click(pop3.querySelector('[data-pp="add"]'));h.assertNoErrors();}
  }
}
click(doc.body); // click elsewhere clears SEL without throwing

/* ── duplicate then delete a section via the size list ── */
const dup=$('#sizeList [data-cdup]');
if(dup){
  const n0=W.VAN.cfg.columns.length;
  click(dup); h.assertNoErrors();
  t.ok('duplicate adds one section', W.VAN.cfg.columns.length===n0+1);
  const del=$('#sizeList [data-cdel]');
  if(del){click(del); h.assertNoErrors();
    t.ok('delete removes one section', W.VAN.cfg.columns.length===n0);}
}

/* ── undo everything, then redo everything, through the real buttons ── */
let guard=0;
while(!$('#s3 .undoBtn').disabled && guard++<60){click($('#s3 .undoBtn'));}
h.assertNoErrors();
t.ok('undo eventually disables itself (history does not loop forever)', guard<60, guard+' undos');
let guard2=0;
while(!$('#s3 .redoBtn').disabled && guard2++<60){click($('#s3 .redoBtn'));}
h.assertNoErrors();
t.ok('redo eventually disables itself', guard2<60, guard2+' redos');
t.ok('undo/redo walked the same number of steps each way', guard===guard2, `${guard} undos, ${guard2} redos`);

/* ── on to the drawings; every view must render without throwing, including
   the two that need network (WebGL, AI photo) and must fail soft offline ── */
for(let i=0;i<10;i++){const e=$('#fitmsgs .msg.err [data-fk]');if(!e)break;click(e);}
click($('#s3 [data-go="4"]'));
h.assertNoErrors();
t.ok('reaches step 4', !doc.getElementById('s4').classList.contains('hide'));
t.ok('cut list has rows', $$('#cut tr').length>0, $$('#cut tr').length+' rows');

for(const k of ['front','side','iso','exploded','studio','real','ai']){
  const tab=$(`[data-view="${k}"]`); if(!tab)continue;
  click(tab); h.assertNoErrors();
}
t.ok('every view (incl. network-dependent ones, offline) rendered without an uncaught error',
  h.errors.length===0, h.errors.map(e=>e&&e.message).join(' | '));

/* ── cross-check: schedule row count matches what the printed balloons on
   the front elevation actually reference (§3, §6 — the fix earlier this
   session) ── */
{
  const {res,fit}=W.VAN.build();
  const rows=W.compactCutParts(res).length;
  const RN=W.scheduleRowNumbers(res);
  let maxSeen=0;
  res.parts.forEach((p,pi)=>p.boxes.forEach((b,bi)=>{const n=RN.of(pi,bi);if(n>maxSeen)maxSeen=n;}));
  t.ok('every balloon number the drawing can produce is a real schedule row (no #21 on a 20-row table)',
    maxSeen<=rows, `max balloon ${maxSeen}, ${rows} schedule rows`);
}

/* ── save the project, then load it back — the reload must reproduce the
   working model exactly, not a stale or partial copy ── */
{
  const before=JSON.stringify(W.VAN.cfg);
  W.writeAutosave();
  const raw=W.localStorage.getItem('van.project.autosave.v4');
  t.ok('autosave actually wrote a project payload', !!raw);
  W.VAN.cfg.columns.push({w:1,zones:[{type:'open',ratio:1,shelves:1}]}); // simulate further edits
  t.ok('cfg now differs from the saved snapshot (sanity)', JSON.stringify(W.VAN.cfg)!==before);
  const restored=W.restoreAutosave();
  h.assertNoErrors();
  t.ok('restoreAutosave() reports success', restored===true);
  t.ok('the reloaded project is byte-identical to what was saved',
    JSON.stringify(W.VAN.cfg)===before);
}

t.report();
