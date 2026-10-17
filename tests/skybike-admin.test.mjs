import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../js/skybike/seed.js';
import {blankDraft} from '../js/skybike/seed.js';
import {createQuote} from '../js/skybike/domain.js';
import {normalizeProduct,saveProduct,setProductActive,archiveProduct,restoreProduct} from '../js/skybike/admin.js';
const input=()=>({type:'Tour',name:'Tour ficticio',code:'TOUR-TEST',category:'Aventura',price:100,priceUsd:30,duration:'3 horas',durationCalendarMinutes:180,schedules:'09:00, 14:30',active:true,gallery:[],flyers:[],includes:'Guía',excludes:'Entradas'});
test('administración crea y edita todos los campos sin alterar documentos',()=>{
 const s=seed(),before=structuredClone({quotes:s.quotes,reservations:s.reservations,receipts:s.receipts,payments:s.payments});
 const p=saveProduct(s,{...input(),description:'Descripción completa',itinerary:'Itinerario',recommendations:'Agua',observations:'Demo'});
 assert.equal(p.priceUsd,30);assert.equal(p.itinerary,'Itinerario');assert.equal(p.code,'TOUR-TEST');
 saveProduct(s,{...p,name:'Nuevo nombre',price:200},p.id);
 saveProduct(s,{...normalizeProduct(s.products[0]),price:999},s.products[0].id);
 assert.deepEqual({quotes:s.quotes,reservations:s.reservations,receipts:s.receipts,payments:s.payments},before);
});
test('códigos duplicados, precios y horarios inválidos se rechazan',()=>{
 const s=seed();saveProduct(s,input());
 assert.throws(()=>saveProduct(s,{...input(),code:'tour-test'}));
 for(const values of [{price:-1},{price:0},{priceUsd:-1},{schedules:'25:00'},{durationCalendarMinutes:2},{code:'código con espacios'},{name:'   '}])assert.throws(()=>saveProduct(s,{...input(),code:'OTRO',...values}));
});
test('servicios conservan modalidades, categoría y precio al editar',()=>{
 const s=seed();const p=saveProduct(s,{type:'Servicio',name:'Guía demo',code:'SRV-GUIA',category:'Privados',price:50,modality:'POR RESERVA'});
 assert.equal(p.modality,'POR RESERVA');saveProduct(s,{...p,price:60},p.id);assert.equal(p.price,60);
 assert.throws(()=>saveProduct(s,{...p,modality:'INVENTADA'},p.id));
 assert.throws(()=>saveProduct(s,{...p,type:'Tour'},p.id));
});
test('archivo exige confirmación, conserva contenido y se restaura inactivo',()=>{
 const s=seed(),p=normalizeProduct(s.products[0]),count=s.products.length;
 assert.throws(()=>archiveProduct(s,p.id,'NO'));
 archiveProduct(s,p.id,p.code);assert.equal(s.products.length,count);assert.equal(s.products[0].active,false);assert(s.products[0].archivedAt);
 assert.throws(()=>saveProduct(s,{...p,name:'No permitido'},p.id));
 restoreProduct(s,p.id);assert.equal(s.products[0].archivedAt,null);assert.equal(s.products[0].active,false);
 setProductActive(s,p.id,true);assert.equal(s.products[0].active,true);
});
test('desactivar impide nuevas cotizaciones pero preserva las anteriores',()=>{
 const s=seed();const old=structuredClone(s.quotes);setProductActive(s,'sky',false);
 assert.deepEqual(s.quotes,old);
 assert.throws(()=>createQuote(s,{...blankDraft(),clientId:'client1',lines:[{id:'l1',productId:'sky',description:'Demo',type:'Tour',qty:1,price:120,unitDiscount:0,date:'2026-12-01',time:'09:00'}]}));
});
test('medios se conservan separados y su cantidad está limitada',()=>{
 const s=seed(),flyer={name:'Flyer demo',data:'data:image/png;base64,DEMO',language:'es'};
 const p=saveProduct(s,{...input(),gallery:[{name:'Galería',data:'data:image/png;base64,DEMO'}],flyers:[flyer]});
 assert.equal(p.flyers[0].language,'es');assert.equal(p.gallery[0].name,'Galería');
 assert.throws(()=>saveProduct(s,{...input(),code:'SEIS',flyers:Array(7).fill(flyer)}));
 assert.equal(s.receipts[0].flyers,undefined);
});
