# Supabase · propuesta de etapa 1

**No ejecutar todavía.** El archivo `001_skybike_proposal.sql` es un diseño para
revisión, no una migración aplicada. No se creó un proyecto ni se accedió a datos.
No se debe ejecutar sobre una base de producción o sobre el sistema de Google.

## Entidades

Incluye agencias y membresías, categorías, catálogo y etapas, fotografías/flyers,
clientes y pasajeros, cotizaciones/recibos con líneas y descuentos por pasajero,
reservas y salidas, pagos/devoluciones, no-show, versiones documentales, Calendar,
cola de integraciones, auditoría, configuración, correlativos y trazabilidad de
lotes de una futura migración. `sky_documents.kind` distingue quotation y receipt;
la facturación electrónica no se modela como si estuviera implementada.

Los detalles comerciales conservan snapshots de nombre, incluye/no incluye,
moneda, tipo de cambio e importes. Las referencias compuestas `(id,organization_id)`
impiden asociar datos de agencias diferentes. Los importes históricos que no
cuadren se conservarán en staging para conciliación: no se forzarán dentro de las
restricciones modificándolos silenciosamente. No importar PIN, tokens ni secretos
como configuración, snapshots o registros legado.

## Permisos propuestos

| Rol | Lectura | Escritura directa autenticada |
| --- | --- | --- |
| Anónimo | Ninguna tabla ni bucket de Skybike | Ninguna |
| Administrador | Datos de su agencia | Catálogo, imágenes nuevas, clientes y pasajeros |
| Ventas | Catálogo, clientes, documentos, reservas y pagos de su agencia | Clientes y pasajeros |
| Operaciones | Catálogo, personas, reservas y Calendar de su agencia | Clientes, pasajeros y asociaciones |
| Contabilidad | Catálogo, clientes, documentos, reservas y pagos de su agencia | Ninguna operación financiera directa |

Las reservas y sus snapshots son visibles a miembros de la agencia (incluido el
importe total en la reserva). Ocultar columnas financieras a Operaciones exigiría
vistas específicas en una etapa posterior. Auditoría, configuración, correlativos
y lotes legado son solo de lectura para administradores. Nadie puede autoasignarse
una membresía ni modificar roles desde el cliente.

Las políticas RLS bloquean a usuarios de otras agencias. No hay concesiones de
DELETE al cliente. Catálogo y pasajeros podrán archivarse sin borrar el historial.
Los buckets son privados y exigen rutas `<organization_id>/<uuid>/<archivo>`.
Para imágenes se permite INSERT solo a administradores; no se sobrescriben ni
borran archivos. Las nuevas versiones usan una ruta nueva. Los PDF solo se
insertarán desde backend; su lectura se limita a admin/ventas/contabilidad.

## Escritura de pagos y documentos: deliberadamente cerrada

No se otorga al cliente INSERT/UPDATE/DELETE de pagos, documentos, reservas,
correlativos ni auditoría. RLS por sí sola no garantiza cálculos correctos o
prevención de pagos simultáneos. Un backend futuro deberá aportar funciones
transaccionales que validen descuentos, recalcule totales, bloquee la reserva,
impida sobrepagos, valide límites por pasajero, registre auditoría y use claves
idempotentes. No habilitar esas escrituras para hacer pasar una prueba de interfaz.

La clave `service_role` tiene privilegios de backend y nunca debe ir al frontend,
repositorio o chat. Los secretos de Google y certificados futuros tampoco.
La primera agencia y su administrador se crearán desde un entorno confiable;
no mediante un formulario que permita escoger el propio rol.

## Validación hecha y pendiente

Hecho: análisis sintáctico PostgreSQL con pglast, revisión de constraints y tests
estáticos de seguridad/ausencia de ejecución automática. **No se ejecutó SQL ni
se validaron políticas contra una instancia.**

Antes de aplicar, con autorización separada y proyecto de pruebas vacío:

1. Revisar esquemas existentes y permisos por defecto del proyecto Supabase.
2. Revisar el SQL completo; CREATE falla si hay colisiones y no reemplaza objetos.
3. Probar transacción y políticas con usuarios de dos agencias y cada rol.
4. Verificar que anon no lea, que no exista escalamiento de membresías y que
   usuarios de una agencia no puedan referenciar objetos o archivos de otra.
5. Probar que las escrituras financieras directas estén denegadas y luego diseñar
   el backend transaccional autorizado, con pruebas de concurrencia y reversos.
6. Revisar respaldo, retención y recuperación antes de importar copias de datos.

Este archivo no activa Calendar, correos, SUNAT ni funciones automáticas externas.
