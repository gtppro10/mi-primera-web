# Entrega A — confirmación, PDF real y correcciones de formularios

Se aplica únicamente la Entrega A solicitada. La Entrega B se documenta en
[la propuesta técnica](SKYBIKE_ENTREGA_B_PROPUESTA.md); no se activa.

## Cambios

1. Guardar el asistente abre una pantalla independiente **COTIZACIÓN GENERADA**,
   con el número real del registro guardado, sin resumen largo ni séptimo paso.
   Se puede compartir el archivo PDF, abrirlo, editar o volver al inicio.
2. El PDF es un archivo `application/pdf` generado localmente con jsPDF y
   AutoTable, dependencias fijadas en el lockfile y servidas desde el propio sitio.
   No es un enlace ficticio ni una captura de pantalla. Las tablas se paginan,
   repiten sus cabeceras y conservan texto seleccionable. El logotipo y los datos
   económicos proceden de la cotización guardada, no del catálogo actualizado.
3. Los flyers son opcionales, conservan su proporción y aparecen en el orden de
   tours, una imagen por página A4 tras el resumen, sin duplicados. Los faltantes
   se advierten; se puede continuar sin ellos. No se agregan a comprobantes.
4. Si el navegador ofrece compartir archivos, se abre su menú nativo; WhatsApp
   solo aparecerá si el dispositivo lo ofrece. Cancelar no se registra como envío.
   Sin soporte se solicita descargar el PDF para adjuntarlo manualmente. No se
   afirma que el destinatario lo recibió. Si el navegador bloquea una pestaña o
   una acción, se muestra el error y se ofrece descargar o reintentar.
5. Editar reabre las seis etapas con una copia de los datos. Guardar actualiza el
   mismo ID y número; conserva fecha de creación y registra revisión. Hay control
   de revisión e idempotencia para reintentos. Los documentos antiguos sin revisión
   se consideran revisión 1. Las cotizaciones aprobadas necesitan nueva aprobación;
   las ya convertidas conservan ese estado y sus reservas/pagos no se reescriben.
6. En Tours, Contenido de la experiencia tiene solo **SERVICIOS INCLUIDOS** y
   **SERVICIOS NO INCLUIDOS**. Los campos históricos ocultos no se borran ni se
   sobrescriben al guardar; fotografías, flyers, precios y categorías se conservan.
   El formulario de servicios adicionales mantiene sus campos existentes.
7. El catálogo y el paso 3 ya no tienen Todos. La selección inicial muestra todos
   los productos/tours sin categoría activa; pulsar una categoría filtra y pulsarla
   de nuevo la desactiva. Se conservan búsqueda y categorías nuevas de administración.
8. Facturación añade **Correo electrónico del cliente**, opcional y validado en
   formulario y dominio. Se guarda en el cliente y en las instantáneas de reserva
   y comprobante. Editar la reserva conserva el correo en la revisión posterior;
   no reescribe comprobantes anteriores. No envía correos ni invitaciones.

El idioma ES/EN y PEN/USD siguen guardándose. La plantilla PDF conserva el español
actual; traducción integral de contenido sigue pendiente, como se indicaba en
fase 1. Los datos comerciales siguen siendo ficticios y los comprobantes internos
no tienen validez tributaria.

## Archivos principales

- `js/skybike/quote-success.js`: confirmación, preparación de archivo, abrir,
  compartir, cancelación, descarga y mensajes honestos de estado.
- `js/skybike/quote-pdf.js`, `pdf-engine.js`: PDF binario A4 y carga local del motor.
- `js/skybike/quote-edit.js`: edición con número estable, revisión e idempotencia.
- `js/skybike/customers.js`: validación de correo opcional del cliente.
- `app.js`, `quote-wizard.js`, `domain.js`: integración y separación de formularios.
- `admin-ui.js`: dos campos visibles en Tours sin perder contenido histórico.
- `styles.css`: tarjeta de confirmación adaptable y botones táctiles.
- `scripts/pdf-vendor.mjs`, `scripts/build.mjs`, `run.sh`, `package*.json`: recursos
  PDF reproducibles desde versiones fijadas; licencias incluidas en el sitio.
- `.github/workflows/pages.yml`: instala las dependencias PDF antes de construir
  el sitio; mantiene los controles existentes y solo publica desde main aprobado.
- Pruebas nuevas `skybike-quote-edit.test.mjs`, `skybike-customers.test.mjs`,
  `skybike-quote-pdf.browser.cjs` y `skybike-delivery-a.browser.cjs`; regresiones
  anteriores adaptadas a la pantalla de confirmación, sin omitir cálculos/PDF.

## Ejecutar

Con Node 24: `npm ci --ignore-scripts`, `npm run build`, `bash run.sh`.
El build prepara los recursos PDF locales en vendor y dist; no se descargan
bibliotecas de una CDN en el navegador. run.sh también prepara esos recursos
cuando las dependencias ya están instaladas. No se copian secretos ni el
repositorio completo al sitio publicable.

## Validación

Instalación con lockfile, sintaxis, pruebas unitarias, auditoría npm, build y suites
Chromium sobre dist servido por HTTP en `/mi-primera-web/`. Se verifican PDF reales
con Poppler, texto, páginas A4, anexos ordenados/proporcionales, ausencia de páginas
vacías, edición sin duplicados y conservación de reservas/pagos. Las pruebas de
compartición simulan capacidades/errores del navegador sin contactar destinatarios.
La disponibilidad real del menú nativo depende del dispositivo, HTTPS y permisos.

Resultado: 67 pruebas unitarias y las nueve suites de navegador aprobadas, sin
pruebas omitidas; sintaxis y auditoría npm correctas (cero vulnerabilidades).
También se verificó una instalación limpia sin dependencias de desarrollo y la
construcción con los mismos comandos que utilizará GitHub Pages. CodeQL y los
controles remotos todavía requieren su ejecución en GitHub.

## Pendiente y autorizaciones futuras

No se añade un login simulado: el acceso por usuario/contraseña requiere servidor,
Supabase Auth, políticas RLS y permisos verificados. No se solicita ni almacena una
contraseña en el frontend. La demo de localStorage conserva su condición de demo,
sin protección multiusuario ni auditoría inalterable.

Para Entrega B se necesita aprobar arquitectura y modelo de permisos, preparar un
servidor seguro y el proyecto de prueba Supabase, revisar/aprobar SQL y migraciones
por separado y configurar OAuth autorizado por el propietario del calendario
central. Los tokens deberán almacenarse en el servidor. Las invitaciones del cliente
usarán datos permitidos separados de los eventos privados; nunca se compartirá
la descripción privada de la agencia. La propuesta incluye pruebas de seguridad.

No se ejecutó SQL, migraron datos reales, conectó Google Calendar/SUNAT ni modificó
Google Apps Script. La rama requiere PR y aprobación antes de merge/publicación.
Los controles remotos y CodeQL deben verificarse aparte en GitHub.
