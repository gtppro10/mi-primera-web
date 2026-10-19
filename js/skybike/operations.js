// Gestión local de demostración: importes PEN en céntimos, fechas de operación en Lima.
import {id,now,createQuote,reserve,approve,balance,totalDocument,record,assertUniqueReservation} from './domain.js';
export const reservationStates=['PENDIENTE','CONFIRMADA','COMPLETADA','CANCELADA'];
export const limaDay=(value=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function validDay(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function setReservationStatus(state,reservationId,status){
 const r=state.reservations.find(r=>r.id===reservationId);if(!r)throw new Error('Reserva no encontrada.');
 // Se conservan estados operativos anteriores para consultar documentos históricos.
 if(![...reservationStates,'EN CAMINO','PRESENTE','REALIZADA'].includes(status))throw new Error('Estado inválido.');
 if(r.status===status)return r;
 if(status!=='CANCELADA')assertUniqueReservation(state,{...r,status},r.id);
 const before=r.status;r.status=status;r.revision=(r.revision||0)+1;
 record(state,'Estado de reserva actualizado',`${r.number} · ${before} → ${status}`,{entity:'reservations',entityId:r.id,before,after:status});return r;
}
export function saveReservation(state,draft,reservationId='',expectedRevision){
 const working=structuredClone(state),old=working.reservations.find(r=>r.id===reservationId);
 if(reservationId&&!old)throw new Error('Reserva no encontrada.');
 if(old&&expectedRevision!==undefined&&(old.revision||0)!==expectedRevision)throw new Error('La reserva cambió. Ábrela nuevamente.');
 const status=draft.status||old?.status||'PENDIENTE';if(!reservationStates.includes(status)&&status!==old?.status)throw new Error('Selecciona un estado válido.');
 const candidate={...draft,client:draft.clientSnapshot||working.clients.find(c=>c.id===draft.clientId),status};
 assertUniqueReservation(working,candidate,old?.id);
 // Validar en copia; conservar tours ya contratados aunque luego se archiven en catálogo.
 const validation=structuredClone(working);
 if(old)for(const p of validation.products)if(old.lines.some(l=>l.productId===p.id)){p.active=true;p.archivedAt=null;}
 const validated=createQuote(validation,{...draft,requestId:undefined});
 let r;
 if(!old){const q=createQuote(working,draft);approve(working,q.id);r=reserve(working,q.id);r.status=status;r.revision=1;}
 else{
  const totals=totalDocument(draft.lines),paid=balance(working,old.id).paid;
  if(totals.total<paid)throw new Error('El total no puede ser menor a los pagos registrados. No se modificaron pagos.');
  for(const passenger of working.passengers.filter(p=>p.reservationId===old.id)){
   if((passenger.tourLineIds||old.lines.filter(l=>l.type==='Tour').map(l=>l.id)).some(key=>!draft.lines.some(l=>l.type==='Tour'&&l.id===key)))throw new Error('Reasigna los pasajeros antes de quitar un tour contratado.');
  }
  for(const line of draft.lines.filter(l=>l.type==='Tour')){const assigned=working.passengers.filter(p=>p.reservationId===old.id&&(p.tourLineIds||old.lines.filter(l=>l.type==='Tour').map(l=>l.id)).includes(line.id)).length;if(assigned>Number(line.qty))throw new Error('La cantidad no puede ser menor a los pasajeros identificados.');}
  const before=structuredClone(old);
  for(const receipt of working.receipts.filter(x=>x.reservationId===old.id&&!x.supersededAt)){receipt.supersededAt=now();receipt.paymentSnapshot=balance(working,old.id);receipt.paymentsSnapshot=structuredClone(working.payments.filter(p=>p.reservationId===old.id));} 
  Object.assign(old,{client:validated.client,lines:structuredClone(draft.lines).map(l=>{delete l.flyers;return l;}),totals,notes:draft.notes,conditions:draft.conditions,currency:draft.currency,exchangeRate:validated.exchangeRate,status,revision:(old.revision||0)+1,updatedAt:now()});
  // No reescribir cotizaciones ni comprobantes emitidos: crear una nueva revisión interna.
  const receipt={...structuredClone(old),id:id(),reservationId:old.id,number:`REC-DEMO-${String(working.receipts.length+1).padStart(3,'0')}`,status:'Recibo de demostración',date:now(),supersedes:working.receipts.filter(x=>x.reservationId===old.id).at(-1)?.id};
  working.receipts.push(receipt);r=old;
  record(working,'Reserva editada',old.number,{entity:'reservations',entityId:old.id,before,after:structuredClone(old)});
  record(working,'Revisión de comprobante creada',receipt.number,{entity:'receipts',entityId:receipt.id});
 }
 if(!old)record(working,'Reserva creada',r.number,{entity:'reservations',entityId:r.id});
 Object.assign(state,working);return r;
}
export function savePassenger(state,data,passengerId=''){
 const r=state.reservations.find(r=>r.id===data.reservationId);if(!r)throw new Error('Selecciona una reserva.');
 const name=String(data.name||'').trim(),document=String(data.document||'').trim(),phone=String(data.phone||'').trim();
 if(!name||!document||name.length>100||document.length>30||phone.length>80)throw new Error('Revisa nombre, DNI/pasaporte y WhatsApp del pasajero.');
 const tourLineIds=[...new Set(data.tourLineIds||[])];
 if(!tourLineIds.length||tourLineIds.some(key=>!r.lines.some(l=>l.id===key&&l.type==='Tour')))throw new Error('Selecciona al menos un tour de esta reserva para el pasajero.');
 if(state.passengers.some(p=>p.id!==passengerId&&p.reservationId===r.id&&p.document.trim().toUpperCase()===document.toUpperCase()))throw new Error('Este pasajero ya está registrado en la reserva. Edita sus tours.');
 for(const key of tourLineIds){const line=r.lines.find(l=>l.id===key);const occupied=state.passengers.filter(p=>p.id!==passengerId&&p.reservationId===r.id&&(p.tourLineIds||r.lines.filter(l=>l.type==='Tour').map(l=>l.id)).includes(key)).length;if(occupied>=Number(line.qty))throw new Error('Los pasajeros identificados superan la cantidad contratada para un tour.');}
 const previous=passengerId?state.passengers.find(p=>p.id===passengerId):null;if(passengerId&&!previous)throw new Error('Pasajero no encontrado.');
 const before=previous?structuredClone(previous):null;
 const passenger={...(previous||{}),id:passengerId||id(),reservationId:r.id,name,document,phone,tourLineIds,notes:String(data.notes||'').slice(0,500)};
 if(previous)Object.assign(previous,passenger);else state.passengers.push(passenger);
 record(state,previous?'Pasajero actualizado':'Pasajero demo registrado',name,{entity:'passengers',entityId:passenger.id,reservationId:r.id,before,after:structuredClone(passenger)});return passenger;
}
export function passengerHistory(state,document){
 const normalized=String(document).trim().toUpperCase();
 return state.passengers.filter(p=>p.document.trim().toUpperCase()===normalized).flatMap(p=>{const r=state.reservations.find(r=>r.id===p.reservationId);if(!r)return [];return r.lines.filter(l=>l.type==='Tour'&&(p.tourLineIds||r.lines.filter(t=>t.type==='Tour').map(t=>t.id)).includes(l.id)).map(l=>({reservation:r.number,status:r.status,name:p.name,tour:l.description,date:l.date,time:l.time}));});
}
export function filteredRecords(state,entity,filters={}){
 return state[entity].filter(item=>{
  const r=entity==='payments'?state.reservations.find(r=>r.id===item.reservationId):item;
  if(!r)return false;
  const client=r.client,day=entity==='payments'?(item.operationDate||limaDay(item.date)):limaDay(item.date);
  const search=String(filters.search||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const haystack=[item.number,r.number,client?.name,client?.document,client?.phone,item.reference,...(r.lines||[]).map(l=>l.description)].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return (!search||haystack.includes(search))&&(!filters.client||client?.id===filters.client||client?.document===filters.client)&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(!filters.tour||(r.lines||[]).some(l=>l.productId===filters.tour))&&(!filters.status||(entity==='payments'?r.status:item.status)===filters.status);
 }).slice().reverse();
}
export function reports(state,{from='',to='',day=limaDay()}={}){
 const inPeriod=date=>(!from||date>=from)&&(!to||date<=to);
 const payments=state.payments.filter(p=>inPeriod(p.operationDate||limaDay(p.date)));
 const active=state.reservations.filter(r=>r.status!=='CANCELADA');
 const sold=new Map();for(const r of active)for(const l of r.lines.filter(l=>l.type==='Tour'&&inPeriod(l.date))){const key=l.productId||l.description;const item=sold.get(key)||{name:l.description,passengers:0,reservations:0};item.passengers+=Number(l.qty);item.reservations++;sold.set(key,item);}
 return {day,departures:active.filter(r=>r.lines.some(l=>l.type==='Tour'&&l.date===day)),income:payments.reduce((n,p)=>n+p.amount,0),advances:payments.filter(p=>p.kind==='Adelanto'||!p.kind&&p.amount<(state.reservations.find(r=>r.id===p.reservationId)?.totals.total||0)&&state.payments.find(x=>x.reservationId===p.reservationId)?.id===p.id).reduce((n,p)=>n+p.amount,0),outstanding:active.reduce((n,r)=>n+balance(state,r.id).balance,0),cancelledOutstanding:state.reservations.filter(r=>r.status==='CANCELADA').reduce((n,r)=>n+balance(state,r.id).balance,0),topTours:[...sold.values()].sort((a,b)=>b.passengers-a.passengers||a.name.localeCompare(b.name))};
}
