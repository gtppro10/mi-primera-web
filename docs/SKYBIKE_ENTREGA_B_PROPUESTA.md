# Entrega B · propuesta de autenticación y calendarios

**Estado: propuesta para revisión. No implementada ni activada.** La Entrega A
no crea un inicio de sesión simulado. Esta propuesta no ejecuta SQL, conecta
Supabase o Google Calendar, envía invitaciones ni modifica datos reales.
Tampoco cambia Google Apps Script ni conecta SUNAT.

## 1. Punto de partida y alcance

La aplicación actual es estática: HTML, CSS y módulos JavaScript, desplegables en
GitHub Pages. `js/skybike/repository.js` conserva datos ficticios en
`skybike-cusco-demo-v1`; eso no constituye autenticación, respaldo ni control de
acceso. El navegador puede modificar esos datos. No se utilizarán para decidir
identidades, permisos ni autoría de operaciones reales.

Se revisaron los módulos actuales de cotizaciones, reservas, pagos y documentos,
el [esquema propuesto](../supabase/001_skybike_proposal.sql) y su
[guía de permisos](../supabase/README.md). [ARCHITECTURE.md](../ARCHITECTURE.md)
describe la demo Nexo anterior: sirve como contexto histórico, no como prueba de
que esta arquitectura ya exista en Skybike.

El esquema propuesto ya contempla agencias, membresías, clientes, documentos,
reservas, pagos, versiones, auditoría y una cola de integraciones. Requiere una
revisión adicional para nombres de usuario privados, suspensión de cuentas,
autoría inmutable, permisos de trabajador y eventos separados para clientes.
**No se debe ejecutar el SQL actual suponiendo que cubre esta entrega.**

La Entrega B futura conservará el asistente de seis pasos, las numeraciones,
PEN/USD, descuentos, fotografías, flyers y documentos. Los comprobantes seguirán
siendo internos y sin validez de factura electrónica SUNAT. Los flyers seguirán
perteneciendo exclusivamente a cotizaciones.

## 2. Arquitectura propuesta

| Componente | Responsabilidad |
| --- | --- |
| Interfaz web HTTPS | Formulario usuario/contraseña y módulos; nunca decide permisos por sí sola |
| Servidor de aplicación/BFF | Resuelve usuario, administra sesión, valida permisos y recibe operaciones |
| Supabase Auth | Verifica contraseñas, proporciona identidades autenticadas y segundo factor |
| PostgreSQL con RLS | Aísla agencias y usuarios; aplica restricciones y transacciones |
| Supabase Storage privado | Fotografías y versiones PDF con acceso autorizado |
| Trabajador de integraciones | Consume una cola persistente para PDF, Calendar e invitaciones |
| Google Calendar API | Mantiene eventos mediante OAuth autorizado por el propietario |
| Servicio de correo autorizado | Envía invitaciones independientes cuando se soliciten expresamente |

GitHub Pages puede conservar la demo pública. Para la aplicación privada se
recomienda un alojamiento con servidor y dominio HTTPS propios, con interfaz y
BFF bajo el mismo sitio. Pages por sí solo no puede ejecutar el BFF, proteger
secretos ni impedir descargar su HTML público. Una pantalla de login delante de
JavaScript estático no sustituye la autorización de datos y operaciones.

La versión privada usará rutas de API protegidas y documentos en almacenamiento
privado. El servidor comprobará sesión, membresía activa, agencia y permiso en
cada solicitud; acceder directamente a una URL o modificar el frontend no
eludirá esos controles. Las rutas de documentos responderán con autorización,
sin servir PDF desde el directorio público de Pages.

Se propone una sesión del BFF con cookie `Secure`, `HttpOnly` y política
`SameSite` apropiada, rotación después del login y protección CSRF en escrituras.
El servidor conservará los tokens de Supabase fuera de JavaScript del navegador.
Se restringirán orígenes CORS y redirecciones a una lista explícita; CORS no se
considerará un control de autorización. No se guardarán contraseñas, tokens de
sesión reales ni claves de servicio en localStorage.

