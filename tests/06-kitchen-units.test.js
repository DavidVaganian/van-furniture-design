/* §1 §3 — kitchen units are a differently-shaped model (a positional array,
   not columns/zones) with their own add/duplicate/reorder/delete UI; drive
   it through the real buttons and make sure identities and the schedule
   stay correct the same way the wardrobe/cabinet path was already proven. */
const {boot,suite}=require('./harness');
const t=suite('06-kitchen-units · duplicate/reorder/delete through the real kitchen controls');
const h=boot(),{$,$$,click,doc,W}=h;

const cb=doc.getElementById('noPhoto'); cb.checked=true; cb.dispatchEvent(new h.W.Event('change',{bubbles:true}));
click($('[data-p="kitchenRun"]'));
h.assertNoErrors();
t.ok('a kitchen cfg with units exists', !!(W.VAN.cfg&&W.VAN.cfg.kitchen&&W.VAN.cfg.kitchen.units.length));

const idsOf=()=>W.VAN.cfg.kitchen.units.map(u=>u.id);
const before=idsOf();
t.ok('every starting unit has a distinct id', new Set(before).size===before.length, before.join(','));

/* duplicate unit 0 through the real button */
click($('[data-ku-act="dup"][data-ku="0"]'));
h.assertNoErrors();
const afterDup=idsOf();
t.ok('duplicate adds exactly one unit', afterDup.length===before.length+1);
t.ok('the duplicate got its OWN id, not a copy of unit 0\'s', new Set(afterDup).size===afterDup.length,
  afterDup.join(','));

/* move the duplicate right, then left again */
click($('[data-ku-act="right"][data-ku="1"]'));
h.assertNoErrors();
const afterRight=idsOf();
click($('[data-ku-act="left"][data-ku="2"]'));
h.assertNoErrors();
const afterLeft=idsOf();
t.ok('right then left returns the same order', JSON.stringify(afterLeft)===JSON.stringify(afterDup),
  `${afterDup.join(',')} -> ${afterRight.join(',')} -> ${afterLeft.join(',')}`);

/* delete units down to exactly one, then confirm the last delete button is
   disabled rather than letting the run go empty */
let guard=0;
while($$('[data-ku-act="del"]').length&&!$('[data-ku-act="del"]').disabled&&guard++<30){
  click($('[data-ku-act="del"]'));
  h.assertNoErrors();
}
t.ok('deleting stops at exactly one unit, never zero', W.VAN.cfg.kitchen.units.length===1,
  W.VAN.cfg.kitchen.units.length+' units left');
t.ok('the sole remaining unit\'s delete button is disabled', $('[data-ku-act="del"]').disabled);
{
  const {res}=W.VAN.build();
  t.ok('a single-unit kitchen still generates parts', res.parts.length>0, res.parts.length+' parts');
}

/* add several units back and confirm the schedule/balloon numbering (the
   fix earlier this session) still holds for a freshly-grown kitchen */
for(let i=0;i<4;i++){click($('#kAdd')); h.assertNoErrors();}
t.ok('4 adds -> 5 units', W.VAN.cfg.kitchen.units.length===5, W.VAN.cfg.kitchen.units.length+'');
t.ok('every unit still has a distinct id after repeated add', new Set(idsOf()).size===5, idsOf().join(','));
{
  const {res}=W.VAN.build();
  const rows=W.compactCutParts(res).length, RN=W.scheduleRowNumbers(res);
  let maxSeen=0; res.parts.forEach((p,pi)=>p.boxes.forEach((b,bi)=>{const n=RN.of(pi,bi);if(n>maxSeen)maxSeen=n;}));
  t.ok('every balloon number is still a real schedule row after kitchen editing',
    maxSeen<=rows, `max ${maxSeen} vs ${rows} rows`);
}

/* walk to the drawings and back, confirm nothing throws */
click($('#s2 [data-go="3"]'));
for(let i=0;i<10;i++){const e=$('#fitmsgs .msg.err [data-fk]');if(!e)break;click(e);}
click($('#s3 [data-go="4"]'));
h.assertNoErrors();
t.ok('reaches step 4 with a populated cut list', $$('#cut tr').length>0, $$('#cut tr').length+' rows');

t.report();
