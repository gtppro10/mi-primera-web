# Automatización segura: Codex → GitHub → GitHub Pages

## Estado real

Los workflows y las pruebas están preparados en el repositorio. No se han
activado ni verificado los permisos del servidor de GitHub: la API devolvió
`Forbidden` en este entorno. Sí funciona la subida de ramas por Git.
La configuración inicial debe realizarla el propietario del repositorio.
Esta documentación no significa que el flujo remoto ya esté activo.

## Flujo después de la activación

1. Pide un cambio a Codex. Codex modifica el código, prueba y sube una rama
   `codex/...`. GitHub Actions no inicia por sí solo nuevas tareas de Codex.
2. `checks.yml` ejecuta instalación exacta desde el lockfile, revisión de sintaxis,
   pruebas de dominio y de política de automatización, auditoría npm y pruebas
   reales de navegador de la versión preparada para Pages.
3. Otro trabajo del mismo workflow ejecuta CodeQL con `security-extended`.
   Espera su resultado para el SHA exacto y bloquea ante cualquier resultado,
   advertencia o fallo de análisis; también bloquea si no logra confirmarlo.
4. `auto-pr.yml`, desde código de main y sin ejecutar código de la rama propuesta,
   crea una PR para ramas propias `codex/` subidas por `gtppro10`. Se crea también
   si fallan las pruebas para permitir revisión, pero no se autoriza auto-merge.
5. Si la opción está autorizada, los controles terminaron bien y se confirman las
   protecciones de main, solicita **auto-merge**. GitHub sigue exigiendo todos los
   checks y las aprobaciones configuradas. No se usa merge forzado, bypass ni
   actualización automática de main que evite verificaciones.
6. Al incorporarse a main, se repiten los controles sobre el commit de main.
   Solo su éxito completo activa `pages.yml`, que publica únicamente los recursos
   estáticos del SHA verificado. Los commits antiguos se omiten si main avanzó.
7. Si falla un control, no se publica esa versión. La web anterior sigue disponible.

Se usa una GitHub App con tokens temporales porque los eventos creados por el
`GITHUB_TOKEN` normal no suelen disparar otros workflows. La App permite que las
PR y las incorporaciones disparen las verificaciones y el despliegue esperado.
Su token se revoca al terminar el trabajo. No se guarda un token permanente en
el código. El token del workflow de CI es de lectura salvo el permiso específico
para cargar resultados CodeQL.

## Activación manual, en orden

### 1. Revisar este primer cambio

Abre una PR de la rama preparada hacia `main`. Este primer cambio añade workflows,
pruebas y dependencias, por lo que **debe revisarse e incorporarse manualmente**.
No puede autorizarse a sí mismo ni instalar una App por ti.

Antes de incorporar la PR, cambia **Settings → Pages → Build and deployment →
Source → GitHub Actions**. Esto sustituye la publicación directa desde una rama,
que no espera las pruebas de este flujo. Conserva las restricciones del entorno
`github-pages`; permite despliegues solo desde main. Si tiene revisores
obligatorios, la publicación seguirá esperando su aprobación.

### 2. Comprobar disponibilidad de Actions y CodeQL

En **Settings → Actions → General**, permite GitHub Actions y las acciones
oficiales empleadas (`actions/*` y `github/codeql-action`). Todas están fijadas
por SHA; Dependabot propondrá sus actualizaciones. Puedes conservar las políticas
más estrictas de tu organización. No hace falta conceder escritura global al
`GITHUB_TOKEN` ni permitirle aprobar PR.

En **Settings → Code security**, habilita CodeQL con **advanced setup** para
usar el workflow incluido; no mantengas otro análisis automático incompatible
sobre el mismo lenguaje. CodeQL está disponible para repositorios públicos;
los privados pueden necesitar GitHub Code Security según el plan. Si no está
habilitado o no hay licencia, el control falla y no hay publicación automática.
No quites ese control para eludir la restricción.

Activa también secret scanning y push protection si tu plan los ofrece. Las
claves se introducen únicamente en Settings, nunca en archivos ni en el chat.

### 3. Proteger main

En **Settings → Branches → Add classic branch protection rule**, protege `main`.
El guardián de esta versión comprueba la API de protección clásica; si utilizas
rulesets, consérvalos y agrega una regla clásica compatible. No elimines ni
reduzcas protecciones existentes. Si el plan no permite esta protección, no
actives auto-merge: puedes seguir usando PR y revisión manual.

Configura:

- Require a pull request before merging.
- Require review from Code Owners. `.github/CODEOWNERS` designa a `@gtppro10`
  para workflows, pruebas, scripts, dependencias y el adaptador SUNAT.
- Require status checks to pass, con estos nombres exactos:
  **Pruebas y auditoría** y **Análisis de seguridad**, de GitHub Actions.
  Los nombres aparecerán después de su primera ejecución.
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings / incluir administradores.
- Bloquear force push y eliminación de main.
- Sin excepciones de usuarios, equipos o Apps para omitir revisiones.

