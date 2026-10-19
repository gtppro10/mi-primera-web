const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {chmodSync, mkdtempSync, rmSync, writeFileSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');

const pdfInfo = path => execFileSync('pdfinfo', [path], {encoding: 'utf8'});
const pdfText = path => execFileSync('pdftotext', ['-layout', path, '-'], {encoding: 'utf8'});

(async () => {
  // Cada ejecución tiene su propio directorio privado, creado atómicamente.
  // Ningún PDF se escribe en una ruta compartida ni sigue un archivo previo.
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'skybike-quote-pdf-'));
  let browser;
  try {
    chmodSync(temporaryDirectory, 0o700);
    browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    const base = process.env.DEMO_URL || 'http://127.0.0.1:8000/';
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Página del mismo origen sin arrancar el resto de la aplicación: esta
    // suite prueba el archivo PDF real y sus recursos locales de forma aislada.
    await page.route('**/__pdf-test__.html', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>Prueba PDF Skybike</title>'}));
    await page.goto(new URL('__pdf-test__.html', base).href);
    const generate = async (mode, path) => {
      const result = await page.evaluate(async selected => {
        const {generateQuotePdf} = await import('./js/skybike/quote-pdf.js');
        const image = color => {
          const canvas = document.createElement('canvas');
          canvas.width = color === '#326620' ? 600 : 420;
          canvas.height = color === '#326620' ? 300 : 840;
          const context = canvas.getContext('2d');
          context.fillStyle = color;
          context.fillRect(0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/png');
        };
        const first = image('#326620'), second = image('#486ea5');
        const quote = {
          id: 'quote-pdf-fixture', number: 'COT-DEMO-PDF-001', date: '2026-10-19T03:00:00Z',
          client: {name: 'Cliente PDF Ficticio', phone: '900000000', countryCode: '+51', document: 'DEMO-PDF', email: 'cliente-pdf@example.com'},
          currency: 'PEN', exchangeRate: 1, language: 'es', validity: 7, status: 'Pendiente',
          conditions: 'Condiciones ficticias de cotización. FIN-CONDICIONES', notes: 'Observaciones de prueba. FIN-OBSERVACIONES',
          lines: [
            {id: 'tour-a', type: 'Tour', description: 'TOUR A - HORIZONTAL', qty: 2, price: 120, discounts: [10, 20], date: '2026-11-20', time: '09:30', descriptionSnapshot: 'Descripción guardada del primer tour.', includes: 'Equipo e instructor. FIN-INCLUYE-A', excludes: 'Transporte. FIN-EXCLUYE-A', durationSnapshot: '2 horas', flyers: [{id: 'flyer-a', data: first, language: 'es'}, {id: 'flyer-a-duplicado', data: first, language: 'es'}]},
            {id: 'extra-a', parentId: 'tour-a', type: 'Servicio', description: 'SERVICIO A - CÁMARA', qty: 1, price: 40, unitDiscount: 0, modality: 'POR UNIDAD', includes: 'Equipo de demostración.', excludes: 'Entrega física real.'},
            {id: 'tour-b', type: 'Tour', description: 'TOUR B - VERTICAL', qty: 1, price: 95, unitDiscount: 5, date: '2026-11-21', time: '10:45', descriptionSnapshot: 'Descripción guardada del segundo tour.', includes: 'Guía. FIN-INCLUYE-B', excludes: 'Entradas. FIN-EXCLUYE-B', flyers: [{id: 'flyer-b', data: second, language: 'es'}]}
          ]
        };
        if (selected === 'long') {
          quote.lines = Array.from({length: 7}, (_, index) => ({...quote.lines[0], id: `long-${index}`, description: `TOUR LARGO ${index}`, descriptionSnapshot: 'Descripción extensa de demostración. '.repeat(25) + `FIN-DESCRIPCION-${index}`, includes: 'Incluido de demostración. '.repeat(45) + `FIN-INCLUYE-${index}`, excludes: 'Excluido de demostración. '.repeat(45) + `FIN-EXCLUYE-${index}`}));
          quote.conditions = 'Condición de demostración. '.repeat(180) + 'FIN-CONDICIONES-LARGAS';
          quote.notes = 'Observación extensa. '.repeat(120) + 'FIN-OBSERVACIONES-LARGAS';
        }
        if (selected === 'usd') { quote.currency = 'USD'; quote.exchangeRate = 4; }
        if (selected === 'missing') {
          quote.lines[0].flyers = [{data: 'data:image/png;base64,bm8tYW4taW1hZ2U=', language: 'es'}];
          quote.lines[2].flyers = [{data: second, language: 'en'}];
        }
        if (selected === 'receipt') {
          quote.number = 'REC-DEMO-001';
          try { await generateQuotePdf(quote); return {rejected: false}; }
          catch (error) { return {rejected: true, message: error.message}; }
        }
        const before = JSON.stringify(quote);
        const result = await generateQuotePdf(quote, {flyers: !['without', 'long', 'usd'].includes(selected)});
        return {
          bytes: [...new Uint8Array(await result.blob.arrayBuffer())], mime: result.blob.type,
          fileMime: result.file.type, fileName: result.file.name, name: result.name,
          fileSize: result.file.size, blobSize: result.blob.size, missing: result.missingFlyers,
          unchanged: before === JSON.stringify(quote)
        };
      }, mode);
      if (mode === 'receipt') return result;
      const bytes = Buffer.from(result.bytes);
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      assert.equal(result.mime, 'application/pdf');
      assert.equal(result.fileMime, 'application/pdf');
      assert.equal(result.fileName, 'COT-DEMO-PDF-001.pdf');
      assert.equal(result.name, result.fileName);
      assert.equal(result.fileSize, result.blobSize);
      assert.ok(result.fileSize > 1000);
      assert.ok(result.unchanged, 'La generación no modifica los datos guardados.');
      writeFileSync(path, bytes, {flag: 'wx', mode: 0o600});
      const info = pdfInfo(path);
      assert.match(info, /Page size:\s+595\.\d+ x 841\.\d+ pts \(A4\)/);
      return {...result, text: pdfText(path), info};
    };

    const fullPath = join(temporaryDirectory, 'quote-flyers.pdf');
    const full = await generate('with', fullPath);
    assert.match(full.info, /Pages:\s+3\b/);
    assert.deepEqual(full.missing, []);
    const pages = full.text.split('\f').filter(part => part.trim());
    assert.equal(pages.length, 3, 'Resumen y exactamente dos flyers, sin página final vacía.');
    assert.ok(pages[0].includes('Cliente PDF Ficticio'));
    assert.ok(pages[0].includes('18/10/2026'), 'La emisión usa America/Lima, no la fecha UTC.');
    const unwrapped = full.text.replace(/\s+/g, ' ');
    for (const token of ['FIN-INCLUYE-A', 'FIN-EXCLUYE-A', 'FIN-INCLUYE-B', 'FIN-EXCLUYE-B', 'Descuentos individuales', 'Pasajero 1', 'Pasajero 2', 'FIN-CONDICIONES', 'FIN-OBSERVACIONES', '340.00']) assert.ok(unwrapped.includes(token), token);
    assert.ok(pages[1].includes('ANEXO DE COTIZACIÓN') && pages[1].includes('TOUR A - HORIZONTAL'));
    assert.ok(pages[2].includes('ANEXO DE COTIZACIÓN') && pages[2].includes('TOUR B - VERTICAL'));
    // Comprueba las dimensiones efectivas de cada imagen en el PDF: el ajuste
    // mantiene relaciones horizontal 2:1 y vertical 1:2 sin deformación.
    const imageList = execFileSync('pdfimages', ['-list', fullPath], {encoding: 'utf8'});
    for (const [pageNumber, ratio] of [[2, 2], [3, 0.5]]) {
      const fields = imageList.split('\n').find(line => new RegExp(`^\\s*${pageNumber}\\s+\\d+\\s+image\\s`).test(line))?.trim().split(/\s+/);
      assert.ok(fields, `Imagen del flyer en página ${pageNumber}.`);
      assert.equal(Number(fields[3]) / Number(fields[4]), ratio);
      assert.ok(Math.abs(Number(fields[12]) - Number(fields[13])) <= 1, 'Resolución X/Y equivalente: no hay estiramiento.');
    }
    const without = await generate('without', join(temporaryDirectory, 'quote-no-flyers.pdf'));
    assert.match(without.info, /Pages:\s+1\b/);
    assert.ok(!without.text.includes('ANEXO DE COTIZACIÓN'));
    assert.deepEqual(without.missing, []);
    const missing = await generate('missing', join(temporaryDirectory, 'quote-missing-flyers.pdf'));
    assert.deepEqual(missing.missing, ['TOUR A - HORIZONTAL', 'TOUR B - VERTICAL']);
    assert.match(missing.info, /Pages:\s+1\b/);
    const usd = await generate('usd', join(temporaryDirectory, 'quote-usd.pdf'));
    assert.ok(usd.text.includes('$85.00'), 'Los S/ 340 originales se convierten con el TC 4 guardado.');
    const long = await generate('long', join(temporaryDirectory, 'quote-long.pdf'));
    assert.ok(Number(long.info.match(/Pages:\s+(\d+)/)[1]) > 3);
    for (let index = 0; index < 7; index++) for (const prefix of ['FIN-DESCRIPCION', 'FIN-INCLUYE', 'FIN-EXCLUYE']) assert.ok(long.text.includes(`${prefix}-${index}`), `${prefix}-${index}`);
    assert.ok(long.text.includes('FIN-CONDICIONES-LARGAS'));
    assert.ok(long.text.includes('FIN-OBSERVACIONES-LARGAS'));
    assert.ok((long.text.match(/PRECIO/g) || []).length > 1, 'La cabecera de tabla se repite en páginas posteriores.');
    assert.ok(!long.text.includes('ANEXO DE COTIZACIÓN'));
    const rejected = await generate('receipt');
    assert.ok(rejected.rejected);
    assert.match(rejected.message, /únicamente cotizaciones/);
    assert.deepEqual(errors, []);
    console.log('PASS PDF binario: archivo real A4, datos guardados, PEN/USD, descuentos, flyers ordenados sin deformación ni duplicados, sin flyers, imágenes inválidas y textos extensos.');
  } finally {
    try { await browser?.close(); }
    finally { rmSync(temporaryDirectory, {recursive: true, force: true}); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
