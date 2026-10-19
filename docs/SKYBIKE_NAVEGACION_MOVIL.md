# Inicio y navegación Mobile First

El inicio `#panel` muestra nueve tarjetas siguiendo la referencia del usuario:
encabezado verde, logotipo original, tarjetas claras con iconos y textos breves.
No abre formularios ni tablas al entrar. En celulares hay dos columnas; desde
701 px hay tres. El contenido se desplaza verticalmente.

## Destinos

| Tarjeta | Pantalla |
| --- | --- |
| Facturación | Comprobantes de pago y recibos internos de demostración |
| Cotizaciones | Catálogo visual para seleccionar tours; acceso a cotizaciones guardadas |
| Reservas | Fechas, horarios y pasajeros de la etapa F |
| Pagos | Adelantos, movimientos y saldos |
| Tours | Administración; acceso al catálogo visual |
| Servicios | Administración de servicios adicionales |
| Clientes | Datos de clientes y pasajeros, historial de servicios |
| Administración | Pantalla informativa: configuración, usuarios y permisos pendientes |
| Reportes e historial | Reportes con acceso al historial y al resumen anterior |

Todas las pantallas de módulos tienen **Volver al inicio**. En celulares, el
botón Menú despliega la navegación secundaria, conservando accesos anteriores.
Al navegar se cierra ese menú, se vuelve arriba y el foco pasa al título. En
computadoras se conserva la barra lateral. Los enlaces usan hashes locales y
rutas relativas compatibles con la subruta de GitHub Pages.

El panel anterior sigue disponible en Reportes → Resumen de la agencia
(`#resumen`). No se eliminaron estadísticas, últimas cotizaciones, formularios,
operaciones, PDF ni flyers. Facturación se identifica como demo no fiscal;
Administración se marca Pendiente desde el inicio y no simula usuarios o ajustes.

## Archivos

- `js/skybike/navigation.js`: definición de tarjetas y enlaces entre módulos;
  pantalla informativa de administración pendiente.
- `js/skybike/app.js`: integración del nuevo inicio, resumen anterior, regreso,
  menú plegable y foco al cambiar de pantalla.
- `index.html`: botón accesible del menú móvil y acceso a administración.
- `styles.css`: distribución, tarjetas, iconos, cabecera y adaptación responsive.
- `tests/skybike-navigation.browser.cjs`: navegación en 320, 375, 390, 430, 768 y
  1440 px, nueve destinos, columnas, tamaños táctiles, desplazamiento, regreso,
  menú plegable y comprobación de que navegar no modifica los datos.
- `tests/browser.cjs`: cambia únicamente el título esperado del nuevo inicio.

La rama conserva el commit de etapa F, que todavía no figuraba en main al
comenzar esta tarea. La PR contra main incluye F si aún no se ha incorporado.
No se fusionó ni publicó ninguna rama como parte de este cambio.

Pruebas: instalación con lockfile, sintaxis, 38 pruebas unitarias, auditoría npm,
build y cinco suites Chromium de regresión/navegación sobre dist servido mediante
HTTP en `/mi-primera-web/`. CodeQL y los controles remotos se verifican en GitHub.

No se agregaron dependencias de ejecución, conexión SUNAT, autenticación,
operaciones SQL ni cambios en las reglas de cálculo. Se mantiene exclusivamente
el almacenamiento de demostración. La configuración y seguridad multiusuario
siguen pendientes de una etapa independiente.
