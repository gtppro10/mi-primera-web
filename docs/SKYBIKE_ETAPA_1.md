# Agencia Skybike Cusco · Resultado de la etapa 1

## Separación del sistema original

- Esta demo no llama Apps Script, Google Sheets, Drive, Calendar, Supabase o SUNAT.
- Usa únicamente datos ficticios y `skybike-cusco-demo-v1` en localStorage.
- La clave anterior `nexo-demo-v1` se conserva intacta. No se importan datos.
- Los archivos originales adjuntos no se publican en GitHub porque contienen
  configuración de la agencia y valores que no deben trasladarse al frontend.
- El código de esta demo está en `js/skybike/`; las reglas antiguas `js/domain.js`
  y sus pruebas permanecen separadas para no reinterpretar documentos anteriores.
- No se sustituye todavía la aplicación operativa ni sus enlaces.

## Qué se puede probar

1. Explorar el catálogo de tours y servicios por fotografía, nombre y categoría.
2. Agregar varias salidas, incluso el mismo tour en días diferentes.
3. Asociar adicionales a un tour: por persona, por unidad o por reserva.
4. Elegir cliente, fecha, hora, pasajeros, precio y descuento monetario por persona.
5. Personalizar el descuento de cada pasajero por posición, sin exigir datos reales.
6. Cotizar en PEN o mostrar equivalente en USD con tipo de cambio guardado.
7. Guardar y aprobar una cotización; convertirla una sola vez a reserva y recibo demo.
8. Registrar pagos en PEN y comprobar saldo; se rechaza pago cero o mayor al saldo.
9. Registrar clientes y pasajeros ficticios, cambiar estados operativos y consultar historial.
10. Abrir cotizaciones, reservas, recibos y fichas; imprimir o Guardar como PDF.
11. Cambiar fotografías de prueba (JPG, PNG, WebP hasta 2 MB) con vista previa.
12. Recargar el navegador y recuperar la selección, documentos y movimientos.

No se añade IGV automáticamente: el cálculo original revisado no lo separaba.
Para un tour de S/ 120 con dos pasajeros y descuentos de S/ 10 y S/ 20,
el resultado es S/ 210. Los extras se suman después de ese descuento.
Los precios, imágenes y documentos no son ofertas, reservas ni comprobantes reales.

## Trazabilidad de funciones originales

| Función original | Estado en esta etapa | Trabajo posterior antes de sustituir el original |
| --- | --- | --- |
| Catálogo y categorías de tours | Demo visual con fotos y selección múltiple | Catálogo real, autorización y precios históricos |
| Edición de imágenes | Carga local con validación | Storage privado, versiones y permisos de administrador |
| Administración completa de tours | Selección y fotos; sin borrado | Altas, edición completa, activación y archivo seguro |
| Clientes y pasajeros | Alta ficticia; cantidad por tour e identificación por reserva | Validación de capacidad por salida, edición y permisos |
| Descuento por pasajero | Monto por persona y personalización por posición | Validación transaccional en backend |
| Servicios adicionales | Tres modalidades y asociación a tour | Catálogo real completo y equivalencia con JSON legado |
| Cotizaciones y vigencia | Crear, consultar, aprobar y convertir | Edición versionada y reglas de vigencia operativas |
| Reservas y estados | Crear, consultar y cambiar estados de prueba | Duplicados, agenda, reglas y estados por detalle |
| Adelantos, pagos y saldos | Pagos PEN con límite de saldo e historial | Concurrencia, idempotencia, conciliación y reversos |
| Finalizar y pagar | Estado REALIZADA y pago son acciones separadas | Operación atómica equivalente al original |
| No-show y devoluciones | Tablas y plan conservados, sin acción demo | Retención/devolución total o parcial y movimientos negativos |
| Recibos / facturación interna | Recibo demo desde reserva | Edición versionada, vínculo legado y generación backend |
| PDF | Impresión / Guardar PDF del navegador | Generación de archivos en servidor y archivo privado |
| Flyers A4 y varias páginas | Ficha demo imprimible | Flyers ES/EN, orden, páginas e incorporación en PDF |
| Historial | Eventos locales y documentos consultables | Auditoría inmutable de backend y versiones originales |
| Soles/dólares | Moneda y tipo de cambio por documento | Conciliar todos los campos monetarios originales |
| Español/inglés | Interfaz de esta etapa en español | Traducción y plantillas ES/EN equivalentes al original |
| Compartir PDF / enlaces firmados | No implementado en esta etapa | Storage privado, URL temporal y flujo WhatsApp |
| Pegado rápido WhatsApp | No implementado en esta etapa | Parser y comparación contra casos del original |
| Google Calendar | No conectado; tablas previstas | Eventos por salida, recordatorios, cola y reintentos |
| Diagnóstico, respaldo y configuración | Documentación; sin rutinas sobre Google | Herramientas nuevas y recuperación verificada |
| PIN administrativo / eliminación | No se reutilizan PIN ni se simula seguridad | Supabase Auth, roles y reautenticación para acciones sensibles |
| Etapas e itinerarios | Tabla prevista | Revisar datos de ETAPAS_TOURS antes de importarlos |

Las funciones pendientes no se han retirado del sistema original. Permanecen en
la matriz de aceptación y deben completarse antes de cualquier puesta en marcha.
El historial de desarrollo de Git no equivale a respaldo de los datos del navegador.

## Base de datos propuesta (NO ejecutada)

Archivo: `supabase/001_skybike_proposal.sql`. No hay conexión, URL, clave ni SDK de
Supabase en la aplicación. No hay un comando de CI que aplique este SQL.
Consulta `supabase/README.md` para permisos, límites y validación pendiente.

## Límites de la demo

No tiene autenticación, multiusuario, sincronización, respaldo ni garantías de
concurrencia entre pestañas. No introducir datos personales o comerciales reales.
Las fotografías distribuidas son paisajes de referencia, no fotografías de los
tours reales; sus fuentes/licencia están en `images/skybike/SOURCES.md`.
Los comprobantes carecen de validez tributaria. No hay firma, XML, emisión ni SUNAT.
