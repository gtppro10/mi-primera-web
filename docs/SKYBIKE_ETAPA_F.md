# Etapa F — reservas, pasajeros, pagos, historial y reportes

Esta etapa amplía la demo A–E, manteniendo el diseño verde/blanco, catálogo,
descuentos monetarios individuales y documentos A4. Solo datos ficticios.
No es una aplicación de producción ni una integración bancaria o tributaria.

## Uso

1. **Reservas → Nueva reserva**: elegir cliente registrado, agregar uno o varios
   tours y ajustar fechas, horarios, cantidades, precios y descuentos. También
   continúa disponible cotización → aprobación → reserva y el comprobante de C.
   La creación directa guarda una cotización de origen y comprobante interno.
2. **Editar** permite cambiar la reserva; **Estado** permite pendiente,
   confirmada, completada y cancelada. Los estados operativos anteriores siguen
   legibles y se conservan al editar. Buscar por número, cliente, DNI o tour.
3. **Clientes y pasajeros → Agregar pasajero**: nombre, DNI/pasaporte, WhatsApp,
   reserva y tours individuales mediante casillas. Editar para reasignar tours.
   Historial de servicios reúne las contrataciones del mismo documento en varias
   reservas. Los registros anteriores sin asignación explícita siguen asociados
   a todos los tours de su reserva; revisar individualmente si corresponde.
4. **Registrar pago** desde Reservas o Pagos: fecha de operación, importe PEN,
   medio y referencia. La fecha de operación es distinta de la fecha de registro.
   El primer pago parcial se clasifica como Adelanto; los demás, pago posterior.
   Las pantallas y los reportes calculan el saldo desde los movimientos guardados.
5. **Historial** permite elegir reservas, cotizaciones, comprobantes o pagos,
   con filtros combinados por cliente, fechas, tour, estado y texto. Las fechas
   son de creación en Lima; en pagos se usa la fecha de operación. El estado
   filtrado es el actual del documento, no una reconstrucción a una fecha pasada.
   El registro completo de actividad queda debajo, con detalle Antes/Después
   cuando existe. Los eventos antiguos sin copia detallada siguen visibles.
6. **Reportes**: elegir día de salida y opcionalmente un período de ingresos y
   tours. Muestra reservas del día (una vez aunque tengan varios tours), ingresos
   registrados, adelantos, saldos activos y tours más vendidos por pasajeros.
   Los tours se filtran por fecha de salida; ingresos por fecha de operación.
   Los saldos son actuales e independientes del período. Las cancelaciones no
   eliminan los pagos recibidos ni generan devoluciones: su saldo se separa.

## Controles de integridad de la demo

- Misma identidad del cliente (DNI/documento, o ID/nombre como respaldo) y mismo
  conjunto de tours, fechas y horarios: reserva duplicada, aunque cambien precio,
  cantidad u orden de los tours. Se puede reservar tras cancelar la anterior.
  Dentro de una reserva, un tour en la misma fecha y horario se registra una sola
  vez; ajustar cantidad en lugar de repetirlo. No es una gestión de disponibilidad
  global: no bloquea distintos clientes ni itinerarios parcialmente coincidentes.
- Un pasajero por documento dentro de una reserva, con tours pertenecientes a
  esa reserva y sin exceder las cantidades contratadas. Para quitar tours o
  reducir cupos primero reasignar pasajeros. No se borran registros para eludir
  este control. Un mismo pasajero puede figurar en distintas reservas.
- Pago positivo, fecha válida y no superior al saldo. Referencias electrónicas
  repetidas se bloquean por medio, incluso entre reservas. Sin referencia (o en
  efectivo), se detectan reserva+medio+fecha+importe+referencia iguales. Para
  movimientos legítimos distintos del mismo importe, usar referencias únicas.
- Reintento con el mismo identificador de solicitud de pago devuelve el registro
  guardado; reutilizarlo con datos distintos falla. Las validaciones también se
  ejecutan en el dominio, no solo en los botones.
- Cada edición se valida sobre una copia: si falla, no persiste reservas, pagos
  ni comprobantes parciales. No se admite reducir el total por debajo de lo
  pagado. Se comprueba la revisión de la reserva para detectar formularios viejos.
- La cotización original no se reescribe al editar la reserva. Se crea una nueva
  revisión del comprobante, conservando el anterior y sus pagos/saldo al momento
  de la revisión. El PDF histórico lleva una advertencia. El último comprobante
  sigue mostrando los pagos actuales. Los flyers continúan exclusivamente en
  cotizaciones, nunca en reservas ni comprobantes.

## Archivos y arquitectura

- `js/skybike/operations.js`: gestión de reservas y pasajeros, asignaciones,
  consultas y reportes puros sobre el estado; sin dependencia de DOM o servicios.
- `js/skybike/operations-ui.js`: formularios, búsquedas, filtros, detalle y reportes.
- `js/skybike/domain.js`: reglas compartidas de duplicados, pagos y cálculos.
- `js/skybike/app.js`, `index.html`, `styles.css`: integración con navegación y
  documentos existentes; consulta de la copia local actual antes de guardar.
- `tests/skybike-operations.test.mjs` y `.browser.cjs`: pruebas de etapa F.

Se conserva `skybike-cusco-demo-v1`; no se lee ni modifica Nexo, Apps Script o datos
externos. No se cambia el formato base ni se reinicia el almacenamiento existente.

## Verificación

`npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run audit:security`,
`npm run build` y `npm run test:browser`. Las pruebas del navegador requieren
Chromium y Poppler, como en C/D/E. Se prueba `dist` servido mediante HTTP en la
subruta `/mi-primera-web/`, equivalente a las rutas relativas de Pages.

38 pruebas unitarias: incluyen reservas nuevas y editadas, duplicados tanto
al crear como al convertir cotizaciones, pagos repetidos, sobrepagos, cancelación,
cupos y tours por pasajero, filtros, reportes, fechas de Lima y saldos históricos.
Las pruebas C/D/E usan ahora una fecha distinta al ejemplo inicial para respetar
la nueva regla de reserva duplicada; mantienen sus aserciones originales.

Cuatro suites de navegador: regresión general, A/B, C/D/E y F. La nueva prueba
verifica formularios, búsqueda, dos pasajeros en tours diferentes, pagos rechazados,
edición y PDF histórico real, persistencia, filtros combinados, reportes y móvil.

## Pendientes para producción

LocalStorage no es una base de datos transaccional, respaldo ni control de acceso.
Leer el estado actual y comprobar revisiones reduce conflictos secuenciales, pero
no garantiza concurrencia entre pestañas/equipos. Faltan Supabase/Auth/RLS,
transacciones y restricciones únicas en servidor, respaldo, permisos, registro
inalterable de auditoría, disponibilidad/cupos globales y conciliación/devoluciones.
El documento propuesto de SQL no se ejecutó ni cambió en esta etapa. No hay SDK,
credenciales, migración real, envío SUNAT ni modificación de Google Apps Script.

La rama y PR requieren revisión manual. No activar auto-merge ni publicar esta
versión sin aprobación. El análisis CodeQL y los controles remotos deben comprobarse
por separado en GitHub; las pruebas locales no los sustituyen.
