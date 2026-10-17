import {seed} from './seed.js';
// Espacio separado: no lee ni modifica datos de la demo Nexo o de Google.
export const STORAGE_KEY='skybike-cusco-demo-v1';
export const repository={
 load(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return seed();const s=JSON.parse(raw);if(s.version!==1||!['products','clients','quotes','reservations','receipts','payments','passengers','history'].every(k=>Array.isArray(s[k]))||!s.draft)throw new Error('Los datos Skybike locales no son compatibles. No se han borrado.');return s;},
 save(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
};
