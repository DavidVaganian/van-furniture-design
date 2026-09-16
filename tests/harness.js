/* Headless harness for the v16 VAN build. Boots the real shipped index.html
   in jsdom with the browser APIs it needs stubbed, and drives it the way a
   person would: clicks, typed values, drags — not internal function calls
   only, so UI-wiring bugs the old vm.Script smoke test could never see
   (event listeners, DOM ids, button state) are actually exercised. */
const fs=require('fs'),path=require('path'),{JSDOM,VirtualConsole}=require('jsdom');
const HTML=path.join(__dirname,'..','index.html');

function boot(){
  const errors=[];
  const vc=new VirtualConsole();
  /* jsdom reports an exception thrown inside a DOM event listener (a click
     handler, an input handler, …) as a 'jsdomError' on the virtual console
     rather than letting it propagate to the test — so a crash inside a real
     click handler would otherwise pass silently. Capture every one. */
  vc.on('jsdomError',err=>errors.push(err));
  const dom=new JSDOM(fs.readFileSync(HTML,'utf8'),
   {url:'http://localhost/van-v16/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.fetch=()=>Promise.reject(new Error('offline in test'));
    w.scrollTo=()=>{};
    w.storage={get:async()=>null,set:async()=>({}),list:async()=>({keys:[]})};
    w.HTMLCanvasElement.prototype.getContext=()=>({
      fillRect(){},drawImage(){},fillStyle:'',lineWidth:1,strokeStyle:'',
      createLinearGradient:()=>({addColorStop(){}}),
      createRadialGradient:()=>({addColorStop(){}}),
      beginPath(){},arc(){},fill(){},stroke(){},lineTo(){},moveTo(){},
      getImageData:()=>({data:new Uint8ClampedArray(64*64*4).fill(200)})});
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AA';
    w.requestAnimationFrame=cb=>setTimeout(cb,0);
    w.cancelAnimationFrame=id=>clearTimeout(id);
  }});
  const W=dom.window,doc=W.document;
  W.addEventListener('error',e=>errors.push(e.error||e.message||e));
  return {W,doc,errors,
    /* fail loudly the first time any uncaught exception happened, instead of
       a test quietly passing on a crashed page */
    assertNoErrors(){ if(errors.length) throw new Error('uncaught error(s) during the test: '+
      errors.map(e=>(e&&e.stack)||String(e)).join('\n---\n')); },
    $:s=>doc.querySelector(s),
    $$:s=>[...doc.querySelectorAll(s)],
    click:el=>el&&el.dispatchEvent(new W.MouseEvent('click',{bubbles:true})),
    dblclick:el=>el&&el.dispatchEvent(new W.MouseEvent('dblclick',{bubbles:true})),
    setIn:(id,v)=>{const e=doc.getElementById(id);e.value=v;
      e.dispatchEvent(new W.Event('input',{bubbles:true}));},
    setSel:(id,v)=>{const e=doc.getElementById(id);e.value=v;
      e.dispatchEvent(new W.Event('change',{bubbles:true}));},
    change:(el,v)=>{el.value=v;el.dispatchEvent(new W.Event('change',{bubbles:true}));},
    key:(target,k,mods)=>target.dispatchEvent(new W.KeyboardEvent('keydown',
      Object.assign({key:k,bubbles:true,cancelable:true},mods||{}))),
    src:()=>fs.readFileSync(HTML,'utf8')};
}

/* Walk a job from the first screen to the drawings (step 4), clearing every
   blocking error by clicking its first fix. */
function toDrawings(h,{lang='en',shape='tallmix',w=2000,ht=2400,noPhoto=true}={}){
  const {$,click,setIn}=h;
  click($(`[data-l="${lang}"]`));
  if(noPhoto){const cb=h.doc.getElementById('noPhoto');
    if(cb&&!cb.checked){cb.checked=true;cb.dispatchEvent(new h.W.Event('change',{bubbles:true}));}}
  click($(`[data-p="${shape}"]`));
  click($('#s2 [data-go="3"]'));
  setIn('wT',w);setIn('wM',w-2);setIn('wB',w-4);
  setIn('hL',ht);setIn('hC',ht-2);setIn('hR',ht+1);
  for(let i=0;i<10;i++){const e=$('#fitmsgs .msg.err [data-fk]');if(!e)break;click(e);}
  click($('#s3 [data-go="4"]'));
}