Para operaciones ordinarias, el backend consultará Supabase con el JWT del
usuario y RLS activa. Las operaciones transaccionales financieras se expondrán
mediante funciones controladas que comprueben identidad y permisos en el
servidor y la base de datos. La clave `service_role` omite RLS: se reservará a
tareas administrativas concretas, con comprobaciones explícitas, y nunca será
una vía general para aceptar parámetros del navegador.

## 3. Acceso con nombre de usuario y contraseña

El formulario mostrará el logotipo, «INICIAR SESIÓN», «Nombre de usuario»,
«Contraseña» y un botón de acceso, sin campo de correo. El correo de los clientes
es independiente de las cuentas de los trabajadores.

Flujo propuesto:

1. El navegador envía usuario y contraseña por HTTPS al BFF; ningún secreto se
   incorpora a URLs, registros de aplicación o herramientas de analítica.
2. El BFF normaliza el nombre con reglas publicadas y aplica límites por cuenta
   y origen. La regla inicial propuesta es un identificador ASCII de 3–32
   caracteres, sin distinguir mayúsculas; se validará antes de crear cuentas.
3. Una tabla de resolución en un esquema privado vincula el usuario único con
   `auth.users.id` y, si Supabase lo exige, un correo técnico. Esa tabla no tendrá
   lecturas públicas ni acceso directo de los trabajadores.
4. El BFF solicita la verificación a Supabase Auth. No compara contraseñas con
   valores guardados en JavaScript ni mantiene una segunda tabla de passwords.
5. Solo tras autenticar y comprobar cuenta/membresía activa se crea la sesión.
   Se registra el resultado sin contraseña, token ni datos innecesarios.

Los identificadores técnicos no se mostrarán en el formulario ni se devolverán
en errores. Su ocultación no será una barrera de seguridad: cualquier acceso a
la API seguirá necesitando identidad y autorización válidas.

Usuario inexistente, contraseña incorrecta, cuenta inactiva y usuario sin acceso
devolverán un mensaje neutral como «No se pudo iniciar sesión. Revisa tus datos o
contacta al administrador». Se normalizarán también código de respuesta y
comportamiento temporal, sin prometer tiempos idénticos. El camino de usuario
inexistente realizará una verificación equivalente controlada. Se probarán
diferencias observables y la resistencia a enumeración.

El límite inicial a evaluar será de cinco fallos por combinación cuenta/origen
en quince minutos, más un límite global por origen y un retraso progresivo.
Estos límites persistirán en servidor y se ajustarán en pruebas; no bastará un
contador local ni un bloqueo permanente que permita negar acceso a terceros.
Los límites de Supabase Auth seguirán activos. Se alertará sobre intentos
anómalos sin registrar el contenido de la contraseña.

El administrador inicial se aprovisionará desde un entorno confiable; no habrá
registro público que permita escoger el rol. Se exigirá segundo factor al
administrador, y reautenticación para modificar usuarios, permisos o conexiones.
La política de contraseña y recuperación se configurará en Auth, incluyendo
protección contra contraseñas comprometidas si está disponible en el plan.

## 4. Usuarios, permisos y suspensión

| Operación | Administrador | Trabajador |
| --- | --- | --- |
| Usuarios, roles y conexiones | Sí, con segundo factor | No |
| Tours y servicios | Sí | Solo consulta, salvo permiso específico aprobado |
| Cotizaciones | Sí | Crear/editar las operaciones autorizadas |
| Comprobantes y reservas | Sí | Crear y consultar según alcance asignado |
| Pagos | Sí | Solo con permiso explícito `payments.create` |
| Reportes y datos personales | Según necesidad | Solo alcance autorizado |
| Configuración sensible y auditoría completa | Sí | No |

El SQL previo utiliza `admin`, `sales`, `operations` y `accounting`. No se
eliminarán esos roles ni se transformarán silenciosamente usuarios existentes.
Se aprobará una correspondencia entre roles y capacidades antes de ampliar el
esquema. La interfaz puede mostrar Administrador/Trabajador; el backend comprobará
capacidades y alcance concreto, no solo el texto del rol.

