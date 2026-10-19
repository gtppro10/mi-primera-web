// Recursos locales construidos desde dependencias fijadas por package-lock.json.
// Nunca cargar bibliotecas ni documentos privados desde una CDN.
let engine;
function loadScript(relative){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(relative,import.meta.url).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('No se pudo cargar el generador PDF. Ejecuta npm ci y npm run build.'));};document.head.append(script);});}
export async function loadPdfEngine(){
 if(!engine)engine=(async()=>{await loadScript('../../vendor/jspdf.umd.min.js');await loadScript('../../vendor/jspdf.plugin.autotable.min.js');const ctor=globalThis.jspdf?.jsPDF;if(!ctor||typeof ctor.API.autoTable!=='function')throw new Error('Generador PDF no disponible.');return ctor;})().catch(error=>{engine=undefined;throw error;});
 return engine;
}
