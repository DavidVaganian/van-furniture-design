const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const fixtures=JSON.parse(fs.readFileSync('vision-fixtures-v4.json','utf8'));
assert.equal(fixtures.fixtures.length,4);for(const f of fixtures.fixtures)if(f.file)assert(fs.existsSync(f.file),f.file+' missing');
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const core=html.slice(html.indexOf('const mm=v=>'),html.indexOf('/* B2: templates only.'));
const planCore=html.slice(html.indexOf('function kitchenPlanItems('),html.indexOf('function kitchenPlanSheet('));
vm.runInNewContext(core+planCore+`
const fit={W:mm(1200),H:mm(2200),D:mm(600),fillerW:mm(20)};
const cfg={columns:[{w:1,zones:[{type:'drawers',ratio:1,count:3,heights:[mm(300),mm(600),mm(1290)]}]},{w:1,zones:[{type:'doors',ratio:.25,count:1},{type:'doors',ratio:.75,count:1}]}],handles:'none'};
const res=generate(cfg,fit), front=res.parts.find(p=>p.k==='drawerfront');
const sides=res.parts.filter(p=>p.k==='drawerside');
for(let i=0;i<3;i++){
 assert.equal(sides[i].boxes[0].y,front.boxes[i].y+mm(14));
 assert.equal(sides[i].boxes[0].h,front.boxes[i].h-mm(30));
 assert.equal(sides[i].fw,sides[i].boxes[0].h);
}
const doors=res.parts.filter(p=>p.k==='door');
assert.notEqual(doors[0].hinges.count,doors[1].hinges.count);
assert.equal(res.totalHinges,doors.reduce((n,p)=>n+p.q*p.hinges.count,0));
assert.deepEqual(cutParts(res).filter(p=>p.k==='drawerfront').map(p=>p.cl),front.varied.map(h=>h-mm(4)));
for(const d of doors)assert(d.hinges.positions.every(p=>p>0&&p<d.fl));
assert(hingeSpec(mm(100),mm(300),mm(18)).positions.every(p=>p>0&&p<mm(100)));
const equal=generate({zones:[{type:'drawers',ratio:1,count:4}]},fit);
assert.equal(equal.parts.filter(p=>p.k==='drawerside').reduce((n,p)=>n+p.q,0),8);
const wpFrames=[
 {id:'a',wall:'back',kind:'frame',w:mm(500),d:mm(580),h:mm(2200),front:'hinged',light:true,zones:[{type:'open',ratio:1,shelves:4,rail:true}]},
 {id:'b',wall:'right',kind:'corner',w:mm(500),d:mm(350),h:mm(2000),front:'sliding',light:false,zones:[{type:'open',ratio:1,shelves:4}]}
];
const wpCfg={columns:wpFrames.map(f=>({w:1,wmm:f.w,zones:f.zones})),zones:wpFrames[0].zones,handles:'bar',colour:'#F4F2ED',wardrobePlanner:{room:{w:mm(1200),d:mm(1600),h:mm(2400)},frames:wpFrames,obstacles:[{id:'door',wall:'back',offset:mm(200),w:mm(900)}],frontColor:'#D8D0C4'}};
const wp=generate(wpCfg,{W:mm(1036),H:mm(2200),D:mm(580),fillerW:mm(18)}),wps=wardrobePlannerStats(wpCfg.wardrobePlanner);
assert.equal(wp.parts.filter(p=>p.plannerFront).length,2);assert.equal(wp.lights,1);assert.equal(wps.back,mm(500));assert.equal(wps.right,mm(500));assert.equal(wps.heightFree,mm(200));assert.equal(wps.collisions.length,1);
const clearAbove=wardrobePlannerStats({room:{w:mm(1200),d:mm(1600),h:mm(3000)},frames:[{id:'low',wall:'back',w:mm(500),h:mm(1000)}],obstacles:[{id:'high-window',wall:'back',offset:mm(100),w:mm(300),bottom:mm(1500),h:mm(500)}]});
assert.equal(clearAbove.collisions.length,0,'a room element above a low frame must not be reported as a collision');
assert.equal(wp.parts.find(p=>p.k==='side'&&p.plannerFrame==='b').fl,mm(2000));assert(wp.parts.find(p=>p.k==='side'&&p.plannerFrame==='b').boxes.every(b=>b.y>=mm(200)));
console.log('PASS: script syntax, unequal drawer alignment and dimensions, cut lengths, per-door hinges, total hinges, short-door positions, equal drawer quantities.');

const kitchen=kitchenPreset('kitchenRun');
const kfit={W:mm(3270),H:mm(2370),D:mm(600),scribe:mm(15),fillerW:mm(27),wOut:0,hOut:0};
const kr=generate(kitchen,kfit);
assert.equal(kr.kitchen,true);assert.equal(kr.units.length,5);assert.equal(kr.used,mm(3200));
assert.equal(kr.appliances.filter(a=>a.type==='dishwasher').length,1);assert.equal(kr.appliances.filter(a=>a.type==='oven').length,1);
assert.equal(kr.appliances.filter(a=>a.type==='hood').length,1);
assert.deepEqual(kr.cutouts.map(c=>c.type).sort(),['hob','sink']);
assert(kr.parts.some(p=>p.k==='worktop'));assert(kr.parts.some(p=>p.k==='drawerfront'));assert(kr.parts.some(p=>p.k==='door'));
assert(kr.totalHinges>0);assert(kr.legs===20);assert(compactCutParts(kr).length<cutParts(kr).length);
const exactKitchen=kitchenPreset('kitchenRun');Object.assign(exactKitchen.kitchen,{baseH:mm(713),wallH:mm(777),wallD:mm(333),wallGap:mm(543),worktopT:mm(41),worktopOverhang:mm(29),plinthH:mm(87),plinthSetback:mm(44)});
const exactResult=generate(exactKitchen,{...kfit,H:mm(2400)});
assert.equal(exactResult.baseH,mm(713));assert.equal(exactResult.wallH,mm(777));assert.equal(exactResult.wallD,mm(333));assert.equal(exactResult.gap,mm(543));assert.equal(exactResult.worktopT,mm(41));assert.equal(exactResult.plinthH,mm(87));assert.equal(exactResult.plinthSetback,mm(44));
assert(exactResult.parts.filter(p=>p.k==='plinth').every(p=>p.fw===mm(87)&&p.boxes.every(b=>b.z===mm(44))));
assert(exactResult.parts.filter(p=>p.k==='worktop').every(p=>p.th===mm(41)&&p.fw===kfit.D+mm(29)));
fitKitchenWidths(kitchen,mm(3370));assert.equal(kitchenUsed(kitchen),mm(3370));
const editable=kitchenPreset('kitchenRun'),ids=editable.kitchen.units.map(u=>u.id),originalN=ids.length;
assert(kitchenUnitAction(editable.kitchen,'right',0));assert.equal(editable.kitchen.units[1].id,ids[0]);
assert(kitchenUnitAction(editable.kitchen,'left',1));assert.equal(editable.kitchen.units[0].id,ids[0]);
assert(kitchenUnitAction(editable.kitchen,'dup',0));assert.equal(editable.kitchen.units.length,originalN+1);assert.notEqual(editable.kitchen.units[0].id,editable.kitchen.units[1].id);
assert(kitchenUnitAction(editable.kitchen,'del',1));assert.equal(editable.kitchen.units.length,originalN);
const added=kitchenAddUnit(editable.kitchen,'sink');assert.equal(added.type,'sink');assert.equal(added.w,mm(800));assert.equal(editable.kitchen.units.length,originalN+1);
while(editable.kitchen.units.length>1)assert(kitchenUnitAction(editable.kitchen,'del',0));
assert.equal(kitchenUnitAction(editable.kitchen,'del',0),false);assert.equal(editable.kitchen.units.length,1);
const over=kitchenPreset('kitchenTall');assert(kitchenUsed(over)>mm(2500));fitKitchenWidths(over,mm(2500));assert.equal(kitchenUsed(over),mm(2500));
for(const layout of ['straight','l','u','galley','island']){const q=kitchenPreset('kitchenRun');q.kitchen.layout=layout;const built=generate(q,kfit),items=kitchenPlanItems(built,q,kfit);assert.equal(items.length,built.units.length);assert(items.every(i=>i.w>0&&i.d>0));if(layout!=='straight')assert(new Set(items.map(i=>Math.round(i.z))).size>1,layout+' must use more than one plan line');}
for(const layout of ['straight','l','u','galley','island']){const u=kitchenUnitsFromMapping({layout,oven:'under',fridge:'integrated'}).map(x=>x[0]);assert(u.includes('sink')&&u.includes('dishwasher')&&u.includes('oven')&&u.includes('tallFridge'));}
const mapped=kitchenUnitsFromMapping({layout:'l',oven:'high',fridge:'free'}).map(x=>x[0]);assert(mapped.includes('tallOven')&&mapped.includes('freeFridge')&&!mapped.includes('oven')&&!mapped.includes('tallFridge'));
const longRun=kitchenPreset('kitchenRun');longRun.kitchen.units=[['tallFridge',620],['dishwasher',600],['sink',800],['baseDoors',600],['baseDoors',600],['baseDrawers',950],['baseDoors',650],['oven',550]].map((q,i)=>({id:'long-'+i,type:q[0],w:mm(q[1])}));
const longBuilt=generate(longRun,{...kfit,W:mm(5370)}),plinths=cutParts(longBuilt).filter(p=>p.k==='plinth'),tops=cutParts(longBuilt).filter(p=>p.k==='worktop');
assert.equal(longBuilt.plinthPieces,2);assert(plinths.every(p=>p.cl<=SH(longRun).l));assert.equal(plinths.reduce((n,p)=>n+p.fl,0),mm(4750));assert(tops.every(p=>p.fl<=mm(4150)));
const bath=bathroomPreset('bathIntegrated'),bathFit={W:mm(800),H:mm(560),D:mm(470),scribe:mm(15),fillerW:0,wOut:0,hOut:0},bathBuilt=generate(bath,bathFit);
assert(bathBuilt.bathroom);assert.equal(bathBuilt.basins.length,1);assert.equal(bathBuilt.basins[0].cx,mm(400));assert(bathBuilt.parts.some(p=>p.k==='worktop'&&p.bathroomTop));assert(bathBuilt.cutouts.some(c=>c.type==='basin'));assert(bathBuilt.services.length===1);assert(bathBuilt.plumbingNotches>0);
const bathDouble=bathroomPreset('bathDoubleVessel'),doubleBuilt=generate(bathDouble,{...bathFit,W:mm(1400),D:mm(500)});assert.equal(doubleBuilt.basins.length,2);assert(doubleBuilt.basins.every(b=>b.type==='vessel'));assert.equal(doubleBuilt.cutouts.filter(c=>c.type==='drain').length,2);assert(doubleBuilt.services.length===2);
for(const name of ['bathIntegrated','bathDoubleIntegrated','bathVessel','bathDoubleVessel','bathCompact']){const q=bathroomPreset(name),B=q.bathroom,rim=B.floorClearance+B.defaultH+B.worktopT+(B.basinType==='vessel'?B.basinH:0);assert.equal(rim,B.targetRimH,name+' finished rim');}
const bed=bedPreset('bedStandard'),bedFit={W:mm(1900),H:mm(1100),D:mm(2100),scribe:0,fillerW:0,wOut:0,hOut:0},bedBuilt=generate(bed,bedFit);
assert.equal(bedBuilt.bed,true);assert.equal(bedBuilt.parts.find(p=>p.k==='bedslat').q,14);assert.equal(bedBuilt.parts.find(p=>p.k==='bedside').q,2);assert(bedBuilt.parts.some(p=>p.k==='bedcentre'));
const storageBed=generate(bedPreset('bedStorage'),bedFit);assert.equal(storageBed.parts.find(p=>p.k==='drawerfront').q,4);
console.log('PASS: 4750 mm continuous run splits plinth and worktop at cabinet boundaries; every plinth fits the selected sheet.');
console.log('PASS: kitchen, bathroom and bed generators derive modules, sanitary cut-outs, service zones, worktops and exact production geometry.');
`,{assert,console});

