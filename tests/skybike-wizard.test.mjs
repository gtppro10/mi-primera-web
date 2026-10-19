import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteDraft,validateWizardStep,validateQuoteDraft,addQuoteProduct,resizeDiscounts,tourSummary,to24Hour,from24Hour,formatQuoteMoney,removeLine} from '../js/skybike/quote-draft.js';
import {seed} from '../js/skybike/seed.js';
import {totalDocument} from '../js/skybike/domain.js';

function example(){
 const state=seed(),draft=quoteDraft({customerName:'Cliente Wizard DEMO',customerDocument:'DEMO-WIZ-001',customerPhone:'900000001',countryCode:'+51'});
 addQuoteProduct(draft,state.products.find(p=>p.id==='sky'));
 draft.lines[0].date='2026-11-20';draft.lines[0].time='09:15';
 return {state,draft};
}

test('el borrador de cotización copia datos sin compartir líneas con comprobantes',()=>{
 const source={lines:[{id:'receipt-line',price:120}],customerName:'Cliente DEMO',documentType:'receipt'},copy=quoteDraft(source);
 copy.lines[0].price=95;
 assert.equal(source.lines[0].price,120);
 assert.equal(copy.documentType,'quote');
 assert.equal(copy.wizardStep,1);
 assert.equal(quoteDraft().lines.length,0);
});

test('los datos del cliente requieren nombre, documento, país y teléfono válido',()=>{
 const {draft}=example();validateWizardStep(draft,1);
 for(const [field,value,reason] of [
  ['customerName','   ','nombre'],['customerDocument','','DNI'],
  ['countryCode','+PER','país'],['countryCode','+12345','país'],
  ['customerPhone','123456','WhatsApp'],['customerPhone','1234567890123456','WhatsApp'],['customerPhone','900ABC001','WhatsApp'],
 ])assert.throws(()=>validateWizardStep({...draft,[field]:value},1),new RegExp(reason),`${field}: ${value}`);
 for(const customerPhone of ['1234567','123456789012345','900 000-001','(900) 000001'])validateWizardStep({...draft,customerPhone},1);
});

test('moneda e idioma son explícitos y USD exige cambio manual positivo',()=>{
 const {draft}=example();
 for(const language of ['es','en'])validateWizardStep({...draft,language},2);
 assert.throws(()=>validateWizardStep({...draft,language:'fr'},2),/moneda e idioma/);
 assert.throws(()=>validateWizardStep({...draft,currency:'EUR'},2),/moneda e idioma/);
 for(const exchangeRate of ['',0,-1,Infinity,'abc'])assert.throws(()=>validateWizardStep({...draft,currency:'USD',exchangeRate},2),/tipo de cambio/);
 validateWizardStep({...draft,currency:'USD',exchangeRate:3.8},2);
 // PEN no necesita el campo que está oculto en el paso 2.
 validateWizardStep({...draft,currency:'PEN',exchangeRate:''},2);
});

test('PEN USD PEN siempre muestra el precio original y no acumula conversiones',()=>{
 const {draft}=example(),original=structuredClone(draft.lines);
 assert.match(formatQuoteMoney(12345,draft),/123\.45/);
 draft.currency='USD';draft.exchangeRate=3.8;
 assert.match(formatQuoteMoney(12345,draft),/32\.49/);
 draft.exchangeRate=4;assert.match(formatQuoteMoney(12345,draft),/30\.86/);
 draft.currency='PEN';assert.match(formatQuoteMoney(12345,draft),/123\.45/);
 assert.deepEqual(draft.lines,original);
});

