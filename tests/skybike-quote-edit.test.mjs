import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../js/skybike/seed.js';
import {approve,reserve,pay} from '../js/skybike/domain.js';
import {persistQuote,draftFromQuote} from '../js/skybike/quote-edit.js';

function newDraft(state,extra={}) {
  return {...state.draft,clientId:state.clients[1].id,requestId:'CREATE-EDIT-DEMO',
    lines:[{...structuredClone(state.quotes[0].lines[0]),id:'EDIT-TOUR-DEMO',date:'2027-11-20',
      descriptionSnapshot:'Descripción conservada',discounts:[5,15],
      flyers:[{id:'FLYER-DEMO',language:'es',data:'data:image/png;base64,DEMO-SNAPSHOT'}]}],
    ...extra};
}

function editable(state,quote) {
  const draft=draftFromQuote(quote);
  draft.clientSnapshot={...quote.client,name:'Cliente editado ficticio'};
  draft.notes='Notas actualizadas de prueba';
  return draft;
}

test('crea con revisión inicial y reintentar la creación no duplica la cotización',()=>{
  const state=seed(),draft=newDraft(state),count=state.quotes.length;
  const quote=persistQuote(state,draft);
  assert.equal(quote.revision,1);
  const before=structuredClone(state);
  assert.equal(persistQuote(state,draft).id,quote.id);
  assert.equal(state.quotes.length,count+1);
  assert.deepEqual(state,before);
});

test('rehidrata los seis pasos con descuentos, servicios, snapshots y cliente internacional',()=>{
  const state=seed(),draft=newDraft(state,{currency:'USD',exchangeRate:3.7,language:'en',
    validity:15,notes:'Notas demo',conditions:'Condiciones demo',
    clientSnapshot:{name:'Cliente internacional demo',phone:'+34 600000001',document:'PAS-DEMO',email:'demo@example.com'}});
  draft.lines.push({id:'EDIT-SERVICE-DEMO',productId:'food',parentId:draft.lines[0].id,type:'Servicio',
    description:'Alimentación guardada',qty:2,price:25,unitDiscount:0,modality:'POR PERSONA',autoQty:false,includes:'Menú guardado'});
  const quote=persistQuote(state,draft),rehydrated=draftFromQuote(quote);
  assert.equal(rehydrated.wizardStep,1);
  assert.equal(rehydrated.clientId,quote.client.id);
  assert.equal(rehydrated.customerName,'Cliente internacional demo');
  assert.equal(rehydrated.customerDocument,'PAS-DEMO');
  assert.equal(rehydrated.countryCode,'+34');
  assert.equal(rehydrated.customerPhone,'600000001');
  assert.equal(rehydrated.customerEmail,'demo@example.com');
  assert.equal(rehydrated.clientSnapshot.email,'demo@example.com');
  assert.equal(rehydrated.currency,'USD');assert.equal(rehydrated.exchangeRate,3.7);
  assert.equal(rehydrated.language,'en');assert.equal(rehydrated.validity,15);
  assert.equal(rehydrated.conditions,'Condiciones demo');assert.equal(rehydrated.notes,'Notas demo');
  assert.equal(rehydrated.requestId,undefined);
  assert.equal(rehydrated.editingId,quote.id);assert.equal(rehydrated.editingRevision,1);
  assert.ok(rehydrated.editRequestId);assert.notEqual(rehydrated.editRequestId,draftFromQuote(quote).editRequestId);
  assert.deepEqual(rehydrated.lines,quote.lines);
  rehydrated.lines[0].flyers[0].data='La copia cambió';
  rehydrated.lines[0].discounts[0]=999;
  assert.equal(quote.lines[0].flyers[0].data,'data:image/png;base64,DEMO-SNAPSHOT');
  assert.deepEqual(quote.lines[0].discounts,[5,15]);
});

test('editar actualiza el mismo registro y conserva identidad, fecha y creador',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state));
  quote.createdBy='TRABAJADOR-DEMO';quote.createdAt='2026-01-01T00:00:00Z';
  const {id,number,date,requestId}=quote,count=state.quotes.length;
  const draft=editable(state,quote);draft.lines[0].price=150;draft.lines[0].date='2027-11-22';
  const edited=persistQuote(state,draft);
  assert.equal(state.quotes.length,count);
  assert.equal(edited.id,id);assert.equal(edited.number,number);assert.equal(edited.date,date);
  assert.equal(edited.requestId,requestId);assert.equal(edited.createdBy,'TRABAJADOR-DEMO');
  assert.equal(edited.createdAt,'2026-01-01T00:00:00Z');
  assert.equal(edited.revision,2);assert.ok(edited.updatedAt);
  assert.equal(edited.client.name,'Cliente editado ficticio');
  assert.equal(edited.lines[0].price,150);assert.equal(edited.lines[0].date,'2027-11-22');
  assert.equal(edited.totals.total,28000);
  assert.deepEqual(edited.lines[0].flyers,draft.lines[0].flyers);
});

