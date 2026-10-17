# Desarrollo de Nexo

## Entrega de cambios

- Usa el checkout existente; cada tarea cloud ya está aislada. No crees worktrees
  salvo petición explícita del usuario.
- Para cambios autorizados en el flujo Codex/GitHub, trabaja en una nueva rama
  `codex/<descripcion>` desde main actualizado. Conserva el trabajo existente.
  Guarda y sube esa rama; no escribas directamente en main ni uses force push.
- Ejecuta `npm ci --ignore-scripts`, `npm run check`, `npm test`,
  `npm run audit:security`, `npm run build` y las pruebas de navegador antes de
  subir. El runtime es Node.js 24. Consulta README.md para arrancar HTTP y
  `tests/browser.cjs` para configurar el navegador y la URL.
- Si algo falla, corrige e investiga. No omitas controles, rebajes auditorías,
  desactives verificaciones TLS ni modifiques pruebas para ocultar defectos.
  Distingue pruebas ejecutadas de controles remotos pendientes.
- El flujo de main crea la PR después del CI de una rama propia `codex/`, si la
  App y las variables están habilitadas. Verifica el enlace real; no afirmes que
  hay PR, auto-merge o despliegue sin confirmación de GitHub.
- Si no hay permisos API, el push de Git puede seguir funcionando. Guarda la rama
  y explica el paso de PR manual; no pidas claves privadas o tokens por chat.

## Alcance y seguridad

- Esta es una demo: sin emisión real, firma fiscal ni conexión SUNAT. No agregues
  credenciales al código ni al frontend. Consulta ARCHITECTURE.md.
- Conserva datos existentes al ampliar localStorage. Usa rutas relativas para
  GitHub Pages, escapa los valores que se muestran e incorpora pruebas del flujo.
- No cambies protecciones de main ni permisos del repositorio para hacer pasar
  la automatización. Los cambios sensibles exigen incorporación manual según
  AUTOMATION.md y CODEOWNERS. Toda nueva integración fiscal necesita una etapa
  independiente y autorización explícita del usuario.
