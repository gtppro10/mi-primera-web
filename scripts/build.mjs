import {mkdirSync, rmSync, lstatSync, readdirSync, copyFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
// Publicar solo los recursos de la web. No copiar repositorio, pruebas o secretos.
function copy(source, destination) {
  const stat=lstatSync(source);
  if(stat.isSymbolicLink()) throw new Error(`No se permiten enlaces simbólicos: ${source}`);
  if(stat.isDirectory()) {
    mkdirSync(destination,{recursive:true});
    for(const name of readdirSync(source)) copy(join(source,name),join(destination,name));
  } else copyFileSync(source,destination);
}
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const file of ['index.html','styles.css','styles','script.js','js','images']) copy(file,join('dist',file));
writeFileSync('dist/.nojekyll','');
console.log('Sitio estático preparado en dist/.');
