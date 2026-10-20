import {createQuote,id,now,record} from './domain.js';
import {quoteDraft,splitClientPhone} from './quote-draft.js';

// Volver al asistente trabaja sobre una copia. Los documentos ya contratados
// siguen siendo instantáneas independientes de la cotización editable.
export function draftFromQuote(quote) {
  if(!quote?.id)throw new Error('Cotización no encontrada.');
  const client=structuredClone(quote.client||{});
  return quoteDraft({
    clientId:client.id||'',clientSnapshot:client,
    customerName:client.name||'',customerDocument:client.document||'',customerEmail:client.email||'',
    ...splitClientPhone(client.phone,client.countryCode||'+51'),
    lines:structuredClone(quote.lines||[]),currency:quote.currency||'PEN',
    exchangeRate:quote.exchangeRate??1,language:quote.language||'es',
    validity:quote.validity??7,conditions:quote.conditions||'',notes:quote.notes||'',
    wizardStep:1,editingId:quote.id,editingRevision:quote.revision||1,
    editRequestId:id()
  });
}

function content(quote) {
  return {
    client:quote.client,lines:quote.lines,totals:quote.totals,
    currency:quote.currency,exchangeRate:quote.exchangeRate,language:quote.language,
    validity:quote.validity,conditions:quote.conditions,notes:quote.notes
  };
}

// Ordenar claves evita que el orden incidental de propiedades invalide un
// reintento. Se comparan también las imágenes sin duplicarlas en el historial.
function canonical(value) {
  if(Array.isArray(value))return '['+value.map(item=>canonical(item)??'null').join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}

function summary(quote) {
  return {revision:quote.revision||1,status:quote.status,currency:quote.currency,
    exchangeRate:quote.exchangeRate,totals:structuredClone(quote.totals),
    tours:quote.lines.filter(line=>line.type==='Tour').length,
    services:quote.lines.filter(line=>line.type!=='Tour').length};
}

export function persistQuote(state,draft) {
  const working=structuredClone(state);
  if(!draft.editingId) {
    const quote=createQuote(working,structuredClone(draft));
    quote.revision ||= 1;
    Object.assign(state,working);
    return quote;
  }

  const old=working.quotes.find(quote=>quote.id===draft.editingId);
  if(!old)throw new Error('Cotización no encontrada. No se creó otro registro.');
  if(!draft.editRequestId)throw new Error('Vuelve a abrir la cotización para editarla.');

  const validation=structuredClone(working),usedLineIds=new Set();
  for(const line of draft.lines) {
    if(!line.id||usedLineIds.has(line.id))throw new Error('Revisa los identificadores de los tours y servicios: hay una línea duplicada.');
    usedLineIds.add(line.id);
    if(!line.productId)continue;
    const product=working.products.find(item=>item.id===line.productId);
    if(product?.active&&!product.archivedAt)continue;
    const retained=old.lines.some(previous=>previous.id===line.id&&previous.productId===line.productId&&previous.type===line.type);
    if(!retained)throw new Error('No puedes agregar un tour o servicio inactivo o archivado.');
    // Solo una línea ya guardada puede conservar su referencia archivada.
    if(product){const temporary=validation.products.find(item=>item.id===line.productId);temporary.active=true;temporary.archivedAt=null;}
    else validation.products.push({id:line.productId,active:true,archivedAt:null});
  }
  const validated=createQuote(validation,{...structuredClone(draft),requestId:undefined});
  if(old.editRequestId===draft.editRequestId) {
    if(canonical(content(old))!==canonical(content(validated)))throw new Error('La solicitud de edición ya se usó con otros datos. Vuelve a abrir la cotización.');
    // Un reintento no cambia fecha, revisión, historial ni documentos asociados.
    return state.quotes.find(quote=>quote.id===old.id);
  }
  if(working.history.some(event=>event.entity==='quotes'&&event.entityId===old.id&&event.editRequestId===draft.editRequestId))throw new Error('Esta edición ya fue procesada y la cotización cambió después. Ábrela nuevamente.');
  if(Number(draft.editingRevision)!==(old.revision||1))throw new Error('La cotización cambió. Ábrela nuevamente antes de guardar.');

  const before=summary(old);
  Object.assign(old,content(validated),{
    revision:(old.revision||1)+1,updatedAt:now(),editRequestId:draft.editRequestId,
    status:old.status==='Convertida'?'Convertida':'Pendiente'
  });
  record(working,'Cotización editada',old.number,{
    entity:'quotes',entityId:old.id,editRequestId:draft.editRequestId,
    before,after:summary(old)
  });
  Object.assign(state,working);
  return old;
}
