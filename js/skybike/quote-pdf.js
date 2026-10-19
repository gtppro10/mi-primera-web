import {lineTotal, totalDocument} from './domain.js';
import {selectedFlyers} from './documents.js';
import {safeImage} from './media.js';
import {loadPdfEngine} from './pdf-engine.js';

const GREEN = [76, 112, 43];
const INK = [35, 43, 32];
const PALE = [241, 246, 236];
const MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - 19;
const DEFAULT_CONDITIONS = 'Condiciones de ejemplo: confirmar disponibilidad y horarios antes de reservar. No realizar pagos reales en esta demostración.';

// Las fuentes estándar de PDF incluyen los caracteres españoles. Estos signos
// equivalentes evitan glifos vacíos sin transformar ni traducir el contenido.
const text = value => String(value ?? '').replace(/\r\n?/g, '\n')
  .replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"').replace(/\u00a0/g, ' ')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const calendarDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  ? value.split('-').reverse().join('/') : text(value || 'Por confirmar');

function issueDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('es-PE', {timeZone: 'America/Lima'}) : 'No indicada';
}

// Solo se leen imágenes del propio sitio o archivos raster ya guardados en la
// cotización. Nunca se consulta un catálogo actual ni una URL de terceros.
async function imageForPdf(source) {
  if (!safeImage(source, '')) throw new Error('La imagen guardada no es válida.');
  if (source.startsWith('./images/')) {
    const target = new URL(source, document.baseURI);
    const directory = new URL('./images/', document.baseURI);
    if (target.origin !== location.origin || !target.pathname.startsWith(directory.pathname)) {
      throw new Error('La imagen debe pertenecer a este sitio.');
    }
  }
  const image = new Image();
  image.src = source;
  try { await image.decode(); }
  catch { throw new Error('No se pudo leer una imagen guardada.'); }
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('La imagen está vacía.');
  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite preparar las imágenes del PDF.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {data: canvas.toDataURL('image/jpeg', 0.94), width: image.naturalWidth, height: image.naturalHeight};
}