El administrador podrá crear cuentas, asignar usuarios únicos, conceder permisos,
desactivarlas y comenzar el restablecimiento de contraseña. Es preferible una
credencial temporal de un solo uso o un proceso de activación que obligue al
trabajador a establecer su contraseña; el administrador no podrá consultar
contraseñas actuales. Un restablecimiento requerirá verificación de identidad,
expiración corta, token de un solo uso y revocación de sesiones previas. No se
enviarán contraseñas por chat ni se utilizará el correo de un cliente para
recuperar una cuenta de trabajador.

Desactivar una cuenta cambiará su estado en servidor, revocará sus sesiones y
refresh tokens y aumentará una versión de sesión. Cada operación del BFF
comprobará estado y versión vigentes; no confiará únicamente en claims antiguos.
Un access token puede seguir siendo válido hasta expirar: por eso las políticas
RLS comprobarán la membresía activa en la base y las rutas sensibles comprobarán
también la versión/suspensión. Se probará el bloqueo de una sesión que ya estaba
abierta y de una solicitud directa a la API.

Los permisos no podrán modificarse desde campos de formulario o metadatos de
usuario editables. Las revocaciones se aplicarán también a trabajos pendientes:
el worker verificará agencia y autorización vigente antes de ejecutar una nueva
acción externa, dejando constancia de una suspensión o revisión requerida.

## 5. Modelo de datos y RLS a revisar, sin ejecutar SQL

Las siguientes son ampliaciones conceptuales; este documento no aplica ni
reescribe migraciones:

| Entidad | Campos o reglas propuestos |
| --- | --- |
| Identidad privada de acceso | Nombre normalizado único, Auth user ID, estado y versión de sesión; sin contraseñas |
| Membresías/permisos | Agencia, usuario, rol, capacidades, activo y fechas de cambios |
| Reservas y comprobantes | Creador UUID y nombre histórico, creación servidor, último editor, modificación y versión |
| Auditoría | Actor y nombre histórico, acción, entidad, versión, diferencias permitidas, instante servidor y request ID |
| Conexión Google | Agencia, calendario autorizado, estado, scopes y referencia a secreto cifrado |
| Evento privado de agencia | Línea estable de tour, Google event ID, versión deseada/sincronizada, estado y revisión externa |
| Representación para cliente | ID opaco separado, campos permitidos, destinatario autorizado, UID ICS y versión |
| Cola/outbox | Tipo de operación, entidad, versión, clave idempotente, estado, intentos, próximo intento y error depurado |
| Entregas de invitación | Destinatario, consentimiento/acción solicitada, proveedor, estado real y clave idempotente |
| Versión PDF privada | Documento, versión, ruta privada, checksum, creador y fecha; sin enlace público permanente |

Se conservarán los campos históricos ocultos de tours y los snapshots de
documentos. No se importarán PIN, tokens ni contraseñas desde Apps Script.

Reglas de acceso exigidas:

- `anon` no lee ni modifica tablas Skybike, archivos privados, identidades de
  acceso ni auditoría. La página de acceso tampoco contiene registros reales.
- Toda relación mantiene `organization_id`; referencias entre agencias y IDs
  ajenos se rechazan aunque el cliente conozca el identificador.
- RLS verifica membresía activa y capacidad; no se permite autoasignar rol,
  cambiar agencia, alterar creador ni desactivar RLS desde una sesión de usuario.
- No se conceden escrituras directas a pagos, correlativos, documentos, reservas,
  auditoría o cola. El servidor recalcula totales, bloquea la reserva y escribe
  operación/auditoría/outbox en una misma transacción.
- Las claves de idempotencia se vinculan a agencia, operación y hash del payload:
  repetir los mismos datos devuelve el resultado anterior; reutilizar la clave
  con otros datos se rechaza. Restricciones y bloqueos impiden sobrepagos y
  numeración duplicada con dos dispositivos simultáneos.