const drawingCore=html.slice(html.indexOf('const SHEET='),html.indexOf('/* §11: the drawing stays clean.'));
vm.runInNewContext(core+`
const T=k=>k==='parts'?new Proxy({},{get:(_,p)=>String(p)}):k,fmt=(k,p)=>k+' '+Object.values(p||{}).join(' ');
${drawingCore}
const c=bathroomPreset('bathDoubleIntegrated'),f={W:mm(1600),H:mm(560),D:mm(500),scribe:mm(15),fillerW:0,wOut:0,hOut:0},r=generate(c,f),svg=bathroomPlanSheet(r,f,c);
assert(svg.includes('Bathroom services plan'));assert(svg.includes('Hot water'));assert(svg.includes('Cold water'));assert(svg.includes('Waste / drain'));assert((svg.match(/<ellipse/g)||[]).length>=4);
console.log('PASS: bathroom services plan renders standard basin, hot/cold-water and waste symbols from the production model.');`,{assert,console});

const validationCore=html.slice(html.indexOf('function validateKitchen('),html.indexOf('function validate(cfg,fit,res)'));
vm.runInNewContext(core+`
const T=k=>k==='parts'?new Proxy({},{get:(_,p)=>String(p)}):k;
const fmt=(k,p)=>k+' '+Object.values(p||{}).join(' ');
const box=b=>b?{x:mmv(b.x),y:mmv(b.y),w:mmv(b.w),h:mmv(b.h)}:null;
${validationCore}
const c=kitchenPreset('kitchenRun');c.kitchen.units=[['tallFridge',620],['dishwasher',600],['sink',800],['baseDoors',600],['baseDoors',600],['baseDrawers',950],['baseDoors',650],['oven',550]].map((q,i)=>({id:'v-'+i,type:q[0],w:mm(q[1])}));
const f={W:mm(5370),H:mm(2370),D:mm(600),scribe:mm(15),fillerW:mm(27),wOut:0,hOut:0},r=generate(c,f),messages=validateKitchen(c,f,r);
assert(!messages.some(m=>m.l==='err'),'the screenshot scenario must not dead-end validation');
assert(messages.some(m=>m.t.startsWith('vKitchenLinearSplit')),'the automatic split must be reported');
const exact=kitchenPreset('kitchenRun');Object.assign(exact.kitchen,{baseH:mm(713),wallH:mm(777),wallGap:mm(543),worktopT:mm(41),plinthH:mm(87)});const lowFit={...f,W:mm(3270),H:mm(1700)},low=generate(exact,lowFit),lowMessages=validateKitchen(exact,lowFit,low);assert(lowMessages.some(m=>m.l==='err'&&m.fixes&&m.fixes[0].k==='kitchenheight'));
console.log('PASS: screenshot scenario reaches drawings and reports the automatic linear-part split.');
`,{assert,console});

