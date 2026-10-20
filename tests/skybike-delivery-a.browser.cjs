// Entrega A: archivos PDF reales, edición conservando identidad y formularios.
// Todas las operaciones usan datos ficticios y nunca contactan a un cliente.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {execFileSync}=require('node:child_process');
const {chooseWizardClient,goToWizardStep}=require('./wizard-helpers.cjs');
const KEY='skybike-cusco-demo-v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const pdfText=buffer=>execFileSync('pdftotext',['-layout','-','-'],{input:buffer,encoding:'utf8'});
const pdfInfo=buffer=>execFileSync('pdfinfo',['-'],{input:buffer,encoding:'utf8'});
const assertPDF=buffer=>{assert.equal(buffer.subarray(0,4).toString(),'%PDF');assert.ok(buffer.length>8000,'Se genera el PDF, no una URL o un marcador');assert.match(pdfInfo(buffer),/Page size:\s+[\d.]+ x [\d.]+ pts \(A4\)/);};

(async()=>{
 const artifacts=fs.mkdtempSync(join(tmpdir(),'skybike-delivery-a-'));
 let browser,page,failure;
 try{
 fs.chmodSync(artifacts,0o700);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();const errors=[],external=[];
 const base=process.env.DEMO_URL||'http://127.0.0.1:8007/';
 const visit=async route=>{await page.goto(base.replace(/#.*$/,'')+'#'+route);};
 page.on('pageerror',error=>errors.push(error.message));
 // El visor PDF de Chromium carga chrome:// y chrome-extension:// internos.
 // Las peticiones HTTP externas siguen prohibidas para esta demo.
 context.on('request',request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==new URL(base).origin)external.push(request.url());});
  await visit('panel');await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();
  // Categoría nueva y flyers ficticios: mismos datos locales que administra la app.
  await page.evaluate(async key=>{
   const s=JSON.parse(localStorage.getItem(key)),sky=s.products.find(p=>p.id==='sky');
   const data=await new Promise(async resolve=>{const blob=await(await fetch('./images/skybike/machu.jpg')).blob();const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});
   sky.flyers=[{id:'flyer-entrega-a-demo',name:'Flyer ficticio Skybike',language:'es',data,mime:'image/jpeg'}];
   s.products.push({...sky,id:'naturaleza-demo',code:'TOUR-NAT-DEMO',name:'Naturaleza ficticia',category:'Naturaleza DEMO',flyers:[]});
   localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('nexo-demo-v1','ENTREGA A CONSERVAR');
  },KEY);
  await page.reload();await visit('catalogo');
  const categories=page.getByRole('group',{name:'Categorías',exact:true});
  assert.equal(await categories.getByRole('button',{name:'Todos',exact:true}).count(),0);
  assert.equal(await categories.locator('[aria-pressed="true"]').count(),0);
  assert.equal(await page.locator('#cards .shop-product').count(),8);
  const adventure=categories.getByRole('button',{name:'Aventura',exact:true});
  await adventure.click();assert.equal(await adventure.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#cards .shop-product').count(),1);
  await adventure.click();assert.equal(await categories.locator('[aria-pressed="true"]').count(),0);
  assert.equal(await page.locator('#cards .shop-product').count(),8);
  await categories.getByRole('button',{name:'Naturaleza DEMO',exact:true}).click();
  assert.equal(await page.locator('#cards .shop-product').count(),1);
  await page.getByLabel('Buscar tours y servicios').fill('no existe DEMO');assert.equal(await page.locator('#cards .shop-product').count(),0);
  await page.getByLabel('Buscar tours y servicios').fill('NATURALEZA');assert.equal(await page.locator('#cards .shop-product').count(),1);
  await page.getByLabel('Buscar tours y servicios').fill('');await categories.getByRole('button',{name:'Naturaleza DEMO',exact:true}).click();
  await page.locator('#cards [data-action="add"][data-id="sky"]').last().click();
  await page.getByRole('button',{name:'Revisar cotización'}).click();await chooseWizardClient(page);
  await goToWizardStep(page,3);
  const wizardCategories=page.getByRole('group',{name:'Categorías de tours',exact:true});
  assert.equal(await wizardCategories.getByRole('button',{name:'Todos',exact:true}).count(),0);
  assert.equal(await wizardCategories.locator('.selected').count(),0);
  assert.equal(await page.locator('#wizard-catalog .shop-product').count(),5);
  await wizardCategories.getByRole('button',{name:'Naturaleza DEMO',exact:true}).click();assert.equal(await page.locator('#wizard-catalog .shop-product').count(),1);
  await page.locator('#wizard-search').fill('no existe');assert.equal(await page.locator('#wizard-catalog .shop-product').count(),0);
  await page.locator('#wizard-search').fill('naturaleza');assert.equal(await page.locator('#wizard-catalog .shop-product').count(),1);
  await page.locator('#wizard-search').fill('');await wizardCategories.getByRole('button',{name:'Naturaleza DEMO',exact:true}).click();assert.equal(await page.locator('#wizard-catalog .shop-product').count(),5);
  await goToWizardStep(page,4);
  await page.locator('.quote-line [name="date"]').fill('2026-12-15');
  await page.locator('.quote-line [name="qty"]').fill('2');
  await page.getByRole('button',{name:'Personalizar descuento por pasajero'}).click();
  await page.locator('.person-discount').nth(0).fill('5');await page.locator('.person-discount').nth(1).fill('10');
  await page.locator('[name="servicePicker"]').selectOption('food');await page.getByRole('button',{name:'Agregar servicio'}).click();
  await goToWizardStep(page,5);await page.getByLabel('Observaciones',{exact:true}).fill('Observación ficticia Entrega A.');
  await goToWizardStep(page,6);
  assert.equal(await page.locator('#wizard-step').innerText(),'Paso 6 de 6');
  assert.equal(await page.locator('#quote-wizard').getByRole('button',{name:/calendario/i}).count(),0);
  const before=await state(page);
  await page.getByRole('button',{name:'Guardar cotización demo',exact:true}).evaluate(button=>{button.click();button.click();});
  await page.waitForFunction(()=>location.hash==='#cotizacion-generada');
  const success=page.locator('#quote-success');
  await success.getByRole('heading',{name:'COTIZACIÓN GENERADA',exact:true}).waitFor();
  const saved=await state(page),quote=saved.quotes.at(-1);
  assert.equal(saved.quotes.length,before.quotes.length+1);
  assert.ok((await success.innerText()).includes(quote.number));
  assert.equal(await page.locator('#wizard-step,.wizard-progress,#quote-total').count(),0);
  assert.equal(await page.getByRole('button',{name:'Guardar cotización demo',exact:true}).count(),0);
  for(const action of ['quote-file-share','quote-file-open','quote-edit'])assert.equal(await success.locator(`[data-action="${action}"]`).count(),1);
  for(const key of ['reservations','receipts','payments','passengers'])assert.deepEqual(saved[key],before[key],`${key} se conserva al guardar cotización`);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`confirmación sin desbordes a ${width}px`);
   for(const button of await success.getByRole('button').all())assert.ok(await button.evaluate(el=>el.getBoundingClientRect().height>=44),'Controles cómodos para tocar');
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:join(artifacts,'skybike-entrega-a-confirmacion.png'),fullPage:true});
  await page.reload();await success.getByRole('heading',{name:'COTIZACIÓN GENERADA',exact:true}).waitFor();assert.ok((await success.innerText()).includes(quote.number));

  // El navegador sin compartir archivos recibe un PDF verdadero para adjuntar.
  await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});});
  await success.locator('#success-include-flyers').uncheck();
  let downloadPromise=page.waitForEvent('download');await success.locator('[data-action="quote-file-share"]').click();
  let download=await downloadPromise;assert.equal(download.suggestedFilename(),quote.number+'.pdf');
  let pdf=fs.readFileSync(await download.path());assertPDF(pdf);assert.ok(pdfText(pdf).includes(quote.number));assert.match(pdfInfo(pdf),/Pages:\s+1\b/);
  await success.locator('#success-include-flyers').check();
  downloadPromise=page.waitForEvent('download');await success.locator('[data-action="quote-file-share"]').click();download=await downloadPromise;pdf=fs.readFileSync(await download.path());assertPDF(pdf);assert.match(pdfInfo(pdf),/Pages:\s+2\b/);
  await success.locator('#success-include-flyers').uncheck();

  // El archivo que ofrece compartir contiene el PDF; el destino lo decide el móvil.
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>data.files?.length===1});
   Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{const file=files[0];window.__sharedPDF={name:file.name,type:file.type,bytes:Array.from(new Uint8Array(await file.arrayBuffer()))};}});
  });
  await success.locator('[data-action="quote-file-share"]').click();await page.waitForFunction(()=>!!window.__sharedPDF);
  const shared=await page.evaluate(()=>window.__sharedPDF);assert.equal(shared.name,quote.number+'.pdf');assert.equal(shared.type,'application/pdf');assertPDF(Buffer.from(shared.bytes));
  await page.evaluate(()=>{delete window.__sharedPDF;Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelado por prueba','AbortError');}});});
  await success.locator('[data-action="quote-file-share"]').click();await page.locator('#quote-file-status').filter({hasText:/cancelad/i}).waitFor();
  assert.doesNotMatch(await page.locator('#quote-file-status').innerText(),/enviado|compartido correctamente|compartido con éxito/i);
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new Error('Fallo nativo ficticio');}});});
  await success.locator('[data-action="quote-file-share"]').click();
  const fallback=success.getByRole('button',{name:'Descargar PDF',exact:true});await fallback.waitFor();
  downloadPromise=page.waitForEvent('download');await fallback.click();download=await downloadPromise;assertPDF(fs.readFileSync(await download.path()));

  // Editar conserva todas las líneas y el número, sin producir otra cotización.
  await success.locator('[data-action="quote-edit"]').click();await page.locator('#quote-wizard').waitFor();
  assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'asistente','Editar entra directamente al asistente compacto');
  assert.equal(await page.locator('#app .page-heading,#app .module-shortcuts').count(),0);
  assert.equal(await page.locator('.wizard-toolbar').count(),1);
  const editing=(await state(page)).quoteDraft;
  assert.equal(editing.customerName,quote.client.name);assert.equal(editing.customerPhone,'900000000');
  assert.deepEqual(editing.lines,quote.lines);
  await goToWizardStep(page,4);assert.equal(await page.locator('.person-discount').nth(1).inputValue(),'10');
  await page.locator('.person-discount').nth(1).fill('15');
  await goToWizardStep(page,5);await page.getByLabel('Observaciones',{exact:true}).fill('Observación actualizada y ficticia Entrega A.');
  await goToWizardStep(page,6);await page.locator('#wizard-save').click();await page.waitForFunction(()=>location.hash==='#cotizacion-generada');
  const afterEdit=await state(page),updated=afterEdit.quotes.find(q=>q.id===quote.id);
  assert.equal(afterEdit.quotes.length,saved.quotes.length);assert.equal(updated.number,quote.number);assert.equal(updated.id,quote.id);
  assert.equal(updated.notes,'Observación actualizada y ficticia Entrega A.');assert.equal(updated.totals.total,quote.totals.total-500);
  for(const key of ['reservations','receipts','payments','passengers'])assert.deepEqual(afterEdit[key],before[key]);
  const popupPromise=page.waitForEvent('popup');await success.locator('[data-action="quote-file-open"]').click();const popup=await popupPromise;
  await popup.waitForURL(/^blob:/);const pdfURL=popup.url();
  const opened=Buffer.from(await page.evaluate(async url=>Array.from(new Uint8Array(await(await fetch(url)).arrayBuffer())),pdfURL));
  assertPDF(opened);assert.ok(pdfText(opened).includes('Observación actualizada'));assert.ok(pdfText(opened).includes(updated.number));await popup.close();
  await success.getByRole('link',{name:'VOLVER AL INICIO',exact:true}).click();await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();

  // Correo opcional, con formato validado y snapshot que sobrevive editar reserva.
  await visit('documentos');await page.getByRole('button',{name:'Nuevo comprobante'}).click();
  await page.locator('#cards [data-action="add"][data-id="valle"]').last().click();await page.getByRole('button',{name:'Revisar cotización'}).click();
  const email=page.locator('#editor [name="customerEmail"]');await email.waitFor();assert.equal(await email.getAttribute('type'),'email');assert.equal(await email.getAttribute('required'),null);
  await email.fill('');assert.equal(await email.evaluate(input=>input.checkValidity()),true);
  await email.fill('correo-invalido');const invalid=await state(page);
  await page.getByRole('button',{name:'Guardar comprobante demo',exact:true}).click();assert.equal(await email.evaluate(input=>input.validity.valid),false);
  assert.deepEqual((await state(page)).reservations,invalid.reservations);assert.deepEqual((await state(page)).payments,invalid.payments);
  await email.fill('cliente-entrega-a@example.com');await page.getByLabel('Adelanto (S/)',{exact:true}).fill('20');await page.getByLabel('Referencia del pago').fill('DEMO-ENTREGA-A-EMAIL');
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();await page.reload();await visit('catalogo');await page.getByRole('button',{name:'Revisar cotización'}).click();assert.equal(await email.inputValue(),'cliente-entrega-a@example.com');
  await page.getByRole('button',{name:'Guardar comprobante demo',exact:true}).click();await page.getByRole('heading',{name:'Comprobantes internos',exact:true}).waitFor();
  const receiptState=await state(page),receipt=receiptState.receipts.at(-1),reservation=receiptState.reservations.find(r=>r.id===receipt.reservationId);
  assert.equal(receipt.client.email,'cliente-entrega-a@example.com');assert.equal(reservation.client.email,receipt.client.email);assert.equal(receiptState.clients.find(c=>c.id===reservation.client.id).email,receipt.client.email);
  assert.equal(receipt.lines.some(l=>l.flyers?.length),false);
  await visit('reservas');await page.locator('tr').filter({hasText:reservation.number}).getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Observaciones de la reserva').fill('Edición ficticia para preservar correo.');await page.getByRole('button',{name:'Guardar reserva demo',exact:true}).click();
  const afterReservation=await state(page);assert.equal(afterReservation.reservations.find(r=>r.id===reservation.id).client.email,receipt.client.email);
  assert.equal(afterReservation.receipts.at(-1).client.email,receipt.client.email);assert.deepEqual(afterReservation.payments,receiptState.payments);
  assert.equal(await page.evaluate(()=>localStorage.getItem('nexo-demo-v1')),'ENTREGA A CONSERVAR');
  assert.equal(await page.getByRole('button',{name:/calendario/i}).count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS Entrega A: confirmación independiente, doble pulsación sin duplicado, edición con identidad, PDF real A4 abrir/descargar/compartir/cancelar, flyers opcionales, filtros sin Todos, correo opcional y persistente, pagos preservados y móvil/escritorio; sin integraciones.');
 }catch(error){failure=error;try{if(page&&!page.isClosed())await page.screenshot({path:join(artifacts,'skybike-entrega-a-failure.png'),fullPage:true});}catch{}throw error;}
 finally{
  let cleanupError;
  try{await browser?.close();}catch(error){cleanupError=error;}
  try{fs.rmSync(artifacts,{recursive:true,force:true});}catch(error){cleanupError||=error;}
  if(!failure&&cleanupError)throw cleanupError;
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
