import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const walk = path => readdirSync(path,{withFileTypes:true}).flatMap(item =>
  item.isDirectory() ? walk(join(path,item.name)) : [join(path,item.name)]);
const paths = [...walk('src'),...walk('public'),'README.md','docs/MODEL.md','docs/VISUAL_GUIDE.md','index.html','package.json']
  .filter(path => !path.includes('/fixtures/') && !path.endsWith('.test.ts') &&
    !path.endsWith('legacy-telemetry.ts') && !path.includes('__pycache__'));
const banned = /[\u0370-\u03ff\u1f00-\u1fff]|QOFT|QOSMOS|Geometric Unity|Shiab|Glyphogenic|observer field|canonical weight|reflexive self|typed fusion|\bcollapse\b/i;
const failures=[];
for(const path of paths) {
  readFileSync(path,'utf8').split('\n').forEach((line,index)=>{
    if(banned.test(line)) failures.push(`${path}:${index+1}: ${line.trim()}`);
  });
}
if(failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Terminology check passed for ${paths.length} active files. Historical adapters, fixtures, and migration records are explicit exceptions.`);
