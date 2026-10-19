const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.DEMO_URL||'http://127.0.0.1:8000/';
 try{
 await page.goto(base);await page.locator('h1').waitFor();
 await page.evaluate(async()=>{const state=JSON.parse(localStorage.getItem('skybike-cusco-demo-v1'));const blob=await(await fetch('./images/skybike/machu.jpg')).blob();const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});state.products.find(p=>p.id==='sky').flyers=[{id:'flyer-demo',data,language:'es',name:'Flyer ficticio'}];localStorage.setItem('skybike-cusco-demo-v1',JSON.stringify(state));});
 await page.reload();await page.getByRole('link',{name:'Catálogo de tours'}).click();
 for(const id of ['sky','valle'])await page.locator(`[data-action="add"][data-id="${id}"]`).last().click();
 await page.getByRole('button',{name:'Revisar cotización'}).click();
 const second=page.locator('.quote-line').filter({hasText:'Valle Sagrado'});await second.getByRole('button',{name:'Agregar servicio'}).click();
 await page.locator('summary').filter({hasText:'Pegado rápido'}).click();
 await page.locator('#whatsapp').fill('Nombre: Cliente Prueba CDE\nDocumento: DEMO-CDE\nWhatsApp: +51 DEMO\nFecha: 20/11/2026\nHora: 10:30\nPasajeros: 2');
 await page.getByRole('button',{name:'Revisar datos pegados'}).click();assert.ok((await page.locator('#paste-preview').innerText()).includes('Cliente Prueba CDE'));
 await page.getByRole('button',{name:'Aplicar datos revisados'}).click();
 await page.locator('[name="conditions"]').fill('Condiciones ficticias de prueba CDE.');
 await page.locator('[name="notes"]').fill('Observaciones ficticias CDE.');
 assert.equal(await page.locator('[name="customerName"]').inputValue(),'Cliente Prueba CDE');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('skybike-cusco-demo-v1')));
 assert.equal(stored.draft.lines[2].parentId,stored.draft.lines[1].id);
 await page.getByRole('button',{name:'Guardar cotización demo',exact:true}).click();
 await page.locator('tr').filter({hasText:'COT-DEMO-002'}).getByRole('button',{name:'Ver',exact:true}).click();
 assert.equal(await page.locator('.flyer-page').count(),0);
 await page.locator('#include-flyers').check();assert.equal(await page.locator('.flyer-page').count(),1);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('#document-output img')].map(i=>i.decode())));
 await page.emulateMedia({media:'print'});
 await page.pdf({path:'/tmp/skybike-quote-flyers.pdf',preferCSSPageSize:true,printBackground:true});
 const info=execFileSync('pdfinfo',['/tmp/skybike-quote-flyers.pdf'],{encoding:'utf8'});assert.match(info,/Pages:\s+2\b/);const dimensions=info.match(/Page size:\s+([\d.]+) x ([\d.]+) pts \(A4\)/);assert.ok(dimensions);assert.ok(Math.abs(+dimensions[1]-595.28)<1&&Math.abs(+dimensions[2]-841.89)<1);
 const text=execFileSync('pdftotext',['-layout','/tmp/skybike-quote-flyers.pdf','-'],{encoding:'utf8'});assert.ok(text.includes('Cliente Prueba CDE'));assert.ok(text.includes('Condiciones ficticias'));assert.equal(text.split('\f')[1].includes('ANEXO DE COTIZACIÓN'),true);
 await page.emulateMedia({media:'screen'});await page.locator('#include-flyers').uncheck();await page.emulateMedia({media:'print'});await page.pdf({path:'/tmp/skybike-quote-no-flyers.pdf',preferCSSPageSize:true});assert.match(execFileSync('pdfinfo',['/tmp/skybike-quote-no-flyers.pdf'],{encoding:'utf8'}),/Pages:\s+1\b/);
 await page.emulateMedia({media:'screen'});await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('link',{name:'Comprobantes internos'}).click();await page.getByRole('button',{name:'Nuevo comprobante'}).click();await page.locator('[data-action="add"][data-id="sky"]').last().click();await page.getByRole('button',{name:'Revisar cotización'}).click();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#editor').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:'/tmp/skybike-editor-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.getByLabel('Adelanto (S/)',{exact:true}).fill('121');await page.getByRole('button',{name:'Guardar comprobante demo'}).click();await page.getByRole('alert').filter({hasText:'adelanto no puede'}).waitFor();
 await page.getByLabel('Adelanto (S/)',{exact:true}).fill('30');await page.getByLabel('Referencia del pago').fill('REF-FICTICIA-CDE');await page.getByRole('button',{name:'Guardar comprobante demo'}).click();
 await page.locator('tr').filter({hasText:'REC-DEMO-002'}).getByRole('button',{name:'Abrir recibo'}).click();assert.equal(await page.locator('#include-flyers').count(),0);assert.equal(await page.locator('.flyer-page').count(),0);await page.getByText('REF-FICTICIA-CDE',{exact:false}).waitFor();
 await page.emulateMedia({media:'print'});await page.pdf({path:'/tmp/skybike-receipt.pdf',preferCSSPageSize:true,printBackground:true});
 const receipt=execFileSync('pdftotext',['-layout','/tmp/skybike-receipt.pdf','-'],{encoding:'utf8'});for(const value of ['COMPROBANTE DE PAGO','SALDO','90.00','30.00','SIN VALIDEZ TRIBUTARIA'])assert.ok(receipt.includes(value),value);
 await page.emulateMedia({media:'screen'});await page.screenshot({path:'/tmp/skybike-comprobante-cde.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/skybike-comprobante-mobile.png',fullPage:true});
 // Resumen largo real: cada bloque final debe sobrevivir al PDF y las filas no exceder A4.
 await page.evaluate(async()=>{const {documentHTML}=await import('./js/skybike/documents.js');const s=JSON.parse(localStorage.getItem('skybike-cusco-demo-v1'));const doc=structuredClone(s.quotes[1]);doc.lines=Array.from({length:8},(_,i)=>({...doc.lines[0],id:`long-${i}`,description:`TOUR LARGO ${i}`,includes:('Incluido de demostración. ').repeat(50)+`FIN-INCLUYE-${i}`,excludes:('No incluido. ').repeat(60)+`FIN-EXCLUYE-${i}`}));document.querySelector('#document-output').innerHTML=documentHTML(doc);});
 await page.emulateMedia({media:'print'});assert.ok(await page.locator('.paper-table tr').evaluateAll(rows=>rows.every(row=>row.getBoundingClientRect().height<900)));await page.pdf({path:'/tmp/skybike-long-a4.pdf',preferCSSPageSize:true});const long=execFileSync('pdftotext',['-layout','/tmp/skybike-long-a4.pdf','-'],{encoding:'utf8'});for(let i=0;i<8;i++){assert.ok(long.includes(`FIN-INCLUYE-${i}`));assert.ok(long.includes(`FIN-EXCLUYE-${i}`));}assert.ok((long.match(/DETALLE DE LOS SERVICIOS/g)||[]).length===1);assert.ok((long.match(/PRECIO/g)||[]).length>1);
 assert.deepEqual(errors,[]);console.log('PASS C/D/E: WhatsApp revisado, servicios por tour, adelanto/saldo, PDFs A4 con/sin flyers, aislamiento de comprobantes, resumen largo y móvil.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