- Los clientes externos no reciben acceso a las tablas internas. Un endpoint
  específico devuelve exclusivamente la representación permitida del tour.
- Storage será privado, con políticas y rutas por agencia. Se limitarán tamaño,
  tipo real de imagen/PDF y permisos de subida; no se confiará solo en extensión.

La atribución se obtendrá de la sesión verificada y se impondrá en servidor/base
de datos. Un `created_by`, nombre o fecha enviados por el navegador se ignorarán
o rechazarán. El creador original permanecerá inmutable después de editar;
`updated_by` y el historial describirán a los siguientes responsables. Cambiar el
nombre de usuario no reescribirá el nombre histórico. Cuentas archivadas se
conservarán referenciadas; no se borrará la autoría en cascada. Los registros
legados sin creador verificable se marcarán como «origen legado sin verificar»,
sin atribuirlos al usuario que realice una importación futura.

## 6. Conexión del calendario central

El propietario de **ludolfo1010@gmail.com** autorizará la conexión Google desde
Administración, con una sesión administrativa reforzada. Esa dirección identifica
el destino solicitado; no es una credencial ni demuestra que exista autorización.

El backend utilizará OAuth 2.0 con redirecciones HTTPS registradas, `state` de un
solo uso, protección de sesión y PKCE cuando corresponda. Se revisarán scopes
mínimos para operar eventos del calendario seleccionado. El propietario aprobará
el calendario exacto por ID y una prueba controlada; no se seleccionará otro
calendario porque falle la autorización.

El cliente OAuth, secretos y refresh tokens estarán en un gestor de secretos o
almacenamiento cifrado con clave fuera de la base pública. No se guardarán en
GitHub Pages, variables `PUBLIC_*`, el repositorio, localStorage o logs. Las
credenciales de despliegue serán independientes de Google. Se planificarán
rotación, revocación y eliminación de la conexión. La configuración de OAuth,
scopes y posible verificación de Google dependerá del tipo de aplicación y de
las políticas vigentes; no se dará por aprobada antes de verificarla.

La propiedad `visibility: private` no protege frente a personas con permisos
amplios en ese calendario. Se revisarán sus ACL: sin acceso público ni clientes
como invitados al evento interno, y solo personal autorizado. No se enviará la
descripción del evento interno en correos, enlaces de cliente ni archivos ICS.

## 7. Creación, actualización y cancelación de eventos

La interfaz ofrecerá calendarios **solo desde Facturación/Comprobantes**, después
de registrar y confirmar una operación vinculada a reserva y comprobante.
Cotizaciones no incluirá esos controles y su API tampoco podrá encolar eventos.
Reservas pendientes no generarán eventos. Un cambio posterior de reserva podrá
encolar una actualización/cancelación de un evento ya autorizado, sin habilitar
una vía de creación desde Cotizaciones.

La transacción de confirmación conservará una línea de tour estable y generará
un trabajo por tour. Dos tours en una reserva producen dos eventos con sus
propias fechas, horas y duraciones; no un evento agregado ni una duración fija.
Se utilizará `America/Lima` tanto al interpretar horas como al mostrarlas,
guardando instantes consistentes. El servidor validará duración y cambio de día.

El evento privado contendrá código de reserva, comprobante interno, cliente,
nombre del tour, horario, duración, pasajeros, lugar de encuentro y observaciones
operativas permitidas. Incluirá «RESERVA GENERADA POR: [nombre histórico del
creador]» obtenido de la sesión registrada al crear la reserva, no del usuario
que después sincronice. No se copiarán DNI, pasaporte, pagos, adelantos o saldos
al calendario. Las notas administrativas se separarán de las operativas.

Reglas de sincronización:

1. Unicidad por agencia y línea de tour; ID externo estable y clave idempotente
   determinística compatibles con Calendar. Un timeout no genera un nuevo ID.
2. El worker obtiene un trabajo con bloqueo/lease, verifica estado vigente y
   compara versión deseada y sincronizada. Trabajos viejos no sobrescriben cambios.
