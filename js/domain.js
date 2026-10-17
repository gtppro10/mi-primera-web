// Reglas independientes de la pantalla y del almacenamiento.
export function lineAmounts(line) {
  const qty = Number(line.qty), price = Number(line.price), discount = Number(line.discount ?? 0);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0 || !line.description?.trim()) throw new Error('Cada concepto necesita descripción, cantidad positiva y precio válido.');
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error('El descuento debe estar entre 0 y 100 %.');
  const gross = Math.round(qty * price * 100);
  if (!Number.isSafeInteger(gross) || gross > 1e12) throw new Error('El importe del concepto es demasiado grande.');
  const saving = Math.round(gross * discount / 100);
  return {gross, saving, net: gross - saving};
}

export function totals(lines, igv) {
  const rate = Number(igv);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !lines.length) throw new Error('Revisa el IGV y agrega al menos un concepto.');
  const subtotal = lines.reduce((sum, line) => sum + lineAmounts(line).net, 0);
  const tax = Math.round(subtotal * rate / 100);
  return {subtotal, tax, total: subtotal + tax};
}

export function approveQuote(quote) {
  if (quote.status !== 'Pendiente') throw new Error('Solo puedes aprobar una cotización pendiente.');
  quote.status = 'Aprobada';
}

export function convertQuote(state, id) {
  const quote = state.quotes.find(q => q.id === id);
  if (!quote || quote.status !== 'Aprobada') throw new Error('Primero debes aprobar la cotización.');
  if (state.invoices.some(i => i.quoteId === id)) throw new Error('Esta cotización ya tiene un borrador.');
  const invoice = {
    id: crypto.randomUUID(), number: `BOR-${String(state.invoices.length + 1).padStart(3, '0')}`,
    quoteId: id, quoteNumber: quote.number, client: structuredClone(quote.client),
    lines: structuredClone(quote.lines), igv: quote.igv, amounts: {...quote.amounts},
    date: new Date().toISOString(), status: 'Borrador', notes: quote.notes
  };
  state.invoices.push(invoice);
  quote.status = 'Convertida';
  return invoice;
}
