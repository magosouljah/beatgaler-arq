# BeatGaler V1 — Plan maestro propuesto de limpieza (solo diseño)

> **Notas verificadas (2026-11-21, `main@ad8f8d0`):** (a) F0 «¿disparan CI las migraciones 0031–0042?» → **No**: el filtro `paths` de `catalog-checks.yml` solo lista 0026–0030 (sí dispara `postgres-migrations.js`). (b) F3: la proyección ya es compartida — `catalog/beat-projection.js` lo importan `commands.js`, `operations.js` y `queries.js`; la duplicación restante es la enumeración de campos (`commands.js` `DOC_KEYS`, `operations.js` `nativeBeatDocument`), ver P05 §8. (c) F1: alcance real del piloto en [PRIMER-PILOTO](../mapa-v1/PRIMER-PILOTO.md). (d) Línea base de pruebas: [LINEA-BASE](../linea-base-20261121/LINEA-BASE.md).

**Fecha:** 2026-11-20. **Fuente de código:** `magosouljah/BeatGaler` `main@ad8f8d0436bba5c3f663a301440ebf977200d953`. **Fuente de conocimiento:** `magosouljah/beatgaler-arq` `panorama-main-20261120/` y las siete profundizaciones P01–P07, presentes y revisadas. **Estado:** PROPUESTA pendiente de aprobación del propietario; **nada implementado, probado ni desplegado** por este plan.

## Conclusión de los siete informes

Los siete terminan en `COMPRENSION_SUFFICIENTE_PARA_PLAN`, lo que significa que hay un mapa de entradas, llamadas, estado, fallos, dependencias e invariantes suficiente para **planificar** refactors incrementales. No hay nueva validación E2E; la infraestructura de reproducción posterior al incidente Direct B, bytes de Telegram, restauración física y algunas defensas de Cloud permanecen sin prueba. **No confundir aprobación para planificar con permiso de borrar/implementar.**

Prioridades de propietario: (1) integridad/no perder archivos; (2) ganar comprensión y reducir complejidad con el menor riesgo; (3) rapidez. Mantener V1 Web/Cloud, diseño Landing/Gallery/BeatCards/Playbar; no introducir V2 ni operar producción. Descartar la limpieza por porcentaje de LOC; perseguir **menos responsabilidades por módulo, ownership evidente y contratos únicos**.

## Orden recomendado y dependencias

### F0 — Congelar contratos y riesgos irreversibles (antes de refactor crítico)

**Objetivo:** separar deuda de integridad que requiere política/operaciones de las oportunidades de simplificación.

- `P01`: Telegram contiene bytes; un backup SQL/S3 no es backup independiente de audio/portada/WAV/PROJECT. Definir tratamiento de copia única/recuperación; cualquier trabajo sobre purga física, borrado de mensajes o desvinculación de referencias **STOP** hasta disponer de política y prueba autorizadas.
- `P01/P07`: Direct B y reproducción/descarga reportaron fallo post-LIVE; exigir comprobación real en **entorno aislado y autorizado** antes de tocar el transporte, y no declararlo PASS por tests con fakes. El código contiene defensas de E5 (búsqueda ambigua), G2 NOT_PROVEN y journal/restore_hold; preservarlas.
- `P03`: definir pruebas para parser de rutas inyectadas, fallo de flush, sesión/cambio de contraseña y cross-process; **no** reemplazar auth wrappers aún.
- `P05/P07`: listar invariantes de datos (tenant, era/epoch, version, locks, idempotencia, cursor, recuento, commit y retención) y suites exactas asociadas. Comprobar si migraciones 0031–0042 tienen trigger CI al cambiar solo ellas.

**Salida:** tabla de operaciones no autorizadas / riesgos aceptados / comportamiento de referencia / prueba necesaria. Solo documentación. F0 no significa que haya que esperar a un backup de bytes para hacer un refactor puro de cliente sin efectos sobre bytes, pero cualquier cambio que afecte transferencia, borrado o restore requiere barreras más estrictas.

### F1 — PILOTO PEQUEÑO: unificar infraestructura HTTP del catálogo Web

**Motivo:** ahorro cognitivo concreto y radio de impacto limitado; `P05` encontró duplicaciones entre `src/features/library/catalog/catalogApi.ts` y `catalogCommandsApi.ts` en preparación de HTTP/auth/CSRF/errores y parseo de respuestas. No empezar por reescribir `server-core` ni por eliminar Worker.

**Alcance acotado:** crear/reusar un **único helper privado de solicitud JSON** para ambos clientes, migrar un endpoint de lectura y uno de escritura, conservando estrictamente URL/base, cookies, CSRF, headers ETag/If-Match/era/epoch/idempotency, AbortSignal, manejo de 401/409/503/errores y DTO. No cambiar API, SQL, servidor, Direct B, caché, UI ni componentes. No cambiar archivos no necesarios.

