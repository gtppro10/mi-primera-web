import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../js/skybike/seed.js';
import {quoteDraft,addQuoteProduct,mergeQuoteBasket,from24Hour,to24Hour} from '../js/skybike/quote-draft.js';

test('incorporar otra cesta conserva cliente, cambio, idioma y correcciones previas',()=>{
 const state=seed(),current=quoteDraft({customerName:'Cliente DEMO',customerDocument:'DEMO-REG',customerPhone:'900000000',currency:'USD',language:'en',exchangeRate:3.9,requestId:'request-demo',wizardStep:4,notes:'Observaciones conservadas'});
 const product=id=>state.products.find(p=>p.id===id);
 addQuoteProduct(current,product('sky'));
 const sky=current.lines[0];sky.qty=2;sky.price=118.33;sky.discounts=[10,20];
 addQuoteProduct(current,product('gopro'),sky.id);
 const basket=quoteDraft();addQuoteProduct(basket,product('sky'));addQuoteProduct(basket,product('valle'));
 const basketSky=basket.lines.find(l=>l.productId==='sky');addQuoteProduct(basket,product('food'),basketSky.id);
 const beforeCurrent=structuredClone(current),beforeBasket=structuredClone(basket);
 const merged=mergeQuoteBasket(current,basket);
 for(const key of ['customerName','customerDocument','customerPhone','currency','language','exchangeRate','requestId','wizardStep','notes'])assert.equal(merged[key],current[key],key);
 assert.equal(merged.lines.filter(l=>l.productId==='sky').length,1);
 assert.deepEqual(merged.lines.find(l=>l.productId==='sky'),sky);
 assert.equal(merged.lines.find(l=>l.productId==='food').parentId,sky.id,'el adicional debe asociarse al tour conservado');
 assert.equal(merged.lines.find(l=>l.productId==='gopro').parentId,sky.id);
 assert.ok(merged.lines.some(l=>l.productId==='valle'));
 merged.lines[0].price=1;
 assert.deepEqual(current,beforeCurrent);assert.deepEqual(basket,beforeBasket);
});

test('una cesta vacía no borra el borrador y una primera cesta se copia sin duplicar',()=>{
 const state=seed(),basket=quoteDraft({wizardStep:1});addQuoteProduct(basket,state.products.find(p=>p.id==='sky'));
 const first=mergeQuoteBasket(undefined,basket);
 assert.equal(first.lines.length,1);assert.notEqual(first.lines,basket.lines);
 const restored=mergeQuoteBasket(first,{lines:[]});assert.deepEqual(restored,first);
 const again=mergeQuoteBasket(restored,basket);assert.equal(again.lines.length,1);
});

test('un horario inválido no se representa ni valida como medianoche',()=>{
 for(const time of ['', '13:99','25:00','09:7','texto']){
  const display=from24Hour(time);assert.deepEqual(display,{hour:'',minute:'',period:'AM'});
  assert.throws(()=>to24Hour(display.hour,display.minute,display.period),/hora, minutos/);
 }
 assert.deepEqual(from24Hour('00:00'),{hour:12,minute:'00',period:'AM'});
 assert.equal(to24Hour(12,'00','AM'),'00:00');
});
