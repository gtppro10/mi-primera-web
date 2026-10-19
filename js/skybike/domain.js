// Importes en céntimos de PEN. El descuento es monetario, nunca porcentual.
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
const cents = value => Math.round(Number(value) * 100);
function amount(value) {
  const n=Number(value);
  if(value==='' || !Number.isFinite(n) || n<0 || n>1000000) throw new Error('Revisa los importes: deben ser positivos o cero.');
  return cents(n);
}
export function lineTotal(line, lines=[]) {
  const parent=lines.find(l=>l.id===line.parentId);
  const qty=line.modality==='POR RESERVA'?1:line.modality==='POR PERSONA'&&line.autoQty!==false&&parent?Number(parent.qty):Number(line.qty);
  if(!Number.isInteger(qty)||qty<1||qty>100)throw new Error('La cantidad debe ser un entero entre 1 y 100.');
  const price=amount(line.price);
  let discounts=Array(qty).fill(amount(line.unitDiscount??0));
  if(line.type==='Tour'&&line.discounts){
    if(line.discounts.length!==qty)throw new Error('Revisa los descuentos de todos los pasajeros.');
    discounts=line.discounts.map(amount);
  }
  if(discounts.some(d=>d>price))throw new Error('Un descuento no puede superar el precio por pasajero.');
  const gross=price*qty,discount=discounts.reduce((s,d)=>s+d,0);
  return {qty,gross,discount,total:gross-discount};
}
export function totalDocument(lines) {
  if(!lines.length)throw new Error('Agrega al menos un tour.');
  return lines.reduce((a,l)=>{
    const t=lineTotal(l,lines);return {gross:a.gross+t.gross,discount:a.discount+t.discount,total:a.total+t.total};
  },{gross:0,discount:0,total:0});
}
export function createQuote(state,draft) {
  const client=state.clients.find(c=>c.id===draft.clientId);
  if(!client)throw new Error('Selecciona un cliente.');
  if(!draft.lines.some(l=>l.type==='Tour'))throw new Error('La cotización necesita al menos un tour.');
  if(!['PEN','USD'].includes(draft.currency)||!Number.isFinite(Number(draft.exchangeRate))||Number(draft.exchangeRate)<=0)throw new Error('Revisa la moneda y el tipo de cambio.');
  for(const l of draft.lines){
    if(l.productId&&!state.products.some(p=>p.id===l.productId&&p.active&&!p.archivedAt))throw new Error('Un tour o servicio de la selección está inactivo o archivado. Revisa el catálogo.');
    if(l.type==='Tour'&&(!/^\d{4}-\d{2}-\d{2}$/.test(l.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(l.time)))throw new Error('Completa la fecha y hora de cada tour.');
    if(l.type!=='Tour'&&!draft.lines.some(t=>t.type==='Tour'&&t.id===l.parentId))throw new Error('Asocia cada servicio adicional a un tour.');
  }
  const totals=totalDocument(draft.lines);
  const quote={id:id(),number:`COT-DEMO-${String(state.quotes.length+1).padStart(3,'0')}`,date:now(),client:structuredClone(client),lines:structuredClone(draft.lines),totals,currency:draft.currency,exchangeRate:draft.currency==='PEN'?1:Number(draft.exchangeRate),language:draft.language||'es',validity:Number(draft.validity||7),notes:draft.notes,status:'Pendiente'};
  if(!Number.isInteger(quote.validity)||quote.validity<1||quote.validity>365)throw new Error('La vigencia debe estar entre 1 y 365 días.');
  state.quotes.push(quote);record(state,'Cotización creada',quote.number);return quote;
}
export function approve(state,quoteId) {
  const q=state.quotes.find(q=>q.id===quoteId);
  if(!q||q.status!=='Pendiente')throw new Error('Solo se aprueban cotizaciones pendientes.');
  q.status='Aprobada';record(state,'Cotización aprobada',q.number);
}
export function reserve(state,quoteId) {
  const quote=state.quotes.find(q=>q.id===quoteId);
  if(!quote||quote.status!=='Aprobada'||state.reservations.some(r=>r.quoteId===quoteId))throw new Error('Aprueba la cotización; cada cotización solo puede convertirse una vez.');
  const reservation={...structuredClone(quote),id:id(),quoteId,quoteNumber:quote.number,number:`RES-DEMO-${String(state.reservations.length+1).padStart(3,'0')}`,status:'CONFIRMADA',date:now()};
  state.reservations.push(reservation);quote.status='Convertida';
  const receipt={...structuredClone(reservation),id:id(),reservationId:reservation.id,number:`REC-DEMO-${String(state.receipts.length+1).padStart(3,'0')}`,status:'Recibo de demostración'};
  state.receipts.push(receipt);record(state,'Reserva y recibo demo creados',reservation.number);return reservation;
}
export function balance(state,reservationId) {
  const r=state.reservations.find(r=>r.id===reservationId);
  if(!r)throw new Error('Reserva no encontrada.');
  const paid=state.payments.filter(p=>p.reservationId===reservationId).reduce((s,p)=>s+p.amount,0);
  return {paid,balance:r.totals.total-paid};
}
export function pay(state,reservationId,value,method,reference='') {
  const amountCents=amount(value),remaining=balance(state,reservationId).balance;
  if(amountCents<=0||amountCents>remaining)throw new Error('El pago debe ser mayor a cero y no superar el saldo.');
  if(!['Efectivo','Yape','Plin','Transferencia','Tarjeta'].includes(method))throw new Error('Selecciona un medio de pago válido.');
  const payment={id:id(),reservationId,amount:amountCents,currency:'PEN',method,reference,date:now()};
  state.payments.push(payment);record(state,'Pago demo registrado',`${method} · ${(amountCents/100).toFixed(2)} PEN`);return payment;
}
export function removeLine(draft,lineId) {draft.lines=draft.lines.filter(l=>l.id!==lineId&&l.parentId!==lineId);}
export function record(state,action,reference) {state.history.push({id:id(),date:now(),action,reference});}