**Criterio PASS verificable:** tests contractuales antes/después sobre peticiones emitidas, abort, body, headers y errores; typecheck + pruebas catálogo Web focalizadas, sin regresión observable. Revertir el commit si difiere el contrato; no maquillar fallos cambiando tests. Tras el piloto, dictaminar si la costura es realmente más simple (puntos de definición, imports/ramificación, no LOC brutas).

**Estado:** PILOTO PROPUESTO; requiere autorización separada para cambios de código en rama LOCAL aislada.

### F2 — Web: separar arquitectura actual de legados (P02 + P04)

- Mantener `main.tsx→WebExperience→AuthExperienceGate→Gallery PG` sin cambio visual. Confirmar grafo de imports/chunks del `build:web` antes de reclasificar alternativas Desktop/INDEX.
- Desacoplar el Web nativo de adaptadores `src/platform` que solo sirven Desktop/INDEX **por un punto de entrada mínimo**, sin duplicar comportamiento.
- Conservar `catalogDirectPort` y módulos de `src/features/cloud/webTransport*` que usa el Worker/mtcute en Web: **compartidos, no código muerto**.
- Proteger navegación `bgPage`, selección global, scroll virtualizado, sesión por cuenta, playback y cachés.
- Corroborar mediante fixtures focalizados los riesgos estáticos R-002 sort/debounce, R-004 lease tardío y controles Delete/Drawer bulk; son **hipótesis hasta su prueba**.
- **Salida:** entrypoint Web legible y árbol de dependencias real para decidir separaciones futuras; ningún cambio de CSS/JS visual.

### F3 — Catálogo PostgreSQL: concentrar escrituras y proyección (P05)

- **Primero** pruebas de equivalencia para cada campo y estado entre `catalog/commands.js` (PATCH) y `catalog/operations.js` (IMPORT/REPLACE): null/ausente, tags Unicode, BPM/key, `legacy_json`, search_text, metadatos y checksum.
- **Después** extraer escritor/proyección de metadatos con entradas de operación explícitas, sin mezclar transacciones, Telegram o códigos de error de dominios distintos.
- Solo tras equivalencia, evaluar helper `mutationTx` con políticas explícitas `allowFrozen`, commit-conflict, lock order y timeouts; **no imponer el mismo wrapper si cambia semántica**. Posteriormente `readTx`, revision/eventSeq, DTO.
- Mantener migraciones existentes 0026–0042, constraints, jobs durables, worker separado, idempotencia, holds/fences. No eliminar tablas/columns solo por nombre.
- **Salida:** menos lugares donde actualizar metadatos; trazabilidad de un campo de UI hasta SQL. Pruebas PG efímeras pertinentes, sin DB real.

### F4 — Cloud: eliminar complejidad accidental de arranque y cuentas (P03)

**Alto riesgo: solo después de tests de contención y baseline.**
- Congelar grafo actual de rutas, middlewares, interceptores, body parsers, CSRF, cookies, antiabuso y `flush before ACK`.
- Extraer router explícito para un **conjunto pequeño de endpoints** y su orden de middleware; probar HTTP completo (no grep o regex).
- Extraer API real del `server-core` antes de reemplazar `server-core-auth-bridge-loader`, `require.extensions` y sustitución textual.
- Sustituir `fs` JSON virtual / snapshots de `runtime_compat_state` por repositorios PG solo con tests multiproceso, restart, reauth/OAuth y fallo de flush; **no** quitar cercos de seguridad.
- Separar cuentas/auth, pagos/access, catálogo y transporte, con límites explícitos de estado y ownership.
- **Salida:** una sola ruta evidente de request→servicio→autoridad y menos efectos globales. Prohibido cambio masivo sin pilotos.

### F5 — Direct B / legacy transport: escisión sin perder funcionalidad (P01 + P02)

- Mapear comandos `get_index/replace_index/delete_messages` versus comandos `catalog_send/catalog_read/initialize/verify/cancel/renew` del Web Worker.
- Separar comandos legacy en módulos/ports aislados; no retirar `WebTransportWorkerClient`, `Controller`, `Session`, `catalogDirectPort`, mtcute ni el gateway Cloud: participan en flujo nativo.
- Conservar toda incertidumbre de envío, non-double-send, lease, receipt, reintento, bot membership, E5/G2, journal y cleanup/fences. Ejecutar solo en laboratorio/autorizado pruebas de sesión temporal, canje, lectura por partes, send suspendido y cancel.
- Eliminar endpoints y rutas INDEX antiguos **solo después** de inventario exhaustivo de caller interno, operativo y dinámico, guardas 410 equivalentes, posibilidad de recuperación de documentos históricos y tests específicos.
- **Salida:** transporte nativo separado del INDEX, no reescritura de MTProto.

### F6 — Pagos, planes y acceso (P06)

