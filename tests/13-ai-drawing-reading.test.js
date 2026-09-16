/* §3 §5 — implements the owner's own two-prompt request literally: a first,
   independent READING pass over the actual drawing image (using their Part
   1 prompt, translated, with VAN's own computed spec attached as the
   "structured model data" their prompt expects), whose locked
   render_description then drives the Part 2 image-generation prompt
   (their Part 2 prompt, translated) instead of VAN's own describeDrawing()
   text — with both a clean reference and the annotated technical drawing
   sent as reference images. A genuine unresolved conflict from the reading
   pass must stop generation with an actionable message (§5), not be
   swallowed the way an unavailable reading pass (no key, network) is. */
const {boot,suite}=require('./harness');
const t=suite('13-ai-drawing-reading · an independent reading pass locks what STEP 2 renders');
const h=boot(),{W}=h;
const mm=v=>Math.round(v*10);

const fit={W:mm(1800),H:mm(2200),D:mm(560),scribe:0,fillerW:0,wOut:0,hOut:0};
const cfg={columns:[{w:1,zones:[{type:'doors',ratio:1,count:2}]}],handles:'bar',plinth:true,material:'laminate',colour:'#EAE6DF'};
cfg.zones=cfg.columns[0].zones;
const res=W.generate(cfg,fit);

const fakeReading={
  status:'ready',
  overall_dimensions:{width_mm:1800,height_mm:2200,depth_mm:560},
  sections_left_to_right:[{index:1,width_mm:1800,bands_top_to_bottom:[
    {type:'doors',count:2,top_above_floor_mm:2200,bottom_above_floor_mm:100,visible_from_outside:true,hidden_contents:''}]}],
  materials:{material:'laminate',finish:'matt',colour_hex:'#EAE6DF',handle_type:'bar'},
  counts_visible:{doors:2,drawer_fronts:0,open_shelves:0},
  counts_hidden:{shelves:0,rails:0},
  render_description:'The whole piece: one section, two full-height hinged doors, closed.',
  forbidden_changes:['do not remove the doors','do not add a rail'],
  uncertainties:[],conflicts:[]
};

/* ── readDrawingViaVision: sends the drawing image + the structured spec
   as text, asks for the schema, returns the parsed reading ── */
{
  let captured=null;
  W.eval('AI.setKey("sk-test-not-real")');
  W.fetch=async(url,opts)=>{
    captured={url,body:JSON.parse(opts.body)};
    return {ok:true,json:async()=>({output_text:JSON.stringify(fakeReading)})};
  };
  W.readDrawingViaVision(res,fit,cfg,'data:image/png;base64,AAAA').then(reading=>{
    t.ok('calls the Responses API', captured&&captured.url.includes('/v1/responses'));
    t.ok('sends the drawing image as input_image',
      captured&&captured.body.input[0].content.some(c=>c.type==='input_image'));
    t.ok('embeds the structured model data (readDrawing output) as text in the prompt',
      captured&&captured.body.input[0].content[0].text.includes('"sections"'));
    t.ok('requests the strict schema by name',
      captured&&captured.body.text.format.name==='drawing_reading'&&captured.body.text.format.strict===true);
    t.ok('returns the parsed reading', reading.status==='ready'&&reading.render_description===fakeReading.render_description);

    /* ── buildImagePromptFromReading: locked spec drives the prompt,
       forbidden_changes carried through, references acknowledged ── */
    const prompt=W.buildImagePromptFromReading(fakeReading,true);
    t.ok('carries the reading\'s own render_description verbatim', prompt.includes(fakeReading.render_description));
    t.ok('carries every forbidden_changes item', fakeReading.forbidden_changes.every(f=>prompt.includes(f)));
    t.ok('tells the model the attached images are the construction, not a style reference',
      /attached reference images/.test(prompt));
    t.ok('still forbids the generic failure modes (hidden content, symmetry, mirroring)',
      /Hidden parts stay hidden/.test(prompt)&&/Do not mirror/.test(prompt));

    /* ── aiRenderImage with TWO references: both go into image[] ── */
    const calls=[];
    W.fetch=async(url,opts)=>{
      calls.push({url,opts});
      if(typeof url==='string'&&url.startsWith('data:'))return {blob:async()=>new W.Blob(['x'],{type:'image/png'})};
      return {ok:true,json:async()=>({data:[{b64_json:'ZmFrZQ=='}]})};
    };
    return W.aiRenderImage('p',false,1800,2200,['data:image/png;base64,AAAA','data:image/png;base64,BBBB'])
      .then(()=>{
        const upload=calls.find(c=>typeof c.url==='string'&&c.url.includes('/v1/images/edits'));
        const imgEntries=upload&&[...upload.opts.body.entries()].filter(([k])=>k==='image[]');
        t.ok('both reference images are attached under image[]', imgEntries&&imgEntries.length===2);
      });
  }).then(()=>{
    h.assertNoErrors();
    t.report();
  }).catch(e=>{ t.ok('the pipeline did not throw', false, e&&e.stack||e); t.report(); });
}
