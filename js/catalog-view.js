import {categories, categoryIcons, categoryOf, imageOf, filterProducts} from './catalog.js';
import {totals} from './domain.js';

export function productCards(products, {esc, money}) {
  if (!products.length) return '<div class="empty catalog-empty">No encontramos coincidencias. Prueba otra búsqueda o categoría.</div>';
  return products.map(p => `<article class="card shop-product">
    <div class="product-picture"><img src="${imageOf(p)}" alt="Ilustración de ${esc(categoryOf(p).toLowerCase())}" width="320" height="240" loading="lazy"><span class="product-type">${esc(p.type)}</span></div>
    <div class="product-content"><span class="product-category">${esc(categoryOf(p))}</span><h2>${esc(p.name)}</h2><p>Precio unitario sin IGV</p><strong class="shop-price">${money(Math.round(p.price*100))}</strong>
    <div class="product-buttons"><button data-action="add-product" data-id="${esc(p.id)}" aria-label="Agregar ${esc(p.name)}">＋ Agregar</button><button class="edit-product secondary" data-action="edit-product" data-id="${esc(p.id)}" aria-label="Editar ${esc(p.name)}">Editar</button></div></div>
  </article>`).join('');
}
export function catalogHTML(state, search, selected, helpers) {
  const {esc,money}=helpers;
  const products=filterProducts(state.products,search,selected);
  const draft=state.draft;
  let amount='Revisa los importes';
  try {if(draft.lines.length)amount=money(totals(draft.lines,draft.igv).total);else amount=money(0);}catch{}
  return `<section class="catalog-toolbar"><label class="search-field"><span>Buscar en el catálogo</span><input id="catalog-search" type="search" value="${esc(search)}" placeholder="¿Qué necesitas cotizar?" autocomplete="off"></label>
    <div class="category-tabs" role="group" aria-label="Categorías">${['Todos',...categories].map(c=>`<button class="category-tab ${selected===c?'selected':''}" data-action="filter-category" data-category="${esc(c)}" aria-pressed="${selected===c}"><span aria-hidden="true">${categoryIcons[c]||'▦'}</span>${c}</button>`).join('')}</div></section>
    ${draft.lines.length?`<div class="mobile-selection"><span>${draft.lines.length} conceptos · <strong>${amount}</strong></span><button data-action="review-draft">Ver selección</button></div>`:''}<div class="catalog-layout"><section class="catalog-items" aria-label="Productos disponibles"><div class="catalog-result-heading"><h2>Explora el catálogo</h2><span id="result-count" role="status">${products.length} resultados</span></div><div id="catalog-results" class="shop-grid">${productCards(products,helpers)}</div></section>
    <aside class="quote-basket card" aria-label="Cotización actual"><div class="basket-heading"><span class="eyebrow">TU SELECCIÓN</span><h2>Cotización actual <span class="count">${draft.lines.length}</span></h2><p>Se conserva en este navegador</p></div>
      ${draft.lines.length?`<ul class="basket-items">${draft.lines.map(l=>`<li><span><strong>${esc(l.description)}</strong><small>Cant. ${esc(l.qty)} · ${esc(l.discount??0)} % dto.</small></span><button class="text-button" data-action="remove-draft-item" data-id="${esc(l.id)}" aria-label="Eliminar ${esc(l.description)}">×</button></li>`).join('')}</ul>`:'<div class="basket-empty"><span aria-hidden="true">＋</span><p>Tu próxima propuesta empieza aquí.</p><small>Elige un servicio y pulsa Agregar.</small></div>'}
      <div class="basket-bottom"><div><span>Total con IGV</span><strong>${amount}</strong></div><button data-action="review-draft" ${draft.lines.length?'':'disabled'}>Revisar cotización →</button><p>Cantidades, precios y descuentos editables</p></div>
    </aside></div>`;
}
