/* §6 §10 — reported directly: on the closed realistic 3D view, small
   metal marks show through the front of a closed door ("should be door
   hinges? then they need to be on the inside"), and handles don't read as
   normal graspable handles. buildScene() had every hinge and every handle
   type on the wrong side of the door's own panel: hinges stood proud of the
   OUTER (viewer) face — visible on a closed door, where a real hinge never
   is — while every handle style sat behind the INNER (carcass) face,
   invisible and unreachable. Both were flipped; this proves the fix with
   the actual mesh tree buildScene() produces, not a description of it. */
const {boot,suite,stubThree}=require('./harness');
const t=suite('08-3d-hardware · door hinges sit inside the carcass, handles sit outside');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);

const stub=stubThree();
W.THREE=stub.T3;

const fit={W:mm(700),H:mm(1900),D:mm(560),scribe:0,fillerW:0,wOut:0,hOut:0};
function doorGroupFor(handleType){
  stub.rec.length=0;
  const cfg={columns:[{w:1,zones:[{type:'doors',ratio:1,count:1}]}],handles:handleType,plinth:false};
  cfg.zones=cfg.columns[0].zones;
  const res=W.generate(cfg,fit);
  const root=W.buildScene(res,fit,cfg,{open:false,glass:false,lit:false});
  const panel=stub.rec.find(m=>m.geometry.kind==='box'&&Math.abs(m.geometry.dims[2]-mmv(res.parts.find(p=>p.k==='door').th))<0.01
    &&m.geometry.dims[0]>100); // the door leaf itself: door-thickness deep, well over 100mm wide
  return {res,root,panel,stub};
}
function mmv(t){return t/10;}

/* ── hinges: must sit BEHIND the door's own inner face (deeper into the
   carcass than the panel itself), never in front of its outer face ── */
{
  const {panel,stub:s}=doorGroupFor('bar');
  const cups=s.rec.filter(m=>m.geometry.kind==='cyl'&&Math.abs(m.geometry.dims[0]-17.5)<0.01);
  const arms=s.rec.filter(m=>m.geometry.kind==='box'&&m.geometry.dims[0]===46&&m.geometry.dims[1]===14);
  t.ok('a hinge cup and arm were actually built', cups.length>0&&arms.length>0,
    `${cups.length} cups, ${arms.length} arms`);
  t.ok('the door panel was found for comparison', !!panel);
  if(panel&&cups.length){
    const panelOuter=panel.worldZ()-panel.geometry.dims[2]/2;   // the face toward the viewer
    const panelInner=panel.worldZ()+panel.geometry.dims[2]/2;   // the face into the carcass
    for(const cup of cups)
      t.ok('hinge cup is behind the door\'s inner face, not in front of its outer face',
        cup.worldZ()>panelInner, `cup z=${cup.worldZ().toFixed(1)} inner=${panelInner.toFixed(1)} outer=${panelOuter.toFixed(1)}`);
    for(const arm of arms)
      t.ok('hinge arm is behind the door\'s inner face too',
        arm.worldZ()>panelInner, `arm z=${arm.worldZ().toFixed(1)} inner=${panelInner.toFixed(1)}`);
  }
}

/* ── every handle style: must sit IN FRONT of the door's outer face, where
   a hand actually reaches, never buried behind the inner face ── */
for(const [type,sig] of [['bar',m=>m.geometry.kind==='cyl'&&m.geometry.dims[0]===6],
                          ['knob',m=>m.geometry.kind==='sphere'&&m.geometry.dims[0]===11],
                          ['grooved',m=>m.geometry.kind==='box'&&m.geometry.dims[0]>300&&m.geometry.dims[1]===16]]){
  const {panel,stub:s}=doorGroupFor(type);
  const parts=s.rec.filter(sig);
  t.ok(`${type}: the handle geometry was actually built`, parts.length>0, parts.length+' meshes');
  if(panel&&parts.length){
    const panelOuter=panel.worldZ()-panel.geometry.dims[2]/2;
    for(const p of parts)
      t.ok(`${type}: sits in front of the door's outer face (reachable from outside)`,
        p.worldZ()<panelOuter, `handle z=${p.worldZ().toFixed(1)} outer=${panelOuter.toFixed(1)}`);
  }
}

t.report();
