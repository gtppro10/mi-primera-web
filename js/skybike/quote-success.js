import {generateQuotePdf} from './quote-pdf.js';
let cached,sequence=0;
const urls=new Set();
function objectURL(blob){const url=URL.createObjectURL(blob);urls.add(url);return url;}
window.addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear();});
const keyOf=(quote,flyers)=>JSON.stringify([quote,flyers]);
function status(root,text){const target=root.querySelector('#quote-file-status');if(target)target.textContent=text;}
export function quoteSuccessHTML(quote,e){
 if(!quote)return '<section class="card quote-success"><h1>Cotización no disponible</h1><p>Abre una cotización guardada para consultarla.</p><a class="hero-link" href="#cotizaciones">Cotizaciones guardadas</a><a class="back-home" href="#panel">VOLVER AL INICIO</a></section>';
 return `<section class="quote-success" id="quote-success" data-quote-id="${e(quote.id)}"><div class="quote-success-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="currentColor"></circle><path d="m18 32 10 10 19-22" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path></svg></div><h1 tabindex="-1">COTIZACIÓN GENERADA</h1><p class="quote-success-number">${e(quote.number)}</p><p>Puedes compartir el PDF, abrirlo o volver a editar la cotización conservando el mismo número.</p><label class="check-option success-flyers"><input type="checkbox" id="success-include-flyers" checked> Incluir flyers de los tours</label><p id="quote-file-warning" class="help"></p><div class="quote-success-actions"><button type="button" data-action="quote-file-share" disabled>COMPARTIR PDF COMO ARCHIVO</button><button type="button" class="secondary" data-action="quote-file-open" disabled>ABRIR PDF</button><button type="button" class="secondary" data-action="quote-edit" data-id="${e(quote.id)}">EDITAR COTIZACIÓN</button><a class="secondary-button" href="#panel">VOLVER AL INICIO</a></div><p id="quote-file-status" role="status" aria-live="polite">Preparando el archivo PDF…</p><button type="button" class="text-button" data-action="quote-file-download" hidden>Descargar PDF</button><button type="button" class="text-button" data-action="quote-file-retry" hidden>Reintentar generación del PDF</button><p class="help">Cotización de demostración sin validez tributaria. No se confirma ningún envío por abrir el menú de compartir.</p></section>`;
}
export async function prepareQuoteSuccess({quote,root}){
 const token=++sequence,card=root.querySelector('#quote-success');if(!card||!quote)return;
 const flyers=root.querySelector('#success-include-flyers').checked,key=keyOf(quote,flyers);
 const toggle=disabled=>root.querySelectorAll('[data-action="quote-file-share"],[data-action="quote-file-open"]').forEach(b=>b.disabled=disabled);
 toggle(true);status(root,'Preparando el archivo PDF…');root.querySelector('[data-action="quote-file-retry"]').hidden=true;
 try{
  const result=cached?.key===key?cached.result:await generateQuotePdf(quote,{flyers});
  if(token!==sequence||!root.contains(card))return;
  cached={key,result};toggle(false);status(root,'PDF listo para abrir o compartir.');
  root.querySelector('#quote-file-warning').textContent=result.missingFlyers.length?`Sin flyer del idioma seleccionado: ${result.missingFlyers.join(', ')}. Puedes continuar sin esos anexos.`:'';
 }catch(error){if(token!==sequence||!root.contains(card))return;status(root,`La cotización está guardada. No se pudo generar el PDF: ${error.message}`);root.querySelector('[data-action="quote-file-retry"]').hidden=false;}
}
function download(result){const a=document.createElement('a');a.href=objectURL(result.blob);a.download=result.name;document.body.append(a);a.click();a.remove();}
export async function handleQuoteFileAction(action,{quote,root}){
 const card=root.querySelector('#quote-success');if(!card||!quote)return;
 if(action==='quote-file-retry'){await prepareQuoteSuccess({quote,root});return;}
 const flyers=root.querySelector('#success-include-flyers').checked,key=keyOf(quote,flyers);
 let tab;
 // Abrir durante el gesto; si generar falla, no dejar una pestaña vacía.
 if(action==='quote-file-open'){tab=window.open('','_blank');if(tab)tab.opener=null;}
 try{
  if(cached?.key!==key){await prepareQuoteSuccess({quote,root});if(cached?.key!==key)throw new Error('El PDF todavía no está disponible. Reintenta la generación.');}
  const result=cached.result;
  if(action==='quote-file-open'){
   if(!tab){status(root,'El navegador bloqueó la pestaña. Puedes descargar el PDF para abrirlo.');root.querySelector('[data-action="quote-file-download"]').hidden=false;return;}
   tab.location.replace(objectURL(result.blob));status(root,'PDF abierto. No se envió a ningún destinatario.');
  }else if(action==='quote-file-download'){download(result);status(root,'Descarga del PDF solicitada para adjuntarlo manualmente.');}
  else if(action==='quote-file-share'){
   if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[result.file]})){
    const buttons=root.querySelectorAll('[data-action="quote-file-share"]');buttons.forEach(b=>b.disabled=true);
    try{await navigator.share({files:[result.file],title:quote.number});status(root,'Archivo entregado al menú de compartir. No se confirma el envío al destinatario.');}
    finally{buttons.forEach(b=>b.disabled=false);}
   }else{download(result);status(root,'Descarga del PDF solicitada. Adjúntalo manualmente en WhatsApp u otra aplicación; no se ha enviado.');}
  }
 }catch(error){tab?.close();if(error.name==='AbortError')status(root,'Compartición cancelada. La cotización permanece guardada.');else{status(root,`No se pudo completar la acción: ${error.message}`);root.querySelector('[data-action="quote-file-download"]').hidden=false;}}
}
