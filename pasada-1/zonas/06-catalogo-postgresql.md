# Zona 06 — Catálogo PostgreSQL

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en código en `5cb6ccc`; PROVISIONAL = inferido o dependiente de la migración. Nada se ejecutó.
**Toda esta zona es provisional mientras la migración no termine.** Hay trabajo de rendimiento (T20) en curso en otra sesión: `queries.js`, `facets.js` y las migraciones 0037–0040 pueden seguir moviéndose.
Rutas relativas a `E:\777\app\BeatGaler\cloud-server\catalog\` salvo indicación.

## Qué hace el catálogo (por responsabilidad)

- **Lectura** — `queries.js` (+`cursor.js`). Lista keyset en ambas direcciones con cursores HMAC ligados a tenant, era, época, generación, revisión, filtros, sort y limit (`queries.js:285-307`). Búsqueda `q` con cuatro caminos elegidos en JS (`searchMode`/`planSearch`, `:131-151`; `filterSql`, `:154-191`). Tags any/all/exclude, 4 órdenes (`TUPLES`, `:43-48`), facets desde `catalog_facets` (`:479`), detalle y archivos. Una transacción `REPEATABLE READ READ ONLY` por petición, timeout 1 s / 2 s (`readTx`, `:252`). FIRME.
- **Mutaciones** — `commands.js` (+`metadata-rules.js`, `facets.js`, `legacy-codec.projectBeat`). `patchBeat` (`:190`), trash/restore en lote ≤50 atómico (`:269`), selección server-side como log de operaciones con CAS (`:341-429`), bulk y rename de tag como operación por lotes (`createOperation` `:468`, `stepOperation` `:528`), feed de cambios (`:693`). Patrón fijo: lock de biblioteca → era/época → idempotencia → lock de beats → versión → escritura → revisión+1 → evento (`mutationTx`, `:129`). FIRME.
- **Transferencias (subida)** — `operations.js` + `transport.js` + `transport-gateway.js`. Intent IMPORT/REPLACE con cuota y reserva (`operations.js:194`), recibo candidato (`:280`), verificación del proveedor con fencing (`:319`), commit que instala beat, archivos, partes y ubicaciones (`:353-465`). Los bytes entran por capacidad opaca de un solo uso (`transport.js:171`, `:257`); PROJECT va por MASTER (`:290`). FIRME.
- **Medios y reproducción** — `media.js` (concesión por parte `:74`, stream con Range `:147`); `playback.js` (rondas shuffle Fisher–Yates perezoso persistido `:165`/`:213`, vecino de orden `:274`). FIRME.
- **Papelera / purga durable** — papelera en `commands.js`; `purge.js`: intención (`:116`), enumeración TRASH→PURGING (`:149`), borrado por objeto con journal externo y prueba de ausencia (`:256`), `releaseRestoreHold` (`:366`); `../catalog-deletion-journal.js` (adapters memoria y disco). FIRME.
- **Worker** — `worker.js` (bucle, leases, backoff; 6 handlers `:60-142`); la cola en sí vive en `operations.js:543-610`; entrada `../catalog-worker.js`. FIRME.
- **Backup/restore** — `backup.js` (`createBackup` `:91`, `restoreBackup` `:147`, reconciliación de journal y bytes). **Sin cableado de producción**: solo lo importan 2 pruebas. FIRME.
- **Provisión / activación** — `authority.js` (`resolveContext` `:168`, `provisionLibrary` `:196`, predicado nativo `:84-120`); `native-cli.js` (inspect/activate/rebind-chat/reset) vía `scripts/catalog-native.cjs`. FIRME.
- **Cerco legacy** — `legacy-fence.js` (410, usado desde 4 modules legacy), `session-guard.js` (protocolo `catalog-v1` en `server-core.js:1963`), triggers de 0027, `flush-quarantine.js`. FIRME.

## Mapa de modules

Exports contados sobre `module.exports`; importadores de producción (pruebas aparte).

| archivo | líneas | exports | importadores prod. | juicio |
|---|---|---|---|---|
| authority.js | 316 | 19 | 9 del catálogo + server, server-core, worker, 4 legacy | Factory **deep**; el archivo es además cajón (`canonicalJson`, clase de error, `SQLSTATE`) |
| queries.js | 670 | 31 | server, worker, commands, playback, media, purge, operations, transport | **Deep**, pero filtra internos (`TUPLES`, `filterSql`, `STATEMENT_TIMEOUT_MS`) |
| commands.js | 720 | 16 | server, worker | **Deep**; 4 responsabilidades en un archivo |
| operations.js | 621 | 15 | server, worker, transport | **Deep**; mezcla transferencias y cola de jobs |
| facets.js | 146 | 6 | commands, operations, purge | **Deep**, mucho leverage |
| cursor.js | 88 | 7 | queries + 7 (por la clase de error) | **Deep** |
| transport.js | 353 | 14 | server | **Deep** |
| transport-gateway.js | 278 | ~20 | transport (solo `captionFor`) | Adapter Telegram; en producción nunca se instancia |
| media.js / playback.js / purge.js | 204 / 313 / 391 | 9 / 7 / 9 | server (+worker para purge) | **Deep** |
| worker.js | 205 | 5 | catalog-worker.js | **Deep** |
| backup.js | 311 | 6 | ninguno | Deep, sin llamadores |
| native-cli.js | 532 | 9 | scripts/catalog-native.cjs | Deep; importa `../legacy-import-executor` (`:10`) |
| metadata-rules.js | 114 | 10 | commands, operations | Puro; duplicado del TS |
| legacy-codec.js | 311 | 18 | commands, operations, queries, staging, migration | Mixto: ~80 líneas vivas, resto solo INDEX |
| routes.js | 208 | 4 | server-core | Glue fino con multiplexado |
| legacy-fence.js / session-guard.js | 82 / 47 | 7 / 5 | 4 modules legacy + server-core / server | Pequeños; se ganan el sitio hoy |
| flush-quarantine.js | 64 | 7 | postgres-auth-multiprocess-compat.js | Pequeño |
| contract.js | 61 | 17 | 9 (solo `requireUserId`, `requireScope`, `partJobId`) | **Shallow** |
| repository.js | 102 | 1 | **ninguno** (2 pruebas) | Shallow / muerto |
| staging.js / migration.js | 180 / 143 | 7 / 5 | ninguno / staging | Residuo |
| api-manifest.json | 827 | — | nadie lo lee | Documentación |
| ../catalog-worker.js / ../catalog-deletion-journal.js / ../catalog-project-master-adapter.js | 56 / 69 / 24 | 2 / 3 / 1 | — / server, worker / ninguno | Entrada / adapter real / adapter sin cablear |

**Capas (FIRME):** no forman capas. `repository.js` nació como capa base y nadie la usa. `queries`, `commands`, `operations`, `playback`, `purge`, `media` y `transport` son modules verticales hermanos; cada uno abre sus transacciones y escribe SQL inline. El solapamiento real:
- `mutationTx` copiado 5 veces (`commands.js:129`, `operations.js:119`, `playback.js:80`, `purge.js:70`, `transport.js:116`), `readTx` 6 veces, `sqlError` 7 veces con listas de SQLSTATE distintas, y la consulta de cuarentena en 9 archivos.
- La escritura de `catalog_beats` (lista de ~25 columnas) en `commands.js:71`, `operations.js:387` y `:406`, `repository.js:51`, `staging.js:35`.
- Dos DTO de beat: `queries.js:200-217` y `commands.js:180-185`.

**Dónde vive el SQL (FIRME):** las consultas, todas inline en JS. Las migraciones 0026–0040 (~1.650 líneas) aportan 39 tablas `catalog_*`/control, CHECKs y unas 30 funciones de trigger. La lógica de negocio está en JS; el SQL contiene:
- guardas que repiten máquinas de estado ya codificadas en JS (generación, query-set, operación, transferencia, job; p. ej. `0026:62`, `0029:46`, `0030:39`/`:141`);
- cerco y anti-cascada (`0027:124`, `:277`);
- derivados automáticos: `state`/`manual_rank` hacia grupos de tags por FK `ON UPDATE CASCADE` (`0026:114-116`), invalidación de `search_text` (`0037:20`), contadores de gramas por triggers de sentencia (`0039:30-90`).

Coste de locality: trash/restore/purge funcionan gracias a esa cascada y a esos triggers, que no se ven desde `commands.js`.

## Modelo de datos y mini-glosario

Tablas (FIRME):
- `catalog_libraries`: una por usuario; autoridad, era, época, revisión, generación activa, contadores, `restore_hold`, `cleanup_enabled` (`0026:11`).
- `catalog_generations`, `catalog_beats` (documento `legacy_json` + columnas proyectadas, `0026:81`), `catalog_beat_tags`, `catalog_beat_tag_groups`, `catalog_facets`, `catalog_trash_entries`, `catalog_tombstones`.
- Archivos: `catalog_file_versions` → `catalog_file_parts` → `catalog_part_locations` → `catalog_media_objects`; `catalog_current_files` (slot vigente).
- Consulta e interacción: `catalog_query_sets`/`_members`/`_leases`, `catalog_selections`/`_ops`/`_op_ids`.
- Operaciones: `catalog_operations` (+batches/items), `catalog_events`, `catalog_transfer_operations`, `catalog_operation_parts`, `catalog_reservations`, `catalog_jobs`, `catalog_transfer_capabilities`.
- Reproducción: `catalog_playback_rounds` (+mapping/consumed/commands), `catalog_media_grants`.
- Purga y restore: `catalog_purges`/`_items`/`_objects`, `catalog_restore_runs`/`_findings`.
- Control: `catalog_native_activation`, `catalog_library_chats`, `catalog_chat_rebinds`, `catalog_vault_rebind_audit`, `control_plane_flush_quarantine`, `catalog_account_deletions`, `catalog_search_gram_counts`.

Glosario (concepto → comportamiento → dónde):
- **era** → identidad de la "vida" de la biblioteca; cambia en reset; cabecera `X-Catalog-Era` → `authority.js:254`.
- **época** → contador monótono de fencing (+1 en rebind/reset/restore); invalida cursores, capacidades y concesiones → `authority.js:255`, `0027:300`.
- **revisión** → +1 por mutación confirmada; cualquier mutación deja obsoletos cursores (`CURSOR_STALE`), query-sets y selecciones → `commands.js:152`, `queries.js:298`.
- **versión** → contador optimista por beat (`expectedVersion` / `If-Match`) → `commands.js:205`.
- **generación** → snapshot completo de biblioteca (STAGING→VALIDATED→ACTIVE→RETIRED); una nativa tiene una sola `native-<uuid>`; todas las tablas llevan `(user_id, generation_id, …)` → `0026:38`, `authority.js:221`.
- **documento canónico** → `legacy_json` (TEXT) es la fuente del beat; las columnas son proyecciones de `legacy-codec.projectBeat` (`:243`).
- **tombstone** → marca de beat purgado; impide restaurar o reusar el id → `0026:197-233`, `purge.js`.
- **query-set** → lista materializada de miembros de un filtro a una revisión, construida por el worker en lotes de 240, con leases por consumidor → `queries.js:543`/`:578`.
- **reserva** → hueco de cuota (`pending_count`) de un IMPORT, 15 min renovable hasta 24 h → `operations.js:226-232`.
- **capacidad / concesión** → tokens opacos de subida / lectura; solo el hash en SQL → `transport.js:171`, `media.js:74`.
- **staging** → generación importada desde INDEX → `staging.js`.
- **quarantine** → usuario bloqueado por conflicto del flush del control-plane; lo comprueba toda transacción → `flush-quarantine.js`, `queries.js:263`.
- **restore_hold / cleanup_enabled** → impiden borrados físicos → `purge.js:48`.

## Interface HTTP y montaje

- **Montaje (FIRME):** `../server.js:92-108` configura singletons por module (`configureCatalogX`); `../server-core.js:133` crea el router con `currentCatalogX()` y `authenticate`. Inyectado: `pool`, `authority`, `resolveAccess` (cuota). **`gateway: null`, `master: null` y `resolveProjectAccess: null` en media, purge y transport** (`server.js:105-108`); `BEATGALER_CATALOG_GATEWAY_ENABLED=true` aborta el arranque (`:101`). En producción hoy subir y reproducir responden 503 y la purga no borra: el camino de bytes solo existe con fakes o LAB.
- **Sin autoridad** → 503 en todo (`routes.js:54`); ruta desconocida → 501 (`:204`).
- **Endpoints `/catalog/v1`:**
  - contexto: `GET /context`, `POST /library/provision`;
  - lectura: `GET /beats`, `/beats/:id`, `/beats/:id/files`, `/navigation/legacy`, `/facets`, `/facets/active`, `/changes`;
  - query-sets: `POST /query-sets`, `GET /:id`, `/cancel`, `/release`, `/neighbor`;
  - mutación: `PATCH /beats/:id`, `POST /beats/trash|restore`, `/selections` (+`/ops`, `/release`), `/tags/rename(/preview)`;
  - operaciones: `POST /operations` (BULK_*, TAG_RENAME, IMPORT, REPLACE, PURGE), `GET /operations/:id`, `/cancel`, `/resume`, `/commit`, `/reservation/renew|readmit`, `/parts/:k/receipt|dispatch|capability|project`, `/attempts`, `PUT /transfer/upload/:token`;
  - reproducción: `POST /playback/rounds` (+`next`, `consume`, `rebuild`, `release`, `GET`), `POST /files/:id/access`, `GET|HEAD /media/:token`;
  - `POST /library/restore-hold/release`.
- **Escrituras** exigen `Idempotency-Key` + `X-Catalog-Era` + `X-Catalog-Epoch` (`routes.js:36`).
- **El cliente no consume (FIRME, grep):** `facets/active`, `beats/:id/files`, `receipt`, `dispatch`, `readmit`, `attempts`, `rebuild`, `restore-hold/release`.
- **`api-manifest.json`** no lo verifica ninguna prueba ni script; el cliente cita versiones v2/v5 y el archivo va por v9. `GET /context` devuelve `capabilities` fijas en false para mutate/operations (`routes.js:73`) aunque están montadas.

## Flujos por el camino catálogo

1. **Buscar / filtrar:** `GET /beats?q&includeTag&sort&cursor` → `routes.js:79` → `queries.listBeats` (`:310`) → `parseListRequest` → `readTx` → `planSearch` → `filterSql` + keyset → `itemDto` → firma de cursores (`finishPage`, `:364`). Facets por `GET /facets`.
2. **Editar nombre/tags/portada-crop:** `PATCH /beats/:id` → `metadata-rules.validatePatch` → `commands.patchBeat` → `mutationTx` → idempotencia → `applyPatchToDoc` → `writeBeatDoc` (`projectBeat`) → `bumpRevision` → facets por delta → evento → fila en `catalog_operations`. En lote: `POST /query-sets` → worker `QUERY_SET_BUILD` → `POST /selections` → `/ops` → `POST /operations {BULK_PATCH}` → worker `OPERATION_STEP` → `commands.stepOperation`. La imagen de portada es una subida (slot ARTWORK), no un patch.
3. **Subir:** `POST /operations {IMPORT, parts, metadata}` (cuota, reserva, `random_id` por parte) → `POST …/capability` → `PUT /transfer/upload/:token` (redime, spool a temporal con sha256, `markDispatched`, `gateway.sendPart`, `putReceipt`, encola `TRANSFER_VERIFY`) → worker `gateway.verifyMessage` → `recordVerification` → `POST …/commit` (202 mientras falte, 200 al instalar). Envío incierto → `TRANSFER_RECONCILE`, nunca reenvío (`transport.js:193-230`).
4. **Reproducir:** `POST /files/:fileId/access` → concesiones por parte → `GET /media/:token` con Range → `gateway.downloadPart`. Shuffle: `POST /playback/rounds {setId}` → `/next` (sorteo en SQL, idempotente por `sequence`). Orden normal: `GET /query-sets/:id/neighbor`.
5. **Papelera → restaurar → purga:** `POST /beats/trash` (retención 14 días) → `POST /beats/restore` (rechaza con tombstone) → `POST /operations {PURGE}` → worker `PURGE` → `purge.step`: enumerar → journal → `deleteMessage` + `probeAbsence` → PURGED + tombstone.

## Fricción (ordenada por coste)

1. **"Añadir un campo a un beat" toca 12–18 sitios (FIRME).**
   - Reglas: `metadata-rules.js` (`PATCH_FIELDS` + `validatePatch`); `src/lib/metadataValidation.ts` y su prueba de paridad si aplica.
   - Mapeo campo→documento, dos copias: `commands.js:44` (`DOC_KEYS`) y `operations.js:404` (propio).
   - Alta: `operations.nativeBeatDocument` (`:109`).
   - Proyección: `legacy-codec.projectBeat`, si se proyecta.
   - Esquema: migración nueva y las pruebas que fijan "0040" (`catalog-contract.test.cjs:19`, `catalog-schema.integration.cjs:56`).
   - SQL de escritura: `commands.js:71-88`, `operations.js:387-390` y `:406-408`, `repository.js:51`, `staging.js:35` y `rebuildDerivedProjections`.
   - DTO de lectura: `queries.js:200-217` y `commands.js:180-185`.
   - Si es buscable: `searchText` del codec, `byFields` en `queries.js:160`, lista de columnas del trigger `0037:28`.
   - Si es ordenable: `TUPLES`/`TUPLE_CASTS`/`TUPLE_TEXT`/`SORTS` en `queries.js:43-61`, índice, CHECK de `catalog_selections.sort` (`0029:117`), tipo `CatalogSort` del cliente.
   - Cliente: `catalogApi.ts` (`CatalogBeatDto`), `catalogCommandsApi.ts`, `catalogMutations.ts`, `catalogTransfer.ts`.
   - Fakes que reimplementan el servidor: `tests/helpers/catalogFakeApi.ts` (148), `catalogFakeCommands.ts` (261).
   - Siembras con INSERT crudo en pruebas de integración y en `scripts/catalog-bench/generator.cjs`.
   - No requiere cambio: `backup.js` descubre columnas (`:64-85`).
2. **Infraestructura transaccional copiada** en 7 modules (detalle arriba). Cambiar la política de timeout, cuarentena o mapeo de errores exige 5–9 ediciones, y las copias ya divergen (FIRME).
3. **"Operación" son tres cosas tras un endpoint:** `catalog_operations`, `catalog_transfer_operations` y `catalog_purges`, despachadas por `kind` y por prefijo de id (`top-`, `op-purge-`) en `routes.js:120-149`. La cola de jobs vive en `operations.js` aunque sirve a todos (FIRME).
4. **Reglas duplicadas JS/SQL/cliente (FIRME):**
   - enumeraciones y transiciones en CHECK/trigger y en `if` de JS;
   - `contract.js` declara espejos que nadie importa (`BEAT_STATES`, `FILE_ROLES`, `FILE_STATUS`, `QUERY_SET_STATUS`, `MIGRATION_STATES`, `GENERATION_TRANSITIONS`, `LEGACY_SCOPES`);
   - `beatIdIssues` dos veces (`contract.js:35`, `legacy-codec.js:93`);
   - tres definiciones de clave normalizada de tag: `metadata-rules.js:13` (colapsa espacios), `legacy-codec.js:251` y `catalogCommandsApi.ts:133` (no colapsan). Coinciden solo porque los tags nativos se validan antes (PROVISIONAL: inocuo mientras no entren tags sin validar);
   - `filterHash` duplicado en cliente (`catalogApi.ts:225`).
5. **Complejidad heredada de la migración por fases (FIRME el hecho; PROVISIONAL el juicio):**
   - la dimensión `generation_id` en todas las claves y consultas, constante en una biblioteca nativa;
   - columnas sin escritor ni lector nativo: `legacy_presence`, `rollback_max_bytes`, `export_bytes_estimate` (solo native-cli), `raw_index`, tabla `catalog_legacy_fields`, `sort_order`, `telegram_topic_id`;
   - `migration_state` con 6 valores cuando el trigger exige IDLE (`0027:296`), y aun así cada `mutationTx` lo comprueba;
   - nombres `legacy_json`/`legacy_sha256` para lo que es el documento canónico vivo;
   - comentarios y cabeceras organizados por tarea T, no por responsabilidad.
6. **Seams con adapter real sin demostrar:** gateway y MASTER son seams legítimos (fake + real), pero el adapter real no se instancia en producción y `catalog-project-master-adapter.js` y `backup.js` no tienen llamador (FIRME). La interface del gateway puede cambiar al tocar Telegram real (PROVISIONAL).
7. **`contract.js` contiene un byte NUL literal** (regex `:42`): git lo trata como binario y Edit/Write lo rechazan (FIRME).
8. **CI no se dispara** con cambios solo en migraciones 0031–0040, `catalog-deletion-journal.js`, `catalog-project-master-adapter.js` o `scripts/catalog-bench/` (filtro `paths` de `catalog-checks.yml`) (FIRME).

## Residuo de la ruta histórica / candidatos a retirar

- `staging.js` (import/export INDEX↔STAGING) y `migration.js` (`decompose`/`compose`): sin importador de producción. Solo las usan pruebas (`catalog-roundtrip.integration`) y, por `rebuildDerivedProjections`, 7 integraciones más el generador de benchmark como utilidad de siembra. FIRME.
- `legacy-codec.js`: residuales `parseStrict`, `validateIndex`, `validateSource`, `collectRefs`, `exportBudget`, `checkBudget`, `trashBeat` (~230 líneas). **Vivos y centrales:** `projectBeat`, `deepDiff`, `SEARCH_TEXT_SEP`, `PROJECTION_VERSION`. El archivo no es retirable entero; su nombre engaña. FIRME.
- `repository.js`: sin llamadores de producción. FIRME.
- `GET /navigation/legacy` (`queries.js:419`): compatibilidad con paginación antigua; el cliente aún la llama (`catalogApi.ts:182`). PROVISIONAL.
- `legacy-fence.js`, capa 2 de `session-guard.js`, triggers de cerco de 0027, `VAULT_PREDICATE_SQL` (`authority.js:84`) e `INDEX_OPERATION_TYPES`: solo existen porque el INDEX existe; quedarán sin llamadores cuando se retiren `library-index-publication.js`, `vault-index-pointer-store.js`, `direct-index-pin-authority.js` y `direct-capability-boundary.js`. PROVISIONAL.
- `flush-quarantine.js`: depende de que sobreviva el flush JSON→PG de `postgres-auth-multiprocess-compat.js`. PROVISIONAL.
- `native-cli reset` y la dependencia de `legacy-import-executor`: herramienta de transición. PROVISIONAL.
- Suites de fixtures `t01-*`/`v01a-*` (~70 JSON de INDEX): prueban el codec residual.

## Pruebas

- **Servidor** (`cloud-server/tests/catalog/`, 33 archivos; conteos por grep de `test(`):
  - 18 unitarias `.test.cjs` (~95 casos), sin PG, con fakes (`helpers/catalog-fake-transport|mtproto|server`). `catalog-routes.test.cjs` cruza HTTP contra modules falsos.
  - 15 `.integration.cjs` (~85 casos) que **exigen PostgreSQL real** efímero (`helpers/catalog-test-db.cjs`, con guardas de propiedad y de red). Llaman a las factories (`createCatalogQueries`, …), no a HTTP; siembran con INSERT crudo y afirman leyendo tablas (15–87 `.query(` por archivo). Están acopladas al esquema: un cambio de columnas rompe muchas aunque la interface no cambie.
- **Arnés:** `cloud-server/tests/catalog-harness/` (6 archivos) y `tests/catalog-harness/` (8: vitest, typecheck, wdio).
- **Cliente:** 11 archivos `tests/component-dom/catalog*` (~53 casos, vitest/jsdom) contra `catalogFakeApi`/`catalogFakeCommands`.
- **Ninguna prueba de CI** recorre HTTP → modules reales → PG; eso solo ocurre en el LAB manual (`scripts/catalog-lab`, Chrome real, gateway fake). FIRME.
- **Qué protegen:** aislamiento por tenant, idempotencia y concurrencia, cursores, equivalencia de caminos de búsqueda, facets delta contra oráculo, máquinas de estado, fencing del worker, journal antes de borrar, restore, cerco legacy.
- **`catalog-checks.yml`:** un job en contenedor `node:22` + servicio `postgres:16` sin puertos. Pasos: `npm ci` (cloud-server y raíz), sentinel de identidad de la instancia, bucle `node scripts/catalog-check.cjs <suite>`, subida de artefactos. En push ejecuta `unit faults integration T03…T17 T19`. No ejecuta `web`, `perf`, T20 ni T21 (pending en `scripts/catalog-suites.json`). Solo se activa en la rama LOCAL.

## Dudas y límites

- No se leyeron completos `backup.js`, `native-cli.js`, `purge.js`, `playback.js`, `media.js` ni `transport-gateway.js` (cabeceras, firmas y greps), ni la mitad de las migraciones 0029–0036. Los juicios deep/shallow de esos se apoyan en interface y cabecera.
- Los conteos de exports y de casos son por grep, aproximados (±2).
- **Depende de cómo acabe la migración:**
  - si `generation_id` es complejidad accidental — depende de si restore/reset futuros usan varias generaciones;
  - qué parte de `legacy-codec`, `staging` y `migration` se retira — depende de si se quiere conservar export a formato INDEX (R11) o las fixtures de roundtrip;
  - la forma final de los seams gateway/MASTER y de las evidencias GATEWAY/PROVIDER/BYTES — G2 sin demostrar;
  - si `backup.js` y el adapter MASTER reciben cableado (T19/G4, T11 fase B);
  - si el cerco y la cuarentena desaparecen con el INDEX y el control-plane JSON;
  - los endpoints sin consumidor pueden ser deuda o trabajo pendiente del cliente (composición apagada por `VITE_CATALOG_API_ENABLED`).
