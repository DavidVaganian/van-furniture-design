/* Runs every *.test.js in this directory, each as its own subprocess (so a
   test file that finishes asynchronously — e.g. one awaiting a mocked
   fetch() chain — reports and exits correctly instead of racing the next
   file or this runner's own summary), in numeric/alpha order, and exits
   non-zero if any suite failed. */
const fs=require('fs'),path=require('path');
const {spawnSync}=require('child_process');
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js')).sort();
let anyFail=false;
for(const f of files){
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:'inherit'});
  if(r.status)anyFail=true;
}
console.log('\n────────────────────────────────────────────────────────────────');
console.log(anyFail?'SOME SUITES FAILED':`ALL ${files.length} SUITES GREEN`);
process.exitCode=anyFail?1:0;
