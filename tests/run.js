/* Runs every *.test.js in this directory in numeric/alpha order and exits
   non-zero if any suite failed. */
const fs=require('fs'),path=require('path');
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js')).sort();
let anyFail=false;
for(const f of files){
  const before=process.exitCode;
  process.exitCode=0;
  require(path.join(__dirname,f));
  if(process.exitCode)anyFail=true;
}
console.log('\n────────────────────────────────────────────────────────────────');
console.log(anyFail?'SOME SUITES FAILED':`ALL ${files.length} SUITES GREEN`);
process.exitCode=anyFail?1:0;