const genericValidation=html.slice(html.indexOf('function validate(cfg,fit,res){'),html.indexOf('const box=b=>'));
vm.runInNewContext(core+`
const T=k=>k==='parts'?new Proxy({},{get:(_,p)=>String(p)}):k,fmt=(k,p)=>k+' '+Object.values(p||{}).join(' '),box=b=>b?{x:mmv(b.x),y:mmv(b.y),w:mmv(b.w),h:mmv(b.h)}:null;
${genericValidation}
const frames=[{id:'wide',kind:'frame',wall:'back',w:mm(1500),d:mm(580),h:mm(2360),front:'hinged',frontCount:2,handle:'bar',light:false,zones:[{type:'open',ratio:1,shelves:2}]}];
const c={sheet:0,rotate:false,material:'laminate',handles:'bar',columns:[{w:1,wmm:mm(1500),zones:frames[0].zones}],zones:frames[0].zones,wardrobePlanner:{room:{w:mm(1200),d:mm(2500),h:mm(2300)},frames,obstacles:[{id:'door',wall:'back',offset:mm(100),w:mm(900)}]}};
const f={W:mm(1530),H:mm(2360),D:mm(580),scribe:mm(15),fillerW:mm(15),wOut:0,hOut:0},r=generate(c,f),messages=validate(c,f,r);
assert(messages.some(m=>m.l==='err'&&(m.fixes||[]).some(x=>x.k==='plannerroom')));assert(messages.some(m=>m.l==='err'&&(m.fixes||[]).some(x=>x.k==='plannerremoveob')));assert(messages.some(m=>(m.fixes||[]).some(x=>x.k==='plannerfrontcount')));
const bc=bathroomPreset('bathDoubleIntegrated');bc.bathroom.centres=[mm(250),mm(500)];const bf={W:mm(700),H:mm(560),D:mm(350),scribe:mm(15),fillerW:0,wOut:0,hOut:0},br=generate(bc,bf),bm=validate(bc,bf,br);assert(bm.some(m=>m.l==='err'&&(m.fixes||[]).some(x=>x.k==='bathlayout')),'invalid bathroom basin layouts need an actionable fix');
console.log('PASS: wardrobe room overflow, ceiling clearance, obstacle collision and wide-front fixes are actionable.');
`,{assert,console});

