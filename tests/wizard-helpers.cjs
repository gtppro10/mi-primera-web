const assert=require('node:assert/strict');

async function wizardStep(page){
 await page.locator('#quote-wizard').waitFor();
 const text=await page.locator('#wizard-step').innerText();
 const match=text.match(/Paso\s+(\d+)\s+de\s+6/i);
 assert.ok(match,`El asistente debe indicar el paso actual: ${text}`);
 return Number(match[1]);
}

async function goToWizardStep(page,target){
 let current=await wizardStep(page);
 for(let attempts=0;current!==target&&attempts<6;attempts++){
  const next=current<target?current+1:current-1;
  await page.locator('#quote-wizard').getByRole('button',{name:current<target?'Siguiente':'Anterior',exact:true}).click();
  await page.locator('#wizard-step').filter({hasText:new RegExp(`Paso\\s+${next}\\s+de\\s+6`,'i')}).waitFor();
  current=await wizardStep(page);
 }
 assert.equal(current,target,'El asistente debe permitir navegar sin perder los datos');
}

async function chooseWizardClient(page,label='Lucía Demo'){
 await goToWizardStep(page,1);
 await page.locator('#quote-wizard [name="clientId"]').selectOption({label});
 // Número ficticio: estas pruebas nunca abren WhatsApp ni contactan clientes.
 await page.locator('#quote-wizard [name="customerPhone"]').fill('900000000');
}

async function saveWizardToList(page){
 await page.getByRole('button',{name:'Guardar cotización demo',exact:true}).click();
 await page.waitForFunction(()=>location.hash==='#cotizacion-generada');
 await page.locator('#quote-success').getByRole('heading',{name:'COTIZACIÓN GENERADA',exact:true}).waitFor();
 assert.equal(await page.locator('#wizard-step, .wizard-progress').count(),0,'La confirmación es una pantalla independiente del asistente');
 await page.goto(page.url().replace(/#.*$/,'')+'#cotizaciones');
 await page.getByRole('heading',{name:'Cotizaciones',exact:true}).waitFor();
}

module.exports={wizardStep,goToWizardStep,chooseWizardClient,saveWizardToList};