test('una cotización aprobada editada vuelve a pendiente antes de otra aprobación',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state));approve(state,quote.id);
  const edited=persistQuote(state,editable(state,quote));
  assert.equal(edited.status,'Pendiente');
  assert.throws(()=>reserve(state,edited.id),/Aprueba/);
});

test('editar una convertida preserva reservas, recibos, pagos y pasajeros completos',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state));approve(state,quote.id);
  const reservation=reserve(state,quote.id);pay(state,reservation.id,20,'Yape','OP-EDIT-DEMO');
  const before=structuredClone({reservations:state.reservations,receipts:state.receipts,payments:state.payments,passengers:state.passengers});
  const draft=editable(state,quote);draft.lines[0].price=200;
  const edited=persistQuote(state,draft);
  assert.equal(edited.status,'Convertida');
  assert.deepEqual({reservations:state.reservations,receipts:state.receipts,payments:state.payments,passengers:state.passengers},before);
  assert.throws(()=>reserve(state,edited.id),/una vez/);
});

test('reintentar una edición no aumenta revisión ni historial y rechaza otro payload',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state)),draft=editable(state,quote);
  const edited=persistQuote(state,draft),before=structuredClone(state);
  assert.equal(persistQuote(state,structuredClone(draft)).id,edited.id);
  assert.deepEqual(state,before);
  const changed=structuredClone(draft);changed.lines[0].flyers[0].data+='CAMBIO';
  assert.throws(()=>persistQuote(state,changed),/otros datos/);
  assert.deepEqual(state,before);
});

test('rechaza la revisión obsoleta y un reintento antiguo sin reescribir cambios posteriores',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state));
  const original=editable(state,quote),stale=editable(state,quote);
  const first=persistQuote(state,original),newest=editable(state,first);newest.notes='Segunda edición';
  persistQuote(state,newest);const before=structuredClone(state);
  assert.throws(()=>persistQuote(state,stale),/cambió/);
  assert.throws(()=>persistQuote(state,original),/cambió/);
  assert.deepEqual(state,before);
});

test('conserva tours archivados existentes sin reactivarlos ni permitir nuevas líneas archivadas',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state));
  const product=state.products.find(item=>item.id==='sky');product.active=false;product.archivedAt='2026-10-18';
  const draft=editable(state,quote);draft.lines[0].qty=3;draft.lines[0].discounts=[5,15,0];
  const edited=persistQuote(state,draft);
  assert.equal(edited.lines[0].qty,3);
  assert.equal(state.products.find(item=>item.id==='sky').active,false);
  assert.equal(state.products.find(item=>item.id==='sky').archivedAt,'2026-10-18');
  const invalid=editable(state,edited);invalid.lines.push({...invalid.lines[0],id:'NEW-ARCHIVED-TOUR'});
  const before=structuredClone(state);
  assert.throws(()=>persistQuote(state,invalid),/inactivo o archivado/);
  assert.deepEqual(state,before);
});

test('rechaza datos inválidos, líneas duplicadas y registros ausentes sin modificar el estado',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state)),before=structuredClone(state);
  let draft=editable(state,quote);draft.lines[0].discounts=[999,999];
  assert.throws(()=>persistQuote(state,draft),/descuento/);assert.deepEqual(state,before);
  draft=editable(state,quote);draft.lines.push(structuredClone(draft.lines[0]));
  assert.throws(()=>persistQuote(state,draft),/duplicada/);assert.deepEqual(state,before);
  draft=editable(state,quote);draft.editingId='NO-EXISTE';
  assert.throws(()=>persistQuote(state,draft),/no encontrada/);assert.deepEqual(state,before);
  draft=editable(state,quote);delete draft.editRequestId;
  assert.throws(()=>persistQuote(state,draft),/Vuelve a abrir/);assert.deepEqual(state,before);
});

test('el historial de edición registra importes antes/después sin duplicar flyers ni cliente',()=>{
  const state=seed(),quote=persistQuote(state,newDraft(state)),draft=editable(state,quote);
  draft.lines[0].price=150;persistQuote(state,draft);
  const event=state.history.at(-1);
  assert.equal(event.action,'Cotización editada');assert.equal(event.entityId,quote.id);
  assert.equal(event.before.revision,1);assert.equal(event.after.revision,2);
  assert.equal(event.before.totals.total,22000);assert.equal(event.after.totals.total,28000);
  assert.ok(!JSON.stringify(event).includes('DEMO-SNAPSHOT'));
  assert.equal(event.before.client,undefined);assert.equal(event.before.lines,undefined);
});

test('cotizaciones anteriores sin revisión se editan como revisión uno sin recrearlas',()=>{
  const state=seed(),quote=state.quotes[0];assert.equal(quote.revision,undefined);
  const draft=editable(state,quote),edited=persistQuote(state,draft);
  assert.equal(edited.revision,2);assert.equal(edited.id,quote.id);assert.equal(edited.status,'Convertida');
  assert.equal(state.quotes.length,1);
});