function toStep3(h,opts){
  const {$,click,setIn}=h;
  const {lang='en',shape='tallmix',w=2000,ht=2400,noPhoto=true}=opts||{};
  click($(`[data-l="${lang}"]`));
  if(noPhoto){const cb=h.doc.getElementById('noPhoto');
    if(cb&&!cb.checked){cb.checked=true;cb.dispatchEvent(new h.W.Event('change',{bubbles:true}));}}
  click($(`[data-p="${shape}"]`));
  click($('#s2 [data-go="3"]'));
  setIn('wT',w);setIn('wM',w-2);setIn('wB',w-4);
  setIn('hL',ht);setIn('hC',ht-2);setIn('hR',ht+1);
}

/* Tiny assertion recorder — prints a readable report, exits non-zero on
   failure, and lets a suite keep going after a failed assertion so one bug
   doesn't hide the next. */
function suite(name){
  const out=[];let fails=0;
  return {
    ok(label,cond,detail){ if(!cond)fails++;
      out.push(`${cond?'PASS':'FAIL'}  ${label.padEnd(62)} ${detail||''}`); },
    report(){
      console.log(`\n── ${name} ──`);
      console.log(out.join('\n'));
      console.log(fails?`\n${fails} FAILURE(S) in ${name}`:`\nALL PASS · ${name}`);
      if(fails)process.exitCode=1;
      return fails;
    }};
}
/* Minimal Three.js stand-in — just enough surface for buildScene() to run
   headless (no WebGL) and produce a real mesh tree we can inspect. Every
   Mesh records itself; geometries only need to exist (roundedBox reads a
   fake BufferAttribute and calls computeVertexNormals(), nothing else). */
function stubThree(){
  const rec=[];
  function V3(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  Object.assign(V3.prototype,{
    set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},
    fromBufferAttribute(a,i){this.x=a.arr[i*3];this.y=a.arr[i*3+1];this.z=a.arr[i*3+2];return this;},
    sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;},
    add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;},
    length(){return Math.hypot(this.x,this.y,this.z);},
    multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}});
  const geo=(kind,dims)=>({kind,dims,computeVertexNormals(){},
    attributes:{position:{count:8,arr:new Array(24).fill(0),setXYZ(){}}}});
  function Obj3D(){
    this.children=[];this.parent=null;this.position=new V3();this.rotation=new V3();
    this.scale=new V3(1,1,1);this.visible=true;this.castShadow=false;this.receiveShadow=false;
    this.userData={};
  }
  Obj3D.prototype.add=function(...os){this.children.push(...os);os.forEach(o=>o.parent=this);return this;};
  /* world Z: sum of this + every ancestor's local Z (exact for the
     closed/unrotated pose these tests inspect — nothing in that pose
     rotates the door group, so a plain position sum matches Three's real
     matrix math for this one axis). */
  Obj3D.prototype.worldZ=function(){let z=0,n=this;while(n){z+=n.position.z;n=n.parent;}return z;};
  function Mesh(g,m){Obj3D.call(this);this.geometry=g;this.material=m;rec.push(this);}
  Mesh.prototype=Object.create(Obj3D.prototype);
  function Group(){Obj3D.call(this);}
  Group.prototype=Object.create(Obj3D.prototype);
  function PointLight(){Obj3D.call(this);}
  PointLight.prototype=Object.create(Obj3D.prototype);
  const T3={
    Group,Mesh,PointLight,
    /* buildScene/roundedBox construct these with `new`, so they must be real
       constructor functions, not arrows returning a plain object */
    BoxGeometry:function(w,h,d){return Object.assign(this,geo('box',[w,h,d]));},
    SphereGeometry:function(r){return Object.assign(this,geo('sphere',[r]));},
    CylinderGeometry:function(a,b,c){return Object.assign(this,geo('cyl',[a,b,c]));},
    PlaneGeometry:function(w,h){return Object.assign(this,geo('plane',[w,h]));},
    TorusGeometry:function(r,tr){return Object.assign(this,geo('torus',[r,tr]));},
    MeshStandardMaterial:function(o){Object.assign(this,o||{});},
    MeshPhysicalMaterial:function(o){Object.assign(this,o||{});},
    MeshBasicMaterial:function(o){Object.assign(this,o||{});},
    Color:function(c){this.c=c;this.multiplyScalar=()=>this;},
    Vector3:V3,CanvasTexture:function(){this.repeat={set(){}};},
    RepeatWrapping:1,BackSide:2,DoubleSide:2};
  return {T3,rec};
}
module.exports={boot,toDrawings,toStep3,suite,stubThree};