Mantén cualquier aprobación adicional, firma de commits, revisión de seguridad
u otra regla ya existente. Si se requiere una aprobación humana para toda PR,
el auto-merge esperará esa aprobación. No se debe rebajar ese requisito para
hacer que la automatización avance. Los cambios de workflows, pruebas,
dependencias y SUNAT siempre quedan para incorporación manual en esta versión.

En **Settings → General → Pull Requests**, habilita **Allow auto-merge** y permite
**Squash merging**. El historial de main conserva un commit por PR; el historial
completo de sus cambios sigue disponible en la PR.

### 4. Crear e instalar una GitHub App de repositorio

En tu configuración personal de GitHub, **Developer settings → GitHub Apps →
New GitHub App**, crea una App para esta automatización:

- Homepage URL: la URL de tu repositorio.
- Desactiva el webhook: estos workflows no lo necesitan.
- Instalable solo en tu cuenta; instálala **solo en mi-primera-web**.
- Repository permissions:
  - **Contents: Read and write** (habilitar incorporación de PR).
  - **Pull requests: Read and write** (crear PR y solicitar auto-merge).
  - **Administration: Read-only** (consultar protecciones; no cambiarlas).
  - **Checks: Read-only** (comprobar verificaciones del commit).
  - Metadata read es automático.
- No concedas bypass de las reglas, permisos de administración de escritura,
  acceso a todos los repositorios ni permisos SUNAT.

Genera una private key en la pantalla de la App. Guarda su contenido de manera
segura en el siguiente paso; no lo incluyas en el repositorio.

### 5. Autorizar las opciones del repositorio

En **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor / propósito |
| --- | --- | --- |
| Variable | `CODEX_APP_ID` | App ID numérico que muestra GitHub |
| Secret | `CODEX_APP_PRIVATE_KEY` | Contenido de la clave privada de la App |
| Variable | `CODEX_AUTOMATION_ENABLED` | `true` para permitir creación de PR |
| Variable | `CODEX_AUTOMERGE_ENABLED` | Primero `false`; luego `true` tras validar protecciones |

No es un token personal ni una clave de SUNAT. Los scripts nunca imprimen esa
clave. Si falta la App, no se crea una PR automáticamente; el resto de CI puede
seguir funcionando. Para detener solo auto-merge, cambia su variable a `false`
y cancela cualquier auto-merge pendiente en las PR abiertas. La variable no
cancela retroactivamente solicitudes ya habilitadas.

### 6. Verificar con un cambio pequeño

Después de incorporar el primer cambio y configurar los permisos:

1. Pide a Codex una modificación pequeña de texto o diseño en una nueva rama
   `codex/...`, con subida a GitHub. No es necesario abrir la PR manualmente.
2. Comprueba en **Actions → Verificaciones** que ambos trabajos terminen bien.
3. Comprueba que **Automatizar PR de Codex** cree la PR automáticamente.
4. Con auto-merge todavía desactivado, revisa la PR y las reglas de main.
5. Autoriza `CODEX_AUTOMERGE_ENABLED=true` y vuelve a ejecutar el workflow
   **Automatizar PR de Codex** desde la ejecución del commit válido, o sube un
   nuevo cambio. No es suficiente repetir solo el trabajo de pruebas de npm.
6. Comprueba que GitHub solicite/complete la incorporación según sus controles.
7. Revisa el nuevo **Verificaciones** en main y luego **Publicar en GitHub Pages**.
8. Abre la URL oficial mostrada por Pages y comprueba catálogo y cotizaciones.

Si la rama queda desactualizada con main, el auto-merge espera. Pide a Codex que
incorpore main en esa rama, resuelva conflictos y vuelva a probar/subir; no uses
bypass. El flujo no modifica ramas ajenas automáticamente.

El origen autorizado es la cuenta propietaria `gtppro10`; el prefijo `codex/`
es una convención y no demuestra por sí solo que el código lo escribió Codex.
No se aceptan forks ni otros autores para incorporación automática. Cambiar esta
política exige revisión del archivo de automatización.

## Recuperar una versión

No se hace reset de main ni force push. En la PR incorporada usa **Revert** para
crear una nueva PR que deshaga el cambio, o pide a Codex un `git revert` en otra
rama. Esa PR pasa por los mismos controles y vuelve a desplegarse si los supera.
Las PR, commits y ejecuciones de Actions conservan la trazabilidad. Los registros
de Actions y artefactos tienen retención limitada; Git conserva el historial de
código. Los datos localStorage no son una base de datos respaldada por Git.

## Alcance

Los análisis automáticos reducen riesgos, pero no certifican la ausencia de
vulnerabilidades. No se emiten facturas, no se conecta SUNAT y no se almacenan
credenciales fiscales. La primera activación y la comprobación del flujo en
GitHub quedan pendientes de tus permisos; ninguna prueba local sustituye esa
validación remota.
