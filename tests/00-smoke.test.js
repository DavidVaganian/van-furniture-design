/* Sanity check: the harness can actually boot this build and walk a job to
   drawings. If this suite is red, every other suite's result is meaningless. */
const {boot,toDrawings,suite}=require('./harness');
const t=suite('00-smoke · harness boots the real file and reaches drawings');
const h=boot(),{$,$$,doc}=h;

t.ok('index.html parsed and scripts ran', !!doc.getElementById('s1'));
t.ok('shape tiles render at boot', $$('#tiles [data-p]').length>0,
  $$('#tiles [data-p]').length+' tiles');

toDrawings(h,{shape:'tallmix',w:2000,ht:2400});
t.ok('reaches step 4 (drawings)', !doc.getElementById('s4').classList.contains('hide'));
t.ok('cut list has rows', $$('#cut tr').length>0, $$('#cut tr').length+' rows');
t.ok('VAN debug bridge exposed', !!h.W.VAN && typeof h.W.VAN.build==='function');

t.report();
