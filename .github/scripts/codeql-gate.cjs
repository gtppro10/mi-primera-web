// Esperar a que GitHub termine de procesar el análisis del commit actual.
// Cualquier alerta abierta (incluidas advertencias) bloquea esta demo.
const {execFileSync}=require('node:child_process');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function api(path) {return JSON.parse(execFileSync('gh',['api',path],{encoding:'utf8'}));}
(async()=>{
 const {REPO,SCAN_REF,SCAN_SHA}=process.env;
 if(!REPO||!SCAN_REF||!SCAN_SHA)throw new Error('Falta contexto del análisis.');
 const query=`ref=${encodeURIComponent(SCAN_REF)}&tool_name=CodeQL&per_page=100`;
 let complete=false;
 for(let attempt=0;attempt<24;attempt++){
  const analyses=api(`repos/${REPO}/code-scanning/analyses?${query}`);
  const current=analyses.find(a=>a.commit_sha===SCAN_SHA && a.category==='/language:javascript-typescript');
  if(current){
   if(current.error || current.warning)throw new Error('CodeQL informó un error o advertencia de análisis. Revisa Security → Code scanning.');
   if(!Number.isInteger(current.results_count))throw new Error('Resultado CodeQL incompleto.');
   if(current.results_count>0)throw new Error(`CodeQL encontró ${current.results_count} resultados. Requieren revisión y corrección.`);
   complete=true;break;
  }
  await delay(5000);
 }
 if(!complete)throw new Error('No se confirmó el resultado CodeQL de este commit. No se autoriza la publicación.');
 console.log('CodeQL procesado, sin resultados ni advertencias para este commit.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
