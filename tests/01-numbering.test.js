/* §3 §6 — Example 1 from the stabilization mandate: the number painted on a
   balloon must be the SAME number the schedule/BOM prints for that physical
   piece. Before this fix, elevationSheet/buildItems numbered balloons by the
   raw res.parts array index, while the schedule numbered rows by walking
   compactCutParts(res) (which merges same-size kitchen pieces into one row,
   and expands a varied drawer/divider front into one row per distinct
   length) — the two disagreed on every kitchen with a repeated cabinet size,
   and on every drawer stack whose fronts are not all the same height. */
const {boot,suite}=require('./harness');
const t=suite('01-numbering · balloon numbers must equal the schedule\'s own numbers');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);   /* mm() is a top-level `const` in the app, not reachable as W.mm */

/* ── kitchen: three identical-width baseDoors units must merge to ONE
   schedule row, and every one of their doors must balloon with THAT row's
   number, not their own distinct res.parts position ── */
{
  const cfg={category:'kitchen',generator:'kitchen',handles:'bar',material:'laminate',finish:'matt',plinth:true,
    kitchen:{layout:'straight',baseH:mm(720),wallH:mm(720),wallD:mm(320),wallGap:mm(500),
      worktopT:mm(38),worktopOverhang:mm(20),plinthH:mm(100),plinthSetback:mm(40),wallUnits:false,
      units:[{id:'u1',type:'baseDoors',w:mm(600)},{id:'u2',type:'sink',w:mm(800)},
             {id:'u3',type:'baseDoors',w:mm(600)},{id:'u4',type:'baseDoors',w:mm(600)}]}};
  const fit={W:mm(3200),H:mm(2350),D:mm(600),scribe:mm(15),fillerW:mm(27),wOut:0,hOut:0};
  const res=W.generate(cfg,fit);
  t.ok('three baseDoors units all present as separate parts',
    res.parts.filter(p=>p.k==='door'&&p.unit==='baseDoors').length===3);

  const rows=W.compactCutParts(res);
  const doorRowIdx=rows.findIndex(p=>p.k==='door'&&p.unit==='baseDoors');
  t.ok('the three identical doors merge into exactly one schedule row',
    rows.filter(p=>p.k==='door'&&p.unit==='baseDoors').length===1,
    `${rows.filter(p=>p.k==='door'&&p.unit==='baseDoors').length} row(s)`);
  t.ok('that row carries qty 3', rows[doorRowIdx].q===3, 'q='+rows[doorRowIdx].q);

  const RN=W.scheduleRowNumbers(res);
  const doorPartIdxs=[]; res.parts.forEach((p,i)=>{if(p.k==='door'&&p.unit==='baseDoors')doorPartIdxs.push(i);});
  const nums=doorPartIdxs.map(i=>RN.of(i,0));
  t.ok('every identical door balloons with the SAME schedule row number',
    nums.every(n=>n===doorRowIdx+1), `row ${doorRowIdx+1}, got ${nums.join(',')}`);
  t.ok('their raw res.parts positions are in fact different (the old bug used these directly)',
    new Set(doorPartIdxs).size===3, doorPartIdxs.join(','));

  const items=W.buildItems(res,fit,false,false);
  const doorItemNums=items.filter(it=>it.k==='door'&&it.n===doorRowIdx+1).length;
  t.ok('the exploded/iso view also carries the row number on every occurrence',
    doorItemNums>=3, doorItemNums+' items numbered '+(doorRowIdx+1));
}

/* ── wardrobe: a 3-drawer stack with three DIFFERENT front heights must
   produce three DISTINCT schedule rows, and each drawer front box must
   balloon with its OWN row number — one balloon used to stand in for all
   three, hiding two of the three real cut lengths from the drawing ── */
{
  const cfg={category:'wardrobe',generator:'cabinet',handles:'bar',material:'laminate',plinth:false,
    columns:[{w:1,zones:[{type:'drawers',ratio:1,count:3,heights:[mm(250),mm(500),mm(700)]}]}]};
  cfg.zones=cfg.columns[0].zones;
  const fit={W:mm(900),H:mm(1600),D:mm(560),scribe:0,fillerW:0,wOut:0,hOut:0};
  const res=W.generate(cfg,fit);
  const dfIdx=res.parts.findIndex(p=>p.k==='drawerfront');
  t.ok('one res.parts entry represents the whole 3-drawer stack',
    dfIdx>=0 && res.parts[dfIdx].varied.length===3, JSON.stringify(res.parts[dfIdx]&&res.parts[dfIdx].varied));

  const rows=W.compactCutParts(res);
  const rowLens=rows.filter(p=>p.k==='drawerfront').map(p=>p.cl).sort((a,b)=>a-b);
  t.ok('three distinct cut lengths appear as three separate schedule rows',
    rowLens.length===3 && new Set(rowLens).size===3, rowLens.join(','));

  const RN=W.scheduleRowNumbers(res);
  const nums=[0,1,2].map(bi=>RN.of(dfIdx,bi));
  t.ok('each of the three boxes gets its own, distinct row number',
    new Set(nums).size===3, nums.join(','));
  t.ok('isDistinct flags this part so every box balloons, not just the first',
    W.scheduleRowNumbers(res).isDistinct(res.parts[dfIdx])===true);

  const items=W.buildItems(res,fit,false,false);
  const dfNums=items.filter(it=>it.k==='drawerfront').map(it=>it.n).sort((a,b)=>a-b);
  t.ok('the drawing carries three separate balloon numbers for the three fronts, not one',
    new Set(dfNums).size===3, dfNums.join(','));
}

t.report();
