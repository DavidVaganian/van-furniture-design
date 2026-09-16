/* §3 §7 — reported directly, with the AI photo attached alongside the real
   construction drawing: a section with two tall closed doors was rendered
   as an OPEN compartment with a visible hanging rail and shelves. Root
   cause: readDrawing()/describeDrawing() captured "does any rail exist
   anywhere in the cabinet" as ONE cabinet-wide fact ("A round metal clothes
   rail spans the top of the open area") with no section attached to it at
   all — so the image model had every reason to place it wherever it liked,
   including inside a section that is actually sealed behind closed doors.
   A closed door's own hidden shelf had the same problem: named, but never
   explicitly marked invisible. */
const {boot,suite}=require('./harness');
const t=suite('11-ai-prompt-visibility · hidden content stays out of the image prompt, rails attach to their own section');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);

const fit={W:mm(3000),H:mm(2300),D:mm(600),scribe:0,fillerW:0,wOut:0,hOut:0};
/* section 1: open bay with its own rail (genuinely visible) — section 2:
   two closed doors with a hidden shelf AND a hidden rail behind them —
   section 3: plain open shelves, no rail at all */
const cfg={columns:[
  {w:1,zones:[{type:'open',ratio:1,shelves:2,rail:true}]},
  {w:1,zones:[{type:'doors',ratio:1,count:2,shelves:1,rail:true}]},
  {w:1,zones:[{type:'open',ratio:1,shelves:3,rail:false}]},
],handles:'bar',plinth:false};
cfg.zones=cfg.columns[0].zones;
const res=W.generate(cfg,fit);
const spec=W.readDrawing(cfg,fit,res);

t.ok('section 1 (open) band carries its own rail flag', spec.sections[0].bands[0].rail===true);
t.ok('section 2 (doors) has no cabinet-wide rail field to leak from',
  !('rail' in spec)||spec.rail===undefined);
t.ok('section 3 (open, no rail) band correctly has no rail',
  spec.sections[2].bands[0].rail===false);

const prompt=W.describeDrawing(spec);
t.ok('no stray, section-less "clothes rail" sentence in the prompt',
  !/clothes rail \(Ø/.test(prompt));
t.ok('section 1\'s own open-band line mentions its rail',
  /SECTION 1[\s\S]*?A round metal clothes rail runs near the top/.test(prompt));
t.ok('section 2\'s door band explicitly says CLOSED / not visible',
  /SECTION 2[\s\S]{0,400}CLOSED front[\s\S]{0,150}NOT visible/.test(prompt),
  prompt.split('SECTION 2')[1]?.slice(0,500));
t.ok('section 3 mentions no rail (band 3 has none)',
  !new RegExp('SECTION 3[\\s\\S]*?clothes rail').test(prompt));
t.ok('the prompt tells the model not to remove a door to reveal what is behind it',
  /Do not remove a door to reveal/.test(prompt));
t.ok('the prompt tells the model not to move parts between sections',
  /Do not move a shelf, rail, drawer or door from the section/.test(prompt));

t.report();
