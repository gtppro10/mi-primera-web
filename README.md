# Nexo · Cotizaciones y borradores para Perú

Primera etapa: **demostración funcional**, con HTML, CSS y JavaScript sencillos.
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
3. **Productos y servicios:** crea o edita conceptos y su precio sin IGV.
4. **Cotizaciones → Nueva cotización:** selecciona cliente, conceptos y cantidades.
   El IGV comienza en 18 %, pero es editable por cotización (incluido 0 %).
5. Revisa subtotal, impuesto y total; guarda la cotización como **Pendiente**.
6. Usa **Ver** para revisarla y luego **Aprobar**.
7. Pulsa **Crear borrador**. Aparece en **Borradores de factura**, con el total y
   los datos conservados. Una cotización solo puede convertirse una vez.
8. Recarga: tus cambios permanecen en este navegador.

El cálculo es una simulación uniforme de IGV, no contempla detracciones,
exoneraciones mixtas, percepciones ni el conjunto de reglas tributarias.
Los datos viven en localStorage del navegador: no se sincronizan entre equipos,
no tienen respaldo y se pierden al borrar los datos del sitio. En esta etapa
no se incluyen inicio de sesión, eliminación, edición de documentos guardados,
emisión, envío a SUNAT ni comprobantes fiscales.

## Archivos y próximos pasos

- `index.html`: estructura, navegación y aviso permanente de demostración.
- `styles.css`: diseño profesional adaptable a escritorio y celular.
- `script.js`: pantallas, formularios e interacción.
- `js/domain.js`: reglas y cálculos en céntimos.
- `js/repository.js`: almacenamiento intercambiable por una API futura.
- `js/seed.js`: clientes, catálogo y cotizaciones ficticios.
- `js/sunat.js`: contrato de integración deshabilitado; nunca envía documentos.
- `ARCHITECTURE.md`: responsabilidades, limitaciones y evolución hacia backend,
  base de datos, usuarios e integración tributaria.

## Pruebas

Con Node.js 22 o superior:

```bash
node --test tests/domain.test.mjs
```

Con el servidor activo, Playwright y Chromium disponibles en el entorno de pruebas:

```bash
node tests/browser.cjs
```

Puedes configurar `DEMO_URL` y `CHROMIUM_PATH`. Playwright es solo una herramienta
de prueba; los visitantes no necesitan instalarlo.

## Publicar en GitHub Pages

1. Incorpora a `main` los cambios preparados en la rama de demostración.
2. En GitHub abre **Settings → Pages**.
3. Selecciona **Deploy from a branch**, rama **main**, carpeta **/ (root)** y guarda.
4. Espera el despliegue en **Actions** y abre el enlace indicado en **Pages**.

La dirección esperada es https://gtppro10.github.io/mi-primera-web/.
Los enlaces relativos y la navegación con `#` permiten usar esa subruta.
GitHub Pages sirve la demo, pero no proporciona backend ni base de datos.
Los datos creados localmente no se suben a GitHub.
