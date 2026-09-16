/* §1 §6 §7 — the owner asked for a real download button for the drawings,
   sorted so dimensions read clearly (not "an unsorted pile"). downloadDrawings()
   reuses drawSheet() — the exact function step 4 already renders on screen —
   for four sheets in a fixed order (front, side/plan, iso, exploded+cut-list),
   assembles them into a hidden #printSheets host, and calls window.print()
   so the browser's own "Save as PDF" produces one real file with no new
   dependency and no drift from what the screen shows. Customer-eye renders
   (Realistic / 3D Studio / AI photo) are pictures, not drawings, and must
   never appear in this set (§7 — never for the saw). */
const {boot,toDrawings,suite}=require('./harness');
const t=suite('15-download-drawings · a real download button assembles the four construction sheets, sorted, print-ready');
const h=boot(),{W,doc}=h;
toDrawings(h,{shape:'tallmix',w:1800,ht:2200});

let printCalled=false;
W.print=()=>{printCalled=true;};
const appTitle=doc.title;

W.downloadDrawings();

const host=doc.getElementById('printSheets');
const pages=[...host.querySelectorAll('.pg')];
const svgs=[...host.querySelectorAll('svg')];

t.ok('window.print() is called (no popup, no new dependency)', printCalled);
t.ok('body carries the printing-drawings marker while the dialog is open',
  doc.body.classList.contains('printing-drawings'));
t.ok('exactly four sheets are assembled', pages.length===4 && svgs.length===4,
  pages.length+' pages, '+svgs.length+' svgs');
t.ok('each sheet is a full A3 viewBox (the same sheet the screen renders, §7)',
  svgs.every(s=>/viewBox="0 0 420 297"/.test(s.outerHTML)));

const html=pages.map(p=>p.innerHTML);
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const shFront=esc(W.eval('T("shFront")')),shSide=esc(W.eval('T("shSide")')),
  shOpen=esc(W.eval('T("shOpen")')),shIso=esc(W.eval('T("shIso")')),shExploded=esc(W.eval('T("shExploded")'));
t.ok('sheet 1 is the front elevation', new RegExp(shFront).test(html[0]));
t.ok('sheet 2 is the side elevation (depth), not a repeat of the front',
  new RegExp(shSide).test(html[1]) && !new RegExp(shFront).test(html[1]));
t.ok('sheet 3 is the oblique/iso view (open + closed)',
  new RegExp(shOpen).test(html[2]) && new RegExp(shIso).test(html[2]));
t.ok('sheet 4 is the exploded view carrying the cut-list schedule',
  new RegExp(shExploded).test(html[3]) && /Schedule|schedule/.test(html[3]));

t.ok('no customer-eye render (Realistic/3D Studio/AI photo) sneaks into the drawing download — those are pictures, never the saw’s source',
  !html.some(x=>/glhost|studiohost/.test(x)));

/* ── cleanup: afterprint (or the last-resort timer) must restore the app,
   not leave the screen permanently swapped to the print-only sheets ── */
t.ok('the tab title is set to the project number while the print dialog is open (the browser’s "Save as PDF" suggested filename)',
  doc.title!==appTitle);
W.dispatchEvent(new W.Event('afterprint'));
t.ok('afterprint cleanup removes the printing marker', !doc.body.classList.contains('printing-drawings'));
t.ok('afterprint cleanup empties the print host again', doc.getElementById('printSheets').innerHTML==='');
t.ok('afterprint cleanup restores the original tab title', doc.title===appTitle);

h.assertNoErrors();
t.report();
