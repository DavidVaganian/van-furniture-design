/* §2 §3 — Example 2 from the stabilization mandate, proven rather than
   asserted: adding a child (a door, a drawer, a shelf, a whole section) to a
   fixed-size carcass must not silently resize the carcass or an unrelated
   sibling section. The overall box comes only from fitOpening() (the wall
   measurements); door/drawer count only re-slices the SAME front width. */
const {boot,suite}=require('./harness');
const t=suite('02-parent-child-geometry · adding a child never resizes its parent');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);

const fit={W:mm(1200),H:mm(2200),D:mm(600),scribe:mm(15),fillerW:mm(20),wOut:0,hOut:0};
const overallOf=res=>({W:Math.max(...res.parts.flatMap(p=>p.boxes.map(b=>b.x+b.w))),
                        H:Math.max(...res.parts.flatMap(p=>p.boxes.map(b=>b.y+b.h)))});

/* single-section wardrobe: 1 door -> 2 -> 4 -> 6 must never move the carcass */
{
  const base=overallOf(W.generate({columns:[{w:1,zones:[{type:'doors',ratio:1,count:1}]}]},fit));
  for(const n of [2,4,6]){
    const cfg={columns:[{w:1,zones:[{type:'doors',ratio:1,count:n}]}]};
    const res=W.generate(cfg,fit), o=overallOf(res);
    t.ok(`${n} doors: carcass width unchanged`, o.W===base.W, `${o.W} vs ${base.W}`);
    t.ok(`${n} doors: carcass height unchanged`, o.H===base.H, `${o.H} vs ${base.H}`);
    const doorPart=res.parts.find(p=>p.k==='door');
    t.ok(`${n} doors: the zone actually has ${n} fronts`, doorPart.q===n);
  }
}

/* switching a zone from doors to drawers, or growing drawer count, must not
   change the section's own width or the cabinet's overall size either */
{
  const mkFit=fit;
  const doorsRes=W.generate({columns:[{w:1,zones:[{type:'doors',ratio:1,count:2}]}]},mkFit);
  const drawersRes=W.generate({columns:[{w:1,zones:[{type:'drawers',ratio:1,count:5}]}]},mkFit);
  const oD=overallOf(doorsRes), oW=overallOf(drawersRes);
  t.ok('doors->drawers: same overall width', oD.W===oW.W, `${oD.W} vs ${oW.W}`);
  t.ok('doors->drawers: same overall height', oD.H===oW.H, `${oD.H} vs ${oW.H}`);
}

/* multi-section cabinet: adding zones/doors inside section 0 must not move
   section 1's geometry (a sibling must be untouched by a change next door) */
{
  const cfg={columns:[{w:1,zones:[{type:'doors',ratio:1,count:1}]},
                       {w:1,zones:[{type:'open',ratio:1,shelves:2}]}]};
  const before=W.generate(cfg,fit);
  const sec1Before=before.parts.filter(p=>(p.col||0)===1).flatMap(p=>p.boxes.map(b=>b.x));
  cfg.columns[0].zones[0].count=4;   // grow doors in section 0 only
  const after=W.generate(cfg,fit);
  const sec1After=after.parts.filter(p=>(p.col||0)===1).flatMap(p=>p.boxes.map(b=>b.x));
  t.ok('growing section 0\'s door count does not move section 1\'s parts',
    JSON.stringify(sec1Before)===JSON.stringify(sec1After));
  const oBefore=overallOf(before), oAfter=overallOf(after);
  t.ok('and the overall cabinet footprint (incl. scribe fillers) is unchanged',
    oAfter.W===oBefore.W&&oAfter.H===oBefore.H, `${oAfter.W}x${oAfter.H} vs ${oBefore.W}x${oBefore.H}`);
}

/* adding a whole section (addSection) must not shrink the sections that
   already existed — that was the actual bug fixed two builds ago (setSectionCount
   reset every width to an even split); prove it stays fixed here too */
{
  const cfg={columns:[{w:1,wmm:mm(500),zones:[{type:'open',ratio:1,shelves:2}]},
                       {w:1,zones:[{type:'open',ratio:1,shelves:2}]}]};
  cfg.zones=cfg.columns[0].zones;
  W.eval('cfg = '+JSON.stringify(cfg));
  W.eval('step = 3');
  const pinnedBefore=cfg.columns[0].wmm;
  W.addSection();
  const cfgAfter=JSON.parse(JSON.stringify(W.eval('cfg')));
  t.ok('adding a section leaves an existing pinned width untouched',
    cfgAfter.columns[0].wmm===pinnedBefore, `${cfgAfter.columns[0].wmm} vs ${pinnedBefore}`);
  t.ok('exactly one section was appended', cfgAfter.columns.length===3, cfgAfter.columns.length+'');
}

t.report();
