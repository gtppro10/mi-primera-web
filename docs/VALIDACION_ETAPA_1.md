# Validación de etapa 1 · Skybike Cusco

## Ejecutado en esta sesión

| Comprobación | Resultado |
| --- | --- |
| `npm ci --ignore-scripts` | Instalación exacta del lockfile completada |
| `npm run check` | Sintaxis JavaScript válida |
| `npm test` | 16 pruebas aprobadas; 0 fallidas, omitidas o canceladas |
| `npm run audit:security` | 0 vulnerabilidades reportadas por npm en esta ejecución |
| `npm run build` | Recursos estáticos creados en dist/, sin SQL ni adjuntos |
| Actionlint 1.7.7 | Workflows sin errores de validación |
| Parser PostgreSQL pglast 7.2 | 44 sentencias y cuerpos PL/pgSQL analizados; NO ejecutados |
| Playwright + Chromium | Flujo completo aprobado por HTTP |

Las 16 pruebas incluyen ocho de negocio/almacenamiento Skybike, cinco de reglas
compatibles de la demo Nexo anterior, dos de la política de automatización y una
revisión estática del SQL. La revisión SQL no sustituye pruebas RLS reales.

## Navegador

Probado tanto sobre el checkout por HTTP como bajo `/mi-primera-web/`:

- Todas las fotografías de referencia cargan desde el servidor local.
- Búsqueda por texto sin acentos y selección de varios tours y adicionales.
- Rechazo de archivo no válido y carga/persistencia de una foto JPG de prueba.
- Cliente ficticio con texto HTML mostrado sin ejecución.
- Dos pasajeros del tour de S/ 120 con descuentos individuales de S/ 10 y S/ 20:
  S/ 210; un segundo tour de S/ 95 y alimentación de S/ 25 por persona suman
  S/ 355. No se añade IGV automático.
- Selección y descuentos recuperados después de recargar.
- Cotización pendiente → aprobada → reserva y recibo demo.
- Pago de S/ 356 rechazado para total S/ 355; pago de S/ 100 aceptado, saldo S/ 255.
- Registro de pasajero ficticio e historial actualizado.
- Recibo conserva el total y muestra el saldo vigente.
- Botón de impresión invoca la función y Chromium genera un PDF A4 válido.
  En impresión se oculta la navegación y permanece el documento.
- Flyer demo imprimible con imagen y contenido de referencia.
- Ocho vistas a 375 px sin desbordar la página; las tablas se desplazan dentro.
- Ninguna solicitud a servicios externos ni errores JavaScript.
- Clave de datos anterior `nexo-demo-v1` sin modificaciones.
- Bloqueo de almacenamiento comunicado sin fingir un guardado exitoso.

## No ejecutado / pendiente

- Aplicación del SQL, pruebas RLS con usuarios/roles y validación de constraints
  sobre una base Supabase: expresamente fuera de la autorización de esta etapa.
- Backend transaccional, autenticación y conexión con base central.
- Pruebas contra datos, Calendar, Drive o Apps Script originales.
- CodeQL y despliegue remoto en GitHub: dependen de los permisos y configuración
  descritos en AUTOMATION.md; las verificaciones locales no prueban su activación.
- Equivalencia completa de documentos y todas las funciones originales: ver la
  matriz en SKYBIKE_ETAPA_1.md. No se ha hecho un cambio del sistema operativo.
