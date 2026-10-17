# Agencia Skybike Cusco · Etapas A y B

## Cambios frente al original y la etapa 1

Se revisaron los campos y funciones de administración de tours en los adjuntos
Code.gs e Index.html. El original contiene alta/edición, estado, duración para
Calendar, incluye/no incluye y flyers ES/EN. La etapa 1 solo ofrecía catálogo y
cambio de fotografía. Esta entrega completa la administración local y amplía su
contenido según la instrucción maestra. No es otro proyecto desde cero.

## A. Interfaz

- Se conserva el verde y blanco, con acento verde oliva del modelo proporcionado.
- Se reutiliza el logotipo original sin copiar PIN, IDs privados ni configuración.
- Accesos funcionales a cotizaciones, tours, servicios y comprobantes internos.
- Catálogo seleccionable por fotografía o Agregar, descripción breve y categorías
  dinámicas: una categoría nueva aparece sin modificar código.
- Formularios de administración organizados en secciones desplegables.
- Diseño móvil, confirmaciones y errores visibles; no hay botones que simulen
  funciones de etapas futuras ni permisos de usuario ficticios.

## B. Administración

**Administrar Tours:** nombre, categoría, código único, precio PEN, precio USD
referencial opcional, duración, minutos operativos, horarios, descripción breve y
completa, itinerario, incluye/no incluye, recomendaciones, observaciones y estado.

**Administrar Servicios:** nombre, código, categoría, precio, modalidad por
persona/unidad/reserva, descripciones, imagen y estado. La modalidad se conserva
al agregar el servicio a una cotización.

**Medios:** portada, hasta seis imágenes de galería y hasta seis flyers por tour,
cada flyer con idioma ES/EN. JPG/PNG/WebP hasta 2 MB por archivo. Se valida tipo,
firma de archivo y decodificación; no se aceptan SVG/HTML disfrazados. Hay vista
previa y retirada de adjuntos del formulario antes de guardar. No se carga en red.
En el almacenamiento local solo se mantiene el conjunto guardado; el archivo
histórico/versionado de medios pertenece al futuro Storage y no se simula aquí.

**Baja controlada:** Archivar requiere escribir el código del registro. Oculta el
registro del catálogo sin borrarlo ni eliminar documentos. Restaurar lo deja
inactivo para revisión antes de activar. Desactivar impide guardar nuevas
cotizaciones que todavía contengan ese registro; las cotizaciones guardadas,
reservas, recibos y pagos no cambian.

## Flyers: separación obligatoria

Los archivos oficiales se guardan en `product.flyers`, separados de portada y
galería. Se muestran solo en Administración de Tours durante esta etapa. No se
adjuntan a recibos ni reservas. Las fichas informativas que ya existían usan la
fotografía principal, no el flyer oficial; se renombraron para evitar confusión.
La incorporación exclusiva a cotizaciones PDF se implementará en E, no en A/B.

## Persistencia y límites

Se conserva `skybike-cusco-demo-v1`; los registros previos reciben valores por
defecto de manera aditiva al leerlos. No se elimina su contenido ni se modifica
`nexo-demo-v1` o Google. Los documentos conservan snapshots; editar precios,
textos o estado del catálogo no cambia sus importes.

Las cargas pendientes bloquean Guardar. Si el navegador se queda sin cuota,
se informa y se conservan los datos guardados. No hay respaldo, multiusuario ni
permisos reales: sigue siendo una demo con datos ficticios. El precio USD es
referencial del catálogo; los documentos mantienen la conversión por tipo de
cambio existente, cuya ampliación pertenece a C.

## Archivos principales

- `js/skybike/admin.js`: validaciones, códigos únicos, edición, estado y archivo.
- `js/skybike/admin-ui.js`: formularios, galerías, flyers y administración visual.
- `js/skybike/media.js`: validación de imágenes sin llamadas externas.
- `app.js`, `index.html`, `styles.css`: integración y mejoras de interfaz.
- `domain.js`: rechazo de tours/servicios inactivos en nuevas cotizaciones.
- `repository.js`: ampliación compatible de los registros locales.
- `supabase/001_skybike_proposal.sql`: propuesta actualizada con código interno,
  USD, descripciones, itinerario, horarios y archivo. **No ejecutada.**

El proyecto Supabase indicado por el usuario es `facturacion-peru-demo`. No se
inspeccionó ni conectó; antes de aplicar cualquier SQL se deberá revisar su
estructura real con autorización. Ninguna etapa A/B aplica SQL o migra datos.

## Verificación

- Pruebas unitarias de creación/edición, duplicados, precios/horarios inválidos,
  modalidades, archivo/restauración y conservación de documentos.
- Pruebas de navegador de alta/edición de tours y servicios, imágenes/galería,
  flyer EN, persistencia, estado, confirmaciones y límites de almacenamiento.
- Se repite el flujo comercial de la etapa 1: múltiples tours, descuentos por
  pasajero, reserva/recibo, pagos/saldos, impresión y vista móvil.
- Se comprueba que un flyer oficial subido no aparezca dentro de un recibo.

No se implementó C, D, E, F, G ni H como parte de esta entrega. No se modificó el
sistema original, no se conectó SUNAT y no se publicó una versión nueva.
El modelo de comprobante recibido se documenta en REFERENCIA_COMPROBANTE.md.
