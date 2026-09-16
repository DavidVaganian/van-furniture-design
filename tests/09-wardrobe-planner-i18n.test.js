/* §8 — the wardrobe Room Planner (category "wardrobe" on step 1) is a
   whole separate screen from the normal step-2 confirm/step-3 drawing flow,
   and it had NO I18N coverage at all: every label, heading, button and
   help sentence across its 5 tabs was hardcoded English. Reported directly
   by the product owner, whose screenshots were this exact screen in
   Armenian with English text throughout. Walk every tab, in hy and ru,
   through the real UI, and scan for a leaked English word. */
const {boot,suite}=require('./harness');
const t=suite('09-wardrobe-planner-i18n · the room planner is translated in every language');
const h=boot(),{$,$$,click,doc,W}=h;
const LEAK=/\b(Room|Frame|Interior|Front|Finish|Wall|Width|Depth|Height|Door|Window|Radiator|Add|Selected|Place|New|Corner|Shelf|Drawer|Handle|Colour|Knob|Bar|Hinged|Sliding|Open|Mixed|Storage|Number|Element|Position|Duplicate|Delete|Fits|too short|clearance|collision|Click a component|production model)\b/;

for(const L of ['hy','ru']){
  const cb=doc.getElementById('noPhoto'); cb.checked=true; cb.dispatchEvent(new h.W.Event('change',{bubbles:true}));
  click($(`[data-l="${L}"]`));
  click($('[data-cat="wardrobe"]'));
  click($('[data-p="wardrobe"]'));
  h.assertNoErrors();
  t.ok(`${L}: the wardrobe planner mounted`, !!$('.wplanner'), 'no .wplanner in #preview');

  /* one obstacle and a selected frame, so the "selected element"/alert
     branches that only render conditionally also get scanned */
  W.VAN.cfg.wardrobePlanner.obstacles=[{id:'ob1',type:'window',wall:'back',offset:100,w:900,bottom:900,h:1200}];
  W.eval('WPOBSEL="ob1"');

  for(const tab of ['room','frames','interior','fronts','finish']){
    const btn=$(`[data-wp-tab="${tab}"]`);
    click(btn);
    h.assertNoErrors();
    const text=($('.wp-panel')||{textContent:''}).textContent;
    const hit=(text.match(LEAK)||[])[0];
    t.ok(`${L}: tab "${tab}" has no leaked English`, !hit, hit?`LEAK "${hit}" in: ${text.slice(0,160)}`:'');
  }
  for(const view of ['room','front','plan']){
    click($(`[data-wp-view="${view}"]`));
    h.assertNoErrors();
    const svg=$('.wp-canvas svg');
    t.ok(`${L}: view "${view}" renders`, !!svg);
    const svgText=svg?svg.textContent:'';
    const hit=(svgText.match(LEAK)||[])[0];
    t.ok(`${L}: view "${view}" svg has no leaked English`, !hit, hit?`LEAK "${hit}" in: ${svgText}`:'');
  }
  const toolbarText=$('.wp-toolbar').textContent, helpText=$('.wp-help').textContent;
  t.ok(`${L}: toolbar has no leaked English`, !LEAK.test(toolbarText), toolbarText);
  t.ok(`${L}: help line has no leaked English`, !LEAK.test(helpText), helpText);
}

t.report();
