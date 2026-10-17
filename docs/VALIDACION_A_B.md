# Validación de etapas A y B

## Comprobaciones ejecutadas

- `npm ci --ignore-scripts`: instalación exacta del lockfile.
- `npm run check`: sintaxis JavaScript válida.
- `npm test`: **22 aprobadas**, 0 fallidas, omitidas o canceladas.
- `npm run audit:security`: 0 vulnerabilidades reportadas en esta ejecución.
- `npm run build`: versión estática generada, sin SQL o adjuntos originales.
- `npm run test:browser`: dos suites Chromium aprobadas, probadas por HTTP en
  `/mi-primera-web/` sobre el contenido de dist/.
- SQL: 44 sentencias y bloques PL/pgSQL analizados mediante pglast 7.2, sin
  conexión de base de datos y sin ejecución de SQL.

## Navegador A/B

Alta y edición de tour con código, categoría nueva, PEN, referencia USD, duración,
horarios, descripciones, itinerario, incluye/no incluye y observaciones. Se cargó
portada, galería y flyers oficiales en ES/EN y se recuperaron tras recargar.
Se probó quitar una imagen de galería antes de guardar.

Se rechazaron archivos cuyo contenido no correspondía al MIME y una carga de
más de seis imágenes. Se verificó el error de cuota de almacenamiento: los datos
previamente guardados permanecieron idénticos.

Se probaron desactivación y ausencia en catálogo; archivo con código incorrecto
rechazado y correcto aceptado; restauración como inactivo y activación explícita.
No se borró el registro. Se crearon y editaron servicios con modalidad por reserva.

La selección mediante fotografía y Agregar produjo una cotización con el tour
nuevo y el servicio nuevo. Se convirtió a reserva y recibo usando el flujo ya
existente; el recibo del tour con flyers oficiales no contenía ninguno de esos
flyers. Su incorporación a cotizaciones PDF sigue pendiente de E.

Se compararon cotizaciones, reservas, recibos y pagos anteriores antes y después
de administrar el catálogo: permanecieron idénticos. Los cambios sí generaron
nuevos eventos locales de historial.

Se probaron pantallas de administración y formulario a 375 px, sin desbordar la
página. La suite de regresión también verifica ocho vistas móviles, descuentos
por pasajero, varios tours, adicionales, pagos/saldos, persistencia e impresión.

## Límites de la validación

No se ejecutó SQL ni se probaron políticas en Supabase. No se conectó el proyecto
facturacion-peru-demo, Apps Script, Drive, Calendar o SUNAT. La demo aún no tiene
roles reales ni seguridad de servidor. CodeQL remoto y despliegue no se dan por
verificados desde esta sesión; los workflows existentes se conservan.

El modelo de comprobante compartido está registrado en REFERENCIA_COMPROBANTE.md.
No se cambió su diseño ni se implementaron las etapas C–H. No se publicó el sitio.
