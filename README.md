# Agencia Skybike Cusco · Etapas A y B

Demo web de la migración aprobada: **solo datos ficticios**. No conecta Google,
Supabase ni SUNAT y no reemplaza el sistema operativo de Apps Script.

## Probar la aplicación

Con Python 3, desde esta carpeta:

```bash
bash run.sh
```

En Windows puedes usar `py -m http.server 8000`. Abre `http://localhost:8000/`
en el mismo ordenador donde ejecutas el servidor. Mantén la terminal abierta;
Ctrl+C lo detiene. Desde Codex cloud, localhost es remoto y no es una URL pública.
Para compartir, incorpora los cambios mediante PR y usa GitHub Pages según
`AUTOMATION.md`. No abras index.html en un visor de archivos: usa HTTP.

1. En **Catálogo de tours**, busca o filtra por categoría y pulsa **Agregar**.
2. Agrega varios tours y sus servicios adicionales. Cada tour conserva su salida.
3. En **Revisar cotización**, elige cliente, fecha/hora, pasajeros y precio.
4. Define un descuento en soles por persona o usa **Personalizar descuento por
   pasajero**. No son porcentajes y no se añade IGV automáticamente.
5. Guarda la cotización; revísala y apruébala en **Cotizaciones**.
6. Crea una reserva. Se genera también un recibo de demostración.
7. En **Pagos y saldos**, registra un pago ficticio en PEN y revisa el saldo.
8. Registra pasajeros en **Clientes y pasajeros** y consulta **Historial**.
9. Abre recibos/fichas y usa **Imprimir / Guardar PDF**. Es impresión del
   navegador, no el generador PDF del servidor original.
10. Cambia una fotografía desde su tarjeta (JPG/PNG/WebP, hasta 2 MB).

Las fotografías distribuidas son paisajes de referencia, **no fotos de los tours
reales**. Fuente/licencia: `images/skybike/SOURCES.md`. Los datos viven solamente
en `skybike-cusco-demo-v1` del navegador; la demo Nexo anterior queda intacta.
No hay autenticación real, sincronización, respaldo ni garantías multiusuario.

## Administración de tours y servicios

Abre **Administrar Tours** o **Servicios Adicionales**. Puedes crear y editar
registros, activar/desactivar, archivar con confirmación y restaurar. Los tours
incluyen galería y flyers ES/EN; los flyers oficiales solo se almacenan para su
uso posterior en cotizaciones PDF, nunca en recibos. Los datos y medios siguen
siendo locales y ficticios. Consulta `docs/SKYBIKE_ETAPAS_A_B.md`.

## Archivos y alcance

- `index.html` / `styles.css`: estructura y diseño adaptable.
- `script.js`: entrada de la nueva demo.
- `js/skybike/app.js`: módulos, catálogo, formularios, imágenes e impresión.
- `js/skybike/admin.js`, `admin-ui.js` y `media.js`: administración y cargas seguras.
- `js/skybike/domain.js`: descuentos, cotizaciones, reservas, recibos y pagos.
- `js/skybike/repository.js` / `seed.js`: almacenamiento aislado y datos ficticios.
- `supabase/001_skybike_proposal.sql`: esquema y RLS **preparados, NO ejecutados**.
- `supabase/README.md`: roles, límites y validaciones pendientes de base de datos.
- `docs/SKYBIKE_ETAPA_1.md`: resultados y matriz de todas las funciones originales,
  incluidas las que se desarrollarán en etapas posteriores.
- `ARCHITECTURE.md`: contexto de la demo anterior; no describe la nueva aplicación.
- `AUTOMATION.md`: flujo de Actions/PR/Pages preparado anteriormente. Su activación
  remota depende de los permisos documentados; no se afirma que esté activo.

Los originales Code.gs e Index.html adjuntos no se han ejecutado ni publicado en
el repositorio. No se accedió a hojas, pagos, archivos o reservas reales.

## Pruebas de desarrollo