const plannerFns=html.slice(html.indexOf('function wardrobePlannerReconcile('),html.indexOf('function renderConfirm(){'));
vm.runInNewContext(core+`
let cfg={category:'wardrobe',columns:[{w:1,zones:[{type:'doors',ratio:1,count:2,shelves:3}]}],zones:[{type:'doors',ratio:1,count:2,shelves:3}],handles:'bar',colour:'#F4F2ED',sourceMeasurements:{}};
let WP_TAB='frames',WP_VIEW='room',WPSEL=null,WPOBSEL=null;
const preview={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null},els={preview,wT:{value:'2450'},wM:{value:'2450'},wB:{value:'2450'},hL:{value:'2400'},hC:{value:'2400'},hR:{value:'2400'},dP:{value:'600'},sc:{value:'15'}};
const $=id=>els[id],scheduleAutosave=()=>{},mark=()=>{};
${plannerFns}
renderWardrobePlanner();assert(preview.innerHTML.includes('VAN Room Planner'));assert(preview.innerHTML.includes('data-wp-add="corner"'));assert(cfg.wardrobePlanner);assert(cfg.columns[0].wmm>0);
const firstId=cfg.columns[0].plannerId,copy=JSON.parse(JSON.stringify(cfg.columns[0]));cfg.columns.splice(1,0,copy);wardrobePlannerReconcile();assert.equal(cfg.wardrobePlanner.frames.length,2);assert.notEqual(cfg.wardrobePlanner.frames[0].id,cfg.wardrobePlanner.frames[1].id);cfg.columns.splice(1,1);wardrobePlannerReconcile();assert.equal(cfg.wardrobePlanner.frames.length,1);assert.equal(cfg.wardrobePlanner.frames[0].id,firstId);
cfg.wardrobePlanner.obstacles=[{id:'ob',type:'door',wall:'back',offset:mm(100),w:mm(800),bottom:0,h:mm(2100)}];WPOBSEL='ob';WP_TAB='room';renderWardrobePlanner();
assert(preview.innerHTML.includes('data-wp-obfield="offset"'));assert(preview.innerHTML.includes('collision'));
WP_TAB='finish';renderWardrobePlanner();assert(preview.innerHTML.includes('data-wp-colour="frameColor"'));
console.log('PASS: wardrobe planner renders frames, room obstacles, collision feedback and live colour controls against a real project model.');
`,{assert,console});

const poseFn=html.slice(html.indexOf('function realisticFrontPose('),html.indexOf('function buildScene('));
vm.runInNewContext(`${poseFn}
const door={kind:'door',mode:'hinged',left:true,w:600,closed:{x:300,z:-18}},drawer={kind:'drawerfront',mode:'hinged',left:true,w:800,closed:{x:400,z:-18}},slide={kind:'door',mode:'sliding',left:false,w:700,closed:{x:350,z:-18}};
assert.deepEqual(realisticFrontPose(door,false),{x:300,z:-18,ry:0});const opened=realisticFrontPose(door,true);assert(opened.ry>1&&opened.z<-18);assert.equal(realisticFrontPose(drawer,true).z,-278);assert(realisticFrontPose(slide,true).x<350);assert.deepEqual(realisticFrontPose(door,false),{x:300,z:-18,ry:0});
console.log('PASS: realistic view opens hinged doors, sliding fronts and drawers from a stable closed pose and closes them without accumulated transforms.');`,{assert,console,Math});

const historyFns=html.slice(html.indexOf('function pushHistory('),html.indexOf('function paintUndo(){'));
vm.runInNewContext(`
const UNDO=[],REDO=[],LIMITS={},I18N={en:{}},cleanClone=v=>JSON.parse(JSON.stringify(v));let cfg={n:0},CAT=null,KMAP={answers:{}},L='en',view='front',photoURL=null,step=1,measureBefore=null,projectBefore=null,measure='100';const PROJ={number:'A'};
const $=()=>null,T=x=>x,paramId=x=>x+'-1',rawM=()=>[measure],snapshot=()=>({cfg:cleanClone(cfg),m:rawM(),project:{...PROJ}}),renderCats=()=>{},renderConfirm=()=>{},renderFinal=()=>{},renderFit=()=>{},renderRail=()=>{},paintUndo=()=>{},scheduleAutosave=()=>{};
${historyFns}
for(let i=1;i<=250;i++){mark('edit '+i);cfg.n=i;}assert.equal(UNDO.length,250);
for(let i=0;i<250;i++)undo();assert.equal(cfg.n,0);assert.equal(REDO.length,250);
for(let i=0;i<250;i++)redo();assert.equal(cfg.n,250);assert.equal(UNDO.length,250);assert.equal(REDO.length,0);
measureBefore=snapshot();measure='101';assert(commitPendingHistory('live millimetre edit'));assert.equal(UNDO.length,251);assert.equal(UNDO[250].m[0],'100');
console.log('PASS: 250 sequential edits undo to the initial model and redo to the final model with no history truncation.');
`,{assert,console});

