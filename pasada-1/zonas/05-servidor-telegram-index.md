# Zona 05 — Servidor Cloud: transporte con Telegram, almacenamiento e INDEX legacy

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en código; PROVISIONAL = inferido. Nada se ejecutó.
Rutas relativas a `E:\777\app\BeatGaler\cloud-server\`. `control` = `direct-transport-control.js`, `lip` = `library-index-publication.js`.

## Mini-glosario del almacenamiento (concepto → comportamiento → archivo) — FIRME salvo indicación

- **MASTER**: cuenta de usuario de Telegram (gramjs, `StringSession` en env o `master-session.txt`; varias vía `masters.local.json`). Crea y posee cada vault, invita/promueve bots, crea topics, publica y fija el INDEX, sube PROJECT, borra y verifica. `master-storage.js` (creación), `control` L441-546 y L1671-1989, `setup-master-account.js` (login QR manual).
- **vault**: supergrupo privado con foro, uno por cuenta, título `<usuario> [BG:<id>]` (`master-storage.js` L32-46, L110-164). Su identidad vive en tres sitios: PG `vaults`, `cloud-data.json` (`linkedAccounts[].storageChatId`) y `vault-registry.json` (vault→master).
- **topic**: hilo del foro por beat (`server-core.js` L260-287; mapa `beatTopics` en `cloud-data.json`).
- **manager bot ("001BeatGaler")**: su token solo llama `getManagedBotToken`/`replaceManagedBotToken`; nunca entra en vaults (`control` L548-708).
- **transport bots / pool**: bots gestionados en `transport-bots.local.json`; token pedido JIT y solo en memoria. Estado en `transport-pool-state.json` (bots, leases, operations, metrics); espejo público en PG `transport_bots`.
- **assignment**: vault→bot persistente (`vaults.transport_bot_id`), el menos cargado en el primer acceso, nunca se reasigna solo (`direct-vault-assignment.js` L112-166).
- **membership**: `pending/ready/repair`. MASTER invita y promueve (`control` L716-731); prueba por Bot API `getChat` (L776-830); máquina de estados en `direct-persistent-membership-runtime.js`.
- **lease / session**: vínculo efímero dispositivo↔bot↔vault, heartbeat 60 s, caduca a 5 min. Se crea en `direct-persistent-session-runtime.js` L73-143, no en `control`.
- **operation**: entrada por operación en curso. `get_index`/`replace_index` son un mutex por vault con liveness renovable de 15 s (`control` L1306-1467).
- **capability**: token `cap_…` de un uso que sustituye al operation id, ligado a usuario/tenant/instalación/sesión/kind/objeto; TTL 10 min, máx. 4 vivos por tenant; hash en PG `direct_capabilities` (`direct-capability-boundary.js`). La misma palabra nombra otras dos cosas: la capability de subida del catálogo (`catalog/transport.js` L31-56) y las capabilities de plan (`upload_project`).
- **temp auth**: el servidor inicia sesión MTProto como el bot (mtcute) y firma el enlace de la clave temporal del navegador (≤15 min). Token y api_hash no salen (`productive-temp-auth-boundary.js` L214-338).
- **pin**: el mensaje fijado del vault es el INDEX autoritativo. Los bots no pueden fijar ni borrar ajenos (`control` L711-714).
- **pointer**: PG `vault_index_pointers`, atajo con CAS. El libro real es `library_quota_state(index_message_id, index_sha256)`.
- **routing**: mapa beatId→mensaje del audio para los primeros 14 beats (`startup-routing-index.js`).
- **resolver chat**: grupo interno MASTER+bots de la era Bot API; se sigue asegurando en cada arranque de sesión (`control` L879-952, L1005). PROVISIONAL si el cliente aún lo usa (`webTransportSession.ts` lo referencia).
- **project**: ZIP del proyecto. Único medio cuyos bytes pasan navegador→servidor→MASTER.
- **gateway (catálogo)**: proceso servidor que enviaría/descargaría/borraría por los clientes nativos (`catalog/transport-gateway.js`). No está cableado (ver abajo).

## Qué hace el servidor frente a Telegram

FIRME. Usa tres clientes:
1. **gramjs como MASTER**: crea vaults, gestiona membership y topics, lee/publica/fija el INDEX, sube PROJECT (bytes reales), borra con verificación de ausencia.
2. **HTTPS Bot API**: con el token manager (emitir/rotar tokens) y con el token del bot (`getMe`, `getChat`).
3. **mtcute como bot**: solo login y firma del bind temporal.

Caminos de bytes:
- **Directo navegador↔Telegram** (MTProto, clave temporal): audio, artwork, archivos y lectura del INDEX. Es el principal hoy; el servidor solo coordina.
- **Proxy por servidor/MASTER**: PROJECT (`/transport/project/upload`) y escritura del INDEX (`/transport/index/publish` recibe el manifest, límite 24 MB, `server-core.js` L128).
- **Proxy HTTP antiguo**: `/beats/upload`, `/projects/upload`, `/cloud-files/upload`, `/beats/stream`, `/beats/download`, `/library/upsert|get` responden 410.
- **Gateway del catálogo**: codificado con fakes. `server.js` L105-108 lo cablea con `gateway: null, master: null` y L101 aborta el arranque si `BEATGALER_CATALOG_GATEWAY_ENABLED=true`. El catálogo no tiene hoy camino de medios.

Los documentos están desfasados. `TELEGRAM-DIRECT.md` dice "Bot API local" y "Cloud nunca recibe los bytes del INDEX". `TELEGRAM-DIRECT-V5-BOTAPI.md` dice que el bot conserva pin/delete y que el cliente fija el INDEX. El código hace lo contrario (`control` L711-714, L1671; `server-core.js` L2323-2344).

## Sistemas

**`direct-transport-control.js`** (activo). Mapa:

| Líneas | Bloque |
|---|---|
| 1-62 | Config por env y estado en memoria (`runtimeSessions`, `managedTokenCache`, locks) |
| 63-208 | Utilidades, diagnóstico a fichero, liveness monotónico |
| 210-439 | Pool y fichero de estado: `normalizeState`, reaping, lock por fichero con espera síncrona, `mutateState`/`stateSnapshot` |
| 441-546 | MASTER: sesión, registro, `masterForVault` |
| 548-708 | Tokens gestionados: fetch con reintento, caché, rotación |
| 711-877 | Primitivas de membership |
| 879-952 | Resolver chat |
| 954-1056 | `runtimeForLease`, `sessionPublic` (quita credenciales si `catalog-v1`, L1019) |
| 1058-1223 | `startSession`, `activateSession`, `probeSessionMembership`, `heartbeat` |
| 1225-1283 | Rotación de token |
| 1285-1523 | `beginOperation`/`endOperation`/`renewOperation` |
| 1525-1659 | Limpieza de leases, `decommissionVaultMembership`, timer de mantenimiento (arranca al hacer `require`, L2016) |
| 1671-1760 | INDEX vía MASTER |
| 1762-1881 | PROJECT vía MASTER |
| 1883-1989 | Borrado verificado, lectura del pin, topics |
| 2019-2047 | Puntero INDEX en JSON (sin llamadores) |
| 2049-2130 | 38 exports + `__test` |

Lo llaman `server-core.js` (rutas), `server.js`, `lip`, `library-beat-quota.js` y `catalog-project-master-adapter.js`.

Veredicto FIRME: son tres modules en un archivo.
- **Coordinador de leases/operations**: deep, pero su interface real se filtra. Producción usa `__test.mutateState/stateSnapshot` (`direct-persistent-session-runtime.js` L74-94, `direct-persistent-membership-runtime.js` L26, L59) y dos envoltorios reemplazan `startSession`/`activateSession` en caliente (`server.js` L287-296).
- **Pasarela MASTER**: unas 20 funciones que abren conexión cada una. Pasa la prueba de borrado gracias a `masterForVault`.
- **Custodia de tokens**: deep.

Resto de `direct-*`:
- `direct-capability-boundary.js` (activo): deep; pasa la prueba. Su seam está oculto: parchea `express.application.post` e intercepta `res.json`. Los dos stores (memoria/PG) son adapters reales.
- `direct-transport-capability-view.js`: lector del fichero de estado para no importar `control` (que tiene efectos al cargar). Shallow; existe por un defecto de `control`.
- `direct-vault-assignment.js` (activo): store PG de assignment/membership con locks. Pasa.
- `direct-persistent-assignment-runtime.js`: singleton más normalización. Solo `resolveForVault` aporta; el resto es pass-through.
- `direct-persistent-session-runtime.js` (activo): es el asignador de leases viviendo fuera del module de leases. Pasa, con mala locality.
- `direct-persistent-membership-runtime.js` (activo): `pending/ready/repair` y reparación explícita. Pasa.
- `direct-index-pin-authority.js` (legacy INDEX): quita a los bots el derecho de fijar; corre en el arranque y en cada inicio de sesión.
- `direct-operation-repository.js`: sin importadores de producción (solo un test).
- `direct-startup-trace.js`: traza de tiempos en cabecera; diagnóstico.
- `web-transport-envelope.js`: función identidad. No pasa la prueba de borrado.

Otros:
- `master-storage.js` y `user-storage-lifecycle.js` (activos): creación y recuperación del vault.
- `telegram-retry.js` (activo): espera FLOOD_WAIT; deep y pequeño.
- `project-upload-route.js` / `project-upload-admission.js` / `project-upload-authority.js` (activos): cabeceras → capability → admisión (1 concurrente, 2 GB) → temporal → sha256/tamaño → MASTER → recibo en `library_project_uploads`. `project-access.js` mezcla la política de plan (se conserva) con la verificación de diffs del INDEX (legacy).
- `lip` más `library-beat-quota.js` y `library-trash-assets.js` (legacy INDEX, activo hoy): cuota, publicación, recuperación, purge.
- `vault-index-pointer-store.js`, `startup-routing-index.js`, `startup-vault-recovery.js` (legacy INDEX, activos).
- `atomic-library-index.js`: solo monta un 410; el coordinador no tiene uso productivo.
- `index-reconciliation.js`, `garbage-journal-repository.js`, `garbage-reconciliation-worker.js`: sin importadores de producción. El journal de basura no corre, y `/library/cleanup-garbage` es un stub que devuelve `deleted:0` (`server-core.js` L2771).
- `legacy-media-upload-disable.js`: tres rutas a 410.
- `catalog-project-master-adapter.js`: solo lo importa un test; `server.js` pasa `master: null`.
- `catalog-deletion-journal.js`: lo usan `server.js` y `catalog-worker.js`, solo si existe `BEATGALER_CATALOG_JOURNAL_DIR`.
- `legacy-exporter.js`, `legacy-import-plan.js`, `legacy-import-executor.js`: no tratan del INDEX (ver sección INDEX).

## Flujos del lado servidor

**Sesión (previa a todo, legacy)** — FIRME:
1. `POST /transport/session/start` (`server-core.js` L1948): auth → chequeo de protocolo catálogo → `migrateLegacyProjects` (MASTER) → assignment PG → pin-authority → lease → token JIT.
2. La respuesta pasa por temp-auth (quita secretos, añade `temp_auth`; dos llamadas: bootstrap y bind) y por routing (añade `startup_routes`).
3. `POST /transport/session/activate`: prueba `getChat`, o MASTER invita/promueve. Después `heartbeat` y `stop`.

**(a) Subir un beat, legacy** — FIRME:
1. `operation/begin` (`commit_import`) emite la capability; `capability/authorize`.
2. `quota/reserve` crea la reserva `new:<beatId>` con TTL; el primer uso inicializa el libro leyendo el INDEX fijado. `renew`/`cancel`.
3. `topic/ensure`: MASTER crea el topic.
4. El navegador sube audio y artwork directo a Telegram. `upload/confirm` existe, pero `verifyMessage` no verifica nada (`control` L1661-1669).
5. PROJECT: `project/authorize` y `project/upload`.
6. `operation/begin` (`replace_index`, mutex por vault) y `index/publish`. `lip.publish` (L208-434) valida versión esperada, reservas vivas, cuota del plan, tombstones y recibos de PROJECT. MASTER sube, fija y verifica. Commit PG (`library_quota_state`, `library_beats`, reservas, pointer). Borra el INDEX anterior.
7. `index/commit`: verifica, CAS del pointer, evento SSE `library_changed` a otros dispositivos (L2237) y rutas.
8. `operation/end`.

**(a) Catálogo** — codificado, no operativo: `POST /catalog/v1/operations` → `…/parts/:partKey/capability` → `PUT /catalog/v1/transfer/upload/:token` (los bytes pasan por el servidor hacia el gateway) o `…/parts/:partKey/project` (MASTER) → recibo → verificación del worker → `…/commit`. Hoy responde 503.

**(b) Reproducir/descargar**:
- Legacy: `operation/begin` (`download`, `download_range`, `stream_master`, `load_artwork`) más `capability/authorize`; bytes directos. FIRME.
- Catálogo: `POST /catalog/v1/files/:fileId/access` y `GET /catalog/v1/media/:token`; el servidor transmite por rangos desde el gateway (`catalog/media.js` L158). Sin gateway no funciona.

**(c) Papelera**:
- Legacy: mover y restaurar son reescrituras del INDEX (`beats[]`↔`trash[]`).
- Borrado definitivo: `POST /transport/trash/purge` → `purgeTrash` (`lip` L436-523). Recupera, toma instantánea de assets (`library_trash_purges` en PENDING, rechaza assets compartidos), publica con purge: MASTER borra y verifica ausencia, nuevo INDEX con tombstone en `deleted[]`, CONFIRMED. El topic se borra en segundo plano (`/beats/delete-topic(s-batch)` exige purge confirmado). Los PENDING se reintentan al arrancar.
- Catálogo: `POST /catalog/v1/beats/trash|restore` solo SQL. Purge con `catalog/purge.js`, worker y journal en disco; bloqueado sin gateway.

**(d) Arranque** (`server.js` L86-116, antes de abrir HTTP) — FIRME:
1. `indexPinAuthority.ensureAll()`.
2. `lip.recoverAll()` por cada vault legacy: re-fija el INDEX del libro si el pin difiere, reintenta purges, borra el INDEX predecesor, migra PROJECT antiguos.
3. Los vaults con catálogo se saltan. Un vault inaccesible se marca `repair` y no bloquea.
4. `catalog-worker.js` es un proceso aparte, apagado por defecto.

## INDEX legacy: qué es, quién lo usa, qué conservar, qué verificar antes de retirarlo

**Qué es** (FIRME): documento `library.json` con `{version:2, beats[], trash[{beat}], deleted[{beat_id,deleted_at}], garbage?, updated_at}`, ≤16 MB, caption `BEATGALER_LIBRARY_INDEX_V1`, fijado en el vault. Lo escribe MASTER desde el servidor. Lo lee el servidor vía MASTER y el navegador con su sesión de bot (confirmado por la zona 03: `webTransport.worker.ts:2308-2506`).

**Comportamientos que el catálogo debe conservar** (FIRME que existen hoy):
1. Publicación atómica con versión esperada y recuperación tras caída a mitad; reintento idempotente.
2. Cuota: reserva con TTL antes de subir, y recomprobación contra el plan al confirmar.
3. No resurrección: tombstones permanentes, id purgado no reutilizable, beat en purge pendiente no editable ni restaurable.
4. Purge con instantánea de assets, rechazo de assets compartidos, borrado con verificación de ausencia y reintento al arrancar.
5. PROJECT: solo bytes medidos por el servidor, con límite de plan.
6. Serialización por vault entre pestañas y dispositivos; una pestaña muerta libera en 15 s; una recarga recupera su propio lock.
7. Aviso `library_changed` a otros dispositivos.
8. Arranque rápido de los primeros beats.
9. Arranque del servidor tolerante a vaults perdidos.
10. Revocación de capabilities en logout, cambio de contraseña y borrado de cuenta.

**Verificar antes de retirarlo**:
- Que no queden vaults con filas en `library_quota_state`/`library_beats`/`vault_index_pointers` sin `catalog_libraries`. Requiere consulta a la base; no hecha.
- Que exista un gateway real. Sin él, retirar el INDEX deja la app sin subir ni reproducir.
- Que el cliente web declare `catalog-v1`. No se encontró ese literal en `src/` (grep); PROVISIONAL.
- Que Desktop quede cercado: `src-tauri/src/commands.rs` llama a `/beats/delete-topics-batch`.
- Quién restringe los derechos del bot en vaults nativos: la pin-authority los salta.
- Orden de migraciones: los triggers de `0027` y la elegibilidad de `catalog/authority.js` (L79-89) leen tablas legacy.
- Que `session/start` deje de llamar a `migrateLegacyProjects` y al pointer para todos los usuarios.

**`legacy-exporter` / `legacy-import-*`** (FIRME): aquí "legacy" es el control-plane JSON (cuentas, sesiones, vaults), no el INDEX.
- `buildLegacyRows` y `deterministicId` se usan en vivo: `postgres-control-plane-runtime.js`, `access-grant-store.js`, `postgres-auth-multiprocess-compat.js`, `provider-identity-authority.js`, `catalog/native-cli.js`.
- `legacy-exporter.js` solo sirve al rollback a JSON (`postgres-rollback-preparation.js`).
- No mueren con el INDEX; su destino depende de retirar la compatibilidad JSON.

## Fricción (ordenada por coste)

1. **El flujo de sesión no se puede leer en un sitio** (FIRME). Una ruta es `server-core.js` + parches de `application.post` (17 archivos lo parchean; el orden en `server.js` L185-262 es carga crítica) + dos envoltorios instalados después de cargar `server-core.js` + `control`. Probar exige replicar el orden de instalación.
2. **Estado de leases en un fichero JSON con lock síncrono** (FIRME). `Atomics.wait` hasta 15 s bloquea todo el proceso (`control` L344-369), mientras assignment y capabilities están en PG. Hay cuatro copias de la caducidad de lease (`control` L406, `direct-persistent-session-runtime.js` L31, `direct-persistent-membership-runtime.js` L17, `direct-transport-capability-view.js` L35). Solo vale para un nodo.
3. **MASTER abre conexión y recorre hasta 1000 diálogos en cada llamada** (`control` L505-546) (FIRME). Una publicación hace 4 o más conexiones, dentro de una transacción PG con locks de fila (`lip` L224-426). Es lo opuesto al invariante del catálogo y hace el arranque proporcional al número de vaults.
4. **Identidad del vault en tres almacenes** (FIRME). `direct-capability-boundary.js` L98-106 y `startup-routing-index.js` L82-88 leen `cloud-data.json` directamente.
5. **Vocabulario colisionado** (FIRME): "capability" ×3; "legacy" ×4 (INDEX, control-plane JSON, copias de PROJECT, rutas Bot API); "MASTER" (cuenta) frente a `beat.master` (audio principal); "index" (INDEX frente a routing-index); "Direct" para todo.
6. **Nombres de fase** (FIRME): `direct-persistent-*`, `stage1-critical-path-trace`, `d8-ro-resolutions`, `step15-*`, `TELEGRAM-DIRECT-V5-BOTAPI.md`, modo `telegram-direct-botapi-local` (`control` L1026), comentarios "T05-N capa 1" y "Direct V4".
7. **Lógica repetida**: el parseo `direct:(\d+)` está en 5 sitios del servidor (`lip` L19, `library-trash-assets.js` L24, `startup-routing-index.js` L52, `server-core.js` L2656, `project-access.js` L33). La validación del manifest está en `lip`, `server-core.js` y presumiblemente el cliente (PROVISIONAL).
8. **Código muerto dentro de archivos vivos** (FIRME por grep). En `server-core.js`, `telegramMethodUrl` lanza siempre (L669), así que `/metadata/artwork`, `/metadata/upsert` y `/library/artwork` fallan siempre. La cadena `migrateCurrentLibraryToTopics` (L497-668) y la recuperación por backups (L2708-2755) no tienen llamadores.
9. **Difícil de probar** (FIRME): `control` lee env y arranca un timer al importarse, y expone setters `__test`. Solo las variantes `…FromClient` de MASTER admiten un cliente inyectado.

## Candidatos a retirar

- **Mueren con el INDEX**: `lip` (salvo la autorización y subida de PROJECT), `library-beat-quota.js`, `library-trash-assets.js`, `vault-index-pointer-store.js`, `direct-index-pin-authority.js`, `startup-routing-index.js`, `atomic-library-index.js`, `startup-vault-recovery.js`, la parte de diffs de `project-access.js`. En `control`: L1671-1735, L1926-1954 y el mutex de INDEX. Rutas `/transport/index/*`, `/transport/quota/*`, `/transport/trash/purge`, `/transport/routing/reconcile`, `/transport/topic/ensure`. `catalog/legacy-fence.js` cuando no quede nada que cercar.
- **Sin importadores de producción hoy** (FIRME): `direct-operation-repository.js`, `index-reconciliation.js`, `garbage-journal-repository.js`, `garbage-reconciliation-worker.js` y sus tablas `direct_operations`, `index_observations`, `garbage_journal`. También `recordIndexPointer`/`getIndexPointer`, `cleanupExpiredSessions` (export), `copyLegacyProjectPartFromClient`, `verifyProjectMediaFromClient` y `directBotAdminRights` (exports). `decommissionVaultMembership` solo se usa en un script de regresión.
- **Variantes superadas**: `web-transport-envelope.js`, `legacy-media-upload-disable.js` más las rutas 410, `verifyMessage` y `/transport/upload/confirm`, el resolver chat (PROVISIONAL), la migración `active_leases` (`control` L259-280), `cleanupLegacyVisibleHandshakes`, `TELEGRAM-DIRECT.md`.
- **No retirar por el INDEX**: assignment, membership, tokens, `master-storage.js`, `telegram-retry.js`, `project-upload-*`, `legacy-import-*`.

## Dudas y límites

- **Decisión abierta**: si los clientes nativos no reciben credenciales y todo va por gateway, leases, operations, `direct-capability-boundary.js` y temp-auth quedan sin cliente. El código no lo resuelve. Además cambiaría el modelo de coste: todos los bytes pasarían por el servidor.
- No se leyó `server-core.js` entero, ni `catalog/*` más allá de cabeceras, ni el worker del navegador ni Desktop.
- No se verificaron datos reales, por regla.
- No se leyó `account-lifecycle.js`: se desconoce qué hace el borrado de cuenta con el vault.
- **Aviso aparte**: no se vio un riesgo evidente de pérdida de archivos; los borrados exigen purge registrado y verificación. Sí hay dos riesgos de disponibilidad:
  - `resolveVault` (`control` L505-513) no detecta el tope de 1000 diálogos; más allá, un vault parecería "perdido" y pasaría a `repair`. `master-storage.js` L72 sí lo detecta.
  - El lock síncrono del fichero de estado puede congelar el servidor.
