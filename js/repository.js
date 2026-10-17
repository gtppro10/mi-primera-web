import {seed} from './seed.js';
// Único punto de acceso a los datos. En otra etapa se sustituye por una API.
const KEY = 'nexo-demo-v1';
export const repository = {
  load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const data = JSON.parse(raw);
    if (data.version !== 1 || !['clients','products','quotes','invoices'].every(key => Array.isArray(data[key]))) throw new Error('Formato de datos local no compatible.');
    return data;
  },
  save(data) {localStorage.setItem(KEY, JSON.stringify(data));}
};
