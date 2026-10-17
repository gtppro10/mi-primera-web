import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals, approveQuote, convertQuote} from '../js/domain.js';
import {seed} from '../js/seed.js';

test('IGV 18 %, 0 % y fracciones con redondeo por concepto',()=>{
 assert.deepEqual(totals([{description:'Demo',qty:2,price:100}],18),{subtotal:20000,tax:3600,total:23600});
 assert.deepEqual(totals([{description:'Demo',qty:1,price:100}],0),{subtotal:10000,tax:0,total:10000});
 assert.deepEqual(totals([{description:'Demo',qty:3,price:0.1}],18),{subtotal:30,tax:5,total:35});
 assert.deepEqual(totals([{description:'Demo',qty:1.5,price:10}],10),{subtotal:1500,tax:150,total:1650});
});
test('rechaza líneas vacías, cantidades o importes inválidos e IGV fuera de rango',()=>{
 for(const lines of [[],[{description:'',qty:1,price:1}],[{description:'x',qty:0,price:1}],[{description:'x',qty:1,price:-1}],[{description:'x',qty:Infinity,price:1}]])assert.throws(()=>totals(lines,18));
 for(const rate of [-1,101,NaN]) assert.throws(()=>totals([{description:'x',qty:1,price:1}],rate));
});
test('requiere aprobación y evita conversiones duplicadas',()=>{
 const s=seed();
 assert.throws(()=>convertQuote(s,'q1'));
 approveQuote(s.quotes[0]);
 assert.throws(()=>approveQuote(s.quotes[0]));
 const invoice=convertQuote(s,'q1');
 assert.equal(invoice.status,'Borrador');assert.equal(s.quotes[0].status,'Convertida');
 assert.deepEqual(invoice.amounts,s.quotes[0].amounts);
 assert.throws(()=>convertQuote(s,'q1'));
 assert.equal(s.invoices.length,1);
 s.quotes[0].lines[0].price=999;
 assert.equal(invoice.lines[0].price,1500);
 s.clients[0].name='Editado';assert.notEqual(invoice.client.name,'Editado');
});
