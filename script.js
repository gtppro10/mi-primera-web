import {repository, emptyDraft} from './js/repository.js';
import {categories, categoryOf, filterProducts} from './js/catalog.js';
import {catalogHTML, productCards} from './js/catalog-view.js';
import {totals, lineAmounts, approveQuote, convertQuote} from './js/domain.js';

const app = document.querySelector('#app');
const feedback = document.querySelector('#feedback');
const money = cents => new Intl.NumberFormat('es-PE', {style:'currency', currency:'PEN'}).format(cents / 100);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => new Intl.DateTimeFormat('es-PE', {dateStyle:'medium', timeZone:'America/Lima'}).format(new Date(value));
let state;
try {state = repository.load(); repository.save(state);} catch (error) {
  state = undefined;
  app.innerHTML = `<section class="card"><h1>No se pudieron abrir los datos locales</h1><p>${esc(error.message)}</p><p>Comprueba que el navegador permita almacenamiento local. Los datos existentes no se han borrado.</p></section>`;
}
const titles = {panel:'Panel principal', clientes:'Clientes', catalogo:'Productos y servicios', cotizaciones:'Cotizaciones', facturas:'Borradores de factura'};
let current = 'panel';
let catalogSearch = '';
let catalogCategory = 'Todos';
const badge = status => `<span class="badge ${status === 'Aprobada' ? 'green' : status === 'Pendiente' ? 'amber' : 'blue'}">${esc(status)}</span>`;
const empty = text => `<div class="empty">${text}</div>`;
const stats = () => [
  ['Cotizaciones', state.quotes.length, 'Documentos de demostración', '▤'],
  ['Por aprobar', state.quotes.filter(q=>q.status==='Pendiente').length, 'Cotizaciones pendientes', '◷'],
  ['Importe aprobado', money(state.quotes.filter(q=>q.status!=='Pendiente').reduce((s,q)=>s+q.amounts.total,0)), 'Incluye cotizaciones convertidas', '+'],
  ['Borradores de factura', state.invoices.length, 'Sin validez tributaria', '▧']
].map(([name,value,note,icon])=>`<article class="stat"><div class="stat-label">${name}<span>${icon}</span></div><strong>${value}</strong><small>${note}</small></article>`).join('');
function quoteTable(quotes) {
  if (!quotes.length) return empty('Todavía no hay cotizaciones. Crea la primera.');
  return `<div class="table-scroll"><table><thead><tr><th>Cotización / fecha</th><th>Cliente</th><th>Total con IGV</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${quotes.map(q=>`<tr><td><strong>${esc(q.number)}</strong><small>${date(q.date)}</small></td><td>${esc(q.client.name)}</td><td class="amount">${money(q.amounts.total)}</td><td>${badge(q.status)}</td><td class="actions"><button class="text-button" data-action="detail-quote" data-id="${esc(q.id)}">Ver</button>${q.status==='Pendiente'?`<button class="text-button" data-action="approve" data-id="${esc(q.id)}">Aprobar</button>`:''}${q.status==='Aprobada'?`<button class="text-button" data-action="convert" data-id="${esc(q.id)}">Crear borrador</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}
function render() {
  current = titles[location.hash.slice(1)] ? location.hash.slice(1) : 'panel';
  document.querySelectorAll('nav a').forEach(a=>{
    const active = a.hash === `#${current}`;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  const subtitles = {panel:'Todo lo que necesitas para empezar tu día.', clientes:'Organiza los contactos de tu empresa.', catalogo:'Tu catálogo, listo para cotizar. Precios sin IGV.', cotizaciones:'Prepara propuestas y conviértelas en oportunidades.', facturas:'Documentos internos de prueba. No son comprobantes electrónicos.'};
  let body='';
  if (current === 'panel') body = `<section class="stats">${stats()}</section><section class="welcome"><div><span class="eyebrow">UN BUEN PUNTO DE PARTIDA</span><h2>De una propuesta a tu próximo proyecto.</h2><p>Crea una cotización, apruébala y explora su borrador de factura.</p><button data-action="new-quote">Crear mi cotización <span>→</span></button></div><div class="welcome-art" aria-hidden="true"><div class="paper"><span>PROPUESTA DEMO</span><i></i><i></i><i></i><b>Todo empieza con una idea.</b><div>✓ Lista para cotizar</div></div></div></section><section class="card"><div class="card-heading"><div><h2>Cotizaciones recientes</h2><p>El estado de tus últimas propuestas</p></div><a href="#cotizaciones">Ver todas →</a></div>${quoteTable(state.quotes.slice(-5).reverse())}</section><div class="info-note">ⓘ Las estadísticas se calculan con los datos ficticios y los registros que crees en este navegador; no representan ventas ni facturación real.</div>`;
  if (current === 'clientes') body = `<section class="card"><div class="card-heading"><h2>Directorio de clientes <span class="count">${state.clients.length}</span></h2></div>${state.clients.length?`<div class="table-scroll"><table><thead><tr><th>Nombre / empresa</th><th>Identificador demo</th><th>Correo</th><th>Acciones</th></tr></thead><tbody>${state.clients.map(c=>`<tr><td><strong>${esc(c.name)}</strong><small>${esc(c.address)}</small></td><td>${esc(c.document)}</td><td>${esc(c.email)||'—'}</td><td><button class="text-button" data-action="edit-client" data-id="${esc(c.id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:empty('No hay clientes.')}</section>`;
  if (current === 'catalogo') body = catalogHTML(state,catalogSearch,catalogCategory,{esc,money});
  if (current === 'cotizaciones') body = `<section class="card"><div class="card-heading"><h2>Todas las cotizaciones <span class="count">${state.quotes.length}</span></h2></div>${quoteTable([...state.quotes].reverse())}</section>`;
  if (current === 'facturas') body = `<section class="card"><div class="card-heading"><h2>Borradores de demostración</h2></div>${state.invoices.length?`<div class="table-scroll"><table><thead><tr><th>Borrador</th><th>Origen</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${state.invoices.map(i=>`<tr><td><strong>${esc(i.number)}</strong><small>${date(i.date)}</small></td><td>${esc(i.quoteNumber)}</td><td>${esc(i.client.name)}</td><td class="amount">${money(i.amounts.total)}</td><td>${badge('Borrador')}</td><td><button class="text-button" data-action="detail-invoice" data-id="${esc(i.id)}">Ver borrador</button></td></tr>`).join('')}</tbody></table></div>`:empty('No hay borradores. Aprueba una cotización y selecciona «Crear borrador».')}</section><div class="info-note">No se generan XML, firmas digitales, series fiscales ni envíos a SUNAT en esta etapa.</div>`;
  const add = {clientes:['new-client','Nuevo cliente'], catalogo:['new-product','Nuevo concepto'], cotizaciones:['new-quote','Nueva cotización']};
  app.innerHTML = `<div class="page-heading"><div><span class="eyebrow">TU NEGOCIO, EN ORDEN</span><h1>${titles[current]}</h1><p>${subtitles[current]}</p></div>${add[current]?`<button data-action="${add[current][0]}">＋ ${add[current][1]}</button>`:current==='panel'?'<button data-action="new-quote">＋ Nueva cotización</button>':''}</div>${body}`;
}
function notify(message) {feedback.textContent=message;}
function mutate(action) {
  const next=structuredClone(state);
  const result=action(next);
  repository.save(next); // Solo actualizar la pantalla si guardar tuvo éxito.
  state=next;
  render();
  return result;
}
function openDialog(title, html) {
  document.querySelector('dialog')?.remove();
  const dialog=document.createElement('dialog');
  dialog.setAttribute('aria-labelledby','dialog-title');
  dialog.innerHTML=`<div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="close secondary" type="button" aria-label="Cerrar">×</button></div>${html}`;
  document.body.append(dialog);
  dialog.querySelector('.close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();if(state)render();});
  dialog.showModal();
  return dialog;
}
function formDialog(title, fields, save) {
  const d=openDialog(title,`<form><div class="form-fields">${fields}</div><p class="form-error" role="alert"></p><div class="form-footer"><span>Solo datos ficticios</span><button type="submit">Guardar</button></div></form>`);
  d.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    try {save(new FormData(e.target));d.close();notify('Cambios guardados en este navegador.');}
    catch(error){d.querySelector('.form-error').textContent=error.message;}
  };
}
function field(label,name,value='',extra='') {return `<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;}
function clientForm(id) {
  const c=state.clients.find(c=>c.id===id)||{};
  formDialog(id?'Editar cliente':'Nuevo cliente',field('Nombre o empresa','name',c.name,'required maxlength="100"')+field('Identificador ficticio (no se valida RUC)','document',c.document,'required maxlength="30" placeholder="DEMO-004"')+field('Correo ficticio','email',c.email,'type="email" maxlength="120" placeholder="contacto@empresa.example"')+field('Teléfono de prueba (opcional)','phone',c.phone,'maxlength="30"')+field('Dirección ficticia (opcional)','address',c.address,'maxlength="160"'), data=>{
    const values=Object.fromEntries([...data].map(([k,v])=>[k,v.trim()]));
    if(!values.name||!values.document) throw new Error('Completa el nombre y el identificador.');
    if(state.clients.some(x=>x.id!==id && x.document.toLowerCase()===values.document.toLowerCase())) throw new Error('Ya existe un cliente con ese identificador.');
    mutate(s=>{if(id) Object.assign(s.clients.find(x=>x.id===id),values);else s.clients.push({id:crypto.randomUUID(),...values});});
  });
}
function productForm(id) {
  const p=state.products.find(p=>p.id===id)||{};
  formDialog(id?'Editar concepto':'Nuevo producto o servicio',field('Nombre','name',p.name,'required maxlength="100"')+`<label>Tipo<select name="type" aria-label="Tipo"><option ${p.type==='Producto'?'selected':''}>Producto</option><option ${p.type==='Servicio'?'selected':''}>Servicio</option></select></label>`+`<label>Categoría<select name="category" aria-label="Categoría">${categories.map(c=>`<option ${categoryOf(p)===c?'selected':''}>${c}</option>`).join('')}</select></label>`+field('Precio unitario sin IGV (S/)','price',p.price??'','type="number" min="0" max="1000000" step="0.01" required'), data=>{
    const name=data.get('name').trim(), price=Number(data.get('price'));
    if(!name || !Number.isFinite(price)||price<0||price>1000000) throw new Error('Revisa el nombre y el precio.');
    mutate(s=>{const values={name,type:data.get('type'),category:data.get('category'),price};if(id)Object.assign(s.products.find(x=>x.id===id),values);else s.products.push({id:crypto.randomUUID(),...values});});
  });
}
// La selección se comparte entre el catálogo y el editor, y sobrevive a recargas.
function addProduct(id) {
  const product=state.products.find(p=>p.id===id);
  if(!product)return;
  mutate(s=>{
    const line=s.draft.lines.find(l=>l.productId===id);
    if(line)line.qty=Number(line.qty||0)+1;
    else s.draft.lines.push({id:crypto.randomUUID(),productId:id,description:product.name,qty:1,price:product.price,discount:0});
  });
  notify(`${product.name} agregado a la cotización actual.`);
}
function filterCatalog() {
  const matches=filterProducts(state.products,catalogSearch,catalogCategory);
  document.querySelector('#catalog-results').innerHTML=productCards(matches,{esc,money});
  document.querySelector('#result-count').textContent=`${matches.length} resultados`;
  document.querySelectorAll('.category-tab').forEach(b=>{
    const active=b.dataset.category===catalogCategory;
    b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));
  });
}
function quoteForm() {
  if(location.hash!=='#catalogo')location.hash='catalogo';
  else render();
  notify(state.draft.lines.length?'Continúa con tu selección o revisa la cotización actual.':'Elige productos o servicios con el botón Agregar.');
}
function reviewDraft() {
  if(!state.draft.lines.length){notify('Agrega al menos un concepto del catálogo.');return;}
  if(!state.clients.length){notify('Primero registra un cliente.');return;}
  const draft=state.draft;
  const selectedClient=draft.clientId||state.clients[0].id;
  const d=openDialog('Revisar cotización',`<form id="quote-form"><div class="form-fields"><label>Cliente<select name="client" aria-label="Cliente" required>${state.clients.map(c=>`<option value="${esc(c.id)}" ${selectedClient===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>${field('IGV (%)','igv',draft.igv,'type="number" min="0" max="100" step="0.01" required')}<p class="help">Descuento porcentual por ítem, aplicado antes del IGV. Precios sin IGV. Simulación sin validez tributaria.</p><div id="lines">${draft.lines.map(l=>`<div class="quote-line" data-line-id="${esc(l.id)}"><div class="quote-line-heading"><strong>${esc(l.description)}</strong><button class="text-button remove-line" type="button" aria-label="Eliminar ${esc(l.description)}">Eliminar</button></div><div class="line-editor">${field('Cantidad','qty',l.qty,'type="number" min="0.01" max="100000" step="0.01" required')}${field('Precio sin IGV (S/)','price',l.price,'type="number" min="0" max="1000000" step="0.01" required')}${field('Descuento (%)','discount',l.discount??0,'type="number" min="0" max="100" step="0.01" required')}</div><p class="line-net"></p></div>`).join('')}</div><button type="button" class="secondary" id="back-catalog">＋ Agregar más desde el catálogo</button><label>Notas (opcional)<textarea name="notes" maxlength="500" rows="2">${esc(draft.notes)}</textarea></label><div id="quote-total" class="totals" aria-live="polite"></div></div><p class="form-error" role="alert"></p><div class="form-footer"><span>Se guardará como pendiente</span><button type="submit">Guardar cotización</button></div></form>`);
  const form=d.querySelector('form');
  function readDraft() {
    const lines=[...d.querySelectorAll('.quote-line')].map(row=>{
      const previous=state.draft.lines.find(l=>l.id===row.dataset.lineId);
      return {...previous,qty:row.querySelector('[name="qty"]').value,price:row.querySelector('[name="price"]').value,discount:row.querySelector('[name="discount"]').value};
    });
    return {lines,clientId:form.elements.client.value,igv:form.elements.igv.value,notes:form.elements.notes.value};
  }
  function updateTotal() {
    const draft=readDraft();
    for(const row of d.querySelectorAll('.quote-line')){
      try {row.querySelector('.line-net').textContent=`Importe sin IGV: ${money(lineAmounts(draft.lines.find(l=>l.id===row.dataset.lineId)).net)}`;}
      catch {row.querySelector('.line-net').textContent='Revisa este ítem.';}
    }
    try {d.querySelector('#quote-total').innerHTML=amountsHTML(totals(draft.lines,draft.igv),draft.igv,draft.lines);}catch{d.querySelector('#quote-total').textContent='Agrega conceptos y completa valores válidos.';}
  }
  function persistDraft() {
    const next={...state,draft:readDraft()};
    repository.save(next);state=next;
  }
  form.addEventListener('input',()=>{
    updateTotal();
    try{persistDraft();d.querySelector('.form-error').textContent='';}catch(error){d.querySelector('.form-error').textContent=`No se pudo guardar la selección: ${error.message}`;}
  });
  form.addEventListener('change',()=>{try{persistDraft();}catch(error){d.querySelector('.form-error').textContent=error.message;}});
  d.querySelectorAll('.remove-line').forEach(button=>button.onclick=()=>{
    const row=button.closest('.quote-line');
    const next=structuredClone(state);
    next.draft=readDraft();next.draft.lines=next.draft.lines.filter(l=>l.id!==row.dataset.lineId);
    try{repository.save(next);state=next;row.remove();updateTotal();}catch(error){d.querySelector('.form-error').textContent=error.message;}
  });
  d.querySelector('#back-catalog').onclick=()=>d.close();
  updateTotal();
  form.onsubmit=e=>{
    e.preventDefault();
    try {
      const draft=readDraft();
      const lines=draft.lines.map(l=>({...l,qty:Number(l.qty),price:Number(l.price),discount:Number(l.discount)}));
      const igv=Number(draft.igv),amounts=totals(lines,igv);
      const client=state.clients.find(c=>c.id===draft.clientId);
      if(!client)throw new Error('Selecciona un cliente.');
      mutate(s=>{s.quotes.push({id:crypto.randomUUID(),number:`COT-${String(s.quotes.length+1).padStart(3,'0')}`,client:structuredClone(client),lines,igv,amounts,date:new Date().toISOString(),status:'Pendiente',notes:draft.notes.trim()});s.draft=emptyDraft();});
      d.close();location.hash='cotizaciones';notify('Cotización creada. Puedes revisarla antes de aprobarla.');
    }catch(error){d.querySelector('.form-error').textContent=error.message;}
  };
}

function amountsHTML(a,igv,lines=[]) {
  const savings=lines.reduce((sum,l)=>sum+lineAmounts(l).saving,0);
  return `${savings?`<div><span>Descuentos incluidos</span><strong>− ${money(savings)}</strong></div>`:''}<div><span>Subtotal${savings?' con descuento':''}</span><strong>${money(a.subtotal)}</strong></div><div><span>IGV (${esc(igv)} %)</span><strong>${money(a.tax)}</strong></div><div class="grand-total"><span>Total</span><strong>${money(a.total)}</strong></div>`;
}

function detail(id,invoice=false) {
  const doc=(invoice?state.invoices:state.quotes).find(x=>x.id===id);
  if(!doc)return;
  openDialog(`${invoice?'Borrador':'Cotización'} ${esc(doc.number)}`,`<div class="detail"><p class="document-warning">DEMO · SIN VALIDEZ TRIBUTARIA</p>${badge(doc.status)}<h3>${esc(doc.client.name)}</h3><p>${esc(doc.client.document)} · ${esc(doc.client.email)}</p><p>${esc(doc.client.address)}</p><p class="muted">${date(doc.date)}${invoice?` · Origen: ${esc(doc.quoteNumber)}`:''}</p><div class="table-scroll"><table><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio sin IGV</th><th>Descuento</th><th>Importe neto</th></tr></thead><tbody>${doc.lines.map(l=>`<tr><td>${esc(l.description)}</td><td>${l.qty}</td><td>${money(Math.round(l.price*100))}</td><td>${esc(l.discount??0)} %</td><td>${money(lineAmounts(l).net)}</td></tr>`).join('')}</tbody></table></div><div class="totals">${amountsHTML(doc.amounts,doc.igv,doc.lines)}</div><p class="notes">${esc(doc.notes)}</p><p class="help">Documento interno ficticio. No enviado a SUNAT.</p></div>`);
}
app.addEventListener('click', e=>{
  const button=e.target.closest('[data-action]');if(!button||!state)return;
  const {action,id}=button.dataset;
  try {
    if(action==='new-client'||action==='edit-client')clientForm(id);
    if(action==='new-product'||action==='edit-product')productForm(id);
    if(action==='new-quote')quoteForm();
    if(action==='add-product')addProduct(id);
    if(action==='filter-category'){catalogCategory=button.dataset.category;filterCatalog();}
    if(action==='review-draft')reviewDraft();
    if(action==='remove-draft-item'){mutate(s=>{s.draft.lines=s.draft.lines.filter(l=>l.id!==id);});notify('Ítem eliminado de la cotización actual.');}
    if(action==='detail-quote')detail(id);
    if(action==='detail-invoice')detail(id,true);
    if(action==='approve'){mutate(s=>approveQuote(s.quotes.find(q=>q.id===id)));notify('Cotización aprobada en la demo. Ahora puedes crear un borrador.');}
    if(action==='convert'){const invoice=mutate(s=>convertQuote(s,id));notify(`Borrador ${invoice.number} creado. Sin validez tributaria.`);location.hash='facturas';}
  }catch(error){notify(`No se pudo guardar: ${error.message}`);}
});
app.addEventListener('input',e=>{if(e.target.id==='catalog-search'){catalogSearch=e.target.value;filterCatalog();}});
window.addEventListener('hashchange',()=>{if(state){document.querySelector('dialog')?.close();render();}});
if(state)render();
