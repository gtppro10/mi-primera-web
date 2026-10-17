import {seed} from './seed.js';
export const emptyDraft = () => ({lines:[], clientId:'', igv:18, notes:''});
// Único punto de acceso a los datos. En otra etapa se sustituye por una API.
const KEY = 'nexo-demo-v1';
export const repository = {
  load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {...seed(), draft:emptyDraft()};
    const data = JSON.parse(raw);
    if (data.version !== 1 || !['clients','products','quotes','invoices'].every(key => Array.isArray(data[key]))) throw new Error('Formato de datos local no compatible.');
    // Migración aditiva: conservar clientes y documentos de la versión anterior.
    const defaults = {p1:'Diseño', p2:'Mantenimiento', p3:'Otros', p4:'Diseño'};
    data.products = data.products.map(p => ({...p, category:p.category || defaults[p.id] || 'Otros'}));
    data.draft ||= emptyDraft();
    return data;
  },
  save(data) {localStorage.setItem(KEY, JSON.stringify(data));}
};