const vision=html.slice(html.indexOf('const NULLNUM='),html.indexOf('/* ── memory of what this workshop'));
vm.runInNewContext(`
${core}
const GENERATOR_FOR=()=> 'cabinet';
const CATEGORY_STANDARDS={kitchen:{w:3300,h:2400,d:620},wardrobe:{w:2400,h:2360,d:600},dresser:{w:1200,h:780,d:450},bed:{w:1900,h:1100,d:2100},bathroom:{w:800,h:560,d:470}};
${vision}
function assertStrictSchema(s,path='root'){
 if(!s||typeof s!=='object')return;
 if(s.type==='object'){
  assert.equal(s.additionalProperties,false,path+' must reject extra properties');
  assert.deepEqual(new Set(s.required||[]),new Set(Object.keys(s.properties||{})),path+' must require every property');
  for(const [k,v] of Object.entries(s.properties||{}))assertStrictSchema(v,path+'.'+k);
 }
 if(s.items)assertStrictSchema(s.items,path+'[]');
}
assertStrictSchema(EVIDENCE_SCHEMA,'evidence');assertStrictSchema(MODEL_SCHEMA,'model');assertStrictSchema(AUDIT_SCHEMA,'audit');
const evidence={documentType:'annotated_plan',category:'wardrobe',isOpenInterior:true,hasVisibleDoors:false,
 cameraView:'frontal',outerQuad:[{x:.05,y:.05},{x:.95,y:.05},{x:.95,y:.95},{x:.05,y:.95}],rootBayCount:4,
 structuralLines:[],ignoredObjects:[],
 widthMm:2400,heightMm:2200,depthMm:470,dimensionEvidence:['240 cm','220 cm','Profundidade: 47 cm'],
 columnCount:4,totalDrawerFronts:6,observations:'Four open wardrobe bays with two banks of three drawers.',
 uncertainties:[],structureConfidence:'high',columns:[
  {index:1,widthFraction:.20625,widthMm:495,evidence:'left divider bay',confidence:'high',zones:[
   {kind:'shelves',yStart:0,yEnd:1,shelfCount:4,drawerCount:0,doorCount:0,rail:false,heightMm:null,evidence:'four open shelf divisions',confidence:'high'}]},
  {index:2,widthFraction:.26875,widthMm:645,evidence:'centre-left bay',confidence:'high',zones:[
   {kind:'hanging',yStart:0,yEnd:.68,shelfCount:1,drawerCount:0,doorCount:0,rail:true,heightMm:null,evidence:'visible rail',confidence:'high'},
   {kind:'drawers',yStart:.68,yEnd:1,shelfCount:0,drawerCount:3,doorCount:0,rail:false,heightMm:null,evidence:'three fronts',confidence:'high'}]},
  {index:3,widthFraction:.26875,widthMm:645,evidence:'centre-right bay',confidence:'high',zones:[
   {kind:'hanging',yStart:0,yEnd:.68,shelfCount:1,drawerCount:0,doorCount:0,rail:true,heightMm:null,evidence:'visible rail',confidence:'high'},
   {kind:'drawers',yStart:.68,yEnd:1,shelfCount:0,drawerCount:3,doorCount:0,rail:false,heightMm:null,evidence:'three fronts',confidence:'high'}]},
  {index:4,widthFraction:.20625,widthMm:495,evidence:'right divider bay',confidence:'high',zones:[
   {kind:'shelves',yStart:0,yEnd:1,shelfCount:4,drawerCount:0,doorCount:0,rail:false,heightMm:null,evidence:'four open shelf divisions',confidence:'high'}]}
 ]};
evidence.columns.forEach((c,ci)=>{c.dividerStart=0;c.dividerEnd=1;c.zones.forEach((z,zi)=>Object.assign(z,{cellId:'c'+ci+'z'+zi,separatorBelow:zi<c.zones.length-1}));});
assert(evidenceUsable(evidence));
const raw=modelFromEvidence(evidence),cfg=normaliseRecognition({evidence,model:raw});
assert.equal(cfg.columns.length,4);
assert.equal(cfg.recognition.drawerCount,6);
assert.equal(cfg.recognition.doorCount,0);
assert.equal(cfg.columns.flatMap(c=>c.zones).filter(z=>z.rail).length,2);
assert.deepEqual(cfg.sourceMeasurements,{widthMm:2400,heightMm:2200,depthMm:470,source:'annotated_plan'});
const built=generate(cfg,{W:mm(2400),H:mm(2200),D:mm(470),fillerW:mm(15)});
assert.equal(built.parts.find(p=>p.k==='divider').q,3);
assert.equal(built.parts.filter(p=>p.k==='drawerfront').reduce((n,p)=>n+p.q,0),6);
assert.equal(built.parts.filter(p=>p.k==='door').length,0);
assert.equal(built.parts.filter(p=>p.k==='rail').reduce((n,p)=>n+p.q,0),2);
const bad=JSON.parse(JSON.stringify(raw));bad.columns[1].zones[1]={type:'doors',ratio:.32,count:2,shelves:0,rail:false,heightMm:null,evidence:'unsupported',confidence:'low'};
assert(validateRecognition(evidence,bad).some(x=>x.includes('doors were invented')));
assert(validateRecognition(evidence,bad).some(x=>x.includes('drawer count')));
console.log('PASS: four-column wardrobe evidence, six drawer fronts, zero doors, per-zone rails, printed dimensions, contradiction checks.');

const tEvidence={...evidence,documentType:'render',cameraView:'frontal',widthMm:null,heightMm:null,depthMm:null,dimensionEvidence:[],
 rootBayCount:3,columnCount:4,totalDrawerFronts:6,ignoredObjects:[{kind:'clothing',x0:.02,y0:.2,x1:.98,y1:.9,effect:'occludes panels',confidence:'high'}],columns:[
  {index:1,widthFraction:.32,widthMm:null,dividerStart:0,evidence:'left root bay',confidence:'high',zones:[
   {kind:'open',yStart:0,yEnd:.2,shelfCount:0,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'left-top',separatorBelow:true,evidence:'luggage shelf',confidence:'high'},
   {kind:'hanging',yStart:.2,yEnd:.62,shelfCount:0,drawerCount:0,doorCount:0,rail:true,heightMm:null,cellId:'left-hang',separatorBelow:true,evidence:'rail',confidence:'high'},
   {kind:'drawers',yStart:.62,yEnd:.9,shelfCount:0,drawerCount:3,doorCount:0,rail:false,heightMm:null,cellId:'left-drawers',separatorBelow:true,evidence:'three seams',confidence:'high'},
   {kind:'open',yStart:.9,yEnd:1,shelfCount:0,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'left-shoes',separatorBelow:false,evidence:'open base',confidence:'high'}]},
  {index:2,widthFraction:.18,widthMm:null,dividerStart:0,evidence:'middle left atomic slice',confidence:'high',zones:[
   {kind:'open',yStart:0,yEnd:.38,shelfCount:1,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'middle-shared-top',separatorBelow:true,evidence:'shared top bay',confidence:'high'},
   {kind:'hanging',yStart:.38,yEnd:1,shelfCount:0,drawerCount:0,doorCount:0,rail:true,heightMm:null,cellId:'middle-left-hang',separatorBelow:false,evidence:'long hanging',confidence:'high'}]},
  {index:3,widthFraction:.18,widthMm:null,dividerStart:.38,evidence:'partial T divider',confidence:'high',zones:[
   {kind:'open',yStart:0,yEnd:.38,shelfCount:1,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'middle-shared-top',separatorBelow:true,evidence:'shared top bay',confidence:'high'},
   {kind:'shelves',yStart:.38,yEnd:.72,shelfCount:3,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'middle-right-shelves',separatorBelow:true,evidence:'three shelf boards',confidence:'high'},
   {kind:'hanging',yStart:.72,yEnd:1,shelfCount:0,drawerCount:0,doorCount:0,rail:true,heightMm:null,cellId:'middle-right-rail',separatorBelow:false,evidence:'lower rail',confidence:'high'}]},
  {index:4,widthFraction:.32,widthMm:null,dividerStart:0,evidence:'right root bay',confidence:'high',zones:[
   {kind:'open',yStart:0,yEnd:.2,shelfCount:0,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'right-top',separatorBelow:true,evidence:'blanket shelf',confidence:'high'},
   {kind:'hanging',yStart:.2,yEnd:.62,shelfCount:0,drawerCount:0,doorCount:0,rail:true,heightMm:null,cellId:'right-hang',separatorBelow:true,evidence:'rail',confidence:'high'},
   {kind:'drawers',yStart:.62,yEnd:.9,shelfCount:0,drawerCount:3,doorCount:0,rail:false,heightMm:null,cellId:'right-drawers',separatorBelow:true,evidence:'three seams',confidence:'high'},
   {kind:'open',yStart:.9,yEnd:1,shelfCount:0,drawerCount:0,doorCount:0,rail:false,heightMm:null,cellId:'right-shoes',separatorBelow:false,evidence:'open base',confidence:'high'}]}
 ]};
const tc=normaliseRecognition({evidence:tEvidence,model:modelFromEvidence(tEvidence)});
assert.equal(tc.recognition.rootBayCount,3);assert.equal(tc.columns.length,4);assert.equal(tc.recognition.drawerCount,6);assert.equal(tc.recognition.doorCount,0);
const tb=generate(tc,{W:mm(3000),H:mm(2400),D:mm(600),fillerW:mm(15)}),div=tb.parts.find(p=>p.k==='divider');
assert.equal(div.q,3);assert(div.varied[1]<div.varied[0]);assert.equal(tb.parts.filter(p=>p.k==='rail').reduce((n,p)=>n+p.q,0),4);
assert(tb.parts.filter(p=>p.k==='shelf').some(p=>p.fl>mm(900)),'shared middle shelf must span both atomic slices');
assert.equal(cutParts(tb).filter(p=>p.k==='divider').length,3);
console.log('PASS: recursive T-junction compiles to partial divider, shared shelf, six drawers and four rails.');

const topCfg={columns:[
 {w:.25,dividerStart:0,dividerEnd:1,zones:[{type:'open',ratio:.2,shelves:0,cellId:'top-a',separatorBelow:true},{type:'open',ratio:.8,shelves:0,cellId:'lower-shared',separatorBelow:false}]},
 {w:.25,dividerStart:0,dividerEnd:.2,zones:[{type:'open',ratio:.2,shelves:0,cellId:'top-b',separatorBelow:true},{type:'open',ratio:.8,shelves:0,cellId:'lower-shared',separatorBelow:false}]},
 {w:.5,dividerStart:0,dividerEnd:1,zones:[{type:'open',ratio:1,shelves:2,cellId:'root-right',separatorBelow:false}]}
],handles:'none',material:'laminate',plinth:false,rail:false};
const topBuilt=generate(topCfg,{W:mm(2400),H:mm(2200),D:mm(500),fillerW:mm(15)}),topDiv=topBuilt.parts.find(p=>p.k==='divider');
assert(topDiv.varied[0]<topDiv.varied[1]);assert(topDiv.boxes[0].y===R.panelT);assert.equal(cutParts(topBuilt).filter(p=>p.k==='divider').length,2);
console.log('PASS: top-only cubby divider ends at a T-junction without splitting the lower shared bay.');

const vanity=JSON.parse(JSON.stringify(evidence));Object.assign(vanity,{documentType:'render',category:'bathroom',cameraView:'frontal',isOpenInterior:false,hasVisibleDoors:false,
 widthMm:null,heightMm:null,depthMm:null,dimensionEvidence:[],rootBayCount:4,columnCount:4,totalDrawerFronts:8,
 bathroom:{vanityDetected:true,basinCount:2,basinType:'vessel',basinCenters:[.27,.73],mount:'wall',tapMount:'wall',worktopVisible:true,widthToHeight:2.9,handleProfile:'continuous_profile',evidence:'two vessel bowls above a floating four-bay vanity; gold lines follow both drawer seams',confidence:'high'},
 observations:'Floating double-vessel vanity with four banks and two drawer fronts in each bank.',uncertainties:[],structureConfidence:'high',
 structuralLines:[
  {orientation:'vertical',position:.03,start:.05,end:.95,kind:'divider',evidence:'background wall batten',confidence:'low'},
  {orientation:'horizontal',position:.51,start:.12,end:.88,kind:'drawer_seam',evidence:'front seam',confidence:'high'},
  {orientation:'horizontal',position:.2,start:.1,end:.9,kind:'led',evidence:'mirror light',confidence:'high'}],
 outerQuad:[{x:.1,y:.3},{x:.9,y:.3},{x:.9,y:.82},{x:.1,y:.82}],ignoredObjects:[]});
vanity.columns=Array.from({length:4},(_,i)=>({index:i+1,widthFraction:.25,widthMm:null,dividerStart:0,dividerEnd:1,evidence:'equal front bank',confidence:'high',zones:[
 {kind:'drawers',yStart:0,yEnd:.5,shelfCount:0,drawerCount:1,doorCount:0,rail:false,heightMm:null,cellId:'v'+i+'a',separatorBelow:true,evidence:'upper drawer front',confidence:'high'},
 {kind:'drawers',yStart:.5,yEnd:1,shelfCount:0,drawerCount:1,doorCount:0,rail:false,heightMm:null,cellId:'v'+i+'b',separatorBelow:false,evidence:'lower drawer front',confidence:'high'}]}));
sanitizeEvidence(vanity);assert.equal(vanity.structuralLines.length,1);assert.equal(vanity.structuralLines[0].kind,'drawer_seam');
const vc=normaliseRecognition({evidence:vanity,model:modelFromEvidence(vanity)});
assert.equal(vc.bathroom.basinCount,2);assert.equal(vc.bathroom.basinType,'vessel');assert.equal(vc.bathroom.mount,'wall');assert.equal(vc.bathroom.tapMount,'wall');
assert.equal(vc.handles,'grooved');assert.equal(vc.columns.length,4);assert(vc.columns.every(c=>c.zones.length===1&&c.zones[0].type==='drawers'&&c.zones[0].count===2));
assert.equal(vc.recognition.drawerCount,8);assert.equal(vc.suggestedMeasurements.widthMm,1600);assert.equal(vc.suggestedMeasurements.heightMm,560);assert.equal(vc.suggestedMeasurements.depthMm,500);
assert(!vc.recognition.warnings.some(x=>x.includes('root bay count')));assert.equal(vc.bathroom.centres.map(mmv).join(','),'432,1168');
const vb=generate(vc,{W:mm(vc.suggestedMeasurements.widthMm),H:mm(vc.suggestedMeasurements.heightMm),D:mm(vc.suggestedMeasurements.depthMm),fillerW:mm(15)});
assert.equal(vb.basins.length,2);assert(vb.basins.every(b=>b.type==='vessel'));assert.equal(vb.parts.filter(p=>p.k==='drawerfront').reduce((n,p)=>n+p.q,0),8);
console.log('PASS: bathroom recognition preserves two vessel basins, wall mounting, four banks, eight fronts, handle profiles and safe starting dimensions.');
`,{assert,console});
assert(html.includes("fetch('https://api.openai.com/v1/responses'"));
assert(html.includes("detail:'high'"));
assert(html.includes('makeAnalysisBoard'));
assert(html.includes('function validateKitchen('));assert(html.includes("k:'kitchenfit'"));assert(html.includes('function kitchenPlanSheet('));
assert(html.includes('function renderNeedMapping('));assert(html.includes('function buildKitchenFromMapping('));assert(html.includes('function kitchenPlanItems('));

