const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mkdtempSync,chmodSync,rmSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
(async()=>{
const artifacts=mkdtempSync(join(tmpdir(),'skybike-navigation-'));
let browser,page,failure;
try{
 chmodSync(artifacts,0o700);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const base=process.env.DEMO_URL||'http://127.0.0.1:8004/';
 async function statistics(expected){
  await page.locator('.dashboard-kpi').first().waitFor();
  assert.equal(await page.locator('.dashboard-kpi').count(),4,'El panel muestra cuatro indicadores reales');
  for(const [key,value] of Object.entries(expected)){
   const card=page.locator(`.dashboard-kpi[data-kpi="${key}"]`);assert.equal(await card.count(),1);
   assert.equal(await card.getAttribute('data-value'),String(value),`${key} refleja los registros locales`);
   const text=await card.locator('.dashboard-kpi-value').innerText();
   if(['income','pending-balance'].includes(key))assert.match(text,new RegExp(`${Math.floor(value/100)}[.,]${String(value%100).padStart(2,'0')}`),`${key} presenta soles y céntimos`);
   else assert.equal(text,String(value));
  }
 }
 async function unobstructed(control,label){
  await control.scrollIntoViewIfNeeded();
  assert.ok(await control.evaluate(el=>{
   const box=el.getBoundingClientRect(),target=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
   return box.height>=44&&box.top>=0&&box.bottom<=innerHeight&&box.left>=0&&box.right<=innerWidth&&!!target&&(target===el||el.contains(target));
  }),`${label}: control visible, sin oclusión y con altura táctil suficiente`);
 }
 for(const width of [280,320,375,390,430,768,1440]){
 await page.setViewportSize({width,height:844});await page.goto(base);await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();assert.equal(await page.locator('.module-card').count(),9);assert.equal(await page.locator('#app form').count(),0);assert.equal(await page.locator('#app .table-scroll').count(),0);
 const grid=await page.locator('.main-menu-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(grid,width<320?1:width<=700?2:width<1280?3:4);
 for(const card of await page.locator('.module-card').all()){const box=await card.boundingBox();assert.ok(box.width>=130&&box.height>=110);}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.home-welcome img').evaluate(i=>i.complete&&i.naturalWidth>0));
 await statistics({income:10000,'active-reservations':1,quotes:1,'pending-balance':12000});
 if(width===390){await page.screenshot({path:join(artifacts,'skybike-menu-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight));}
 if(width===1440)await page.screenshot({path:join(artifacts,'skybike-menu-desktop.png'),fullPage:true});
 const before=await page.evaluate(()=>localStorage.getItem('skybike-cusco-demo-v1'));
 for(const route of ['documentos','cotizador','reservas','pagos','tours','servicios','pasajeros','administracion','reportes']){
 await page.locator(`.module-card[href="#${route}"]`).click();await page.waitForFunction(route=>location.hash==='#'+route,route);await page.getByRole('link',{name:'Volver al inicio'}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${route}`);
 if(route==='cotizador'){
  assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'asistente');
  assert.equal(await page.locator('#app .page-heading,#app .module-shortcuts').count(),0,'El menú abre directamente el asistente');
  assert.equal(await page.locator('.wizard-toolbar,#wizard-prev,#wizard-next').count(),3,'Una sola barra y un botón de cada dirección');
 }
 if(route==='administracion'){await page.getByText('Administración aún no está habilitada',{exact:true}).waitFor();assert.equal(await page.locator('#app input,#app form').count(),0);}
 await page.getByRole('link',{name:'Volver al inicio'}).click();await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();assert.ok(await page.evaluate(()=>scrollY<10));
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('skybike-cusco-demo-v1')),before,'Navegar no debe modificar los datos');
 }
 // Todos los enlaces de escritorio deben ser alcanzables incluso con poca altura.
 for(const [width,height] of [[1440,540],[1920,900]]){
  await page.setViewportSize({width,height});await page.goto(base+'#panel');
  assert.equal(await page.locator('.main-menu-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
  const before=await page.evaluate(()=>localStorage.getItem('skybike-cusco-demo-v1'));
  for(const link of await page.locator('#sidebar-navigation a').all()){
   const hash=await link.getAttribute('href');await unobstructed(link,`menú lateral ${width}×${height} ${hash}`);await link.click();
   await page.waitForFunction(hash=>location.hash===hash,hash);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sin desborde en ${hash}`);
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('skybike-cusco-demo-v1')),before,'El menú lateral no modifica los datos');
 }
 await page.goto(base+'#panel');
 // El panel se actualiza con operaciones ficticias; cancelar no simula devolver dinero.
 await page.locator('.module-card[href="#pagos"]').click();
 await page.locator('tr').filter({hasText:'RES-DEMO-001'}).getByRole('button',{name:'Registrar pago',exact:true}).click();
 await page.getByLabel('Monto en soles').fill('20');await page.getByLabel('Medio de pago').selectOption('Transferencia');await page.getByLabel('Referencia ficticia').fill('DEMO-PANEL-020');
 await page.locator('dialog').getByRole('button',{name:'Guardar',exact:true}).click();await page.getByRole('link',{name:'Volver al inicio'}).click();
 await statistics({income:12000,'active-reservations':1,quotes:1,'pending-balance':10000});
 await page.locator('.module-card[href="#reservas"]').click();await page.locator('tr').filter({hasText:'RES-DEMO-001'}).getByRole('button',{name:'Estado',exact:true}).click();
 await page.getByLabel('Estado',{exact:true}).selectOption('CANCELADA');await page.locator('dialog').getByRole('button',{name:'Guardar',exact:true}).click();await page.getByRole('link',{name:'Volver al inicio'}).click();
 await statistics({income:12000,'active-reservations':0,quotes:1,'pending-balance':0});
 await page.evaluate(async()=>{
  const key='skybike-cusco-demo-v1',state=JSON.parse(localStorage.getItem(key));
  const {createQuote}=await import('./js/skybike/domain.js');
  createQuote(state,{clientId:'client2',currency:'PEN',exchangeRate:1,validity:7,notes:'Cotización ficticia para probar el panel.',lines:[{...structuredClone(state.quotes[0].lines[0]),id:crypto.randomUUID(),date:'2026-12-28'}]});
  localStorage.setItem(key,JSON.stringify(state));
 });
 await page.reload();await statistics({income:12000,'active-reservations':0,quotes:2,'pending-balance':0});
 await page.setViewportSize({width:390,height:844});await page.goto(base);const toggle=page.getByRole('button',{name:'Menú',exact:false});await unobstructed(toggle,'Botón de menú móvil');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');const historyLink=page.locator('#sidebar-navigation a[href="#historial"]');await unobstructed(historyLink,'Último enlace del menú móvil');await historyLink.click();await page.waitForFunction(()=>document.querySelector('#navigation-toggle').getAttribute('aria-expanded')==='false');assert.equal(await toggle.getAttribute('aria-expanded'),'false');await page.getByRole('link',{name:'Volver al inicio'}).click();
 await page.locator('.module-card[href="#reportes"]').click();await page.getByRole('link',{name:'Resumen de la agencia'}).click();await page.getByRole('heading',{name:'Tu próxima aventura empieza aquí',exact:true}).waitFor();await page.getByRole('link',{name:'Volver al inicio'}).click();
 await page.locator('.module-card[href="#cotizador"]').click();await page.getByRole('link',{name:'Volver al inicio'}).click();await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();await toggle.click();await page.locator('#sidebar-navigation a[href="#cotizaciones"]').click();await page.waitForFunction(()=>document.querySelector('#app')?.dataset.route==='cotizaciones');await page.getByRole('heading',{name:'Cotizaciones',exact:true}).waitFor();assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'inicio');await page.getByRole('link',{name:'Volver al inicio'}).click();
 // El catálogo sigue siendo la pantalla de entrada; revisar abre solo el asistente.
 await toggle.click();await page.locator('#sidebar-navigation a[href="#catalogo"]').click();await page.getByRole('heading',{name:'Descubre nuestros tours',exact:true}).waitFor();assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'inicio');
 await page.locator('#cards [data-action="add"][data-id="sky"]').last().click();await page.getByRole('button',{name:'Revisar cotización'}).click();await page.locator('#wizard-form').waitFor();
 assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'asistente');assert.equal(await page.locator('#app .page-heading,#app .module-shortcuts').count(),0);
 await page.reload();await page.locator('#wizard-form').waitFor();assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'asistente');assert.equal(await page.locator('.wizard-toolbar').count(),1);assert.equal(await page.locator('#app .page-heading,#app .module-shortcuts').count(),0);await page.getByRole('link',{name:'Volver al inicio'}).click();
 await page.waitForFunction(()=>document.activeElement===document.querySelector('.home-welcome h1'));await page.keyboard.press('Tab');assert.ok(await page.locator('.module-card[href="#documentos"]').evaluate(el=>el===document.activeElement));assert.deepEqual(errors,[]);console.log('PASS navegación: 9 tarjetas, 4 indicadores reales con pago/cancelación/cotización, 7 tamaños y 1920px, menú lateral accesible en escritorio bajo/móvil, asistente compacto, teclado y navegación sin mutar datos.');
}catch(error){failure=error;try{if(page&&!page.isClosed())await page.screenshot({path:join(artifacts,'skybike-navigation-failure.png'),fullPage:true});}catch{}throw error;}
finally{
 let cleanupError;
 try{await browser?.close();}catch(error){cleanupError=error;}
 try{rmSync(artifacts,{recursive:true,force:true});}catch(error){cleanupError||=error;}
 if(!failure&&cleanupError)throw cleanupError;
}
})().catch(e=>{console.error(e);process.exitCode=1;});
