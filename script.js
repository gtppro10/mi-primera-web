import {repository} from './js/repository.js';
import {totals, approveQuote, convertQuote} from './js/domain.js';

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
  if (current === 'catalogo') body = `<section class="product-grid">${state.products.map(p=>`<article class="card product"><span class="product-icon">${p.type==='Servicio'?'◇':'▦'}</span>${badge(p.type)}<h2>${esc(p.name)}</h2><p>Precio unitario sin IGV</p><strong class="price">${money(Math.round(p.price*100))}</strong><button class="secondary" data-action="edit-product" data-id="${esc(p.id)}">Editar concepto</button></article>`).join('') || empty('No hay conceptos en el catálogo.')}</section>`;
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
  dialog.addEventListener('close',()=>dialog.remove());
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
  formDialog(id?'Editar concepto':'Nuevo producto o servicio',field('Nombre','name',p.name,'required maxlength="100"')+`<label>Tipo<select name="type" aria-label="Tipo"><option ${p.type==='Producto'?'selected':''}>Producto</option><option ${p.type==='Servicio'?'selected':''}>Servicio</option></select></label>`+field('Precio unitario sin IGV (S/)','price',p.price??'','type="number" min="0" max="1000000" step="0.01" required'), data=>{
    const name=data.get('name').trim(), price=Number(data.get('price'));
    if(!name || !Number.isFinite(price)||price<0||price>1000000) throw new Error('Revisa el nombre y el precio.');
    mutate(s=>{const values={name,type:data.get('type'),price};if(id)Object.assign(s.products.find(x=>x.id===id),values);else s.products.push({id:crypto.randomUUID(),...values});});
  });
}
function quoteForm() {
  if(!state.clients.length||!state.products.length) {notify('Primero registra un cliente y un producto o servicio.');return;}
  const d=openDialog('Nueva cotización',`<form id="quote-form"><div class="form-fields"><label>Cliente<select name="client" aria-label="Cliente" required>${state.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>${field('IGV (%)','igv',18,'type="number" min="0" max="100" step="0.01" required')}<p class="help">Precios sin IGV. El impuesto se aplica a todos los conceptos. Simulación: no valida reglas tributarias ni operaciones especiales.</p><div id="lines"></div><button class="secondary" type="button" id="add-line">＋ Agregar concepto</button><label>Notas (opcional)<textarea name="notes" maxlength="500" rows="2"></textarea></label><div id="quote-total" class="totals" aria-live="polite"></div></div><p class="form-error" role="alert"></p><div class="form-footer"><span>Se guardará como pendiente</span><button type="submit">Guardar cotización</button></div></form>`);
  const form=d.querySelector('form');
  const readLines=()=>[...d.querySelectorAll('.quote-line')].map(row=>({description:state.products.find(p=>p.id===row.querySelector('select').value).name, qty:Number(row.querySelector('[name="qty"]').value),price:Number(row.querySelector('[name="price"]').value)}));
  function updateTotal(){try {d.querySelector('#quote-total').innerHTML=amountsHTML(totals(readLines(),form.elements.igv.value),form.elements.igv.value);}catch{d.querySelector('#quote-total').textContent='Completa los conceptos con valores válidos.';}}
  function addLine(){
    const row=document.createElement('div');row.className='quote-line';
    row.innerHTML=`<label>Concepto<select aria-label="Concepto">${state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><div class="line-values">${field('Cantidad','qty',1,'type="number" min="0.01" max="100000" step="0.01" required')}${field('Precio sin IGV (S/)','price',state.products[0].price,'type="number" min="0" max="1000000" step="0.01" required')}<button class="secondary remove-line" type="button" aria-label="Quitar concepto">×</button></div>`;
    row.querySelector('select').onchange=()=>{row.querySelector('[name="price"]').value=state.products.find(p=>p.id===row.querySelector('select').value).price;updateTotal();};
    row.querySelector('button').onclick=()=>{row.remove();updateTotal();};
    d.querySelector('#lines').append(row);updateTotal();
  }
  d.querySelector('#add-line').onclick=addLine;
  form.addEventListener('input',updateTotal);
  addLine();
  form.onsubmit=e=>{
    e.preventDefault();
    try {
      const lines=readLines(), igv=Number(form.elements.igv.value), amounts=totals(lines,igv);
      const client=state.clients.find(c=>c.id===form.elements.client.value);
      if(!client) throw new Error('Selecciona un cliente.');
      mutate(s=>s.quotes.push({id:crypto.randomUUID(),number:`COT-${String(s.quotes.length+1).padStart(3,'0')}`,client:structuredClone(client),lines,igv,amounts,date:new Date().toISOString(),status:'Pendiente',notes:form.elements.notes.value.trim()}));
      d.close();notify('Cotización creada. Puedes revisarla antes de aprobarla.');
    }catch(error){d.querySelector('.form-error').textContent=error.message;}
  };
}
function amountsHTML(a,igv) {return `<div><span>Subtotal</span><strong>${money(a.subtotal)}</strong></div><div><span>IGV (${esc(igv)} %)</span><strong>${money(a.tax)}</strong></div><div class="grand-total"><span>Total</span><strong>${money(a.total)}</strong></div>`;}
function detail(id,invoice=false) {
  const doc=(invoice?state.invoices:state.quotes).find(x=>x.id===id);
  if(!doc)return;
  openDialog(`${invoice?'Borrador':'Cotización'} ${esc(doc.number)}`,`<div class="detail"><p class="document-warning">DEMO · SIN VALIDEZ TRIBUTARIA</p>${badge(doc.status)}<h3>${esc(doc.client.name)}</h3><p>${esc(doc.client.document)} · ${esc(doc.client.email)}</p><p>${esc(doc.client.address)}</p><p class="muted">${date(doc.date)}${invoice?` · Origen: ${esc(doc.quoteNumber)}`:''}</p><div class="table-scroll"><table><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio sin IGV</th><th>Importe</th></tr></thead><tbody>${doc.lines.map(l=>`<tr><td>${esc(l.description)}</td><td>${l.qty}</td><td>${money(Math.round(l.price*100))}</td><td>${money(Math.round(l.price*l.qty*100))}</td></tr>`).join('')}</tbody></table></div><div class="totals">${amountsHTML(doc.amounts,doc.igv)}</div><p class="notes">${esc(doc.notes)}</p><p class="help">Documento interno ficticio. No enviado a SUNAT.</p></div>`);
}
app.addEventListener('click', e=>{
  const button=e.target.closest('[data-action]');if(!button||!state)return;
  const {action,id}=button.dataset;
  try {
    if(action==='new-client'||action==='edit-client')clientForm(id);
    if(action==='new-product'||action==='edit-product')productForm(id);
    if(action==='new-quote')quoteForm();
    if(action==='detail-quote')detail(id);
    if(action==='detail-invoice')detail(id,true);
    if(action==='approve'){mutate(s=>approveQuote(s.quotes.find(q=>q.id===id)));notify('Cotización aprobada en la demo. Ahora puedes crear un borrador.');}
    if(action==='convert'){const invoice=mutate(s=>convertQuote(s,id));notify(`Borrador ${invoice.number} creado. Sin validez tributaria.`);location.hash='facturas';}
  }catch(error){notify(`No se pudo guardar: ${error.message}`);}
});
window.addEventListener('hashchange',()=>{if(state){document.querySelector('dialog')?.close();render();}});
if(state)render();
