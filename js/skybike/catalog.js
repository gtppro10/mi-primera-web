import {safeImage} from './media.js';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

/** Convert the original PEN price once, only for display. Never mutate products. */
export function catalogPriceCents(price,{currency='PEN',exchangeRate=1}={}) {
 if(!['PEN','USD'].includes(currency))throw new Error('La moneda del catálogo debe ser PEN o USD.');
 const pen=Number(price);
 if(price===''||price==null||!Number.isFinite(pen)||pen<0)throw new Error('El precio del catálogo no es válido.');
 const penCents=Math.round(pen*100);
 if(currency==='PEN')return penCents;
 const rate=Number(exchangeRate);
 if(exchangeRate===''||exchangeRate==null||!Number.isFinite(rate)||rate<=0)throw new Error('Ingresa un tipo de cambio mayor que cero.');
 return Math.round(penCents/rate);
}

/** Format a value already expressed in the chosen currency's smallest unit. */
export function formatCatalogPrice(cents,currency='PEN') {
 return new Intl.NumberFormat(currency==='USD'?'en-US':'es-PE',{
  style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2,
  ...(currency==='USD'?{currencyDisplay:'code'}:{}),
 }).format(cents/100);
}

/**
 * Return cards only. The caller owns search, category filters and grid container.
 * money, when supplied, receives (convertedCents, currency), never a PEN amount
 * already converted by the caller. Add actions retain the application's events.
 */
export function renderCatalogCards(products,{esc=escapeHTML,money=formatCatalogPrice,currency='PEN',exchangeRate=1}={}) {
 if(!products.length)return '<p class="catalog-empty compact-catalog-empty" role="status">No hay coincidencias. Prueba otra categoría o búsqueda.</p>';
 return products.map(product=>{
  const name=esc(product.name),productId=esc(product.id);
  const price=esc(money(catalogPriceCents(product.price,{currency,exchangeRate}),currency));
  return `<article class="card shop-product compact-catalog-card"><div class="product-picture"><button type="button" class="catalog-photo-button" data-action="add" data-id="${productId}" aria-label="Seleccionar ${name} por fotografía"><img src="${esc(safeImage(product.image))}" alt="" width="420" height="315" loading="lazy" decoding="async"></button></div><div class="product-content"><h2 title="${name}">${name}</h2><strong class="shop-price">${price}</strong><button type="button" class="compact-catalog-add" data-action="add" data-id="${productId}" aria-label="Agregar ${name}">Agregar</button></div></article>`;
 }).join('');
}
