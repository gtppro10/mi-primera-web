import {mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
mkdirSync(join(root,'vendor'),{recursive:true});
for(const [source,target] of [
 ['node_modules/jspdf/dist/jspdf.umd.min.js','jspdf.umd.min.js'],
 ['node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js','jspdf.plugin.autotable.min.js'],
 ['node_modules/jspdf/LICENSE','jspdf-LICENSE.txt'],
 ['node_modules/jspdf-autotable/LICENSE.txt','jspdf-autotable-LICENSE.txt']
])copyFileSync(join(root,source),join(root,'vendor',target));
