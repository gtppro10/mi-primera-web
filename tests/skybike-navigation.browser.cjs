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
 for(const width of [280,320,375,390,430,768,1440]){
 await page.setViewportSize({width,height:844});await page.goto(base);await page.getByRole('heading',{name:'Menú principal',exact:true}).waitFor();assert.equal(await page.locator('.module-card').count(),9);assert.equal(await page.locator('#app form').count(),0);assert.equal(await page.locator('#app .table-scroll').count(),0);
 const grid=await page.locator('.main-menu-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(grid,width<320?1:width<=700?2:3);
 for(const card of await page.locator('.module-card').all()){const box=await card.boundingBox();assert.ok(box.width>=130&&box.height>=110);}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.home-welcome img').evaluate(i=>i.complete&&i.naturalWidth>0));
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
 await page.setViewportSize({width:390,height:844});await page.goto(base);const toggle=page.getByRole('button',{name:'Menú',exact:false});await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.locator('#sidebar-navigation a[href="#historial"]').click();await page.waitForFunction(()=>document.querySelector('#navigation-toggle').getAttribute('aria-expanded')==='false');assert.equal(await toggle.getAttribute('aria-expanded'),'false');await page.getByRole('link',{name:'Volver al inicio'}).click();
 await page.locator('.module-card[href="#reportes"]').click();await page.getByRole('link',{name:'Resumen de la agencia'}).click();await page.getByRole('heading',{name:'Tu próxima aventura empieza aquí',exact:true}).waitFor();await page.getByRole('link',{name:'Volver al inicio'}).click();
 await page.locator('.module-card[href="#cotizador"]').click();await page.getByRole('link',{name:'Volver al inicio'}).click();await toggle.click();await page.locator('#sidebar-navigation a[href="#cotizaciones"]').click();await page.getByRole('heading',{name:'Cotizaciones',exact:true}).waitFor();assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'inicio');await page.getByRole('link',{name:'Volver al inicio'}).click();
 // El catálogo sigue siendo la pantalla de entrada; revisar abre solo el asistente.
 await toggle.click();await page.locator('#sidebar-navigation a[href="#catalogo"]').click();await page.getByRole('heading',{name:'Descubre nuestros tours',exact:true}).waitFor();assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'inicio');
 await page.locator('#cards [data-action="add"][data-id="sky"]').last().click();await page.getByRole('button',{name:'Revisar cotización'}).click();await page.locator('#wizard-form').waitFor();
 assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'asistente');assert.equal(await page.locator('#app .page-heading,#app .module-shortcuts').count(),0);
 await page.reload();await page.locator('#wizard-form').waitFor();assert.equal(await page.locator('#app').getAttribute('data-quote-view'),'asistente');assert.equal(await page.locator('.wizard-toolbar').count(),1);assert.equal(await page.locator('#app .page-heading,#app .module-shortcuts').count(),0);await page.getByRole('link',{name:'Volver al inicio'}).click();
 await page.waitForFunction(()=>document.activeElement===document.querySelector('.home-welcome h1'));await page.keyboard.press('Tab');assert.ok(await page.locator('.module-card[href="#documentos"]').evaluate(el=>el===document.activeElement));assert.deepEqual(errors,[]);console.log('PASS navegación: 9 tarjetas, 7 tamaños, asistente directo desde menú/catálogo, recarga compacta, guardados desde menú global, regreso al inicio, teclado y datos intactos.');
}catch(error){failure=error;try{if(page&&!page.isClosed())await page.screenshot({path:join(artifacts,'skybike-navigation-failure.png'),fullPage:true});}catch{}throw error;}
finally{
 let cleanupError;
 try{await browser?.close();}catch(error){cleanupError=error;}
 try{rmSync(artifacts,{recursive:true,force:true});}catch(error){cleanupError||=error;}
 if(!failure&&cleanupError)throw cleanupError;
}
})().catch(e=>{console.error(e);process.exitCode=1;});