- Proteger idempotencia de checkout, inbox de webhooks, ledger, aplicación de derechos, cuota de PROJECT y reconciliación de eventos ausentes.
- Revisar por caller real `billing-checkout.js`, `billing-webhook.js`, `billing-entitlements.js`, `plans.js`, `project-access.js` y adaptadores PG antes de retirar.
- Distinguir `billing-access-resolver` PG, `BILLING_V1_ACCESS_CATALOG` y catalog legacy fallback; no usar el segundo como reemplazo accidental del primero.
- Resolver como **preguntas de producto/contrato** checkout `OPEN` abandonado y downgrade durante PROJECT antes de cambiar semántica.
- Conservar wrappers pequeños si ofrecen frontera de inyección/orden; eliminar archivos no es objetivo en sí.

### F7 — Herramientas, CI y eliminación final (P07 + P02)

- Actualizar triggers que no incluyen parte del esquema o código cambiado, tras comprobar workflows alternativos; retirar tests/scripts huérfanos solo si no tienen uso directo o indirecto y existe cobertura sustituta.
- Optimizar pruebas por comportamiento afectado y contrato: no repetir todas las suites Rust/Desktop si no se tocaron.
- Mantener deploy Web/Cloud versionado, rollback compatible con esquema y restore aislado; journal y bytes externos no se confunden con dump SQL.
- Desktop/Tauri y `DESIGN/` siguen **aislados**, no borrar por mera exclusión de producto; archivar o retirar solo con decisión explícita y reachability demostrada.
- **Salida:** suite mínima confiable por módulo, instrucciones de CI y candidatos muertos realmente demostrados. Sin deploy automático.

## Matriz de prioridad, dificultad y parada

| Tramo | Valor para simplificar | Riesgo de cambio | Estado / parada |
|---|---|---|---|
| F0 riesgos / contratos | Fundamental | Ninguno si solo documentación | **Hacer primero** |
| F1 piloto helper HTTP Web | Medio | Bajo-medio | **Primera implementación candidata** tras permiso |
| F2 aislar Web/legados | Alto | Medio-alto | Chunks/import graph y smoke |
| F3 unificar escritor SQL | Muy alto | Alto | Tests field-by-field/PG/rollback |
| F4 Cloud auth y monkey-patching | Muy alto | **Muy alto** | Tests HTTP + multiproceso + flush y auth |
| F5 separar Worker Direct de INDEX | Alto | **Muy alto** | Direct E2E y no pérdida de bytes |
| F6 billing/access | Medio | Alto | Pago/persistencia/idempotencia |
| F7 CI + restos realmente muertos | Medio | Variable | Cobertura sustituta y control de riesgos |

**Regla de ejecución propuesta:** trabajar sobre rama local/laboratorio independiente; un cambio pequeño y reversible por vez; commits separados, contraste con baseline y tests exactamente afectados. No aplicar automáticamente en `main` protegido, AWS, Telegram, PostgreSQL ni producción. **Cada transición de fase requiere revisar resultados y permisos vigentes**; no iniciar F1 implícitamente por existir este plan.

## STOPs verdaderos (no inflar bloqueos)

1. Posibilidad de pérdida o borrado de bytes, duplicar envío incierto, purge físico, ruptura de restore_hold/fence o revocación de capability.
2. Diferencia de contrato/semántica HTTP, auth, tenant/epoch/version/idempotencia, commit durable, pagos o permisos; prueba de comportamiento que falla sin causa explicada.
3. Requisito de AWS, Telegram, credenciales, DB real, nuevo despliegue, borrado o cambio de `main`.
4. Decisión arquitectónica/producto no aprobada que no sea mera extracción interna equivalente.

No STOP por formateo, imports, documentación o trabajo repetitivo en rama autorizada si no hay semántica nueva; conservar autonomía dentro del alcance explícitamente aprobado.

## Fuentes e informes

- [Panorama](PANORAMA.md) · [Inventario](INVENTARIO-C0.md).
- [P01 — Archivos y Direct](profundizacion/P01-DIRECT-ARCHIVOS.md).
- [P02 — Legacy y Desktop](profundizacion/P02-LEGACY-Y-DESKTOP.md).
- [P03 — Cloud/Auth](profundizacion/P03-CLOUD-AUTH-CONTROL.md).
- [P04 — Gallery/UI](profundizacion/P04-GALLERY-UI.md).
- [P05 — PostgreSQL](profundizacion/P05-CATALOGO-SQL.md).
- [P06 — Billing](profundizacion/P06-PAGOS-ACCESO.md).
- [P07 — CI/deploy/restore](profundizacion/P07-CI-DEPLOY-RECOVERY.md).

**Dictamen:** siete investigaciones suficientes para planificar; **ninguna** habilita por sí sola deploy, purga, eliminación de módulos críticos o cambios de comportamiento. Siguiente decisión del propietario: aprobar solo planificación o autorizar F1 en laboratorio con pruebas de paridad.
