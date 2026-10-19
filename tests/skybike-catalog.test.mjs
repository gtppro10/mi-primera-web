import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPriceCents,renderCatalogCards} from '../js/skybike/catalog.js';

const tour={id:'tour-demo',name:'Tour de prueba',type:'Tour',price:123.45,priceUsd:999,image:'./images/skybike/valle.jpg',category:'Categoría oculta',duration:'Duración oculta',shortDescription:'Descripción oculta'};

test('el catálogo muestra fotografía, nombre, precio y Agregar sin administración',()=>{
 const html=renderCatalogCards([tour]);
 assert.equal((html.match(/<img /g)||[]).length,1);
 assert.equal((html.match(/<h2 /g)||[]).length,1);
 assert.equal((html.match(/data-action="add"/g)||[]).length,2);
 assert.match(html,/Seleccionar Tour de prueba por fotografía/);
 assert.match(html,/Agregar Tour de prueba/);
 assert.match(html,/123\.45/);
 for(const hidden of ['Categoría oculta','Duración oculta','Descripción oculta','999','Ver ficha','Cambiar fotografía','Referencial'])assert.ok(!html.includes(hidden),hidden);
});

test('los precios USD parten siempre de PEN y no cambian los productos',()=>{
 const original=structuredClone(tour);
 assert.equal(catalogPriceCents(tour.price,{currency:'USD',exchangeRate:3.8}),3249);
 assert.match(renderCatalogCards([tour],{currency:'USD',exchangeRate:3.8}),/USD\s32\.49/);
 assert.match(renderCatalogCards([tour],{currency:'PEN',exchangeRate:0}),/123\.45/);
 assert.deepEqual(tour,original);
 for(const exchangeRate of ['',null,0,-1,NaN,Infinity])assert.throws(()=>renderCatalogCards([tour],{currency:'USD',exchangeRate}),/tipo de cambio/);
});

test('el catálogo escapa textos y atributos e impide imágenes ejecutables',()=>{
 const html=renderCatalogCards([{...tour,id:'x" onclick="alert(1)',name:'<img src=x onerror=alert(1)>',image:'javascript:alert(1)'}]);
 assert.ok(!html.includes('<img src=x'));
 assert.ok(!html.includes('data-id="x" onclick='));
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/src="\.\/images\/skybike\/valle\.jpg"/);
 assert.ok(!html.includes('javascript:'));
});

test('la búsqueda sin coincidencias ofrece un estado accesible',()=>{
 assert.match(renderCatalogCards([]),/role="status"/);
 assert.ok(!renderCatalogCards([]).includes('data-action="add"'));
});
