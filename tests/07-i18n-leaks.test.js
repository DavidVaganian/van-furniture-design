/* §8 — every user-visible string must be translated. The wardrobe planner,
   bathroom and bed validate() messages (and their one-click fix labels)
   were hardcoded English regardless of the selected language — reported
   directly by the product owner testing the Armenian UI. Force every one of
   those message paths to actually fire, in Armenian and in Russian, and
   scan every message for a leaked English word. */
const {boot,suite}=require('./harness');
const t=suite('07-i18n-leaks · validate() messages are translated in every language');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);
const LEAK=/\b(exceeds|clearance|collision|resolved|Finished|verify|does not fit|below|needs|outer frame|verified|adjustable|require|room height|must be|Extend|Set|Fit and|Remove|conflicting)\b/i;

function scan(label,msgs){
  for(const m of msgs){
    t.ok(`${label}: "${m.t.slice(0,40)}…" has no leaked English`, !LEAK.test(m.t), m.t);
    for(const f of m.fixes||[])
      t.ok(`${label}: fix "${f.label}" has no leaked English`, !LEAK.test(f.label), f.label);
  }
}

for(const L of ['hy','ru']){
  W.eval(`L=${JSON.stringify(L)}`);

  /* wardrobe planner: force a back-wall overflow, a tight ceiling clearance
     and a collision, all three message paths at once */
  {
    const fit={W:mm(1200),H:mm(2200),D:mm(600),scribe:0,fillerW:0,wOut:0,hOut:0};
    const cfg={columns:[{w:1,wmm:mm(1200),zones:[{type:'open',ratio:1,shelves:2}],plannerId:'f1'}],
      wardrobePlanner:{room:{w:mm(1000),d:mm(600),h:mm(2210)},
        frames:[{id:'f1',wall:'back',w:mm(1200),d:mm(600),h:mm(2200)}],
        obstacles:[{id:'o1',wall:'back',offset:mm(100),w:mm(300),bottom:0,h:mm(2200)}]}};
    cfg.zones=cfg.columns[0].zones;
    const res=W.generate(cfg,fit), msgs=W.validate(cfg,fit,res);
    t.ok(`${L}: the planner overflow/clearance/collision messages actually fired`,
      msgs.filter(m=>m.l==='err').length>=2, msgs.map(m=>m.t).join(' | '));
    scan(`${L} wardrobe planner`,msgs);
  }
  /* bathroom: force a rim-height warning and a too-low vessel basin */
  {
    const cfg=W.bathroomPreset('bathVessel');
    cfg.bathroom.floorClearance=mm(650); cfg.bathroom.basinH=mm(10);
    const fit={W:mm(800),H:mm(600),D:mm(470),scribe:0,fillerW:0,wOut:0,hOut:0};
    const res=W.generate(cfg,fit), msgs=W.validate(cfg,fit,res);
    t.ok(`${L}: a bathroom warning actually fired`, msgs.some(m=>m.l==='warn'), msgs.map(m=>m.t).join(' | '));
    scan(`${L} bathroom`,msgs);
  }
  /* bed: force a frame smaller than the mattress */
  {
    const cfg=W.bedPreset('bedStandard');
    const fit={W:mm(1000),H:mm(1100),D:mm(1000),scribe:0,fillerW:0,wOut:0,hOut:0};
    const res=W.generate(cfg,fit), msgs=W.validate(cfg,fit,res);
    t.ok(`${L}: the bed too-small message actually fired`, msgs.some(m=>m.l==='err'), msgs.map(m=>m.t).join(' | '));
    scan(`${L} bed`,msgs);
  }
  /* kitchen: force the worktop height and the room-too-low message */
  {
    const cfg=W.kitchenPreset('kitchenRun');
    Object.assign(cfg.kitchen,{baseH:mm(600),plinthH:mm(50),worktopT:mm(20)}); // workH well under 850
    const fit={W:mm(3270),H:mm(2200),D:mm(600),scribe:mm(15),fillerW:mm(27),wOut:0,hOut:0};
    const res=W.generate(cfg,fit), msgs=W.validate(cfg,fit,res);
    t.ok(`${L}: a kitchen worktop-height warning actually fired`, msgs.some(m=>m.l==='warn'||m.l==='err'), msgs.map(m=>m.t).join(' | '));
    scan(`${L} kitchen`,msgs);
  }
}

t.report();
