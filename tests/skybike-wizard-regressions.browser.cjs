const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {chooseWizardClient,goToWizardStep,wizardStep,saveWizardToList}=require('./wizard-helpers.cjs');
const storageKey='skybike-cusco-demo-v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const base=process.env.DEMO_URL||'http://127.0.0.1:8000/',errors=[];
 async function fresh(route){const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'#'+route);return page;}
 async function add(page,product){await page.locator(`[data-action="add"][data-id="${product}"]`).last().click();}
 async function review(page){await page.getByRole('button',{name:'Revisar cotización'}).click();await page.locator('#quote-wizard').waitFor();}
 async function failStorage(page){await page.evaluate(()=>{window.demoOriginalStorageSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('Cuota de prueba DEMO');};});}
 async function restoreStorage(page){await page.evaluate(()=>{Storage.prototype.setItem=window.demoOriginalStorageSetItem;});}
 try{
  // Volver al catálogo incorpora conceptos sin reemplazar las correcciones.
  const basket=await fresh('catalogo');await add(basket,'sky');await review(basket);await chooseWizardClient(basket);await goToWizardStep(basket,4);
  await basket.locator('.quote-line [name="unitDiscount"]').fill('17');
  await basket.locator('.quote-line [name="servicePicker"]').selectOption('food');await basket.getByRole('button',{name:'Agregar servicio'}).click();
  const before=(await state(basket)).quoteDraft,skyId=before.lines.find(l=>l.productId==='sky').id;
  assert.equal((await state(basket)).draft.lines.length,0,'la cesta auxiliar se consume al incorporarla al asistente');
  await basket.goto(base+'#catalogo');await add(basket,'valle');await review(basket);
  const merged=(await state(basket)).quoteDraft;
  assert.equal(merged.customerPhone,'900000000');assert.equal(merged.wizardStep,4);
  assert.equal(merged.lines.find(l=>l.productId==='sky').unitDiscount,'17');assert.equal(merged.lines.find(l=>l.productId==='sky').id,skyId);
  assert.equal(merged.lines.find(l=>l.productId==='food').parentId,skyId);assert.equal(merged.lines.length,3);
  await basket.goto(base+'#catalogo');await add(basket,'sky');await review(basket);assert.equal((await state(basket)).quoteDraft.lines.length,3);
  assert.equal((await state(basket)).quoteDraft.lines.find(l=>l.productId==='sky').unitDiscount,'17');await basket.close();

  // Un valor inválido debe permanecer corregible al retroceder o recargar.
  const clock=await fresh('catalogo');await add(clock,'sky');await review(clock);await chooseWizardClient(clock);await goToWizardStep(clock,4);
  await clock.locator('.quote-line [name="hour"]').fill('13');await goToWizardStep(clock,3);await goToWizardStep(clock,4);
  assert.equal(await clock.locator('.quote-line [name="hour"]').inputValue(),'13');
  await clock.reload();assert.equal(await clock.locator('.quote-line [name="hour"]').inputValue(),'13');
  await clock.getByRole('button',{name:'Siguiente',exact:true}).click();await clock.locator('.wizard-error').filter({hasText:/horario/}).waitFor();assert.equal(await wizardStep(clock),4);
  assert.equal((await state(clock)).quoteDraft.lines[0].time,'');
  await clock.locator('.quote-line [name="hour"]').fill('10');await clock.locator('.quote-line [name="minute"]').fill('25');await clock.locator('.quote-line [name="period"]').selectOption('PM');
  await goToWizardStep(clock,5);assert.equal((await state(clock)).quoteDraft.lines[0].time,'22:25');
  await goToWizardStep(clock,1);await clock.locator('#wizard-whatsapp').fill('Hora: 10:30');await clock.getByRole('button',{name:'Rellenar automáticamente'}).click();await clock.getByRole('button',{name:'Aplicar datos revisados'}).click();
  await goToWizardStep(clock,4);assert.equal(await clock.locator('.quote-line [name="hour"]').inputValue(),'10');assert.equal(await clock.locator('.quote-line [name="minute"]').inputValue(),'30');assert.equal(await clock.locator('.quote-line [name="period"]').inputValue(),'AM');
  await goToWizardStep(clock,5);assert.equal((await state(clock)).quoteDraft.lines[0].time,'10:30');await clock.close();

  // Un fallo de persistencia no cambia el paso ni bloquea el reintento.
  const quota=await fresh('cotizador');await chooseWizardClient(quota);
  const saved=await quota.evaluate(key=>localStorage.getItem(key),storageKey);await failStorage(quota);
  await quota.getByRole('button',{name:'Siguiente',exact:true}).click();await quota.locator('.wizard-error').filter({hasText:/Cuota/}).waitFor();assert.equal(await wizardStep(quota),1);
  assert.equal(await quota.evaluate(key=>localStorage.getItem(key),storageKey),saved);
  await restoreStorage(quota);await goToWizardStep(quota,2);
  const savedSecond=await quota.evaluate(key=>localStorage.getItem(key),storageKey);await failStorage(quota);
  await quota.getByRole('button',{name:'Anterior',exact:true}).click();await quota.locator('.wizard-error').filter({hasText:/Cuota/}).waitFor();assert.equal(await wizardStep(quota),2);
  assert.equal(await quota.evaluate(key=>localStorage.getItem(key),storageKey),savedSecond);
  await restoreStorage(quota);await goToWizardStep(quota,1);assert.equal(await quota.locator('[name="customerPhone"]').inputValue(),'900000000');await quota.close();

  // Un cliente guardado con prefijo internacional recupera ambos campos.
  const international=await fresh('cotizador');await international.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.clients.push({id:'international-demo',name:'Cliente Internacional DEMO',document:'DEMO-INT',phone:'+1 2025550100',email:''},{id:'peru-demo',name:'Cliente Perú DEMO',document:'DEMO-PERU',phone:'+51 900000000',email:''});localStorage.setItem(key,JSON.stringify(s));},storageKey);await international.reload();
  await international.locator('[name="clientId"]').selectOption('international-demo');assert.equal(await international.locator('[name="countryCode"]').inputValue(),'+1');assert.equal(await international.locator('[name="customerPhone"]').inputValue(),'2025550100');await goToWizardStep(international,2);await goToWizardStep(international,1);
  await international.locator('[name="clientId"]').selectOption('peru-demo');assert.equal(await international.locator('[name="countryCode"]').inputValue(),'+51');assert.equal(await international.locator('[name="customerPhone"]').inputValue(),'900000000');await goToWizardStep(international,2);await international.close();

  // Cambiar a Facturación conserva la selección previa y su borrador independiente.
  const isolated=await fresh('cotizador');await chooseWizardClient(isolated);await isolated.goto(base+'#catalogo');await add(isolated,'sky');
  await isolated.goto(base+'#documentos');await isolated.getByRole('button',{name:'Nuevo comprobante'}).click();
  const switched=await state(isolated);assert.equal(switched.quoteDraft.lines[0].productId,'sky');assert.equal(switched.quoteDraft.customerPhone,'900000000');assert.equal(switched.draft.documentType,'receipt');assert.equal(switched.draft.lines.length,0);
  await add(isolated,'valle');await isolated.getByRole('button',{name:'Revisar cotización'}).click();await isolated.locator('#editor').waitFor();
  await isolated.getByLabel('Adelanto (S/)',{exact:true}).fill('20');await isolated.getByLabel('Referencia del pago').fill('REFERENCIA-FICTICIA-FASE1');
  const receiptBefore=structuredClone((await state(isolated)).draft);await isolated.getByRole('button',{name:'Cerrar',exact:true}).click();
  await isolated.goto(base+'#cotizador');await goToWizardStep(isolated,6);await saveWizardToList(isolated);
  const afterQuote=await state(isolated);assert.deepEqual(afterQuote.draft,receiptBefore);assert.equal(afterQuote.quotes.length,2);assert.equal(afterQuote.reservations.length,1);assert.equal(afterQuote.receipts.length,1);assert.equal(afterQuote.payments.length,1);
  await isolated.goto(base+'#catalogo');await isolated.getByRole('button',{name:'Revisar cotización'}).click();assert.equal(await isolated.getByLabel('Adelanto (S/)',{exact:true}).inputValue(),'20');assert.equal(await isolated.getByLabel('Referencia del pago').inputValue(),'REFERENCIA-FICTICIA-FASE1');await isolated.close();
  assert.deepEqual(errors,[]);
  console.log('PASS regresiones: cesta preservada, horarios corregibles y pegado posterior, reintentos de almacenamiento, prefijos internacionales y borradores independientes de cotización/comprobante.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
