# Especificación maestra: fase 1 — interfaz y cotizaciones

Se implementa únicamente la fase 1 del documento adjunto del usuario. El proyecto
existente se conserva; no se sustituye por una aplicación nueva. La rama parte
de main con A–F y el menú móvil ya incorporados.

## Comparación previa y resultado

| Función | Situación previa | Esta fase |
| --- | --- | --- |
| Inicio y navegación | Nueve tarjetas, dos columnas móviles | Se conserva; una columna por debajo de 320 px, Reportes como noveno módulo |
| Administración de tours y servicios | Altas, edición, imágenes, flyers, archivo | Se conserva, separada de la selección; no se duplican formularios |
| Catálogo | Mezclaba selección y controles de administración | Tarjetas con fotografía, nombre, precio y Agregar; filtros fuera |
| Cotizaciones | Formulario largo compartido con comprobantes | Asistente independiente de seis pasos con progreso y validación |
| Descuentos y adicionales | Cálculo PEN por pasajero y modalidades | Se reutiliza el dominio, con resúmenes por tour y servicios asociados |
| Moneda | Conversión disponible en formulario largo | Elección PEN/USD, cambio manual visible solo en USD y equivalencias |
| Idioma | Idioma guardado por el dominio, interfaz sin selección | Preferencia ES/EN seleccionable, persistida y revisable; traducción PDF integral pendiente de fase 2 |
| WhatsApp | Parser etiquetado de cliente, fecha y cantidad | Propuesta local revisable; tour etiquetado si coincide de forma única, horarios 24 h o AM/PM |
| Reservas, pasajeros, pagos e historial | Etapa F implementada | Sin cambios de reglas ni operaciones automáticas desde el asistente |
| PDF y flyers | Generación A4 mediante imprimir/guardar PDF | Se conserva y prueba; mejoras solicitadas corresponden a fase 2 |

## Uso

1. Desde **Cotizaciones** en el inicio, abrir el asistente. **Cotizaciones
   guardadas** sigue disponible como enlace del módulo y en la navegación.
2. Paso 1: elegir un cliente existente o completar un cliente ficticio nuevo.
   Nombre, documento, código de país y WhatsApp son obligatorios. La copia del
   cliente en el documento no cambia su ficha maestra.
3. Pegar opcionalmente datos WhatsApp con etiquetas Nombre, WhatsApp, DNI,
   Tour, Fecha, Hora y Pasajeros. Rellenar automáticamente prepara una propuesta;
   Aplicar datos revisados la aplica. Limpiar borra el texto pegado, sin borrar
   los datos ya revisados. No se ejecuta ni se envía el contenido del mensaje.
   Los datos generales de salida se aplican a todos los tours seleccionados;
   corregir cada tour en el paso 4. Si un tour no coincide de forma única, se
   advierte para elegirlo manualmente. No se adivina texto libre ambiguo.
4. Paso 2: moneda PEN o USD e idioma ES o EN. USD requiere un cambio manual
   positivo: US$ 1 = S/ cambio. No se consultan cotizaciones de cambio externas.
5. Paso 3: buscar y filtrar tours, pulsar Agregar o su fotografía y revisar la
   selección. Se evita duplicar el mismo tour por pulsaciones repetidas.
6. Paso 4: fecha por tour (selector de fecha nativo con etiqueta dd/mm/aaaa;
   la apariencia nativa depende del navegador, con fecha seleccionada también
   visible como dd/mm/aaaa), hora, minutos y AM/PM, pasajeros y
   descuentos monetarios individuales. Cada tour tiene su propio Agregar servicio,
   modalidad, cantidad, precio, subtotal y eliminación. Cambiar cantidad de un
   tour ajusta adicionales por persona salvo una cantidad editada manualmente.
   Quitar un tour elimina solo sus servicios.
7. Paso 5: vigencia, observaciones, condiciones y resumen en la moneda elegida.
8. Paso 6: revisar todos los datos y guardar la cotización demo. No se crean
   reservas, recibos ni pagos. El PDF actual sigue accesible al abrir la cotización
   guardada. Las acciones nuevas de generación y envío de fase 2 no se simulan.

