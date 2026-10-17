import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
function check(dir) {
  for (const item of readdirSync(dir, {withFileTypes:true})) {
    if (['.git', 'node_modules', 'dist'].includes(item.name)) continue;
    const file=join(dir,item.name);
    if(item.isDirectory()) check(file);
    else if(/\.(js|mjs|cjs)$/.test(file)) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
  }
}
check('.');
console.log('Sintaxis JavaScript válida.');
