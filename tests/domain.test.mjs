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

test('descuento antes del IGV, con compatibilidad para documentos antiguos',()=>{
 assert.deepEqual(totals([{description:'Servicio',qty:2,price:100,discount:10}],18),{subtotal:18000,tax:3240,total:21240});
 assert.deepEqual(totals([{description:'Servicio',qty:2,price:100,discount:100}],18),{subtotal:0,tax:0,total:0});
 assert.deepEqual(totals([{description:'Fracción',qty:1.5,price:10,discount:10}],0),{subtotal:1350,tax:0,total:1350});
 for(const discount of [-1,101,NaN]) assert.throws(()=>totals([{description:'x',qty:1,price:10,discount}],18));
 const s=seed();s.quotes[0].lines[0].discount=10;s.quotes[0].amounts=totals(s.quotes[0].lines,18);
 approveQuote(s.quotes[0]);
 const invoice=convertQuote(s,'q1');
 assert.equal(invoice.lines[0].discount,10);
 assert.deepEqual(invoice.amounts,s.quotes[0].amounts);
});

test('buscador sin acentos y filtro combinado de categoría',async()=>{
 const {filterProducts}=await import('../js/catalog.js');
 const products=[{name:'Impresión de tarjetas',type:'Producto',category:'Impresión'}, {name:'Diseño de logotipo',type:'Servicio',category:'Diseño'}];
 assert.equal(filterProducts(products,'impresion','Todos').length,1);
 assert.equal(filterProducts(products,'DISEÑO','Diseño').length,1);
 assert.equal(filterProducts(products,'tarjetas','Diseño').length,0);
});
