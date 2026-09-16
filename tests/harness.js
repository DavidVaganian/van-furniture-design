/* Headless harness for the v16 VAN build. Boots the real shipped index.html
   in jsdom with the browser APIs it needs stubbed, and drives it the way a
   person would: clicks, typed values, drags — not internal function calls
   only, so UI-wiring bugs the old vm.Script smoke test could never see
   (event listeners, DOM ids, button state) are actually exercised. */
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const HTML=path.join(__dirname,'..','index.html');

function boot(){
  const dom=new JSDOM(fs.readFileSync(HTML,'utf8'),
   {url:'http://localhost/van-v16/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
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
  return {W,doc,
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
module.exports={boot,toDrawings,toStep3,suite};