vm.runInNewContext(core+`
assert.equal(expressionValue('IW / 3',{IW:1800}),600);
assert.equal(expressionValue('(W - 2 * S) / N',{W:2400,S:15,N:3}),790);
assert(Number.isNaN(expressionValue('globalThis.alert(1)',{W:1})));
const fit={W:mm(1872),H:mm(2100),D:mm(600),scribe:mm(15),fillerW:mm(27)};
const c={material:'laminate',handles:'none',columns:[
 {w:1,wexpr:'IW / 3',zones:[{type:'open',ratio:1,shelves:2,hexpr:'IH / 2'},{type:'doors',ratio:1,count:1}]},
 {w:1,wexpr:'IW / 3',zones:[{type:'drawers',ratio:1,count:3}]},
 {w:1,wexpr:'IW / 3',zones:[{type:'doors',ratio:1,count:2}]}
]};c.zones=c.columns[0].zones;
const first=generate(c,fit),ids=c.columns.map(x=>x.id),zoneIds=c.columns.flatMap(x=>x.zones.map(z=>z.id));
assert.equal(new Set(ids).size,3);assert.equal(new Set(zoneIds).size,4);assert(c.columns.every(x=>x.wmm===mm(600)));assert.equal(c.columns[0].zones[0].hmm,mm(1048));
generate(c,fit);assert.deepEqual(c.columns.map(x=>x.id),ids,'stable model ids must survive regeneration');
c.parametric.constraints.equalSections=true;c.columns[0].wmm=mm(800);delete c.columns[0].wexpr;generate(c,fit);assert(c.columns.every(x=>x.wmm===mm(600)));
c.parametric.constraints.equalZones[c.columns[0].id]=true;generate(c,fit);assert.equal(c.columns[0].zones[0].hmm,c.columns[0].zones[1].hmm);
c.parametric.rules.panelT=mm(22);const thick=generate(c,fit);assert.equal(thick.parts.find(p=>p.k==='side').th,mm(22));assert.equal(paramScope(c,fit).T,22);
c.columns[1].wexpr='IW / 0';generate(c,fit);assert(c.parametric.errors.some(e=>e.target===c.columns[1].id));
const kitchen=kitchenPreset('kitchenRun');kitchen.kitchen.units[0].wexpr='(W - 2700)';generate(kitchen,{...fit,W:mm(3300),H:mm(2400)});assert.equal(kitchen.kitchen.units[0].w,mm(600));
console.log('PASS: safe expressions, stable model identities, equal-width/equal-height constraints and project panel thickness drive production geometry.');
`,{assert,console,Math,Date});

