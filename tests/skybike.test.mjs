import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lineTotal,totalDocument,createQuote,approve,reserve,balance,pay,removeLine} from '../js/skybike/domain.js';
import {seed,blankDraft} from '../js/skybike/seed.js';
const tour=(extra={})=>({id:'tour1',type:'Tour',description:'Tour demo',qty:2,price:120,unitDiscount:10,date:'2026-11-01',time:'09:00',...extra});
test('descuento monetario por persona, sin IGV automático',()=>{
 assert.deepEqual(totalDocument([tour()]),{gross:24000,discount:2000,total:22000});
 assert.equal(lineTotal(tour({discounts:[10,20]})).total,21000);
 assert.equal(lineTotal(tour({price:0.1,unitDiscount:0,qty:3})).total,30);
});
test('descuentos individuales validados y cantidades enteras',()=>{
 for(const l of [tour({discounts:[10]}),tour({discounts:[121,0]}),tour({unitDiscount:-1}),tour({qty:1.5}),tour({price:''})])assert.throws(()=>lineTotal(l));
 assert.equal(lineTotal(tour({discounts:[120,120]})).total,0);
});
test('adicionales por persona, unidad y reserva mantienen su modalidad',()=>{
 const parent=tour({qty:3});
 const service={description:'Comida',type:'Servicio',qty:1,price:25,parentId:parent.id,modality:'POR PERSONA'};
 assert.equal(lineTotal(service,[parent,service]).total,7500);
 assert.equal(lineTotal({...service,autoQty:false,qty:2},[parent]).total,5000);
 assert.equal(lineTotal({...service,modality:'POR RESERVA',qty:8},[parent]).total,2500);
 assert.equal(lineTotal({...service,modality:'POR UNIDAD',qty:2},[parent]).total,5000);
});
test('guardar varios tours exige cliente, salida y asociación de adicionales',()=>{
 const s=seed();const draft={...blankDraft(),clientId:'client1',lines:[tour(),tour({id:'tour2',price:95,unitDiscount:0})]};
 const q=createQuote(s,draft);assert.equal(q.lines.length,2);assert.equal(q.totals.total,41000);
 assert.throws(()=>createQuote(s,{...draft,lines:[tour({date:''})]}));
 assert.throws(()=>createQuote(s,{...draft,clientId:'no-existe'}));
 assert.throws(()=>createQuote(s,{...draft,lines:[tour(),{description:'Extra',type:'Servicio',qty:1,price:5,parentId:'inexistente'}]}));
});
test('reserva única, recibo snapshot y pago sin sobrepasar saldo',()=>{
 const s=seed();const q=createQuote(s,{...blankDraft(),clientId:'client1',lines:[tour({discounts:[10,20]})]});
 assert.throws(()=>reserve(s,q.id));approve(s,q.id);const r=reserve(s,q.id);
 assert.throws(()=>reserve(s,q.id));assert.equal(s.receipts.at(-1).totals.total,21000);
 pay(s,r.id,100,'Yape','DEMO');assert.deepEqual(balance(s,r.id),{paid:10000,balance:11000});
 assert.throws(()=>pay(s,r.id,111,'Yape'));assert.throws(()=>pay(s,r.id,0,'Yape'));
 pay(s,r.id,110,'Efectivo');assert.equal(balance(s,r.id).balance,0);
 q.lines[0].price=999;assert.equal(r.lines[0].price,120);
});
test('quitar tour elimina sus extras pero conserva otras salidas',()=>{
 const draft={lines:[tour(),tour({id:'tour2'}),{id:'extra1',parentId:'tour1'}]};removeLine(draft,'tour1');
 assert.deepEqual(draft.lines.map(l=>l.id),['tour2']);
});
test('espacio local independiente no modifica los datos de Nexo',async()=>{
 const map=new Map([['nexo-demo-v1','datos anteriores intactos']]);
 globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const {repository,STORAGE_KEY}=await import('../js/skybike/repository.js');const s=repository.load();repository.save(s);
 assert.equal(STORAGE_KEY,'skybike-cusco-demo-v1');assert.equal(map.get('nexo-demo-v1'),'datos anteriores intactos');
 assert.equal(repository.load().reservations.length,1);
 delete globalThis.localStorage;
});
test('moneda, tipo de cambio y snapshots se conservan sin recálculo retroactivo',()=>{
 const s=seed();const draft={...blankDraft(),currency:'USD',exchangeRate:3.8,clientId:'client1',lines:[tour()]};
 const q=createQuote(s,draft);assert.equal(q.currency,'USD');assert.equal(q.exchangeRate,3.8);assert.equal(q.totals.total,22000);
 s.products[0].price=999;s.clients[0].name='Modificado';assert.equal(q.lines[0].price,120);assert.notEqual(q.client.name,'Modificado');
 assert.throws(()=>createQuote(s,{...draft,exchangeRate:0}));
});