/** Genera un archivo PDF real desde la instantánea actual de una cotización. */
export async function generateQuotePdf(quote, {flyers = true} = {}) {
  if (!quote || !/^COT-/.test(quote.number || '') || quote.reservationId || !Array.isArray(quote.lines)) {
    throw new Error('Este generador admite únicamente cotizaciones guardadas.');
  }
  quote = structuredClone(quote);
  if (!quote.lines.some(line => line.type === 'Tour') || !quote.client?.name) {
    throw new Error('La cotización debe tener cliente y al menos un tour.');
  }
  if (quote.lines.some(line => line.type !== 'Tour' && !quote.lines.some(tour => tour.type === 'Tour' && tour.id === line.parentId))) {
    throw new Error('Cada servicio adicional debe estar asociado a un tour de la cotización.');
  }
  if (!['PEN', 'USD'].includes(quote.currency || 'PEN') ||
      (quote.currency === 'USD' && !(Number(quote.exchangeRate) > 0 && Number.isFinite(Number(quote.exchangeRate))))) {
    throw new Error('Revisa la moneda y el tipo de cambio de la cotización.');
  }
  const totals = totalDocument(quote.lines);
  const money = amount => new Intl.NumberFormat(quote.currency === 'USD' ? 'en-US' : 'es-PE', {
    style: 'currency', currency: quote.currency || 'PEN'
  }).format(amount / 100 / (quote.currency === 'USD' ? Number(quote.exchangeRate) : 1));
  const tours = quote.lines.filter(line => line.type === 'Tour');
  const jsPDF = await loadPdfEngine();
  const pdf = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4', compress: true});
  pdf.setProperties({title: `Cotización ${quote.number}`, subject: 'Cotización de demostración sin validez tributaria', author: 'SKYBIKE CUSCO', creator: 'AGENCIA SKYBIKE CUSCO'});
  const logo = await imageForPdf('./images/skybike/logo-agencia.jpg');

  function font(size = 9, bold = false, color = INK) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  }
  function compactHeader() {
    font(10, true, GREEN);
    pdf.text('SKYBIKE CUSCO', MARGIN, 14);
    font(8);
    pdf.text(text(`COTIZACIÓN ${quote.number}`), PAGE_WIDTH - MARGIN, 14, {align: 'right'});
    pdf.setDrawColor(...GREEN);
    pdf.line(MARGIN, 18, PAGE_WIDTH - MARGIN, 18);
  }
  function addSummaryPage() {
    pdf.addPage();
    compactHeader();
    return 25;
  }
  function ensure(y, height) { return y + height > BOTTOM ? addSummaryPage() : y; }
  function block(title, value, initialY) {
    let y = ensure(initialY, 17);
    font(9, true, GREEN);
    pdf.text(text(title), MARGIN, y + 4);
    y += 9;
    font(8.5);
    const lines = pdf.splitTextToSize(text(value || 'No indicadas.'), WIDTH - 4);
    for (const line of lines) {
      if (y + 4.3 > BOTTOM) {
        y = addSummaryPage();
        font(9, true, GREEN);
        pdf.text(text(`${title} (continuación)`), MARGIN, y + 4);
        y += 9;
        font(8.5);
      }
      pdf.text(line, MARGIN + 2, y);
      y += 4.3;
    }
    return y + 4;
  }

  // Encabezado y dos recuadros conservan la organización del modelo original.
  pdf.setFillColor(...GREEN);
  pdf.rect(MARGIN, 9, WIDTH, 1.2, 'F');
  const logoScale = Math.min(25 / logo.width, 21 / logo.height);
  pdf.addImage(logo.data, 'JPEG', MARGIN, 16, logo.width * logoScale, logo.height * logoScale);
  font(15, true, GREEN);
  pdf.text('SKYBIKE CUSCO', 43, 22);
  font(7.5, true);
  pdf.text('AGENCIA · DEMOSTRACIÓN', 43, 28);
  font(7);
  pdf.text('Dirección de ejemplo · Cusco, Perú', 43, 33);
  pdf.setDrawColor(...GREEN);
  pdf.roundedRect(137, 14, 59, 28, 2, 2);
  font(11, true, GREEN);
  pdf.text('COTIZACIÓN', 166.5, 21, {align: 'center'});
  font(8);
  pdf.text('RUC: DEMO · No fiscal', 166.5, 27, {align: 'center'});
  font(9, true, GREEN);
  pdf.text(text(quote.number), 166.5, 33, {align: 'center'});
  font(7);
  pdf.text(text(quote.status || 'Pendiente'), 166.5, 38, {align: 'center'});
  font(7, true, GREEN);
  pdf.text('DEMOSTRACIÓN · SIN VALIDEZ TRIBUTARIA · Datos ficticios', MARGIN, 48);

  const phone = quote.client.countryCode && quote.client.phone && !String(quote.client.phone).startsWith('+')
    ? `${quote.client.countryCode} ${quote.client.phone}` : quote.client.phone;
  const cards = [
    {title: 'CLIENTE', x: MARGIN, rows: [
      ['Nombre', quote.client.name], ['WhatsApp', phone],
      ['DNI / Pasaporte', quote.client.document], ['Correo', quote.client.email]
    ]},
    {title: 'DOCUMENTO', x: 107, rows: [
      ['Emisión', issueDate(quote.date)], ['Cantidad de tours', tours.length],
      ['Moneda', `${quote.currency || 'PEN'}${quote.currency === 'USD' ? ` · TC ${quote.exchangeRate} PEN/USD` : ''}`],
      ['Vigencia', `${quote.validity || 7} días`]
    ]}
  ];
  font(7.5);
  const boxWidth = 89;
  const boxes = cards.map(card => ({...card, lines: card.rows.flatMap(([label, value]) =>
    pdf.splitTextToSize(text(`${label}: ${value || 'No indicado'}`), boxWidth - 8))}));
  const boxHeight = Math.max(...boxes.map(box => box.lines.length * 4 + 13));
  for (const box of boxes) {
    pdf.setDrawColor(200, 217, 185);
    pdf.roundedRect(box.x, 53, boxWidth, boxHeight, 2, 2);
    font(8, true, GREEN);
    pdf.text(box.title, box.x + 4, 59);
    font(7.5);
    pdf.text(box.lines, box.x + 4, 65, {lineHeightFactor: 1.5});
  }
  let y = 53 + boxHeight + 8;
  font(9, true, GREEN);
  pdf.text('DETALLE DE LOS SERVICIOS', MARGIN, y);
  y += 4;

  const columnWidths = [9, 47, 40, 40, 23, 23];
  font(7.5);
  const rows = [];
  function appendRows(line, extra = false) {
    const amounts = lineTotal(line, quote.lines);
    const duration = line.durationSnapshot || line.duration ||
      (line.durationCalendarMinutes ? `${line.durationCalendarMinutes} minutos` : '');
    const description = [
      extra ? 'SERVICIO ADICIONAL' : '', line.description,
      line.type === 'Tour' ? `Fecha: ${calendarDate(line.date)} · Hora: ${line.time || 'Por confirmar'}` : `Modalidad: ${line.modality || 'POR UNIDAD'}`,
      duration ? `Duración: ${duration}` : '', line.descriptionSnapshot,
      line.itinerarySnapshot ? `Itinerario: ${line.itinerarySnapshot}` : '',
      line.discounts ? `Descuentos individuales: ${line.discounts.map((v, i) => `Pasajero ${i + 1}: ${money(Math.round(Number(v) * 100))}`).join(' · ')}`
        : Number(line.unitDiscount || 0) ? `Descuento por pasajero: ${money(Math.round(Number(line.unitDiscount) * 100))}` : ''
    ].filter(Boolean).join('\n');
    // Filas de continuación acotadas: ninguna fila depende de que un texto
    // enorme quepa en una sola página. autoTable repite la cabecera al paginar.
    const cells = [description, line.includes || '—', line.excludes || '—']
      .map((value, index) => pdf.splitTextToSize(text(value), columnWidths[index + 1] - 4));
    const count = Math.max(...cells.map(lines => Math.ceil(lines.length / 16)));
    for (let part = 0; part < count; part++) {
      rows.push([
        part ? '' : String(amounts.qty),
        ...cells.map(lines => lines.slice(part * 16, (part + 1) * 16).join('\n')),
        part ? '' : money(Math.round(Number(line.price) * 100)),
        part ? '' : money(amounts.total)
      ].map((content, index) => ({content, styles: {
        ...(extra ? {fillColor: PALE} : {}),
        ...(index === 0 || index >= 4 ? {halign: index >= 4 ? 'right' : 'center'} : {})
      }})));
    }
  }
  for (const tour of tours) {
    appendRows(tour);
    for (const service of quote.lines.filter(line => line.type !== 'Tour' && line.parentId === tour.id)) appendRows(service, true);
  }
  pdf.autoTable({
    startY: y,
    head: [['CANT. PAX', 'DESCRIPCIÓN', 'INCLUYE', 'NO INCLUYE', 'PRECIO UNITARIO', 'TOTAL']],
    body: rows, theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
    margin: {top: 25, bottom: 19, left: MARGIN, right: MARGIN},
    styles: {font: 'helvetica', fontSize: 7.5, cellPadding: 2, textColor: INK, lineColor: [200, 217, 185], lineWidth: 0.15, overflow: 'linebreak', valign: 'top'},
    headStyles: {fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7},
    columnStyles: Object.fromEntries(columnWidths.map((cellWidth, index) => [index, {cellWidth}])),
    didDrawPage: data => {
      if (data.pageNumber > 1) compactHeader();
    }
  });
  y = pdf.lastAutoTable.finalY + 6;
  y = ensure(y, 40);
  const tourGross = tours.reduce((sum, line) => sum + lineTotal(line, quote.lines).gross, 0);
  const totalRows = [['Subtotal de tours', tourGross], ['Servicios adicionales', totals.gross - tourGross], ['Descuento', -totals.discount], ['TOTAL', totals.total]];
  font(8, true, GREEN);
  pdf.text('RESERVAS Y ATENCIÓN AL CLIENTE', MARGIN, y + 4);
  font(7.5);
  pdf.text(['WhatsApp: contacto de demostración', 'Correo: reservas@example.com', 'Oficina: dirección de ejemplo, Cusco, Perú'], MARGIN, y + 10, {lineHeightFactor: 1.6});
  for (let index = 0; index < totalRows.length; index++) {
    const [label, amount] = totalRows[index];
    const rowY = y + index * 7;
    pdf.setFillColor(...(index === totalRows.length - 1 ? PALE : [255, 255, 255]));
    pdf.rect(110, rowY, 86, 7, 'F');
    font(8.5, index === totalRows.length - 1);
    pdf.text(label, 112, rowY + 4.6);
    pdf.text(text(money(amount)), 194, rowY + 4.6, {align: 'right'});
  }
  y += 35;
  y = block('CONDICIONES DE LA COTIZACIÓN', quote.conditions || DEFAULT_CONDITIONS, y);
  if (quote.notes) y = block('OBSERVACIONES', quote.notes, y);

  const decodedFlyers = [];
  const loadedImages = new Set();
  if (flyers) {
    for (const flyer of selectedFlyers(quote)) {
      try {
        const image = await imageForPdf(flyer.data);
        decodedFlyers.push({...flyer, image});
        loadedImages.add(flyer.data);
      } catch { /* La interfaz recibe el nombre del tour sin flyer legible. */ }
    }
  }
  const missingFlyers = flyers ? [...new Set(tours.filter(tour =>
    !(tour.flyers || []).some(flyer => flyer.language === (quote.language || 'es') && loadedImages.has(flyer.data))
  ).map(tour => tour.description))] : [];
  for (const flyer of decodedFlyers) {
    pdf.addPage();
    font(10, true, GREEN);
    pdf.text('SKYBIKE CUSCO · ANEXO DE COTIZACIÓN', MARGIN, 16);
    font(11, true);
    const title = pdf.splitTextToSize(text(flyer.tour), WIDTH);
    pdf.text(title, MARGIN, 24);
    const imageY = 27 + title.length * 4.6;
    const availableHeight = BOTTOM - imageY - 3;
    const scale = Math.min(WIDTH / flyer.image.width, availableHeight / flyer.image.height);
    const width = flyer.image.width * scale, height = flyer.image.height * scale;
    pdf.addImage(flyer.image.data, 'JPEG', MARGIN + (WIDTH - width) / 2, imageY + (availableHeight - height) / 2, width, height);
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setDrawColor(200, 217, 185);
    pdf.line(MARGIN, 281, PAGE_WIDTH - MARGIN, 281);
    font(7, false, GREEN);
    pdf.text(text(`${quote.number} · DEMOSTRACIÓN`), MARGIN, 286);
    pdf.text(`Página ${page} de ${pdf.getNumberOfPages()}`, PAGE_WIDTH - MARGIN, 286, {align: 'right'});
  }
  const blob = pdf.output('blob');
  const name = `${quote.number.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
  const file = new File([blob], name, {type: 'application/pdf'});
  return {blob, file, name, missingFlyers};
}
