import {id,now,record} from './domain.js';
export const tourCategories=['Aventura','Machu Picchu','Tradicional','Trekking'];
export const modalities=['POR PERSONA','POR UNIDAD','POR RESERVA'];
export function normalizeProduct(p){
 return {code:`${p.type==='Tour'?'TOUR':'SRV'}-${p.id.slice(0,8).toUpperCase()}`,shortDescription:'',description:'',itinerary:'',schedules:'',recommendations:'',observations:'',gallery:[],flyers:[],priceUsd:null,durationCalendarMinutes:120,archivedAt:null,...p};
}
export function saveProduct(state,values,productId){
 const current=productId?state.products.find(p=>p.id===productId):null;
 if(productId&&!current)throw new Error('El registro ya no existe.');
 if(current?.archivedAt)throw new Error('Restaura el registro antes de editarlo.');
 const product=normalizeProduct({...current,...values,id:current?.id||id()});
 for(const field of ['name','category','code']){
  product[field]=String(product[field]||'').trim();
  if(!product[field])throw new Error('Completa nombre, categoría y código interno.');
 }
 product.code=product.code.toUpperCase();
 if(!/^[A-Z0-9_-]{2,40}$/.test(product.code))throw new Error('El código admite de 2 a 40 letras, números, guiones o guiones bajos.');
 if(state.products.some(p=>p.id!==product.id&&normalizeProduct(p).code.toUpperCase()===product.code))throw new Error('Ya existe un registro con ese código.');
 if(!['Tour','Servicio'].includes(product.type)||current&&product.type!==current.type)throw new Error('El tipo del registro no se puede cambiar.');
 if(product.price===''||product.price==null)throw new Error('Completa el precio en soles.');
 product.price=Number(product.price);
 if(!Number.isFinite(product.price)||product.price<0||product.price>1000000)throw new Error('El precio en soles no es válido.');
 product.priceUsd=product.priceUsd===''||product.priceUsd==null?null:Number(product.priceUsd);
 if(product.priceUsd!==null&&(!Number.isFinite(product.priceUsd)||product.priceUsd<0||product.priceUsd>1000000))throw new Error('El precio de referencia en dólares no es válido.');
 if(product.type==='Servicio'&&!modalities.includes(product.modality))throw new Error('Selecciona la modalidad del servicio.');
 if(product.type==='Tour'){
  if(product.price<=0)throw new Error('El precio base del tour debe ser mayor a cero.');
  product.durationCalendarMinutes=Number(product.durationCalendarMinutes);
  if(!Number.isInteger(product.durationCalendarMinutes)||product.durationCalendarMinutes<15||product.durationCalendarMinutes>10080)throw new Error('La duración operativa debe estar entre 15 y 10080 minutos.');
  if(product.schedules.trim()&&!product.schedules.split(/[;,\n]/).every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t.trim())))throw new Error('Usa horarios HH:MM separados por comas, por ejemplo 09:00, 14:30.');
 }
 if(product.gallery.length>6||product.flyers.length>6)throw new Error('Máximo seis imágenes de galería y seis flyers por registro.');
 product.updatedAt=now();
 if(current)Object.assign(current,product);else state.products.push(product);
 record(state,current?'Catálogo actualizado':'Catálogo creado',`${product.code} · ${product.name}`);
 return product;
}
export function setProductActive(state,productId,active){
 const p=state.products.find(p=>p.id===productId);
 if(!p||p.archivedAt)throw new Error('El registro no existe o está archivado.');
 p.active=active;record(state,active?'Catálogo activado':'Catálogo desactivado',p.name);
}
export function archiveProduct(state,productId,confirmation){
 const p=state.products.find(p=>p.id===productId);
 if(!p||p.archivedAt)throw new Error('Registro no disponible.');
 if(confirmation.trim()!==normalizeProduct(p).code)throw new Error('El código de confirmación no coincide.');
 p.active=false;p.archivedAt=now();record(state,'Catálogo archivado sin borrar',p.name);
}
export function restoreProduct(state,productId){
 const p=state.products.find(p=>p.id===productId);
 if(!p?.archivedAt)throw new Error('El registro no está archivado.');
 p.archivedAt=null;p.active=false;record(state,'Catálogo restaurado como inactivo',p.name);
}
