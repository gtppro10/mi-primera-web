const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdtempSync,chmodSync,rmSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const KEY='skybike-cusco-demo-v1';

(async()=>{
 const artifacts=mkdtempSync(join(tmpdir(),'skybike-wizard-'));
 let browser,page,failure;
 try{
 chmodSync(artifacts,0o700);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const base=process.env.DEMO_URL||'http://127.0.0.1:8005/';
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 const step=async n=>{await page.waitForFunction(n=>document.querySelector('#wizard-step')?.textContent===`Paso ${n} de 6`,n);};
 const next=async n=>{await page.locator('#wizard-next').click();await step(n);};
 const previous=async n=>{await page.locator('#wizard-prev').click();await step(n);};
 const noOverflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
 async function sizes(label){
  for(const width of [280,320,375,390,430,768,1440]){
   await page.setViewportSize({width,height:844});await noOverflow(`${label} ${width}px`);
   if(await page.locator('#wizard-catalog').count()){
    const columns=await page.locator('#wizard-catalog').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width<320?1:width>=900?3:2,`catálogo ${width}px`);
    for(const card of await page.locator('#wizard-catalog .shop-product').all()){
     assert.equal(await card.locator('.product-content > *').count(),3);
     assert.ok(await card.locator('.compact-catalog-add').evaluate(el=>el.getBoundingClientRect().height>=44));
     assert.equal(await card.getByRole('button',{name:/Ver ficha|Cambiar fotografía/}).count(),0);
    }
   }
  }
  await page.setViewportSize({width:390,height:844});
 }
  await page.goto(base);await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();
  assert.equal(await page.locator('.module-card').count(),9);
  for(const width of [280,320,375,390,430,768,1440]){
   await page.setViewportSize({width,height:844});await noOverflow(`inicio ${width}px`);
   assert.equal(await page.locator('.main-menu-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width<320?1:width<=700?2:3);
  }
  await page.setViewportSize({width:390,height:844});
  // Una cotización nueva no debe consumir ni reiniciar un comprobante pendiente.
  await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));data.draft={...data.draft,documentType:'receipt',clientId:'client1',advance:30,method:'Yape',reference:'DEMO-WIZ-RECEIPT',lines:[{id:'receipt-draft-line',productId:'sky',type:'Tour',description:'Comprobante ficticio en proceso',qty:1,price:120,unitDiscount:0,date:'2026-11-30',time:'09:00'}]};localStorage.setItem(key,JSON.stringify(data));},KEY);
  const before=await state(),legacyDraft=structuredClone(before.draft);
  await page.evaluate(()=>localStorage.setItem('nexo-demo-v1','DEMO WIZARD NO MODIFICAR'));
  await page.goto(`${base.replace(/#.*$/,'')}#cotizador`);await step(1);
  assert.equal(await page.locator('#quote-wizard').count(),1);
  await page.getByRole('link',{name:'Volver al inicio'}).waitFor();
  assert.equal(await page.locator('#wizard-prev').isDisabled(),true);
  await sizes('cliente');
  await page.locator('#wizard-next').click();await step(1);await page.getByRole('alert').filter({hasText:'nombre'}).waitFor();
  await page.locator('#wizard-whatsapp').fill('Nombre: Cliente Wizard DEMO\nDNI: DEMO-WIZARD-001\nWhatsApp: +51 900000001\nTour: Skybike\nFecha: 20/11/2026\nHora: 9:30 AM\nPasajeros: 2');
  await page.getByRole('button',{name:'Rellenar automáticamente',exact:true}).click();
  assert.equal(await page.getByLabel('Nombre completo',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Aplicar datos revisados'}).click();
  assert.equal(await page.getByLabel('Nombre completo',{exact:true}).inputValue(),'Cliente Wizard DEMO');
  assert.equal(await page.getByLabel('Código de país',{exact:true}).inputValue(),'+51');
  assert.equal(await page.getByLabel('WhatsApp',{exact:true}).inputValue(),'900000001');
  const parsedTour=(await state()).quoteDraft.lines.find(l=>l.productId==='sky');
  assert.equal(parsedTour.date,'2026-11-20');assert.equal(parsedTour.time,'09:30');assert.equal(Number(parsedTour.qty),2);
  await page.getByLabel('WhatsApp',{exact:true}).fill('123456');await page.locator('#wizard-next').click();await step(1);await page.getByRole('alert').filter({hasText:'WhatsApp'}).waitFor();
  await page.getByLabel('WhatsApp',{exact:true}).fill('900000001');await next(2);
  assert.equal(await page.locator('[name="exchangeRate"]').count(),0);
  await page.locator('[name="language"][value="en"]').check();
  await page.reload();await step(2);assert.equal(await page.locator('[name="language"][value="en"]').isChecked(),true);
  await page.locator('[name="language"][value="es"]').check();await page.reload();await step(2);assert.equal(await page.locator('[name="language"][value="es"]').isChecked(),true);await page.locator('[name="language"][value="en"]').check();
  await page.locator('[name="currency"][value="USD"]').check();
  await page.getByLabel('US$ 1.00 = S/ · Tipo de cambio manual',{exact:true}).fill('0');
  await page.locator('#wizard-next').click();await step(2);await page.getByRole('alert').filter({hasText:'tipo de cambio'}).waitFor();
  await page.getByLabel('US$ 1.00 = S/ · Tipo de cambio manual',{exact:true}).fill('3.8');
  await sizes('internacional');await next(3);
  await sizes('selección');
  await page.locator('.wizard-selection').getByRole('button',{name:'Quitar',exact:true}).click();
  await page.locator('#wizard-next').click();await step(3);await page.getByRole('alert').filter({hasText:'al menos un tour'}).waitFor();
  const add=productId=>page.locator(`#wizard-catalog .compact-catalog-add[data-id="${productId}"]`);
  assert.match(await page.locator('.shop-product').filter({has:page.locator('[data-id="sky"]')}).locator('.shop-price').innerText(),/31\.58/);
  await add('sky').click();await add('sky').click();
  assert.equal((await state()).quoteDraft.lines.filter(l=>l.type==='Tour').length,1);
  await page.getByRole('alert').filter({hasText:'ya está seleccionado'}).waitFor();
  await page.locator('#wizard-search').fill('VALLE');assert.equal(await page.locator('#wizard-catalog .shop-product').count(),1);
  await add('valle').click();await page.locator('#wizard-search').fill('');
  assert.equal(await page.locator('#selected-count').innerText(),'2 tours seleccionados');
  const originalPrices=(await state()).quoteDraft.lines.map(l=>l.price);
  assert.deepEqual(originalPrices,[120,95]);
  await previous(2);await page.locator('[name="currency"][value="PEN"]').check();assert.equal(await page.locator('[name="exchangeRate"]').count(),0);await next(3);
  assert.match(await page.locator('.shop-product').filter({has:page.locator('[data-id="sky"]')}).locator('.shop-price').innerText(),/120\.00/);
  assert.deepEqual((await state()).quoteDraft.lines.map(l=>l.price),originalPrices);
  await previous(2);await page.locator('[name="currency"][value="USD"]').check();assert.equal(await page.locator('[name="exchangeRate"]').inputValue(),'3.8');await next(3);await next(4);
  const sky=page.locator('[data-line]').filter({has:page.getByRole('heading',{name:'Skybike · aventura en las alturas',exact:true})});
  const valle=page.locator('[data-line]').filter({has:page.getByRole('heading',{name:'Valle Sagrado · ruta cultural',exact:true})});
  await sky.getByLabel('Fecha del tour · dd/mm/aaaa',{exact:true}).fill('');await page.locator('#wizard-next').click();await step(4);await page.getByRole('alert').filter({hasText:'fecha'}).waitFor();
  await sky.getByLabel('Fecha del tour · dd/mm/aaaa',{exact:true}).fill('2026-11-20');
  await sky.getByLabel('Hora',{exact:true}).fill('9');await sky.getByLabel('Minutos',{exact:true}).fill('15');await sky.getByLabel('AM/PM',{exact:true}).selectOption('AM');
  await sky.getByLabel('Pasajeros',{exact:true}).fill('2');await sky.getByRole('button',{name:'Personalizar descuento por pasajero'}).click();
  await sky.locator('.person-discount').nth(0).fill('10');await sky.locator('.person-discount').nth(1).fill('20');
  await valle.getByLabel('Fecha del tour · dd/mm/aaaa',{exact:true}).fill('2026-11-21');
  await valle.getByLabel('Hora',{exact:true}).fill('12');await valle.getByLabel('Minutos',{exact:true}).fill('45');await valle.getByLabel('AM/PM',{exact:true}).selectOption('PM');
  await valle.getByLabel('Pasajeros',{exact:true}).fill('3');await valle.getByLabel('Descuento por persona · PEN',{exact:true}).fill('200');await page.locator('#wizard-next').click();await step(4);await page.getByRole('alert').filter({hasText:'descuento'}).waitFor();
  await valle.getByLabel('Descuento por persona · PEN',{exact:true}).fill('5');
  for(const row of [sky,valle]){await row.getByLabel('Servicio para este tour',{exact:true}).selectOption('food');await row.getByRole('button',{name:'Agregar servicio'}).click();}
  assert.equal(await sky.locator('[data-service] [name="qty"]').inputValue(),'2');
  assert.equal(await valle.locator('[data-service] [name="qty"]').inputValue(),'3');
  await valle.locator('[data-service] [name="qty"]').fill('1');
  await sky.getByLabel('Servicio para este tour',{exact:true}).selectOption('food');await sky.getByRole('button',{name:'Agregar servicio'}).click();await page.getByRole('alert').filter({hasText:'Servicio ya agregado'}).waitFor();
  await sky.getByLabel('Servicio para este tour',{exact:true}).selectOption('gopro');await sky.getByRole('button',{name:'Agregar servicio'}).click();
  const gopro=sky.locator('[data-service]').filter({has:page.getByText('Alquiler de GoPro',{exact:true})});
  await gopro.getByLabel('Modalidad',{exact:true}).selectOption('POR RESERVA');assert.equal(await gopro.getByLabel('Cantidad',{exact:true}).inputValue(),'1');assert.equal(await gopro.getByLabel('Cantidad',{exact:true}).getAttribute('readonly'),'');
  await gopro.getByLabel('Modalidad',{exact:true}).selectOption('POR UNIDAD');await gopro.getByLabel('Cantidad',{exact:true}).fill('2');
  let draft=(await state()).quoteDraft;assert.equal(draft.lines.filter(l=>l.type!=='Tour').length,3);
  const skyd=draft.lines.find(l=>l.productId==='sky'),valled=draft.lines.find(l=>l.productId==='valle');
  assert.equal(skyd.time,'09:15');assert.equal(valled.time,'12:45');assert.deepEqual(skyd.discounts,['10','20']);
  assert.equal(draft.lines.find(l=>l.productId==='food'&&l.parentId===valled.id).qty,'1');
  await page.reload();await step(4);assert.equal(await sky.locator('.person-discount').nth(1).inputValue(),'20');
  await sizes('detalles');await next(5);
  await page.getByLabel('Vigencia de la cotización (días)',{exact:true}).fill('0');await page.locator('#wizard-next').click();await step(5);await page.getByRole('alert').filter({hasText:'vigencia'}).waitFor();
  await page.getByLabel('Vigencia de la cotización (días)',{exact:true}).fill('14');
  await page.getByLabel('Observaciones',{exact:true}).fill('Observación ficticia wizard.');await page.getByLabel('Condiciones',{exact:true}).fill('Condiciones ficticias wizard.');
  assert.match(await page.locator('#quote-total .grand-total').innerText(),/167\.11/);
  await sizes('resumen');await previous(4);await next(5);assert.equal(await page.getByLabel('Observaciones',{exact:true}).inputValue(),'Observación ficticia wizard.');await next(6);
  await sizes('revisión');assert.equal(await page.locator('#wizard-next').isDisabled(),true);
  const finalText=await page.locator('#quote-wizard').innerText();for(const text of ['Cliente Wizard DEMO','900000001','DEMO-WIZARD-001','USD','Inglés (EN)','3.8','20/11/2026','21/11/2026','09:15','12:45','167.11','14 días','Observación ficticia wizard.'])assert.ok(finalText.includes(text),text);
  assert.equal(await page.locator('#quote-wizard').getByRole('button',{name:/calendario|WhatsApp|PDF/i}).count(),0);
  await page.screenshot({path:join(artifacts,'skybike-wizard-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:join(artifacts,'skybike-wizard-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Guardar cotización demo',exact:true}).click();await page.waitForFunction(()=>location.hash==='#cotizacion-generada');
  await page.locator('#quote-success').getByRole('heading',{name:'COTIZACIÓN GENERADA',exact:true}).waitFor();
  assert.equal(await page.locator('#wizard-step,.wizard-progress').count(),0);
  const after=await state(),quote=after.quotes.at(-1);
  assert.equal(after.quotes.length,before.quotes.length+1);assert.equal(quote.client.name,'Cliente Wizard DEMO');assert.equal(quote.currency,'USD');assert.equal(quote.exchangeRate,3.8);assert.equal(quote.language,'en');assert.equal(quote.totals.total,63500);assert.equal(quote.status,'Pendiente');assert.equal(quote.validity,14);
  for(const key of ['reservations','receipts','payments','passengers'])assert.deepEqual(after[key],before[key],key);
  assert.deepEqual(after.draft,legacyDraft);assert.equal(await page.evaluate(()=>localStorage.getItem('nexo-demo-v1')),'DEMO WIZARD NO MODIFICAR');
  assert.equal((await state()).quoteDraft.lines.length,0);
  assert.deepEqual(errors,[]);
  console.log('PASS wizard: seis pasos, validaciones, WhatsApp revisado, PEN/USD sin mutación, ES/EN, tours/servicios separados, descuentos, duplicados, reload y siete tamaños; guardar no crea reservas ni pagos.');
 }catch(error){failure=error;try{if(page&&!page.isClosed())await page.screenshot({path:join(artifacts,'skybike-wizard-failure.png'),fullPage:true});}catch{}throw error;}
 finally{
  let cleanupError;
  try{await browser?.close();}catch(error){cleanupError=error;}
  try{rmSync(artifacts,{recursive:true,force:true});}catch(error){cleanupError||=error;}
  if(!failure&&cleanupError)throw cleanupError;
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