El panel principal muestra cuatro indicadores calculados con los datos guardados
de la demo y nueve accesos rápidos. El menú lateral agrupa las operaciones y tiene
desplazamiento propio en computadoras. Las tarjetas se adaptan a dos columnas en
celulares y hasta cuatro en pantallas grandes; Administración sigue pendiente.

Al entrar en Nueva cotización se abre directamente la etapa guardada del
asistente. Su barra superior mantiene Anterior, Siguiente y Volver al inicio
visibles al desplazarse; el catálogo y las cotizaciones guardadas conservan sus
propias pantallas de entrada. Los errores de validación aparecen bajo la barra,
sin avanzar de etapa ni borrar el borrador.

Con Node.js 24:

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run audit:security
npm run build
npx --no-install playwright install chromium
npm run test:browser
```

La prueba de navegador necesita el servidor HTTP activo. `DEMO_URL` permite
probar la subruta de Pages; `CHROMIUM_PATH` permite usar un Chromium instalado.
`dist/` incluye solo recursos estáticos, sin SQL, pruebas, secretos o adjuntos.
No hay ninguna tarea que aplique SQL a Supabase.

## Antes de una etapa siguiente

No usar la demo con datos reales. Se requiere autorización separada para crear
un proyecto de pruebas Supabase, aplicar SQL y validar las políticas con usuarios
de distintas agencias. La generación PDF de servidor, traducciones, versiones,
Calendar, WhatsApp, no-show/devoluciones y demás equivalencias están registradas
en la matriz de conservación; no se han eliminado del sistema original.

## Comprobantes y cotizaciones A4 (C/D/E)

Consulta [la guía de C/D/E](docs/SKYBIKE_CDE.md) para WhatsApp, adelantos,
servicios por tour y PDF con flyers exclusivos de cotizaciones. La generación
usa Imprimir / Guardar como PDF del navegador. Solo datos ficticios.
Las pruebas PDF requieren `pdfinfo` y `pdftotext` (paquete `poppler-utils`).
Esta rama requiere revisión e incorporación manual; no autoriza publicación.

## Etapa F: gestión de la agencia

Reservas con edición y búsqueda, pasajeros por tour, pagos con control de
duplicados/sobrepagos, historial filtrado y reportes. Consulta la
[guía de etapa F](docs/SKYBIKE_ETAPA_F.md) para uso, reglas y límites de la demo.
Los documentos A4 y el catálogo siguen disponibles; no hay conexión a Supabase,
Google ni SUNAT. Esta rama requiere revisión e incorporación manual.

## Inicio Mobile First

El inicio ahora es un menú de nueve tarjetas, con dos columnas en celulares,
regreso visible desde cada módulo y menú secundario plegable. Administración
está identificada como pendiente. Consulta la [guía de navegación](docs/SKYBIKE_NAVEGACION_MOVIL.md).

## Fase 1 de la especificación maestra

Cotizaciones ahora utiliza un asistente de seis pasos con borrador independiente,
catálogo compacto y equivalencias PEN/USD. La preferencia ES/EN se guarda; la
traducción integral del PDF y el envío WhatsApp pertenecen a la fase 2. Consulta
[la guía de fase 1](docs/SKYBIKE_FASE_1.md) para funciones, pruebas y pendientes.

## Entrega A: confirmación y PDF como archivo

Después de guardar una cotización se puede abrir/compartir un PDF real o editar
conservando el mismo número. Tours conserva su contenido histórico oculto;
Facturación permite correo de cliente validado. Ejecuta `npm ci --ignore-scripts`
y `npm run build` para preparar las bibliotecas PDF locales antes de servir la web.
Consulta la [guía de Entrega A](docs/SKYBIKE_ENTREGA_A.md) y la
[propuesta de Entrega B](docs/SKYBIKE_ENTREGA_B_PROPUESTA.md). El login real y
Google Calendar no están activados; no hay una protección de acceso simulada.
