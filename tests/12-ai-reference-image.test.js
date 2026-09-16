/* §3 §5 — the AI photo generator used to send text only; the product owner
   asked, with two researched prompts of their own, for the actual
   construction geometry to go along as a reference image, since a pure
   text prompt cannot guarantee exact placement in a layout this
   structured. frontPreviewSVG() renders a clean, dimension-free front view
   straight from the same res.parts the drawing/schedule come from;
   aiRenderImage() switches to the image-EDIT endpoint (which accepts a
   reference image) instead of pure text-to-image whenever one is
   available, and degrades to the old text-only call if it isn't. */
const {boot,suite}=require('./harness');
const t=suite('12-ai-reference-image · a reference image of the real layout goes with the text prompt');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);

const fit={W:mm(1800),H:mm(2200),D:mm(560),scribe:0,fillerW:0,wOut:0,hOut:0};
const cfg={columns:[{w:1,zones:[{type:'doors',ratio:1,count:2}]}],handles:'bar',plinth:true,material:'laminate',colour:'#EAE6DF'};
cfg.zones=cfg.columns[0].zones;
const res=W.generate(cfg,fit);

/* ── frontPreviewSVG: a real, well-formed, dimension-free SVG ── */
{
  const svg=W.frontPreviewSVG(res,fit,cfg);
  t.ok('produces a well-formed SVG', /^<svg viewBox="0 0 [\d.]+ [\d.]+"/.test(svg));
  t.ok('carries explicit pixel width/height for rasterizing', /width="1024" height="\d+"/.test(svg));
  t.ok('draws the door fronts (rects filled with the cabinet colour)',
    new RegExp('fill="'+cfg.colour+'"').test(svg));
  t.ok('carries no dimension text, balloons or title block',
    !/Schedule|schedule|VAN-000\d|scribe/i.test(svg));
  t.ok('every part box present in res.parts produced a rect (no silent drops)',
    (svg.match(/<rect/g)||[]).length>=res.parts.reduce((a,p)=>a+p.boxes.length,0));
}

/* ── buildImagePrompt: mentions the attached reference only when told one
   will actually be sent, and never claims one exists when it won't ── */
{
  const withRef=W.buildImagePrompt(cfg,fit,res,true);
  const withoutRef=W.buildImagePrompt(cfg,fit,res,false);
  t.ok('with a reference: says so explicitly', /attached reference image/.test(withRef));
  t.ok('without a reference: says nothing about an attachment', !/attached reference image/.test(withoutRef));
  t.ok('both still carry the literal construction description', /CONSTRUCTION DRAWING/.test(withRef)&&/CONSTRUCTION DRAWING/.test(withoutRef));
}

/* ── aiRenderImage: routes to the image-EDIT endpoint with the reference
   as multipart form data when one is supplied, and to the old text-only
   generations endpoint when it isn't — proven against a mocked fetch, so
   this runs without a network call or a real API key ── */
{
  const calls=[];
  W.eval('AI.setKey("sk-test-not-real")');
  W.fetch=async(url,opts)=>{
    calls.push({url,opts});
    if(typeof url==='string'&&url.startsWith('data:'))
      return {blob:async()=>new W.Blob(['fake-png-bytes'],{type:'image/png'})};
    return {ok:true,json:async()=>({data:[{b64_json:'ZmFrZQ=='}]})};
  };

  W.aiRenderImage('a prompt',false,1800,2200,'data:image/png;base64,AAAA')
    .then(img=>{
      const upload=calls.find(c=>typeof c.url==='string'&&c.url.includes('/v1/images/edits'));
      t.ok('a reference image routes to /v1/images/edits', !!upload);
      t.ok('the upload body is multipart form data, not JSON', upload&&upload.opts.body instanceof W.FormData);
      t.ok('no Content-Type header is forced (browser sets the multipart boundary)',
        upload&&!(upload.opts.headers&&upload.opts.headers['Content-Type']));
      t.ok('the image generation still resolves to a data URL', img.startsWith('data:image/png;base64,'));

      calls.length=0;
      return W.aiRenderImage('a prompt',false,1800,2200,null);
    })
    .then(img2=>{
      const gen=calls.find(c=>typeof c.url==='string'&&c.url.includes('/v1/images/generations'));
      t.ok('no reference image falls back to /v1/images/generations', !!gen);
      t.ok('the fallback body is JSON', gen&&typeof gen.opts.body==='string'&&JSON.parse(gen.opts.body).prompt==='a prompt');
      t.ok('the fallback still resolves to a data URL', img2.startsWith('data:image/png;base64,'));
      h.assertNoErrors();
      t.report();
    })
    .catch(e=>{ t.ok('aiRenderImage did not throw', false, e&&e.stack||e); t.report(); });
}