3. Crear, actualizar o cancelar conserva el vínculo local/remoto. Se usa la
   revisión/ETag cuando sea aplicable para detectar ediciones concurrentes.
4. Una cancelación deja una marca persistente y no borra el historial; quitar un
   tour cancela solo su evento. Una reprogramación mantiene el evento vinculado.
5. Antes de reintentar una creación incierta se consulta el ID estable. Un 404 de
   cancelación se trata como ya cancelado; una eliminación externa de un evento
   activo requiere reconciliación según política aprobada, sin recrearlo a ciegas.
6. Una edición manual en Google no sustituye automáticamente el estado comercial:
   se muestra el conflicto y se aplica la política de conciliación aprobada.

La reserva se guarda aunque Google esté temporalmente caído. La pantalla indicará
«Pendiente», «Sincronizando», «Sincronizado» o «Error: requiere revisión» según el
resultado persistido; no mostrará éxito solo por haber encolado el trabajo.

## 8. Invitaciones y archivos del cliente: representación independiente

El correo del cliente es opcional para guardar un comprobante. Para enviar una
invitación se valida el correo, se muestra destinatario/tours y el usuario
autorizado confirma expresamente el envío. No se envían mensajes al registrar
automáticamente cualquier correo. Se registra esa solicitud y su resultado real.

El cliente nunca se añade al evento privado de la agencia. Se genera otra
representación, con identificador y UID diferentes, a partir de una lista cerrada:

| Campo compartible | Contenido permitido |
| --- | --- |
| Título | Nombre público del tour |
| Inicio, fin y zona | Fecha, horario, duración y `America/Lima` |
| Lugar | Punto de encuentro aprobado para el cliente |
| Descripción | Datos públicos de contacto de SKYBIKE CUSCO |

El destinatario solo se usa para la entrega autorizada. No se incluyen nombre o
correo del trabajador, usuario interno, DNI/pasaporte, pagos, adelantos, saldos,
observaciones administrativas, códigos internos de acceso, descripciones privadas
ni URLs privadas del PDF. No se serializa el objeto reserva y luego se ocultan
campos: un constructor separado produce exclusivamente los campos de la tabla.
La misma regla se aplica a título, descripción, ubicación, adjuntos, propiedades
extendidas, metadatos, enlaces y contenido HTML, no solo al texto visible.

Opciones propuestas:

- **Google Calendar:** enlace de creación con campos permitidos o invitación
  desde un evento de clientes separado y restringido. El enlace no confirma que
  el cliente haya guardado nada. La invitación nunca usa la descripción interna.
- **Apple Calendar y Outlook:** descarga de un archivo `.ics` por tour; Outlook
  puede además ofrecer un enlace compatible con sus campos permitidos.
- **Invitación por correo:** mensaje independiente con ICS de cliente, enviado
  mediante un proveedor aprobado. No incorpora a clientes de reservas distintas
  como asistentes de un mismo evento ni expone sus direcciones entre sí.

Un nombre visible del organizador no oculta su correo: si se requiere invitación
desde Google se autorizará una identidad pública de atención adecuada y un
calendario de clientes separado. No se usará la cuenta personal del trabajador
ni se supondrá que cambiar `displayName` protege la dirección. El organizador y
remitente, sus scopes y la información realmente visible se comprobarán antes
de habilitar invitaciones automáticas.

El ICS usará un UID opaco estable por representación de cliente, `DTSTAMP`,
`SEQUENCE` creciente, `DTSTART`/`DTEND` y zona horaria explícita mediante
`TZID=America/Lima` con definición VTIMEZONE válida, o instantes UTC equivalentes.
Se escaparán caracteres, saltos y líneas según el formato ICS para impedir
inyectar propiedades o invitados. El UID no contendrá DNI, correo, usuario ni
código privado. Una descarga manual no necesita `ATTENDEE`; las invitaciones
incluirán únicamente al destinatario que se haya autorizado.

