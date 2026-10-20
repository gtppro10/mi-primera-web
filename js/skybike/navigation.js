// Navegación y resumen de solo lectura: no guarda datos ni cambia reglas de negocio.
import {balance} from './domain.js';
const paths={
 receipt:'M7 3h18v26l-4-3-5 3-5-3-4 3V3Zm5 7h8m-8 5h8m-8 5h5',
 quote:'M6 6h20v22H6V6Zm5-3h10v6H11V3Zm0 12h10m-10 5h10',
 calendar:'M5 7h22v21H5V7Zm5-4v8m12-8v8M5 15h22m-16 5h2m6 0h2',
 wallet:'M5 8h22v19H5V8Zm0 0 18-4v4m-4 8h8v7h-8v-7Zm3 3h1',
 mountain:'m3 26 10-19 5 10 4-6 8 15H3Zm7-13 3 3 3-3',
 tools:'m8 5 5 5-3 3-5-5a7 7 0 0 0 9 9l10 10 4-4-10-10a7 7 0 0 0-10-8Z',
 people:'M20 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM7 27v-3a9 9 0 0 1 18 0v3M5 12a3 3 0 0 0 0 6m22-6a3 3 0 0 1 0 6',
 settings:'M16 11a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-3-7h6l1 4 4 2 4-1 2 5-3 3v4l-4 4-4-1-3 4-5-2v-4l-4-3-3-1 1-6 4-1 4-3V4Z',
 chart:'M5 4v24h24M11 22v-6m7 6V9m7 13V5'
};
export const mainModules=[
 ['FACTURACIÓN','Comprobantes de pago y recibos internos','documentos','receipt','Demo · no fiscal'],
 ['COTIZACIONES','Tours, precios y flyers para cotizar','cotizador','quote',''],
 ['RESERVAS','Fechas, horarios y pasajeros','reservas','calendar',''],
 ['PAGOS','Adelantos, pagos y saldos','pagos','wallet',''],
 ['TOURS','Catálogo y administración de tours','tours','mountain',''],
 ['SERVICIOS','Administrar servicios adicionales','servicios','tools',''],
 ['CLIENTES','Datos de clientes e historial de servicios','pasajeros','people',''],
 ['ADMINISTRACIÓN','Configuración, usuarios y datos de la agencia','administracion','settings','Pendiente'],
 ['REPORTES','Estadísticas y registros de la agencia','reportes','chart','']
];
const moduleTones=['green','blue','orange','violet','teal','rose','indigo','slate','amber'];
const iconSVG=icon=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[icon]}"></path></svg>`;
export function homeMenu(state={}){
 const reservations=Array.isArray(state.reservations)?state.reservations:[];
 const payments=Array.isArray(state.payments)?state.payments:[];
 const quotes=Array.isArray(state.quotes)?state.quotes:[];
 const financialState={reservations,payments};
 const income=payments.reduce((total,payment)=>total+Number(payment.amount),0);
 const active=reservations.filter(reservation=>['PENDIENTE','CONFIRMADA'].includes(reservation.status)).length;
 const pending=reservations.filter(reservation=>reservation.status!=='CANCELADA').reduce((total,reservation)=>total+balance(financialState,reservation.id).balance,0);
 const money=cents=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(cents/100);
 const metrics=[
  ['income','Ingresos registrados',income,money(income),'Pagos registrados en esta demo','green','wallet'],
  ['active-reservations','Reservas activas',active,String(active),'Pendientes y confirmadas','blue','calendar'],
  ['quotes','Cotizaciones',quotes.length,String(quotes.length),'Cotizaciones guardadas','orange','quote'],
  ['pending-balance','Saldo pendiente',pending,money(pending),'Reservas no canceladas','violet','receipt']
 ];
 return `<section class="dashboard-home" aria-label="Panel de la agencia"><header class="home-welcome"><div class="home-welcome-copy"><strong>SKYBIKE CUSCO</strong><h1 tabindex="-1">Menú principal</h1><p>Organiza cada experiencia desde un solo lugar.</p></div><div class="home-welcome-brand"><img src="./images/skybike/logo-agencia.jpg" alt="Logotipo original Skybike Cusco" width="80" height="64"><span>Gestión de la agencia</span></div></header><section class="dashboard-kpis" aria-label="Resumen de datos de demostración">${metrics.map(([key,label,value,formatted,description,tone,icon])=>`<article class="dashboard-kpi dashboard-kpi--${tone}" data-kpi="${key}" data-value="${value}"><div class="dashboard-kpi-heading"><h2>${label}</h2><span class="dashboard-kpi-icon" aria-hidden="true">${iconSVG(icon)}</span></div><strong class="dashboard-kpi-value">${formatted}</strong><p>${description}</p></article>`).join('')}</section><div class="dashboard-section-heading"><div><h2>Accesos rápidos</h2><p>Elige un módulo para continuar.</p></div><span class="dashboard-local-label"><span aria-hidden="true"></span>Demo local</span></div><nav class="main-menu-grid" aria-label="Menú principal">${mainModules.map(([title,description,route,icon,status],index)=>`<a class="module-card module-tone-${moduleTones[index]} ${route==='administracion'?'module-pending':''}" href="#${route}"><span class="module-icon" aria-hidden="true">${iconSVG(icon)}</span><strong>${title.charAt(0)+title.slice(1).toLowerCase()}</strong><span class="module-description">${description}</span>${status?`<span class="module-status">${status}</span>`:''}<span class="module-arrow" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12m-5-5 5 5-5 5"></path></svg></span></a>`).join('')}</nav><p class="home-note">Datos de demostración · Se guardan únicamente en este navegador.</p></section>`;
}
export function moduleLinks(route){
 const groups=[['catalogo','cotizaciones','cotizador'],['tours'],['reportes','historial','resumen']];
 const labels={cotizador:'Nueva cotización',catalogo:'Catálogo para cotizar',cotizaciones:'Cotizaciones guardadas',tours:'Administrar tours',reportes:'Reportes',historial:'Historial',resumen:'Resumen de la agencia'};
 const group=groups.find(g=>g.includes(route));if(!group)return '';
 const links=route==='tours'?['catalogo']:group.filter(key=>key!==route);
 return `<div class="module-shortcuts" role="group" aria-label="Opciones del módulo">${links.map(key=>`<a href="#${key}">${labels[key]} →</a>`).join('')}</div>`;
}
export function pendingAdministration(){return '<section class="card operations-card administration-pending"><span class="badge">PENDIENTE DE DESARROLLO</span><h2>Administración aún no está habilitada</h2><p>La configuración de la agencia, los usuarios y sus permisos requieren una etapa de desarrollo e integración con autenticación.</p><ul><li>Configuración comercial y datos de la agencia: pendiente.</li><li>Usuarios, acceso y permisos: pendiente.</li><li>Conexión con Supabase: pendiente, sin ejecutar SQL.</li></ul><p>Esta pantalla es informativa. No permite administrar usuarios ni modificar datos de la agencia.</p></section>';}