const edgeFns=html.slice(html.indexOf('function applyEdge(cfg,'),html.indexOf('/* one place that sets the section count'));
vm.runInNewContext(core+`
${edgeFns}
const z1={type:'open',ratio:.5,hexpr:'IH/2',_h:mm(1000)},z2={type:'open',ratio:.5,_h:mm(1000)},a={id:'a',wmm:mm(600),wexpr:'IW/2',zones:[z1,z2]},b={id:'b',wmm:mm(600),wexpr:'IW/2',zones:[{type:'open',ratio:1,_h:mm(2000)}]},c={columns:[a,b],zones:a.zones,parametric:{constraints:{equalSections:true,symmetricOuter:true,equalZones:{a:true}},rules:{},errors:[]}};
applyEdgeX(c,{col:0,wa:600,wb:600,xL:0,x0:0,x1:1218},700);assert.equal(a.wmm,mm(700));assert.equal(b.wmm,mm(500));assert.equal(a.wexpr,undefined);assert.equal(c.parametric.constraints.equalSections,false);
applyEdge(c,{parts:[]},{col:0,zone:0,kind:'zone'},850,{H:mm(2000)});assert.equal(z1.hexpr,undefined);assert.equal(c.parametric.constraints.equalZones.a,false);
console.log('PASS: dragging and typed/formula dimensions edit the same parameters and release conflicting constraints.');
`,{assert,console,Math,Date});
for(const hook of ['data-km-type','data-km-act','data-km-add','data-km-fit'])assert(html.includes(hook),hook+' missing from measurement editor');
for(const hook of ['function renderWardrobePlanner','data-wp-tab','data-wp-add','data-wp-interior','data-wp-front','data-wp-colour','data-wp-room','data-wp-frame-field','data-wp-obadd','data-wp-obfield'])assert(html.includes(hook),hook+' missing from wardrobe room planner');
for(const hook of ['data-czh','data-cdh','data-cunpin','data-k-detail','data-b-field','data-b-centre','data-b-choice','beforeinput','function commitPendingHistory','function wardrobePlannerReconcile','function generateWardrobePlanner','function generateBathroom','function bathroomPlanSheet','function realisticFrontPose','function worktopMeshWithCutouts','function decorateFront3D','REAL_OPEN','plannerfrontcount','kitchenheight'])assert(html.includes(hook),hook+' missing from precision/history integration');
for(const hook of ['CATEGORY_STANDARDS','function renderMeasureProfile','data-std=','data-bed-field','Finished basin rim height','function generateBed','analyse(img.base64,img.mime,CAT)'])assert(html.includes(hook),hook+' missing from category-standard routing');
assert(!html.includes('HISTORY_LIMIT'),'history must not have an artificial cap');
assert(html.includes('r33 · 2026-09-12'),'v16 release label is missing');
for(const id of ['oven','hood','fridge','layout'])assert(html.includes(`id:'${id}'`));
assert(html.includes('rectifyCabinetImage'));assert(html.includes('furniture_visual_audit'));
assert(!html.includes('Object.assign({material:') || !html.includes('PRESETS.tallmix))'));
console.log('PASS: Responses API, high-detail image input, strict schemas, and no silent preset fallback.');

