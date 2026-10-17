> Documento de la demo Nexo anterior, conservado como referencia. La etapa actual
> Agencia Skybike Cusco está descrita en `docs/SKYBIKE_ETAPA_1.md` y
> `supabase/README.md`. No representa una migración ejecutada.

# Arquitectura de la demostración Nexo

## Etapa 1: lo que funciona

Aplicación estática de HTML, CSS y módulos JavaScript, sin compilación ni
paquetes de producción. Navegación mediante fragmentos (`#clientes`, etc.),
compatible con la ruta de un proyecto en GitHub Pages.

- Panel con estadísticas calculadas a partir de los registros de la demo.
- Alta y edición de clientes con identificadores ficticios y control de duplicados.
- Catálogo visual con imágenes locales, categorías y búsqueda. Alta y edición
  de productos o servicios con precios sin IGV.
- Selección persistente del catálogo y cotizaciones con varios conceptos,
  cantidades decimales, precios editables, descuentos por ítem, notas e IGV editable.
- Aprobación de cotizaciones y conversión única a un borrador de factura.
- Consulta de documentos y persistencia en localStorage del navegador.

## Responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura general y navegación accesible |
| `styles.css` | Diseño adaptable, tablas, formularios y ventanas de diálogo |
| `script.js` | Vistas, eventos y coordinación de los casos de uso |
| `js/domain.js` | Cálculo de importes y reglas de aprobación/conversión |
| `js/repository.js` | Lectura y escritura local; punto de sustitución por una API |
| `js/seed.js` | Datos ficticios iniciales |
| `js/catalog.js` y `js/catalog-view.js` | Categorías, búsqueda y catálogo visual |
| `images/` | Ilustraciones SVG locales por categoría |
| `js/sunat.js` | Contrato deshabilitado para una futura integración |
| `run.sh` | Servidor estático para desarrollo |
| `tests/` | Pruebas de reglas y de flujos en navegador |

El estado contiene `clients`, `products`, `quotes` e `invoices`, con IDs internos.
Las cotizaciones y borradores conservan copias del cliente y de sus conceptos;
las ediciones posteriores del catálogo no alteran esos documentos. Los estados
son Pendiente → Aprobada → Convertida. Una conversión genera un único Borrador.
No hay emisión de factura. Los códigos COT y BOR son referencias internas demo.

Los importes brutos se redondean a céntimos por concepto. El descuento es un
porcentaje entre 0 y 100 % sobre cada importe bruto; se redondea a céntimos y
se resta antes de calcular el IGV sobre la suma neta. Los documentos anteriores
sin campo de descuento se interpretan como 0 %, conservando sus importes. Se aplica una única tasa a toda la cotización. Es un cálculo de
simulación, no una implementación completa de las reglas tributarias peruanas.

## Evolución futura (no implementada)

1. **Backend y base de datos:** sustituir el repositorio local por una API HTTPS;
   incorporar validación del lado servidor, migraciones, transacciones,
   idempotencia y numeración concurrente. Las cotizaciones/borradores necesitan
   relación con la empresa, el usuario y la versión del documento.
2. **Autenticación:** sesiones seguras, autorización por empresa y rol y auditoría.
   El avatar actual es decorativo. No existe inicio de sesión ni aislamiento
   multiusuario. La demo no debe almacenar información confidencial.
3. **Integración tributaria:** backend con secretos y certificados administrados
   de forma segura, validación de RUC y tipos de operación, catálogos SUNAT,
   UBL/XML, firma, ambientes de prueba, transporte aplicable y procesamiento de
   respuestas/CDR. Antes de producción se deben validar requisitos vigentes,
   permisos y normativa. No poner credenciales en el navegador ni GitHub Pages.

`sunatGateway.send()` siempre rechaza el envío. No hay llamadas de red de la
aplicación, autenticación, firma, PDF fiscal ni conexión con SUNAT. Todos los
borradores indican que carecen de validez tributaria.

## Límites del almacenamiento

Los datos viven solo en el navegador y origen actuales. No se sincronizan entre
computadoras ni con GitHub. Borrar los datos del sitio los elimina. No hay
respaldo, control de concurrencia entre pestañas ni protección contra edición
manual del almacenamiento. Si el almacenamiento falla, se informa sin fingir
un guardado exitoso ni borrar automáticamente los datos existentes.

## Validación

Con Node.js 22 o superior: `node --test tests/domain.test.mjs`.
Con el servidor de `bash run.sh` activo: `node tests/browser.cjs`.
La segunda prueba requiere Playwright y Chromium instalados en el entorno de
pruebas. `DEMO_URL` y `CHROMIUM_PATH` permiten cambiar URL y navegador. Las
capturas de diagnóstico se guardan en `/tmp`, fuera del repositorio.

## Selección actual y compatibilidad

El estado incorpora `draft` (cliente, tasa IGV, notas y líneas de selección).
Las líneas incluyen un ID propio, producto de origen, descripción copiada,
cantidad, precio y descuento. Guardar una cotización crea su copia y vacía la
selección. La selección incompleta no se convierte en documento hasta validar
el formulario. Agregar el mismo producto incrementa su cantidad, sin reemplazar
precios o descuentos editados. Cambiar el catálogo no altera las líneas añadidas.

El repositorio migra de forma aditiva los datos locales anteriores: asigna
categorías a los conceptos conocidos y crea una selección vacía si falta. No
borra clientes, productos, cotizaciones ni borradores. Las instalaciones nuevas
incluyen ocho conceptos de ejemplo; no se inyectan productos nuevos en las
instalaciones existentes. Puedes crearlos con Nuevo concepto.

## Entrega continua

`AUTOMATION.md` describe CI, CodeQL, auditoría, App con tokens temporales,
creación de PR, política de auto-merge, protecciones y publicación. La App nunca
ejecuta código de la rama propuesta en su workflow privilegiado. Los cambios de
seguridad, pruebas, dependencias y SUNAT requieren incorporación manual.