Las reprogramaciones usarán el mismo UID y una secuencia superior. Las
cancelaciones generarán una representación cancelada y, cuando exista una
invitación gestionada, `METHOD:CANCEL`/`STATUS:CANCELLED` con UID y secuencia
correctos. Importar manualmente un ICS o usar un enlace no garantiza que una
actualización posterior llegue al calendario del cliente: se explicará esa
limitación y se ofrecerá descargar/enviar la actualización. No se prometerá
sincronización bidireccional con Apple u Outlook sin desarrollar ese servicio.

## 9. PDF privados, errores y operación

Los PDF reales futuros se generarán desde un snapshot versionado, en un worker
de confianza y un bucket privado. El backend autorizará la lectura y emitirá
una URL firmada de corta duración, por ejemplo cinco minutos. No se insertarán
enlaces permanentes ni URLs firmadas en el evento del cliente. La política
concreta de descarga/compartición del PDF se aprobará por separado.

Una URL firmada es una credencial temporal para quien la posea; revocar una
cuenta no garantiza revocar un enlace ya emitido. Para revocación inmediata se
usará descarga a través del BFF con comprobación por solicitud. Se evitará
cachear respuestas privadas y se limitarán vida útil, permisos y trazas. Un
archivo ya descargado o reenviado no puede retirarse remotamente.

La cola tendrá reintentos con espera progresiva, dispersión y límite de intentos;
respetará `Retry-After` y cuotas del proveedor. Fallos 401/403 persistentes
detendrán reintentos automáticos y pedirán revisar autorización. Errores
permanentes irán a revisión manual; no se descartarán silenciosamente. Un reinicio
del servidor no perderá trabajos confirmados. Se reconciliarán tareas atascadas
y se harán respaldos verificables antes de operar datos reales.

Los logs registrarán IDs opacos, estado y error depurado; nunca contraseñas,
tokens OAuth, claves, cuerpo completo de reservas ni enlaces firmados. Se
definirán retención, acceso a auditoría y alertas de fallos. «Enviado» significará
aceptado por el proveedor; la entrega o lectura solo se indicará con evidencia
adicional. La cancelación de la hoja nativa de compartir no se informará como
envío exitoso.

## 10. Pruebas exigidas antes de activar

Estas pruebas son **pendientes de la Entrega B**, no resultados de la Entrega A.
Se ejecutarán en proyectos separados, con personas ficticias, bandejas de prueba
y calendarios de prueba; nunca sobre reservas o contactos reales.

| Riesgo / caso | Resultado exigido |
| --- | --- |
| Usuario/contraseña válidos e inválidos | Sesión real solo con credenciales válidas y membresía activa |
| Enumeración y fuerza bruta | Errores neutrales, límites persistentes y sin exposición del correo técnico |
| Reset y segundo factor | Token expirado/reutilizado falla; cambio sensible exige MFA/reautenticación |
| Cuenta desactivada con sesión abierta | Escrituras y lecturas privadas denegadas, incluido acceso directo a Supabase |
| Cambio de rol con token antiguo | El permiso revocado deja de operar sin esperar una nueva sesión |
| Manipular creador/agencia/fecha | Backend rechaza o ignora el dato; conserva creador original |
| Edición por otro trabajador | Conserva autor original y registra editor, fecha y versión |
| Anónimo u otra agencia | No accede a personas, archivos, reservas, configuración ni auditoría |
| Pago o confirmación concurrentes | Una operación por clave, sin numeración duplicada ni sobrepago |
| Dos tours y doble confirmación | Dos eventos estables, sin duplicados por doble clic o reintento |
| Timeout después de crear en Google | Reintento encuentra el mismo evento en vez de crear otro |
| Editar/cancelar con tareas fuera de orden | No revive un evento cancelado ni sobrescribe una versión más reciente |
| Cotización o comprobante no confirmado | No crea eventos ni invitaciones desde UI o API |
| Horario cercano a medianoche | Horas Lima y duración correctas en Google, Apple y Outlook |
| Privacidad de cliente | Ningún dato prohibido en JSON, URLs, ICS, correo, evento, adjuntos o metadatos |
| Cadenas maliciosas en nombres/notas | Sin XSS ni inyección de propiedades ICS o destinatarios |
| Fallo de Google, correo o worker | Operación conservada; estado pendiente/error y reintento verificables |
| PDF ajeno o enlace vencido | Acceso denegado; versión autorizada legible y sin flyers en comprobantes |
| Respaldo y recuperación | Recuperación demostrada sin perder auditoría, vínculos ni trabajos pendientes |

