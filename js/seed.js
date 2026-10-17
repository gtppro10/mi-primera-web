import {totals} from './domain.js';
export function seed() {
  const clients = [
    {id:'c1', name:'Estudio Horizonte (ficticio)', document:'DEMO-001', email:'contacto@horizonte.example', phone:'', address:'Lima · dirección ficticia'},
    {id:'c2', name:'Comercial Andina (ficticio)', document:'DEMO-002', email:'compras@andina.example', phone:'', address:'Arequipa · dirección ficticia'},
    {id:'c3', name:'Café del Valle (ficticio)', document:'DEMO-003', email:'hola@valle.example', phone:'', address:'Cusco · dirección ficticia'}
  ];
  const products = [
    {id:'p1', name:'Diseño de página web', type:'Servicio', price:1500},
    {id:'p2', name:'Soporte técnico · hora', type:'Servicio', price:100},
    {id:'p3', name:'Teclado inalámbrico demo', type:'Producto', price:120},
    {id:'p4', name:'Consultoría digital · sesión', type:'Servicio', price:250}
  ];
  const specs = [
    {client:0, product:0, qty:1, status:'Pendiente'},
    {client:1, product:2, qty:5, status:'Aprobada'},
    {client:2, product:3, qty:2, status:'Pendiente'}
  ];
  const quotes = specs.map((s,i) => {
    const p = products[s.product];
    const lines = [{description:p.name, qty:s.qty, price:p.price}];
    return {id:`q${i+1}`, number:`COT-${String(i+1).padStart(3,'0')}`, client:{...clients[s.client]}, lines, igv:18, amounts:totals(lines,18), date:new Date().toISOString(), status:s.status, notes:'Ejemplo ficticio para explorar el sistema.'};
  });
  return {version:1, clients, products, quotes, invoices:[]};
}