test('seleccionar tours y servicios evita duplicados y conserva cada asociación',()=>{
 const {state,draft}=example(),sky=draft.lines[0],valle=state.products.find(p=>p.id==='valle'),food=state.products.find(p=>p.id==='food');
 assert.equal(addQuoteProduct(draft,state.products.find(p=>p.id==='sky')),false);
 assert.equal(addQuoteProduct(draft,valle),true);
 const valley=draft.lines.find(l=>l.productId==='valle');
 assert.equal(addQuoteProduct(draft,food,sky.id),true);
 assert.equal(addQuoteProduct(draft,food,sky.id),false);
 assert.equal(addQuoteProduct(draft,food,valley.id),true);
 assert.equal(draft.lines.filter(l=>l.productId==='food').length,2);
 assert.throws(()=>addQuoteProduct(draft,food,'missing'),/tour/);
 assert.throws(()=>addQuoteProduct(draft,{...valle,active:false}),/inactivo/);
 assert.throws(()=>addQuoteProduct(draft,{...valle,archivedAt:'2026-10-18'}),/archivado/);
 removeLine(draft,sky.id);
 assert.equal(draft.lines.some(l=>l.id===sky.id||l.parentId===sky.id),false);
 assert.ok(draft.lines.some(l=>l.parentId===valley.id));
});

test('horarios de doce horas conservan medianoche, mediodía y minutos',()=>{
 for(const [hour,minute,period,time] of [[12,0,'AM','00:00'],[12,45,'PM','12:45'],[1,5,'PM','13:05'],[11,59,'PM','23:59'],[9,15,'AM','09:15']]){
  assert.equal(to24Hour(hour,minute,period),time);
  const display=from24Hour(time);assert.equal(to24Hour(display.hour,display.minute,display.period),time);
 }
 for(const args of [[0,0,'AM'],[13,0,'PM'],[1,60,'AM'],[1,'','AM'],[1,30,'XX']])assert.throws(()=>to24Hour(...args),/hora, minutos/);
});

test('detalles validan fechas reales, cantidades y descuentos de cada pasajero',()=>{
 const {draft}=example();validateQuoteDraft(draft);
 for(const date of ['', '2026-02-30','2026-13-01'])assert.throws(()=>validateWizardStep({...draft,lines:[{...draft.lines[0],date}]},4),/fecha/);
 for(const qty of [0,101,1.5,''])assert.throws(()=>validateWizardStep({...draft,lines:[{...draft.lines[0],qty}]},4),/cantidad/);
 for(const invalid of [{unitDiscount:-1},{unitDiscount:121},{qty:2,discounts:[10]},{qty:2,discounts:[10,121]}])assert.throws(()=>validateWizardStep({...draft,lines:[{...draft.lines[0],...invalid}]},4));
 assert.throws(()=>validateWizardStep({...draft,lines:[]},3),/al menos un tour/);
 assert.throws(()=>validateWizardStep({...draft,lines:[...draft.lines,{id:'orphan',type:'Servicio',parentId:'missing'}]},4),/asociado/);
 for(const validity of [0,366,1.5,''])assert.throws(()=>validateWizardStep({...draft,validity},5),/vigencia/);
});

test('descuentos individuales y extras calculan por tour sin mezclar pasajeros',()=>{
 const {state,draft}=example(),sky=draft.lines[0];
 resizeDiscounts(sky,2);sky.discounts=[10,20];
 addQuoteProduct(draft,state.products.find(p=>p.id==='valle'));
 const valle=draft.lines.find(l=>l.productId==='valle');valle.qty=3;valle.unitDiscount=5;
 for(const parent of [sky,valle])addQuoteProduct(draft,state.products.find(p=>p.id==='food'),parent.id);
 addQuoteProduct(draft,state.products.find(p=>p.id==='gopro'),sky.id);
 const valleyFood=draft.lines.find(l=>l.productId==='food'&&l.parentId===valle.id);valleyFood.autoQty=false;valleyFood.qty=1;
 draft.lines.find(l=>l.productId==='gopro').qty=2;
 assert.deepEqual(tourSummary(sky,draft.lines),{gross:24000,net:21000,extras:13000,total:34000});
 assert.deepEqual(tourSummary(valle,draft.lines),{gross:28500,net:27000,extras:2500,total:29500});
 assert.equal(totalDocument(draft.lines).total,63500);
 resizeDiscounts(sky,3);assert.deepEqual(sky.discounts,[10,20,0]);
 resizeDiscounts(sky,1);assert.deepEqual(sky.discounts,[10]);
});