El modelo de amenazas cubrirá toma de cuenta, escalamiento de permisos,
referencias a registros ajenos, filtración entre agencias, abuso de cuentas
inactivas, replay de solicitudes, fuga OAuth, compartición accidental de agenda,
inyección en ICS y acceso a PDF por enlaces compartidos. Las pruebas incluirán
API/base de datos, no solamente botones ocultos en el navegador.

## 11. Configuraciones y autorizaciones manuales futuras

Antes de implementar o activar integraciones se deberá aprobar concretamente:

1. **Infraestructura:** alojamiento con backend HTTPS, dominio, costes, región,
   responsable operativo y separación demo/pruebas/producción.
2. **Supabase de pruebas:** creación del proyecto vacío, revisión de la migración
   ampliada y autorización explícita para ejecutarla allí. Producción requerirá
   otra revisión, respaldos y permiso separado; este documento no los autoriza.
3. **Acceso:** administrador inicial, política de nombres, contraseñas/MFA,
   recuperación y matriz de capacidades/visibilidad de trabajadores.
4. **Secretos:** gestores y permisos de despliegue. Se introducen únicamente en
   paneles seguros de los proveedores, nunca en el repositorio, frontend o chat.
5. **Google:** proyecto Cloud, Calendar API, pantalla de consentimiento, cliente
   OAuth, redirecciones, scopes y autorización del propietario de
   `ludolfo1010@gmail.com`. Revisar ACL del calendario antes de conectarlo.
6. **Clientes:** calendario/identidad pública de atención si se enviarán
   invitaciones, remitente y proveedor de correo, permisos, cuotas, consentimiento
   y contenido permitido. Un correo opcional por sí solo no autoriza un envío.
7. **Retención:** políticas de personas, auditoría, archivos, copias de seguridad,
   acceso a PDF y eliminación/archivado, conforme a las obligaciones aplicables.
8. **Publicación:** revisar PR, pruebas de seguridad y prueba de recuperación.
   Mantener los controles del repositorio y autorizar despliegue por separado.

No se necesitan contraseñas ni tokens enviados al chat para revisar esta
propuesta. La autorización OAuth se realiza en Google; los secretos se
configuran mediante los mecanismos seguros del alojamiento y Supabase.

## 12. Secuencia de entrega y criterio de aceptación

1. Aprobar arquitectura, permisos, privacidad y presupuesto. Diseñar el esquema
   ampliado y sus pruebas sin reemplazar la demo ni el sistema Apps Script.
2. Implementar backend/Auth en un entorno aislado; validar RLS, suspensión,
   recuperación, MFA y autoría inmutable antes de cargar información sensible.
3. Conectar repositorio remoto mediante una capa de acceso compatible y probar
   reservas, pagos concurrentes, documentos y auditoría con datos ficticios.
4. Añadir outbox y Calendar de pruebas. Verificar duplicados, actualización,
   cancelación y privacidad de la representación del cliente.
5. Autorizar y probar invitaciones/correo y enlaces ICS; comprobar lo visible en
   cuentas externas reales de prueba de Google, Apple y Outlook.
6. Revisar resultados y aprobar activación. Una migración real, si se solicita,
   tendrá plan separado con copia de origen de solo lectura, staging,
   conciliación de totales, trazabilidad y reversión; nunca borrará el original.

La Entrega B se considerará lista únicamente cuando esas garantías se hayan
probado contra servicios de prueba y el propietario apruebe la configuración.
Hasta entonces Administración debe indicar que el login y los calendarios
están pendientes; no se mostrará una protección simulada ni se afirmará que un
evento, invitación o sincronización se haya realizado.
