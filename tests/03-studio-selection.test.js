/* §1 (Example 1's numbering/reference-integrity class, applied to selection)
   — the 3D Studio's STUDIO_SEL caches a part's res.parts index plus its
   column/zone at the moment it was picked. studioTarget() re-validates ci/zi
   against the CURRENT model before any destructive action, so a stale
   selection can't corrupt data — but before this fix it was never cleared
   when the model changed from OUTSIDE the studio (an edit on step 2/3, or an
   undo/redo/project load), so the Studio's "Selected: <part>" panel kept
   showing a phantom part with stale cached dimensions after the real one was
   gone, deleted, or renumbered. */
const {boot,toStep3,suite}=require('./harness');
const t=suite('03-studio-selection · a structural edit drops a stale 3D Studio pick');
const h=boot(),{W}=h;

toStep3(h,{shape:'tallmix'});
W.eval('cfg.columns=[{w:1,zones:[{type:"doors",ratio:1,count:2}]},{w:1,zones:[{type:"open",ratio:1,shelves:2}]}]; cfg.zones=cfg.columns[0].zones;');

/* simulate: the user picked a part in the 3D Studio earlier in the session */
W.eval('STUDIO_SEL={pi:3,col:1,zi:0,key:"door|1|0|0|0|3",dims:{w:400,h:2000,d:18},box:{x:0,y:0,z:0,w:400,h:2000,d:18}}');
t.ok('selection is set before the edit', W.eval('!!STUDIO_SEL'));

/* an ordinary step-3 action — deleting section 1 — happens next, entirely
   unrelated to the studio, and goes through mark() like every mutation */
W.secDelete(1);
t.ok('deleting a section (any mark()-guarded edit) drops the stale studio pick',
  W.eval('STUDIO_SEL===null'));

/* same guarantee across undo/redo, which restores state WITHOUT going
   through mark() (it calls restoreSnapshot() directly) */
W.eval('STUDIO_SEL={pi:0,col:0,zi:0,key:"x",dims:{w:1,h:1,d:1},box:{x:0,y:0,z:0,w:1,h:1,d:1}}');
t.ok('selection set again before undo', W.eval('!!STUDIO_SEL'));
W.undo();
t.ok('undo (restoreSnapshot) also drops the stale studio pick', W.eval('STUDIO_SEL===null'));

t.report();
