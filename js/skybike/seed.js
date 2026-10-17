import {id,createQuote,approve,reserve,pay} from './domain.js';
export const blankDraft=()=>({lines:[],clientId:'',currency:'PEN',exchangeRate:3.8,language:'es',validity:7,notes:''});
export function seed() {
 const products=[
  {id:'sky',name:'Skybike · aventura en las alturas',type:'Tour',category:'Aventura',price:120,duration:'2 horas',image:'./images/skybike/aventura.jpg',includes:'Equipo de seguridad, instructor y actividad.',excludes:'Transporte y alimentación.',active:true},
  {id:'machu',name:'Machu Picchu · día de descubrimiento',type:'Tour',category:'Machu Picchu',price:650,duration:'Día completo',image:'./images/skybike/machu.jpg',includes:'Guía de demostración y visita programada.',excludes:'Trenes y entradas. Tarifas ficticias.',active:true},
  {id:'valle',name:'Valle Sagrado · ruta cultural',type:'Tour',category:'Tradicional',price:95,duration:'8 horas',image:'./images/skybike/valle.jpg',includes:'Guía y recorrido de referencia.',excludes:'Entradas y almuerzo.',active:true},
  {id:'montana',name:'Montaña de colores · caminata',type:'Tour',category:'Trekking',price:110,duration:'10 horas',image:'./images/skybike/trekking.jpg',includes:'Guía y acompañamiento.',excludes:'Entrada y equipo personal.',active:true},
  {id:'gopro',name:'Alquiler de GoPro',type:'Servicio',category:'Servicios',price:40,modality:'POR UNIDAD',image:'./images/skybike/aventura.jpg',includes:'Equipo de referencia.',excludes:'',active:true},
  {id:'food',name:'Alimentación adicional',type:'Servicio',category:'Servicios',price:25,modality:'POR PERSONA',image:'./images/skybike/valle.jpg',includes:'Menú de demostración.',excludes:'',active:true},
  {id:'drone',name:'Video con dron',type:'Servicio',category:'Servicios',price:90,modality:'POR RESERVA',image:'./images/skybike/trekking.jpg',includes:'Video de referencia.',excludes:'',active:true}
 ];
 const state={version:1,products,clients:[{id:'client1',name:'Lucía Demo',document:'DEMO-001',phone:'WhatsApp ficticio',email:'lucia@example.com'},{id:'client2',name:'Grupo Horizonte Demo',document:'DEMO-002',phone:'Contacto ficticio',email:'grupo@example.com'}],quotes:[],reservations:[],receipts:[],payments:[],passengers:[],history:[],draft:blankDraft()};
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
 const line={id:id(),productId:'sky',description:products[0].name,type:'Tour',qty:2,price:120,unitDiscount:10,date,time:'09:00',includes:products[0].includes,excludes:products[0].excludes};
 const q=createQuote(state,{...blankDraft(),clientId:'client1',lines:[line],notes:'Ejemplo ficticio. No es una reserva real.'});
 approve(state,q.id);const r=reserve(state,q.id);pay(state,r.id,100,'Efectivo','DEMO');
 state.passengers.push({id:id(),reservationId:r.id,name:'Pasajero de ejemplo 1',document:'DEMO-P01',notes:'Registro ficticio'});
 return state;
}
