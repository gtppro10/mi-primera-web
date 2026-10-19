# Etapas C, D y E — demostración local

## Probar paso a paso

1. Ejecutar `bash run.sh` en el repositorio. El servidor escucha en 8000.
   En un entorno remoto, abrir el puerto 8000 mediante la vista previa disponible
   en la plataforma; localhost del ordenador no apunta al servidor remoto.
2. Abrir Catálogo de tours, seleccionar varios tours y Revisar cotización.
3. Revisar el cliente y sus datos para este documento. No se modifica la ficha
   maestra del cliente al corregir los datos de un documento.
4. Opcionalmente pegar texto WhatsApp con etiquetas Nombre, Documento, WhatsApp,
   Pasajeros, Fecha (AAAA-MM-DD o DD/MM/AAAA) y Hora (HH:MM de 24 horas).
   Revisar la propuesta y pulsar Aplicar. Fecha, hora y cantidad se proponen para
   todos los tours; revisar las salidas individualmente. No se adivinan tours,
   precios ni pagos desde mensajes ambiguos. Texto libre del original y horarios
   de 12 horas aún necesitan edición manual.
5. Ajustar cantidades, precios y descuentos en soles. Personalizar descuento
   por pasajero reemplaza el descuento general del tour. Agregar servicio dentro
   del tour asigna el adicional a ese tour; se pueden cambiar asociación,
   modalidad, cantidad y precio. Cada línea muestra su subtotal.
6. Elegir Cotización o Comprobante de pago demo. En comprobante, completar
   adelanto en PEN, medio y referencia. Se valida total/saldo y se guardan juntos
   cotización de origen, reserva, comprobante y pago. Un reintento de la misma
   solicitud guardada no duplica esos registros. No es garantía multiusuario.
7. Abrir el documento desde Cotizaciones o Comprobantes internos. Para PDF,
   pulsar Imprimir / Guardar PDF, elegir A4 y Guardar como PDF en el navegador,
   sin encabezados ni pies automáticos. No hay servidor de generación PDF.
8. Solo en una cotización aparece Añadir flyers. Los archivos se cargan desde
   Administrar Tours: flyers ES/EN. Se toma el idioma del documento (español por
   defecto). Las fotografías de portada no se convierten en flyers. Cada flyer
   distinto ocupa una página posterior, sin deformación. Si falta el flyer del
   idioma elegido se avisa. Sin marcar la opción solo se imprime el resumen.

## Archivos

- `js/skybike/app.js`: formulario, vista previa, guardado y pagos.
- `js/skybike/domain.js`: cálculo, validaciones, snapshots y operación de
  comprobante sobre copia del estado, sin persistir resultados parciales.
- `js/skybike/whatsapp.js`: propuesta conservadora del texto pegado.
- `js/skybike/documents.js`: plantillas seguras del comprobante, reserva y
  cotización; filtrado/deduplicación de anexos exclusivos de cotizaciones.
- `styles.css`: diseño del formulario y documentos, tablas con encabezados
  repetidos, filas largas divididas en bloques de continuación y salida A4.
- `tests/skybike-documents*`: pruebas de flujo, cálculos, PDF y móviles.

## Límites y pendientes

Es una demo local, no la versión final de producción. Se conserva el logotipo
original y la estructura verde del modelo. Dirección, RUC y contacto siguen
siendo marcadores ficticios; validar identidad, políticas y condiciones antes
 de producción. No se reutilizan datos personales de la captura.

Los descuentos son monetarios y no se agrega IGV. Los pagos se registran en PEN;
USD solo muestra el equivalente mediante el cambio guardado. Descripciones,
servicios, precios y flyers se guardan como copia al seleccionar; los documentos
anteriores no se recalculan con el catálogo nuevo. Los documentos antiguos sin
flyers guardados no incorporan retroactivamente imágenes del catálogo.

Pendientes: configuración comercial real aprobada, traducción integral ES/EN,
parser WhatsApp completo del original, descarga/archivo PDF en servidor,
compartición segura, Supabase/Auth/Storage, concurrencia, respaldos, Calendar y
migración validada. Mantener la matriz de funciones de etapa 1: no se ha eliminado
ninguna función del sistema Google, ni se afirma equivalencia total.

No SQL ejecutado, no datos migrados, no conexión SUNAT, no cambios en Apps Script.
La incorporación y publicación de esta rama requieren revisión manual. Las
pruebas locales no equivalen al análisis CodeQL remoto ni a una publicación.

## Verificación realizada

- `npm ci --ignore-scripts`, sintaxis, 27 pruebas unitarias, auditoría npm sin
  vulnerabilidades y build: correctos.
- Tres suites Chromium sobre `dist` servido por HTTP en `/mi-primera-web/`:
  flujo existente, administración A/B y flujo C/D/E: correctas.
- PDF real generado con Chromium y leído mediante Poppler: cotización con
  flyer = 2 páginas A4; sin flyer = 1 página. Comprobante con total S/ 120,
  adelanto S/ 30 y saldo S/ 90. Un adelanto de S/ 121 se rechaza.
- Resumen largo: 8 páginas A4, encabezado de tabla repetido y marcadores finales
  de incluye/no incluye conservados para los 8 tours. Filas de continuación
  menores que el alto imprimible. Revisión visual del comprobante renderizado.
- Formulario y comprobante a 390 px sin desbordamiento horizontal; las pruebas
  anteriores también recorren las 8 pantallas móviles.
- Datos ficticios exclusivamente. CodeQL y verificaciones GitHub requieren
  ejecución remota; sus resultados no se sustituyen por las pruebas locales.
