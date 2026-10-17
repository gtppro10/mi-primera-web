# Nexo · Cotizaciones y borradores para Perú

Demostración con catálogo visual: **demostración funcional**, con HTML, CSS y JavaScript sencillos.
No es un sistema de facturación electrónica operativo. No se usan credenciales
reales, no se envía información a SUNAT y los borradores **no tienen validez
tributaria**.

## Cómo abrirlo

Desde la carpeta del proyecto, con Python 3 instalado:

```bash
bash run.sh
```

En Windows también puedes ejecutar `py -m http.server 8000` desde esa carpeta.
En tu computadora abre `http://localhost:8000/` y mantén la terminal abierta.
Ctrl+C detiene el servidor. En Codex, localhost es la máquina remota: requiere
reenvío de puertos para abrirlo desde tu computadora; el visor de un archivo
individual no ejecuta esta aplicación. Los módulos JavaScript requieren HTTP.
No es necesario instalar dependencias ni compilar la aplicación.

## Recorrido de prueba

1. **Panel principal:** revisa las estadísticas de los registros ficticios.
2. **Clientes:** crea o edita un contacto con identificador de prueba, por
   ejemplo `DEMO-004`. No introduzcas información personal o credenciales reales.
3. **Productos y servicios:** busca por nombre o usa las categorías. Cada tarjeta
   tiene una ilustración local, categoría, precio sin IGV y botón **Agregar**.
4. Pulsa **Agregar** para formar la cotización actual. Si agregas otra vez un
   concepto, aumenta su cantidad. La selección se conserva al navegar o recargar.
5. Pulsa **Revisar cotización** (o **Ver selección** en celular). Elige cliente,
   ajusta cantidades y precios, aplica descuentos porcentuales por ítem o elimina
   conceptos. El descuento se aplica antes del IGV (18 % inicial, editable).
   Guarda la cotización como **Pendiente**; la selección queda vacía.
6. Usa **Ver** para revisarla y luego **Aprobar**.
7. Pulsa **Crear borrador**. Aparece en **Borradores de factura**, con el total y
   los datos conservados. Una cotización solo puede convertirse una vez.
8. Recarga: tus cambios permanecen en este navegador.

El cálculo es una simulación uniforme de IGV, no contempla detracciones,
exoneraciones mixtas, percepciones ni el conjunto de reglas tributarias.
Los datos viven en localStorage del navegador: no se sincronizan entre equipos,
no tienen respaldo y se pierden al borrar los datos del sitio. En esta etapa
no se incluyen inicio de sesión, eliminación de documentos guardados, edición de documentos guardados,
emisión, envío a SUNAT ni comprobantes fiscales.

## Archivos y próximos pasos

- `index.html`: estructura, navegación y aviso permanente de demostración.
- `styles.css`: diseño profesional adaptable a escritorio y celular.
- `script.js`: pantallas, formularios e interacción.
- `js/domain.js`: reglas y cálculos en céntimos, con descuento por ítem.
- `js/catalog.js` y `js/catalog-view.js`: categorías, búsqueda y tarjetas visuales.
- `images/`: ilustraciones SVG locales, sin servicios externos.
- `js/repository.js`: almacenamiento intercambiable por una API futura.
- `js/seed.js`: clientes, catálogo y cotizaciones ficticios.
- `js/sunat.js`: contrato de integración deshabilitado; nunca envía documentos.
- `ARCHITECTURE.md`: responsabilidades, limitaciones y evolución hacia backend,
  base de datos, usuarios e integración tributaria.

## Pruebas y automatización

Con Node.js 24 o superior:

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run audit:security
npm run build
```

Para las pruebas de navegador, con el servidor activo:

```bash
npx --no-install playwright install chromium
npm run test:browser
```

Puedes configurar `DEMO_URL` y `CHROMIUM_PATH`. Playwright es una dependencia de
pruebas, no un requisito para los visitantes. `dist/` contiene solo la versión
estática para publicar; no incluye pruebas ni configuración del repositorio.

**Consulta [AUTOMATION.md](AUTOMATION.md) para activar GitHub Actions**, la GitHub
App, protecciones de main y despliegue de Pages. La activación inicial requiere
permisos del propietario. No se ha activado desde Codex por falta de acceso a la
API de configuración de GitHub.

## Publicación

El flujo preparado utiliza **Settings → Pages → Source → GitHub Actions**,
no publicación directa desde una rama. Antes de incorporarlo, configura las
protecciones y permisos indicados en `AUTOMATION.md`. Solo se despliega un commit
de main después de pasar pruebas, auditoría y CodeQL.

La dirección esperada es https://gtppro10.github.io/mi-primera-web/.
Las rutas relativas y la navegación con `#` permiten usar esa subruta.
GitHub Pages sirve la demo, pero no proporciona backend ni base de datos.
Los datos creados en el navegador no se suben a GitHub.