Anterior y Siguiente conservan el borrador, incluso tras recargar. Se valida antes
de avanzar y se revalida todo al guardar. Un fallo de almacenamiento se muestra
sin dejar el asistente en un paso incoherente. Nunca se supone éxito si guardar
falló. La generación de cotizaciones no confirma reservas ni agenda eventos.

## Moneda e idioma

Precios y descuentos originales se editan y guardan en **PEN**. Las equivalencias
por pasajero, descuentos, servicios y totales se muestran en la moneda elegida.
Cambiar PEN→USD→PEN no reescribe precios ni acumula redondeos. El documento guarda
el cambio utilizado (1 para PEN), y la preferencia de idioma.

**ES/EN en fase 1 es una preferencia guardada, no una promesa de traducción del
PDF actual.** La plantilla existente sigue en español. Las etiquetas y contenidos
configurables traducidos, envío/compartición WhatsApp y mejoras de PDF se completan
en fase 2. Esto se indica también en la pantalla de selección y revisión.

## Separación de datos y flujos

El borrador nuevo se guarda en `quoteDraft`, dentro de la misma clave de demo
`skybike-cusco-demo-v1`. No lee ni modifica datos reales, Nexo ni Google.
`draft` conserva la selección y el adelanto de un comprobante pendiente. Ir al
asistente no consume ese comprobante. Al mover una cesta auxiliar de cotización,
se fusiona sin sobreescribir correcciones previas y se vacía solo la cesta ya
transferida. El catálogo auxiliar anterior conserva selección de productos y
servicios para el flujo de comprobantes; el catálogo del paso 3 contiene tours.

Se mantienen las funciones de reservas, clientes, pagos, historial y PDF. El
formulario largo se conserva para Facturación y solo permite comprobantes;
las cotizaciones se preparan en el asistente. No se muestran calendarios dentro
del asistente y no hay conexión Google Calendar.

## Archivos

- `js/skybike/quote-draft.js`: validaciones, horarios, importes, asociación de
  servicios, prevención de doble selección y fusión de borradores.
- `js/skybike/quote-wizard.js`: seis pasos y persistencia del formulario.
- `js/skybike/catalog.js` y `styles/catalog.css`: catálogo compacto reutilizable.
- `js/skybike/app.js`, `navigation.js`, `whatsapp.js`, `domain.js`: integración
  del asistente con el estado existente, selección, parser y validación de idioma.
- `index.html`, `styles.css`, `scripts/build.mjs`: estilos y recursos de la web
  construida, con rutas relativas compatibles con GitHub Pages.
- `tests/skybike-wizard*`, `skybike-catalog.test.mjs`, `skybike-contact.test.mjs`
  y `wizard-helpers.cjs`: nuevas pruebas y adaptación de regresiones.

## Verificación y límites

Pasaron 54 pruebas unitarias y siete suites de navegador. La auditoría npm no
encontró vulnerabilidades. La suite cubre siete anchos (280, 320, 375, 390, 430, 768 y 1440 px), seis pasos,
validación, ida/vuelta/recarga, PEN/USD, idioma, fechas y AM/PM, descuentos y
servicios por tour, duplicados, preservación de comprobantes y fallos de cuota.
Caso económico: S/635.00 = US$167.11 a cambio 3.8. Se conservan las comprobaciones
anteriores de PDF A4, flyers exclusivos de cotizaciones, recibos, documentos
largos, reservas, pasajeros y pagos. Se prueba dist por HTTP en /mi-primera-web/.

LocalStorage sigue siendo solo almacenamiento de demostración: no ofrece
concurrencia multiusuario, autenticación ni respaldos. No se modificó ni ejecutó
SQL, no se migraron datos, no se conectó SUNAT ni se modificó Google Apps Script.

Pendientes por fases: mejoras PDF/traducción y WhatsApp (2), confirmación y
calendarios exclusivos de Facturación/ICS/OAuth (3), Supabase/Auth/RLS/Storage
sin ejecutar SQL todavía (4), seguridad de producción y SUNAT de pruebas con
validación independiente (5). No se implementan en esta rama.

La rama debe revisarse mediante PR. No se autoriza merge ni publicación
 automática. Los controles remotos y CodeQL se verifican aparte en GitHub.