for(const hook of ['function mountStudio(','function studioPanelHTML(','function studioTarget(','data-st-tab','data-st-add','data-st-colour','data-st-material','data-st-room','data-st-camera','data-st-open','data-st-xray','root.userData.selectables=selectables','new T3.Raycaster()'])assert(html.includes(hook),hook+' missing from 3D Studio');
assert(html.includes("STUDIO_TAB='edit'"),'clicking a 3D part must open its editor');
assert(html.includes("view==='studio'"),'3D Studio must use its own output view');
assert(html.includes("viewKeys=['front','side','iso','exploded','real','studio','ai']"),'3D Studio output tab missing');
assert(html.includes("baseLabels.slice(0,5).concat([SU('tab'),baseLabels[5]])"),'existing realistic and AI views must remain alongside the separate studio');

const studioCore=html.slice(html.indexOf('function studioEnsure('),html.indexOf('function studioPanelHTML('));
vm.runInNewContext(core+`
let STUDIO_SEL={pi:0,box:{x:650,w:20}},STUDIO_TAB='add';
${studioCore}
const kitchen={category:'kitchen',kitchen:{units:[{w:mm(600)},{w:mm(800)}]}};
const kr={parts:[{k:'door'}],units:[{x:mm(0),w:mm(600)},{x:mm(600),w:mm(800)}]};
let target=studioTarget(kr,kitchen);assert.equal(target.kind,'unit');assert.equal(target.ui,1);
STUDIO_SEL={pi:0,col:1,zi:0,box:{x:0,w:10}};
const furniture={columns:[{zones:[{type:'open'}]},{zones:[{type:'drawers',count:3}]}]};
target=studioTarget({parts:[{k:'drawerfront'}]},furniture);assert.equal(target.kind,'zone');assert.equal(target.object.type,'drawers');
studioEnsure(furniture);furniture.studio.partStyles['part:test']={colour:'#123456',material:'oak'};studioEnsure(furniture);assert.equal(furniture.studio.partStyles['part:test'].colour,'#123456');
console.log('PASS: 3D Studio keeps a separate view, maps semantic geometry back to editable units/zones, and preserves per-part finishes.');
`,{assert,console,Math,Date});

vm.runInNewContext(core+`
const z={type:'open',ratio:1,shelves:2,shelfPositions:[.2,.8]},c={columns:[{w:1,zones:[z]}],zones:[z],handles:'none',material:'laminate',plinth:false,rail:false};
const fit={W:mm(800),H:mm(2000),D:mm(580),fillerW:0},r=generate(c,fit),s=r.parts.find(p=>p.k==='shelf');
assert.equal(s.boxes.length,2);assert.equal(s.zi,0);assert.equal(s.boxes[0]._shelfIndex,0);assert(s.boxes[1].y-s.boxes[0].y>mm(1100),'custom shelf positions must drive production geometry');
console.log('PASS: freely positioned shelves remain tagged and drive the production model.');
`,{assert,console,Math,Date});
for(const hook of ['function studioShelfPositions(','function studioMoveSelection(','function studioNudgePlacement(','function studioFloorTexture(','function studioDecorate(','data-st-move','data-st-place','data-st-centre','draggable="true"','text/x-van-component',"e.key==='Delete'",'studioRemove(res,cfg)','new T3.PlaneGeometry(roomW,roomH)','new T3.PlaneGeometry(roomD,roomH)'])assert(html.includes(hook),hook+' missing from direct 3D manipulation or enclosed room');
assert(html.includes('S.room[key]=safe'),'room dimensions must live in the studio room model');
assert(!html.includes("for(const id of ['wT','wM','wB'])$(id).value"),'changing the room must not resize the furniture opening');
console.log('PASS: 3D Studio exposes keyboard delete/reorder/nudge, draggable components, furniture placement, wardrobe props and three room walls.');
