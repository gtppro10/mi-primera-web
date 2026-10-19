import {id,lineTotal,totalDocument,removeLine} from './domain.js';
export const wizardTitles=['Datos del cliente','Documento internacional','Selección de tours','Detalles de tours','Resumen','Revisión y generación'];
export function quoteDraft(source={}){return {lines:[],clientId:'',customerName:'',customerDocument:'',customerPhone:'',countryCode:'+51',currency:'PEN',exchangeRate:3.8,language:'es',validity:7,notes:'',conditions:'Tarifas de demostración. Confirmar disponibilidad antes de reservar.',wizardStep:1,...structuredClone(source),documentType:'quote'};}
export function formatQuoteMoney(cents,draft){const usd=draft.currency==='USD';const rate=Number(draft.exchangeRate);if(usd&&(!Number.isFinite(rate)||rate<=0))return 'Tipo de cambio inválido';return new Intl.NumberFormat(usd?'en-US':'es-PE',{style:'currency',currency:usd?'USD':'PEN'}).format(cents/100/(usd?rate:1));}
export function to24Hour(hour,minute,period){const h=Number(hour),m=Number(minute);if(!Number.isInteger(h)||h<1||h>12||!/^\d{1,2}$/.test(String(minute))||!Number.isInteger(m)||m<0||m>59||!['AM','PM'].includes(period))throw new Error('Revisa hora, minutos y AM/PM.');return `${String(h%12+(period==='PM'?12:0)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
export function from24Hour(time='09:00'){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return {hour:'',minute:'',period:'AM'};const [h,m]=time.split(':').map(Number);return {hour:h%12||12,minute:String(m||0).padStart(2,'0'),period:h>=12?'PM':'AM'};}
export function addQuoteProduct(draft,product,parentId=''){
 if(!product?.active||product.archivedAt)throw new Error('El producto está inactivo o archivado.');
 const parent=draft.lines.find(l=>l.id===parentId&&l.type==='Tour');
 if(product.type!=='Tour'&&!parent)throw new Error('Selecciona el tour al que pertenece el servicio.');
 if(draft.lines.some(l=>l.productId===product.id&&(product.type==='Tour'||l.parentId===parentId)))return false;
 draft.lines.push({id:id(),productId:product.id,type:product.type,description:product.name,category:product.category,qty:product.type==='Tour'?1:product.modality==='POR PERSONA'?Number(parent.qty):1,price:product.price,unitDiscount:0,modality:product.modality||'POR PERSONA',autoQty:true,parentId:parent?.id||'',date:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'America/Lima'}),time:(product.schedules||'').split(',')[0].trim()||'09:00',includes:product.includes,excludes:product.excludes,descriptionSnapshot:product.description||'',itinerarySnapshot:product.itinerary||'',flyers:product.type==='Tour'?structuredClone(product.flyers||[]):undefined});return true;
}
export function resizeDiscounts(line,qty){if(line.discounts)line.discounts=Array.from({length:qty},(_,i)=>line.discounts[i]??line.unitDiscount??0);line.qty=qty;}
export function tourSummary(tour,lines){const base=lineTotal(tour,lines),extras=lines.filter(l=>l.parentId===tour.id).reduce((n,l)=>n+lineTotal(l,lines).total,0);return {gross:base.gross,net:base.total,extras,total:base.total+extras};}
export function validateWizardStep(draft,step){
 if(step===1){if(!draft.customerName?.trim())throw new Error('Completa el nombre del cliente.');if(!draft.customerDocument?.trim())throw new Error('Completa el DNI o pasaporte.');if(!/^\+?[1-9]\d{0,3}$/.test(draft.countryCode||''))throw new Error('Revisa el código de país.');if(!/^\d{7,15}$/.test(String(draft.customerPhone||'').replace(/[\s()-]/g,'')))throw new Error('Revisa el WhatsApp: entre 7 y 15 dígitos, sin el código de país.');}
 if(step===2){if(!['PEN','USD'].includes(draft.currency)||!['es','en'].includes(draft.language))throw new Error('Selecciona moneda e idioma válidos.');if(draft.currency==='USD'&&(!Number.isFinite(Number(draft.exchangeRate))||Number(draft.exchangeRate)<=0||draft.exchangeRate===''))throw new Error('Ingresa un tipo de cambio mayor a cero.');}
 if(step===3&&!draft.lines.some(l=>l.type==='Tour'))throw new Error('Selecciona al menos un tour.');
 if(step===4){for(const l of draft.lines){if(l.type==='Tour'){if(!/^\d{4}-\d{2}-\d{2}$/.test(l.date)||!Number.isFinite(Date.parse(l.date+'T12:00:00Z'))||new Date(l.date+'T12:00:00Z').toISOString().slice(0,10)!==l.date)throw new Error('Completa una fecha válida para cada tour.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(l.time))throw new Error('Revisa el horario de cada tour.');}else if(!draft.lines.some(t=>t.id===l.parentId&&t.type==='Tour'))throw new Error('Un servicio no está asociado a un tour.');}totalDocument(draft.lines);}
 if(step===5&&(!Number.isInteger(Number(draft.validity))||Number(draft.validity)<1||Number(draft.validity)>365))throw new Error('La vigencia debe estar entre 1 y 365 días.');
}
export function validateQuoteDraft(draft){for(let step=1;step<=5;step++)validateWizardStep(draft,step);}
export {removeLine};
// Mover la cesta auxiliar al borrador sin reemplazar correcciones ya realizadas.
export function mergeQuoteBasket(current,basket){
 const next=quoteDraft(current||basket),parents=new Map();
 for(const line of basket.lines.filter(l=>l.type==='Tour')){const existing=next.lines.find(l=>l.type==='Tour'&&(l.id===line.id||l.productId&&l.productId===line.productId));if(existing)parents.set(line.id,existing.id);else{next.lines.push(structuredClone(line));parents.set(line.id,line.id);}}
 for(const line of basket.lines.filter(l=>l.type!=='Tour')){const parentId=parents.get(line.parentId)||line.parentId;if(!next.lines.some(l=>l.type!=='Tour'&&l.parentId===parentId&&(l.id===line.id||l.productId&&l.productId===line.productId)))next.lines.push({...structuredClone(line),parentId});}
 return next;
}
export function splitClientPhone(phone,countryCode='+51'){
 const value=String(phone||'').trim(),match=value.match(/^\+([1-9]\d{0,3})[\s-]+(.+)$/);
 if(match)return {countryCode:'+'+match[1],customerPhone:match[2]};
 return {countryCode,customerPhone:value.startsWith(countryCode)?value.slice(countryCode.length).trim():value};
}
