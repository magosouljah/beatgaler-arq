# P05 — Catálogo SQL nativo: mapa, invariantes y superficie de limpieza

**Fecha del diagnóstico:** 2026-11-20. **Modo:** NEW chat · ALTA · solo lectura.  
**Fuente exclusiva de código:** `magosouljah/BeatGaler`, rama `main`, HEAD real **`ad8f8d0436bba5c3f663a301440ebf977200d953`**. La comparación del HEAD con el SHA de `PANORAMA.md` devolvió **idéntico, 0 commits de diferencia**.  
**Preparación:** leídos primero `magosouljah/beatgaler-arq/panorama-main-20261120/PANORAMA.md` y el tramo aplicable de `INVENTARIO-C0.md` (catálogo, migraciones, cliente y pruebas); no se releyó el historial.  
**Operación:** lectura del árbol de GitHub; **sin ejecutar tests, SQL, navegador, servicios ni CI; sin acceder a credenciales o datos productivos; sin cambios al código, migraciones o DB**. Esta es una reconstrucción estática, no una validación en vivo.

## 0. Sistema de evidencia y alcance

- **VERIFICADO_EN_CÓDIGO:** declaración, llamada, implementación, SQL o constraint inspeccionado en el SHA fijado. Indica **lo que el código hace si se ejecuta en la ruta configurada**, no prueba que haya ocurrido en producción.
- **VERIFICADO_EN_FUNCIONAMIENTO (documental, NO ejecutado en P05):** exclusivamente cuando se cita una comprobación externa existente, con su alcance y límites. El documento `docs/plans/catalogo-postgresql/CIERRE-LIVE-2026-11-20.md:3-23,34-38@ad8f8d0` reporta dos IMPORT `COMMITTED`, cuatro partes `VERIFIED` y worker operativo en el corte de producción; declara explícitamente **reproducción/descarga no probadas, G2 NOT_PROVEN, G3 sin dictamen, T25 pendiente y sin restore del backup final con esos bytes**. Esta constatación documental no sustituye pruebas físicas posteriores.
- **HIPÓTESIS:** posible simplificación, código sin caller actual encontrado, riesgo no reproducido, suposición sobre coste o funcionalidad que exige falsación. El informe de 11 de noviembre **no es evidencia vigente**.
- Las referencias `ruta:línea@ad8f8d0` usan el SHA corto `ad8f8d0`, equivalente inequívocamente al SHA completo fijado arriba. Las líneas son las del archivo original en GitHub, no de copias ni de ramas LOCAL.

**Dictamen ejecutivo.** PostgreSQL ya es el **árbitro nativo de identidad, metadatos y vínculos** de cada beat. Telegram contiene los **bytes**, no el INDEX. El diseño tiene mecanismos esenciales de integridad (tenant, era/epoch, versión, transacciones, recibos verificados, reintento duradero, retención y journal). La oportunidad inmediata no es adelgazar el modelo SQL: es **concentrar proyección/escritura de metadatos, envoltorios transaccionales y adaptadores HTTP/DTO**, preservando diferencias de semántica. Se comprobó duplicación actual; también se refutó la noción de que «todo lo legacy» o «todo DTO duplicado» sea borrable.

## 1. Entradas reales y ownership: no confundir definición con ejecución

```text
WEB — CatalogLibraryProvider / createCatalogServices
  ├─ catalogApi → /catalog/v1/context, /beats, /facets, /changes
  ├─ catalogCommandsApi → PATCH, trash, restore, selections, bulk, purge
  ├─ catalogMutations → Transfer → DirectPort (import dinámico)
  ├─ QueryStore / InteractionStore / PlaybackSession
  └─ MediaClient / PrefixCache / MAIN coordinator
                                  │ HTTPS + auth/cookie/CSRF
                                  ▼
CLOUD — server.js (arranque del proceso) → server-core.js
  └─ app.use(createCatalogRouter(currentCatalog* singleton))
       ├─ authority   ├─ queries  ├─ commands ├─ operations
       ├─ direct      ├─ playback ├─ media    ├─ purge
       └─ prefix-packs / native-transport-provisioning
                                  │ pool Postgres
                                  ▼
           catalog_libraries / catalog_beats / operaciones / etc.
                                  ▲
WORKER SEPARADO — catalog-worker.js (flag enabled + cutover postgres)
  └─ createCatalogWorker(operations, queries, commands, gateway, purge)
       ├─ claim y checkpoint de catalog_jobs
       ├─ verify/reconcile → Telegram gateway → receipt/evidence
       ├─ commit y materialización SQL
       ├─ QUERY_SET_BUILD / OPERATION_STEP
       └─ PURGE con journal + gateway (según flags y guardas)
```

**Entrypoints confirmados.** `cloud-server/server-core.js:33-44,131-135@ad8f8d0` importa los singletons y monta `createCatalogRouter` de `cloud-server/catalog/routes.js:48-71@ad8f8d0`. El worker **no es** un handler de server-core: `cloud-server/catalog-worker.js:19-40,50-60@ad8f8d0` tiene `main()` separado, exige flag, control-plane PostgreSQL, autoridad nativa y activación, y después inicia su propio loop. `cloud-server/catalog/worker.js:60-145,183-208@ad8f8d0` define los seis handlers y el claim. No puede inferirse disponibilidad del worker a partir de HTTP sano.

**Consumidores web confirmados.** `src/features/library/catalog/catalogLibraryProvider.tsx:8-25,67-113,134-153@ad8f8d0` compone servicios y stores. En `:74-78` hace un **import dinámico**: solo desarrollo con flag LAB carga `catalogLabDirectPort`; en el flujo normal carga `catalogDirectPort`. El puerto real usa el transporte web; **no retirar `src/features/cloud/webTransport*` como «muerto»** por ser indirecto. `catalogApi.ts:138-193@ad8f8d0` y `catalogCommandsApi.ts:59-113@ad8f8d0` usan HTTP de metadatos; `catalogMutations.ts:108-149,220-276@ad8f8d0` inicia y recupera transferencias. `catalogQueryStore.ts:293-305@ad8f8d0` consume **de verdad** `legacyNavigation` al resolver el antiguo parámetro de página: nombre legacy no significa ruta muerta.

**Dependencias dinámicas/condicionales:** provider importa DirectPort dinámicamente; `catalog-gateway-runtime.js:45-113,126-160@ad8f8d0` selecciona bot por chat, mantiene caché temporal y abre clientes Telegram perezosamente; `catalog-worker.js:34-40@ad8f8d0` inyecta o no gateway y journal; `purge.js:81-100,338-421@ad8f8d0` solo permite efectos físicos si sus guardas se satisfacen. Estas condiciones deben figurar en cualquier análisis de reachability.

## 2. Inventario de módulos (estado respecto a V1 main, no cantidad de uso)

| Módulo / componente | Responsabilidad y propietario | Estado | Evidencia |
|---|---|---|---|
| `catalog/authority.js` | Activa/resuelve biblioteca, protege era/epoch, vault y chat; no infiere bibliotecas | **ACTIVO** | `authority.js:151-272@ad8f8d0` |
| `catalog/queries.js` | Listado SQL, keyset, búsquedas, facets, query sets durables y proyección API de lectura | **ACTIVO** | `queries.js:200-219,245-310,310-416,516-654@ad8f8d0` |
| `catalog/commands.js` | PATCH, trash/restore, selección, bulk, tags, feed de cambios y revisión | **ACTIVO** | `commands.js:126-241,328-451,487-739@ad8f8d0` |
| `catalog/operations.js` | Intención IMPORT/REPLACE, reservas/partes, commit y journal/jobs | **ACTIVO** | `operations.js:116-245,283-475,553-630@ad8f8d0` |
| `catalog/worker.js` y `catalog-worker.js` | Scheduler y proceso separado de reconciliación/commit/sets/bulk/purge | **ACTIVO condicionado** | `worker.js:60-145,183-208@ad8f8d0`; `catalog-worker.js:19-53@ad8f8d0` |
| `catalog/facets.js` | Delta de facetas en mutaciones; oráculos y rebuild para diagnóstico/fixtures | **COMPARTIDO** | `facets.js:25-95,103-161@ad8f8d0` |
| `catalog/cursor.js` | Firma HMAC y rotación de keyring de los cursores | **ACTIVO** | `cursor.js:13-16,40-88@ad8f8d0` |
| `catalog/beat-projection.js` | Proyección pura del documento al esquema SQL; diferencias semánticas | **COMPARTIDO, activo** | `beat-projection.js:2-6,20-65@ad8f8d0` |
| `catalog/metadata-rules.js` | Validación server-side de patch, nombre/tags/BPM/Key/crop | **ACTIVO** | `metadata-rules.js:47-121@ad8f8d0` |
| `catalog/name-uniqueness.js` | Normaliza clave del nombre y verifica unicidad bajo lock | **ACTIVO** | `name-uniqueness.js:4-23@ad8f8d0` |
| `catalog/direct.js` | Sesión Direct y tickets/capacidades para envío y reportes | **ACTIVO condicionado** | `direct.js:48-78,84-110,151-236@ad8f8d0` |
| `catalog/transport-gateway.js` | Verificación Telegram, búsqueda de envío incierto, borrado/ausencia | **ACTIVO condicionado** | `transport-gateway.js:18-37,125-156,176-231@ad8f8d0` |
| `catalog/playback.js` | Sets READY, vecino, rondas Shuffle y comandos idempotentes | **ACTIVO** | `playback.js:76-165,165-306@ad8f8d0` |
| `catalog/media.js` | Emite referencias autorizadas a partes VERIFIED/PRESENT y confirma bytes | **ACTIVO** | `media.js:27-95,95-122@ad8f8d0` |
| `catalog/purge.js` | Purga lógica SQL y limpieza física defensiva con journal | **ACTIVO / efecto externo protegido** | `purge.js:81-115,144-165,206-297,338-475@ad8f8d0` |
| `catalog/prefix-packs.js` + migración 0041 | MAIN: paquete de prefijos para acelerar reproducción; nunca autoridad del beat | **ACTIVO opcional** | `prefix-packs.js:20-23,93-115,131-217@ad8f8d0` |
| `catalog/routes.js` | Adaptador HTTP y separación por familia de operaciones | **ACTIVO** | `routes.js:21-59,71-208@ad8f8d0` |
| `catalog_legacy_fields` + estado de generaciones importadas | Persistencia de reversibilidad/compatibilidad de datos anteriores | **LEGACY retenido** | `0026_catalog_core.sql:322-332@ad8f8d0`; `0027_catalog_native.sql:326-375@ad8f8d0` |
| `GET /navigation/legacy` | Compatibilidad real de enlaces `bgPage` mediante QueryStore | **COMPARTIDO (compatibilidad activa)** | `queries.js:419-468@ad8f8d0`; `catalogQueryStore.ts:293-305@ad8f8d0` |
| `refreshGroupsAndFacets` | Recuento completo anterior, ahora oráculo/export; no se encontró caller runtime | **INCIERTO para eliminación** | `commands.js:97-120,739@ad8f8d0` |
| `rebuildDerivedProjections` | Reconstrucción explícita, usado en scripts/fixtures y pruebas | **COMPARTIDO (diagnóstico)** | `facets.js:148-161@ad8f8d0`; búsquedas de callers en tests/scripts |

El estado **ACTIVO** significa *alcanzable desde un entrypoint o consumidor rastreado*, sujeto a flags/estado cuando se indica; no implica que toda función exportada haya sido llamada en producción.

## 3. Modelo SQL: entidades y relaciones que explican el sistema

```text
users(user_id) ──1:1── catalog_libraries(user_id, vault_id, authority_era, authority_epoch,
                           revision, active_generation_id, counters, restore_hold)
  │                         │
  ├── vaults (chat/bot)      └──1:N── catalog_generations(generation_id, origin, status)
  │                                     │
  │                                     ├──1:N── catalog_beats(beat_id, state,
  │                                     │          version, legacy_json, metadata + proyecciones)
  │                                     │           ├──1:N── catalog_beat_tags
  │                                     │           │        └── catalog_beat_tag_groups
  │                                     │           │               └── catalog_facets (agregado)
  │                                     │           ├──0:1── catalog_trash_entries
  │                                     │           ├──0:1── catalog_tombstones
  │                                     │           ├──1:N── catalog_file_versions(file_id, role,
  │                                     │           │         revision, VERIFIED/RETIRED/...)
  │                                     │           │          ├──1:N── catalog_file_parts(index)
  │                                     │           │          │          └──1:N── catalog_part_locations
  │                                     │           │          │                     └── catalog_media_objects
  │                                     │           │          │                             (Telegram chat/message)
  │                                     │           │          └── catalog_current_files(beat,slot→file)
  │                                     │           └──0:N── catalog_events (version/revision)
  │                                     └──1:N── catalog_query_sets(predicate+revision)
  │                                                  ├── catalog_query_members(slot,beat,expected_version)
  │                                                  ├── catalog_query_set_leases(consumer)
  │                                                  ├── catalog_selections → _ops → _op_ids
  │                                                  ├── catalog_operations → _batches → _batch_items
  │                                                  └── catalog_playback_rounds
  │                                                            ├── _mapping
  │                                                            ├── _consumed
  │                                                            └── _commands
  ├── catalog_transfer_operations → catalog_operation_parts → catalog_transfer_capabilities
  │                 │                    └── receipt/verify → catalog_jobs
  │                 └── catalog_reservations          (los blobs todavía no están en SQL)
  ├── catalog_purges → catalog_purge_items → catalog_purge_objects → catalog_media_objects
  ├── catalog_media_grants (grant hash, file/part/object, epoch)
  ├── catalog_prefix_packs(MAIN) → catalog_prefix_pack_entries(file + offset/length)
  ├── catalog_library_chats / catalog_chat_rebinds
  └── control_plane_flush_quarantine / catalog_restore_runs+findings
```

**Nodos y ownership concretos.**
1. **Biblioteca y generación.** `catalog_libraries` tiene una fila por usuario, autoridad, epoch y contadores; `catalog_generations` versiona el *universo* de beats. Solo una generación `ACTIVE` por usuario (índice parcial) y su FK desde biblioteca es diferible (`0026_catalog_core.sql:11-60@ad8f8d0`). `catalog_native_activation` registra activación del entorno, `catalog_library_chats` fija correspondencia de chat; fences 0027 impiden rebind incontrolado (`0027_catalog_native.sql:10-59,257-306@ad8f8d0`).
2. **Beat canónico.** En el catálogo nativo, **`catalog_beats`, acotado por `user_id + generation_id + beat_id`**, y sus vínculos relacionales son la autoridad de existencia, estado, versión y metadatos. `catalog_beats.legacy_json` conserva el documento de beat que `commands` edita y del que `beat-projection.projectBeat` deriva columnas SQL (nombre, BPM, key, rating, tags/search). El calificativo `legacy_json` **no implica INDEX de Telegram como autoridad**. Hay CHECK del SHA del documento (`0026_catalog_core.sql:81-123@ad8f8d0`; `commands.js:67-95,209-225@ad8f8d0`; `beat-projection.js:20-46@ad8f8d0`). La fuente canónica de **bytes** es Telegram, localizado por `catalog_media_objects` vía `catalog_part_locations`, no el campo JSON.
3. **Metadatos derivados.** `catalog_beat_tags` guarda orden/etiqueta; `catalog_beat_tag_groups` agrupa por norm_key y arrastra `state/manual_rank` por FK `ON UPDATE CASCADE`; `catalog_facets` guarda conteo/representante. El `search_text` y sus contadores de gramos se mantienen mediante guardas/triggers: no son fuentes independientes (`0026_catalog_core.sql:125-176@ad8f8d0`; `0037_catalog_search_text.sql:12-28@ad8f8d0`; `0039_catalog_search_gram_counts.sql:14-90@ad8f8d0`).
4. **Archivo≠parte≠ubicación≠objeto.** `catalog_current_files` señala *cuál versión* ocupa cada slot del beat; `catalog_file_versions` preserva historial y retención; cada `catalog_file_parts` puede tener `PRIMARY/BACKUP` en `catalog_part_locations` y la ubicación KNOWN apunta a `catalog_media_objects`. El objeto contiene identificador Telegram, no los bytes. La ubicación OPAQUE **no autoriza borrado por intuición** (`0026_catalog_core.sql:236-320@ad8f8d0`; `operations.js:427-456@ad8f8d0`).
5. **Consultas materializadas.** `catalog_query_sets` congela predicado/`base_revision` y sus `catalog_query_members` tienen slot/beat/expected_version; leases distinguen consumidor. Un set no reemplaza el listado general: este usa keyset inmediato; selección y shuffle consumen READY (`0026_catalog_core.sql:334-414@ad8f8d0`; `queries.js:543-623@ad8f8d0`; `playback.js:110-115@ad8f8d0`).
6. **Dos tipos distintos de operación.** `catalog_operations` soporta comandos PATCH/BULK/TAG_RENAME, con evento, lotes y resultados; `catalog_transfer_operations` soporta IMPORT/REPLACE/PURGE como clase SQL, más partes, reservas y jobs. `catalog_purges` es el registro **específico** de purga y `routes.js` enruta la intención `PURGE` a él. No fusionar estas tablas sin demostrar la equivalencia de contratos (`0029_catalog_commands.sql:10-156@ad8f8d0`; `0030_catalog_transfer_operations.sql:7-155@ad8f8d0`; `routes.js:121-151@ad8f8d0`).
7. **MAIN no es INDEX.** `catalog_prefix_packs` y `catalog_prefix_pack_entries` asocian prefijos de archivos verificados a offsets de un mensaje Telegram; único pack PUBLISHED y único STAGED por usuario. Optimiza acceso, no decide existencia del beat ni sustituye `current_files` (`0041_catalog_prefix_packs.sql:6-62@ad8f8d0`; `prefix-packs.js:20-23,93-217@ad8f8d0`).

**Migraciones 0026–0042, por responsabilidad:**

| Migración | Aporte que sobrevivirá | Naturaleza |
|---|---|---|
| `0026` | Core biblioteca/generaciones/beat/proyecciones tags/facets/trash/files/ubicaciones/sets + FKs, triggers | **Integridad esencial**, algunas columnas legacy para compatibilidad |
| `0027` | Activación native, chat/rebind/quarantine, fences de escritura legacy, borrado y truncado | **Seguridad de autoridad** |
| `0028` | ICU `und` obligatoria, columnas display/search e índices de orden | **Contrato de búsqueda/orden** |
| `0029` | Comandos, event feed, lotes, selección CAS | **Concurrencia/recuperación** |
| `0030` | Transferencias, partes/receipts, reservas, jobs y transiciones | **Integridad de medios** |
| `0031` | Tickets hash y máquina de intentos | **Límite de capacidades** |
| `0032` | Shuffle persistido, consumidos, grants de medios | **Semántica playback/autorización** |
| `0033` | Purge, manifiesto objetos, estados inciertos y journal | **No perder bytes** |
| `0034` | Auditoría inmutable de rebind | **Trazabilidad** |
| `0035` | Runs/findings de restore | **Recuperación** |
| `0036` | Estadísticas del planner de tags | **Rendimiento** |
| `0037` | `search_text` y trigger de sincronía | **Proyección de búsqueda** |
| `0038` | `pg_trgm` / índices GIN y nulos | **Rendimiento** |
| `0039` | Contador exacto por grama/estado + triggers de sentencia | **Optimización con invariante SQL** |
| `0040` | Autovacuum adaptado a tablas calientes | **Rendimiento operacional** |
| `0041` | MAIN SQL + entries, locks de publicación | **Caché durable** |
| `0042` | Activación permite `REUSED_UNROTATED` | **Compatibilidad de corte**, riesgo de tokens documentado |

Referencias de DDL: `cloud-server/migrations/0026_catalog_core.sql:11-417`, `0027_catalog_native.sql:10-405`, `0028_catalog_queries.sql:12-54`, `0029_catalog_commands.sql:10-156`, `0030_catalog_transfer_operations.sql:7-155`, `0031_catalog_transfer_capabilities.sql:8-32`, `0032_catalog_playback.sql:8-86`, `0033_catalog_purge.sql:7-75`, `0034_catalog_native_cli.sql:6-29`, `0035_catalog_restore.sql:6-27`, `0036_catalog_beat_tags_label_stats.sql:12-13`, `0037_catalog_search_text.sql:12-33`, `0038_catalog_search_indexes.sql:13-26`, `0039_catalog_search_gram_counts.sql:14-90`, `0040_catalog_autovacuum.sql:9-13`, `0041_catalog_prefix_packs.sql:12-62` y `0042_catalog_reused_bots.sql:6-10`, **todas @ad8f8d0**. No se aplicó ninguna migración durante P05. El runner `cloud-server/postgres-migrations.js:23-63,202-274@ad8f8d0` enumera archivos, comprueba checksums y usa advisory lock; preservar verificación de esquema más nuevo.

## 4. Mapa SQL ↔ módulo ↔ funcionalidad

| Funcionalidad visible / efecto | Escritura o lectura SQL principal | Módulo dueño / consumidor |
|---|---|---|
| Arranque/contexto/provision | `catalog_native_activation`, `vaults`, `catalog_libraries`, `catalog_generations`, `catalog_library_chats` | `authority.js:168-246` ↔ `catalogApi.ts:176-218` |
| Galería list/filter/sort | `catalog_beats` + `catalog_beat_tags/search_text/gram_counts`; keyset, cursor firmado | `queries.js:107-200,310-374` ↔ `catalogApi.ts:179` → `catalogQueryStore.ts:241-360` |
| Facetas de tags | `catalog_facets` / `catalog_beat_tag_groups` | `queries.js:470-515`, `facets.js:25-95` ↔ `catalogApi.ts:184-192` |
| Detalle y edición de metadatos | `catalog_beats.legacy_json` + proyecciones + tags + `catalog_operations/events` | `commands.js:45-95,191-241` ↔ `catalogCommandsApi.ts:28,103-106` ↔ `catalogMutations.ts:69-92,137` |
| Trash/restore | `catalog_beats.state`, `catalog_trash_entries`, tombstone/counters/facets/events | `commands.js:269-324` ↔ `catalogMutations.ts:149-169` |
| Bulk/rename | `catalog_query_sets/members` + `catalog_selections/selection_ops` + `catalog_operations/batches/items` | `queries.js:543-623` + `commands.js:328-451,487-714` ↔ `catalogCommandsApi.ts:34-42,113-140` |
| Nueva subida/reemplazo | `catalog_transfer_operations` + `catalog_operation_parts` + `catalog_reservations` | `operations.js:195-245,361-475` ↔ `catalogMutations.ts:220-276` |
| Sesión/ticket Direct | `catalog_transfer_capabilities`, sender/random_id, bot/vault/chat | `direct.js:84-110,151-236` + `catalog-gateway-runtime.js:45-113` |
| Verify/reconcile/commit | `catalog_jobs` leases + receipts, `catalog_media_objects`, versions/parts/locations/current_files | `worker.js:60-108` + `operations.js:283-475,553-630` + `transport-gateway.js:125-139,176-231` |
| Audio y descargas | `catalog_current_files/versions/parts/locations/media_objects` + grants | `media.js:51-122` ↔ `catalogMediaClient.ts`; bytes por DirectPort |
| Next/Prev/Shuffle | `catalog_query_members`, `catalog_playback_rounds/mapping/consumed/commands` | `playback.js:110-306` ↔ `catalogLibraryProvider.tsx:134-141` |
| Vaciar papelera / purge | `catalog_purges/items/objects` + `beats.state` / tombstone / grants / journal | `purge.js:144-165,206-475` ↔ `catalogMutations.ts:178-188` |
| MAIN / prefix | `catalog_prefix_packs/entries`, `current_files` (validación) | `prefix-packs.js:37-52,93-217` ↔ `catalogMainPack.ts` / `catalogMediaClient.ts` |
| Copia/restore de autoridad | `schema_migrations`, `catalog_restore_runs/findings`, epoch bump | `postgres-migrations.js:202-274` + scripts/restore **fuera de ruta interactiva** |

Las relaciones son **por responsabilidad**, no un diagrama de un único SELECT. `catalog_commands` escribe metadatos y **nunca debe tocar Telegram**; `worker` habla con Telegram pero solo publica la referencia de partes verificadas en SQL. En edición de portada, `artwork: null` desvincula el slot y retira versión con retención, **sin eliminar mensaje Telegram** (`commands.js:211-235@ad8f8d0`). Reemplazar portada/WAV/PROJECT es transferencia, no PATCH de bytes.

## 5. Contratos HTTP, SQL, eventos y Telegram

**HTTP bajo `/catalog/v1` (definición efectiva del router).** `routes.js:21-59,71-208@ad8f8d0`:

- **Lecturas**: `GET /context`, `/beats`, `/beats/:id`, `/beats/:id/files`, `/facets`, `/facets/active`, `/changes?after=...`, `/query-sets/:id`, `/selections/:id`, `/operations/:id`, `/playback/rounds/:id`, `/prefix-packs/manifest`, `/navigation/legacy`.
- **Mutaciones**: `POST /library/provision`; `PATCH /beats/:id`; `POST /beats/trash|restore`; `POST /query-sets` y `/:id/cancel|release`; `POST /selections` y `/:id/ops|release`; `POST /tags/rename/preview|rename`; `POST /operations` con discriminante `kind` (IMPORT/REPLACE, BULK*, TAG_RENAME, PURGE); `/operations/:id/{commit,cancel,reservation/renew,reservation/readmit,resume}`; endpoints por parte `dispatch|send-ticket|send-report|direct-receipt`; `POST /direct/session`; playback ronda NEXT/CONSUME/REBUILD/RELEASE; `/prefix-packs/main` y publish/cancel; `/files/:fileId/access` y confirmación de parte.
- Las **cabeceras** para escrituras de comando mediante `writeHeaders` son `Idempotency-Key`, `X-Catalog-Era`, `X-Catalog-Epoch`; ausencia → **428** (`routes.js:35-44@ad8f8d0`). Algunas transiciones de una operación *ya identificada* usan solo `eraHeaders`; no atribuir exigencia de clave a todas sin revisar ruta. PATCH admite `If-Match` con expectedVersion y produce conflicto de versión (ver `commands.js:191-208,244-254@ad8f8d0`).
- Contratos de cliente: `catalogApi.ts:10-88,145-220@ad8f8d0` y `catalogCommandsApi.ts:16-46,59-149@ad8f8d0`. Ambos propagan `CatalogApiError {status,code,detail}`, auth/cookie/CSRF. El cliente nativo no interpreta caída de SQL como catálogo vacío: `resolveContext` solo llama `provision` tras `LIBRARY_NOT_PROVISIONED` (`catalogApi.ts:194-215@ad8f8d0`).
- **Query**: filtros de tags `includeTag/excludeTag`, modo ANY/ALL, q y orden manual/rating/name/bpm se traducen a predicado **antes de LIMIT** (`queries.js:107-191,310-335@ad8f8d0`). Lectura REPEATABLE READ/READ ONLY, `statement_timeout=1000ms`, deadline API 2000ms y tamaño página ≤2MiB (`queries.js:18-34,245-269,363-374@ad8f8d0`). Cursor firmado HMAC ligado a tenant/era/epoch/generación/revisión/filtros/sort/limit (`cursor.js:51-88@ad8f8d0`; `queries.js:285-310@ad8f8d0`). **No reutilizar cursor tras revisión distinta.**
- **Estados SQL**: claves únicas y CHECKs por usuario, transiciones de generación, transferencia, job, consulta y purge en SQL; no confiar solo en TS. `catalog_events` se escribe con revisión y número secuencial y el cliente recibe feed; fuera de ventana de retención → `RESYNC_REQUIRED` 410 y debe refrescar páginas (`commands.js:714-725@ad8f8d0`; `0029_catalog_commands.sql:69-83@ad8f8d0`).
- **Telegram**: `caption` de transferencia `catalog:v1 op=... part=...` y de MAIN `catalog:v1 pack=...`; `random_id` de envío persistido, sender/chat y recibo candidato, búsqueda/verify por gateway. **El recibo del navegador no prueba la existencia/identidad del byte**: worker comprueba proveedor y puede reconciliar (`transport-gateway.js:18-24,62-68,125-156,176-231@ad8f8d0`; `operations.js:283-359@ad8f8d0`). La API de medios devuelve referencias del objeto presente en vez de trasladar binarios por SQL (`media.js:51-88@ad8f8d0`).

**Eventos y operaciones**: La revisión de biblioteca se incrementa junto a cambio/counters y evento; la versión se incrementa por beat. `commands.js:153-161,221-240@ad8f8d0` y `operations.js:458-473@ad8f8d0` implementan la misma obligación, por duplicado. La idempotencia de un PATCH vive en `catalog_operations`; la idempotencia del upload vive en `catalog_transfer_operations`; shuffle en `catalog_round_commands`; tickets de envío en `catalog_transfer_capabilities`. **Son dominios diferentes**.

## 6. Diagramas de camino feliz y fallo/reintento

### A. Lectura, filtros, selección

```text
[Web filtros/sort] → QueryStore.setQuery / requestGeneration
  → GET /catalog/v1/beats?state&q&includeTag&excludeTag&sort&cursor
  → queries.readTx(REPEATABLE READ READ ONLY)
  → autoridad/generación/revisión → predicado SQL → keyset LIMIT
  → itemDto + cursor HMAC → render bloque virtualizado
  → (si se necesita selección global/Shuffle)
     POST query-sets [predicate_hash,base_revision,lease]
     → catalog_jobs QUERY_SET_BUILD → workers construyen 240/step
     → CHECK revisión final con catalog_libraries FOR UPDATE → READY
     → selección CAS o ronda Shuffle sobre miembros congelados

Fallo: cursor viejo/filtro revisado/epoch diferente
  → CURSOR_STALE/INVALID, NO bloque mezclado → QueryStore
  → descarta bloques, recarga primer bloque una vez, preserva filtros;
  si vuelve a cambiar: error visible, no silencio/[].
Fallo: set perdió la revisión durante BUILDING → STALE, no READY falso.
```

Refs: `queries.js:245-374,543-623@ad8f8d0`; `catalogQueryStore.ts:131-167,205-238,354-360@ad8f8d0`.

### B. PATCH metadata / rename / trash

```text
Web detecta campos cambiados → CatalogCommandsApi.patchBeat
 → validar patch y versión (sin DB)
 → BEGIN + quarantine + lock catalog_libraries FOR UPDATE
 → autoridad POSTGRES + IDLE + era/epoch → idempotency key + hash
 → lock beat(s) FOR UPDATE (orden beat_id) + expected_version
 → [legacy_json documento canónico] aplicar patch
 → projectBeat → UPDATE catalog_beats + tags si cambiaron
 → facets delta si necesario → version +1, library.revision +1
 → catalog_events + catalog_operations.result_json → COMMIT
 → respuesta beat/versión/revisión; QueryStore actualiza vista

Fallo: name duplicado, versión/epoch distinta o selección stale
 → 409, no cambios parciales; misma Idempotency-Key y hash: replay
 → distinto hash: IDEMPOTENCY_MISMATCH 409.
Fallo: selección cambia mientras se opera
 → status CONFLICT puede persistirse intencionalmente con commit-on-error;
 no sustituir envoltorio de transacción sin preservar ese caso.
```

Refs: `commands.js:130-179,187-241,376-423@ad8f8d0`. Trash/restore usa `catalog_trash_entries` y contadores, no elimina bytes de Telegram (`commands.js:269-324@ad8f8d0`).

### C. IMPORT / REPLACE y fallo de proveedor

```text
Web prepareFiles MASTER/WAV/ARTWORK/PROJECT
 → POST /operations {IMPORT|REPLACE}, Idempotency-Key, era/epoch
 → operaciones: cuota incluyendo PENDING, nombre/versión, reserva HELD,
   operation_parts + random_id y sender/chat en SQL → COMMIT
 → DirectPort solicita ticket temporal hash (capability) → Telegram send
 → dispatch/report + receipt candidato en SQL → job TRANSFER_VERIFY
 → worker claim FOR UPDATE SKIP LOCKED (lease generation, owner)
 → gateway verifica mensaje/size/sender/proveedor → parte VERIFIED
 → job TRANSFER_COMMIT (o petición commit 202 mientras espera)
 → operaciones.commitOperation bajo library lock + revalidación versión/era
 → INSERT/UPDATE beat + file_versions + file_parts + part_locations
   + media_objects PRESENT + current_files + counters + event
   + reservation CONSUMED + transfer COMMITTED → COMMIT
 → solo entonces beat aparece ACTIVE.

Fallo: el cliente se cae tras enviar, o receipt incierto
 → conservar operation + random_id + referencia local
 → RECONCILE (NO reenviar): buscar Telegram por identidad/caption
    0 coincidencias = UNCERTAIN; 1 verificable = adoptar/verificar;
    >1 o identidad ambigua = BLOCKED, intervención
 → lease expira → nuevo worker puede reclamar; fencing impide al viejo
   confirmar resultados; reintento acotado/backoff; bytes retenidos.
Fallo: REPLACE versión anterior o reserva vencida
 → conflicto / readmit, NO se publica una versión sobre otro edit;
 los objetos ya enviados NO se borran automáticamente.
```

Refs: `operations.js:171-245,283-475,478-543,561-621@ad8f8d0`; `direct.js:151-236@ad8f8d0`; `worker.js:62-108,151-176@ad8f8d0`; `catalogMutations.ts:55-65,102-149,193-276@ad8f8d0`.

### D. Reproducción, shuffle, MAIN y fallos

```text
Gallery → set READY (filtro + revisión) → PlaybackSession
 → neighbor o round NEXT/CONSUME (idempotency+sequence, lock ronda)
 → fileId/revision actual de beat → media.issueAccess
 → valida ACTIVE/VERIFIED/KNOWN/PRESENT + epoch + grant/TTL
 → navegador DirectPort obtiene partes desde Telegram
 → opcional MAIN/PREFIX pack si entrada corresponde al file+sha actual
 → reproducción y cachés de navegador (NO cambian autoridad SQL).

Cambio de revisión/set o epoch: ronda STALE, rebuild conserva consumidos;
 fallo de bytes: no convertir a "beat vacío", recobrar acceso o reportar.
MAIN obsoleto: reconstrucción opcional por versiones y umbral,
 nunca sobrescribe el archivo original ni decide el slot actual.
```

Refs: `playback.js:110-165,165-306@ad8f8d0`; `media.js:51-122@ad8f8d0`; `prefix-packs.js:20-23,131-217@ad8f8d0`; `0041_catalog_prefix_packs.sql:12-62@ad8f8d0`.

### E. Purga y restauración

```text
Usuario PURGE TRASH → POST /operations kind PURGE (idempotente)
 → catalog_purges + items y job durable
 → enumerateStep en tx SQL:
    registrar objetos en manifiesto ANTES de desvincular
    beat TRASH → PURGED; versiones DELETED; tombstone;
    revocar grants; contador/revision/evento; COMMIT
 → cleanupStep independiente:
    comprobar otras referencias+retención+restore_hold+cleanup_enabled
    + gateway+ journal + no delete concurrente
    → objeto DELETING bajo lock + journal.append+verify
    → Telegram.delete → probeAbsence
    → solo con evidencia DELETED; incertidumbre → UNCERTAIN aparcado.

Fallo: objeto compartido → KEPT; retención/restore_hold → DEFERRED;
 gateway o journal ausente → NO DELETE; timeout tras delete posible
 → UNCERTAIN, probe en reanudación (NO reenviar a ciegas).
Restaurar backup SQL ≠ restaurar bytes Telegram: reconciliar objetos,
 bump epoch, conservar restore_hold hasta evidencia.
```

Refs: `purge.js:36-78,144-165,206-297,307-475@ad8f8d0`; `0033_catalog_purge.sql:7-75@ad8f8d0`; `0035_catalog_restore.sql:6-27@ad8f8d0`.

## 7. Invariantes NO NEGOCIABLES (contratos de preservación)

| ID | Invariante | Quién lo defiende hoy / regresión intolerable |
|---|---|---|
| **I01** | Nunca cruzar biblioteca/tenant; cada consulta de catálogo y FK física respeta `user_id` y generación | DDL claves compuestas `0026:81-320`; autoridad `authority.js:249-258` |
| **I02** | Solo POSTGRES activado; fallo DB/SQL no da catálogo vacío ni fallback a INDEX | `authority.js:151-194`; `catalogApi.ts:194-215`; fences `0027:124-167` |
| **I03** | Era identifica linaje, epoch invalida clientes/grants tras restore/rebind, generation ubica snapshot; no confundir con revision ni version | `authority.js:101-135,249-258`; `queries.js:285-310`; `media.js:51-66` |
| **I04** | Revisión de biblioteca y versión de beat monotónicas en cada mutación material; comparación CAS impide overwrite concurrente | `commands.js:153-161,191-208`; `operations.js:403-425,458-473` |
| **I05** | Mutación bajo lock de biblioteca, orden determinista de beats; status/contadores/facets/evento/resultado en **misma transacción** | `commands.js:130-161,187-188,221-240`; `operations.js:120-137,458-473` |
| **I06** | Idempotency key+hash: replay solo misma intención; distinta intención → 409, sin doble beat/cuota/evento | `commands.js:165-179`; `operations.js:171-177,195-200`; índices `0029:37-40`/`0030:29-33` |
| **I07** | No aceptar nombre duplicado ACTIVE según política de trim+lower; evaluar al reservar y al confirmar | `name-uniqueness.js:4-23`; `operations.js:205,396-423`; `commands.js:215-216` |
| **I08** | Proyecciones (display, search, BPM, tags, gram counts) coherentes con documento y state; mantener trigger/FK aunque se refactorice JS | `beat-projection.js:20-46`; `0037:12-28`; `0039:14-90`; `facets.js:25-95` |
| **I09** | Cursor/keyset firmado ligado a contexto completo y filtros; páginas nunca mezclan revisiones | `cursor.js:51-88`; `queries.js:285-374`; `catalogQueryStore.ts:131-167` |
| **I10** | Query set READY solo con revisión aún válida; miembros/versión congelados; selección CAS y shuffle sin repetición | `queries.js:543-623`; `0026:334-414`; `commands.js:376-423`; `playback.js:150-255` |
| **I11** | Los bytes NO se dan por presentes por recibo web; solo proveedor/byte comprobado autoriza VERIFIED/PRESENT y enlace actual | `operations.js:283-359,427-456`; `media.js:51-88` |
| **I12** | Ticket temporal/identidad random_id de envío son persistentes, no exponer token largo; no doble dispatch incierto | `0030:66-96`; `0031:8-32`; `direct.js:151-236` |
| **I13** | Claim con lease_generation y fencing; worker caído es reintentable, worker viejo no puede confirmar tras ceder lease | `operations.js:561-621`; `worker.js:151-176` |
| **I14** | Ningún timeout o 0 coincidencias demuestra «no se envió»; reconciliar o bloquear antes de cualquier reenvío | `worker.js:86-108`; `transport-gateway.js:125-139` |
| **I15** | Quota debe incluir ACTIVE + TRASH + PURGING + PENDING; reserva se consume/libera una sola vez | `operations.js:179-185,230-235,458-461,478-543` |
| **I16** | Desvincular/reemplazar archivo retiene la versión y el objeto; borrado físico separado y reversible durante ventana | `commands.js:211-235`; `operations.js:449-455`; `0026:236-320` |
| **I17** | Purge SQL registra manifiesto/tombstone antes del efecto físico; no eliminar objeto compartido, retenido, opaque, incierto ni sin journal verificado | `purge.js:144-165,246-297,307-421`; `0027:215-237` |
| **I18** | restore_hold/cleanup_enabled y fences de autoridad/rebind/delete/TRUNCATE solo se relajan con evidencia operativa expresa | `0027:171-306`; `purge.js:307-475` |
| **I19** | MAIN no modifica `catalog_current_files` ni actúa como catálogo alterno; publicar solo tras verificar y CAS de secuencia | `0041:12-62`; `prefix-packs.js:131-209` |
| **I20** | Restore y upgrades de esquema deben invalidar clientes obsoletos, verificar compatibilidad de migraciones y reconciliar bytes | `postgres-migrations.js:202-274`; `0035:6-27`; `authority.js:276-295` |

Todas las referencias de esta tabla corresponden a `cloud-server/catalog/...` o `cloud-server/migrations/...`, **@ad8f8d0**. **No borrar ni «optimizar»** un guard SQL a partir de un test de interfaz; las invariantes de bytes requieren también pruebas de fallo y prueba del proveedor.

## 8. Duplicaciones vigentes: falsación de hipótesis históricas

**VERIFICADO_EN_CÓDIGO, HEAD main (no inferido del 11-nov):**

| Duplicación / dispersión actual | Prueba exacta | Riesgo de cambio / recomendación |
|---|---|---|
| Envoltorio `mutationTx` por dominio | `commands.js:130-151`; `operations.js:120-137`; `direct.js:54-71`; `playback.js:80-96`; `purge.js:88-105`; `prefix-packs.js:69-83` | **Candidato** a núcleo común para disponibilidad/quarantine/era/epoch/IDLE/commit/rollback, **con políticas explícitas**. Purge exige `allowFrozen`; otras variantes hacen trabajo adicional; no sustituir a ciegas. |
| Envoltorio `readTx` | `queries.js:252-272`; `commands.js:351-358`; `operations.js:138-147`; `playback.js:97-104`; `purge.js:106-114`; `media.js:32-39` | **Candidato** a función de aislamiento/deadline/error normalizado; las lecturas de datos, lecturas que aplican guards y `queries.writeTx` **no tienen idéntico contrato**. |
| Escritura SQL de metadatos | `commands.js:67-95` define `BEAT_UPDATE_SQL` y etiquetas; `operations.js:396-423` tiene INSERT nuevo y UPDATE/reescritura REPLACE por separado | **Duplicación real de responsabilidades de persistencia**. Una columna editable obliga sincronizar ambos; extraer **puertos de escritura explícitos** `insertBeatProjection` / `updateBeatProjection` bajo tx inyectada, conservando diferencias IMPORT/REPLACE/PATCH y side effects. |
| Construcción del documento / mapping | `commands.js:45-70` `DOC_KEYS`/patch→legacy_json; `operations.js:109-115` `nativeBeatDocument`; `beat-projection.js:20-46`; `metadata-rules.js:47-119` | Parte necesaria (validar versus proyectar), parte accidental (múltiples enumeraciones de campos). Concentrar definiciones semánticas con *roles* separados. |
| DTO de beat / archivos / operación | `queries.js:200-219` `DTO_COLUMNS/itemDto`; `commands.js:181-185` `beatDto`; `operations.js:148-164` `opDto`; `commands.js:479-485` bulk op; `catalogApi.ts:28-73`; `catalogCommandsApi.ts:17-46`; `catalogMutations.ts:69-92` | Se repite transformación, **pero DTO no idéntico**: lista, detalle, resultado comando, operación transfer y Beat UI requieren campos distintos. Extraer mapping base compartido; no forzar un megadto ni borrar variantes sin equivalencia. |
| Bump revisión, event_seq, evento | `commands.js:153-161`; `operations.js:458-464`; `purge.js:154-159` | **Candidato** a servicio interno de «commit de cambio» atómico en tx, con payload/evento tipados. Preservar contadores y ordenamiento serializado por library lock. |
| Validación y normalización tags/nombre | `metadata-rules.js:14-22,80-95`; `beat-projection.js:27-29`; `name-uniqueness.js:9-23`; `catalogCommandsApi.ts:9-12,148`; `catalogMutations.ts:105` | Posible divergencia de reglas: `metadata-rules.normalizeTag` colapsa whitespace y `projectBeat.normKey` solo trim+lower; **HIPÓTESIS de incompatibilidad**, no bug confirmado (proyección puede requerir datos legacy distintos). Aislar pruebas de equivalencia **antes** de unificar. |
| Capa HTTP genérica | `catalogApi.ts:138-174` vs `catalogCommandsApi.ts:59-96` | Headers/cookie/CSRF/timeout/errores duplicados; **bajo riesgo** al extraer transporte compartido, pero conservar cambios de método, idempotency e If-Match. |

**Contrapruebas relevantes.** `refreshGroupsAndFacets` existe y está exportada, pero búsqueda de símbolos en el HEAD encontró solo su definición/export `commands.js:97-120,739@ad8f8d0` y documentación, **ninguna invocación de aplicación**; las mutaciones revisadas llaman `facets.snapshotGroups/insertGroups/applyFacetDelta`. Es **candidato** para aislar en herramienta/oráculo, no orden de borrado inmediata sin comprobar scripts/tests/exports y equivalencia de reconstrucción. `facets.rebuildDerivedProjections` SÍ aparece en generadores y pruebas, por lo que **no está muerto**. `/navigation/legacy` SÍ tiene consumidor web. `catalogDirectPort` SÍ está tras import dinámico productivo. Estos ejemplos impiden extrapolar una limpieza masiva por nombres antiguos.

**Detalles de versión del contrato que exigen comprobación, NO error confirmado de usuario:** el tipo `CatalogQuerySet.status` del cliente enumera BUILDING/READY/STALE/FAILED/CANCELLED, mientras 0026 incluye RELEASED; `CatalogBulkStatus` no enumera BLOCKED, mientras 0029 sí (`catalogCommandsApi.ts:34-42@ad8f8d0`; `0026_catalog_core.sql:345@ad8f8d0`; `0029_catalog_commands.sql:21@ad8f8d0`). Comprobar qué respuestas llegan a esos consumers y si TS solo acota un estado terminal esperado; completar tipos si corresponden.

## 9. Coste REAL de añadir un campo editable: responsabilidades afectadas

**Caso de control:** añadir `mood` como nueva propiedad escalar editable del beat V1, visible en tarjeta/detalle, persistente tras import/reemplazo, sincronizada por búsquedas y eventos cuando proceda. **No se propone implementarla**, es un ensayo de impacto sobre el estado actual. La medición cuenta **responsabilidades**, no líneas; cada obligación puede ocupar varios archivos.

| # | Responsabilidad existente que debe decidir o cambiar | Superficie demostrada |
|---|---|---|
| 1 | Contrato y validación canónica de entrada (PATCH, bulk, IMPORT/REPLACE) | `metadata-rules.js:47-119` |
| 2 | Normalización/representación en documento persistente | `commands.js:45-70`; `operations.js:109-115` |
| 3 | Proyección pura y comparación del nuevo campo | `beat-projection.js:20-65` |
| 4 | Persistencia SQL/base y CHECK/índice *si* consulta/sort necesita columna | `0026:81-123`, `0028:14-54`, migración nueva si se aprueba después |
| 5 | Escritura de PATCH y bulk sin destruir JSON antiguo | `commands.js:72-95,487-714` |
| 6 | Escritura de IMPORT y REPLACE (dos semánticas distintas) | `operations.js:396-425` |
| 7 | Coherencia de etiquetas/facetas/search *si* ese campo participa en búsqueda | `facets.js:25-95`; `queries.js:131-191`; `0037–0039` |
| 8 | Proyección DTO de lista/detalle y campo en evento/versión | `queries.js:200-219,378-390`; `commands.js:181-185,153-161` |
| 9 | Modelo TS HTTP de DTO y patch | `catalogApi.ts:28-73`; `catalogCommandsApi.ts:17-31` |
| 10 | Adapter Beat UI y diff metadata de cliente | `catalogMutations.ts:69-92` |
| 11 | Import/review/replace en interfaz y preparación payload | `catalogMutations.ts:254-276`; `catalogLibraryProvider.tsx:108-113` |
| 12 | Display/filtros/caché/orden URL; invalidate si afecta queryKey | `catalogQueryStore.ts:94-110,354-360`; `catalogApi.ts:122-136,223-227` |
| 13 | Pruebas de contrato/proyección/SQL/write/read/transfer/UI | suites `T07/T08/T09` y sus casos listados en `scripts/catalog-suites.json` |
| 14 | Compatibilidad con documentos existentes y reconstrucción de proyecciones; rollback/recovery | `beat-projection.js`, `facets.js:148-161`; guardas `0027`; `postgres-migrations.js:202-274` |

**Resultado medido por trazado:** **14 responsabilidades potencialmente afectadas**, con rutas concretas arriba. Para un campo **solo visual no consultable**, las #4 (nueva columna/index), #7 (search/facets) y parte de #12 podrían quedar sin cambio: **11 responsabilidades o menos según contrato**, no «14 archivos obligatorios». Para un campo buscable/ordenable, 14 es una lista razonable de *verificaciones*, no conteo de edición ni esfuerzo estimado. Son **al menos 4 familias de cambio separadas** que hoy replican enumeración de campos: validador, escritor PATCH, escritor transfer, DTO/cliente; centralizarlas reduce puntos donde olvidar la propiedad. **No estimar horas ni % sin diff y tests.**

## 10. Integridad necesaria vs complejidad accidental

**Complejidad necesaria — PRESERVAR:** lock por biblioteca y tenant; era/epoch/generación/revisión/versión como dimensiones separadas; keyset y cursor con HMAC; sets y selección server-side para operaciones globales; partes y ubicaciones con referencias conocidas/opacas; reserva/quota; sender/random_id e idempotencia; worker duradero con fencing; retención/historial, tombstone, manifest y journal de purge; compatibilidad de restore/legacy hasta demostrar retiro seguro; SQL constraints/triggers y checksums de migraciones. Motivo: previenen pérdida/duplicación de bytes, cross-tenant y corrupción visible.

**Complejidad probablemente accidental — concentrar, no eliminar contratos:** seis `mutationTx` casi iguales, seis `readTx`, dispersión de mappings y escrituras de proyección, tres emisores de eventos/revisión, dos fetch wrappers, múltiples DTO parciales; naming `legacy_json` pese a ser formato persistente actual. **La solución es reducir la cantidad de lugares que expresan la misma regla**, no colapsar SQL en una tabla ni retirar guards.

**Complejidad heredada que sí tiene dependencias:** `catalog_legacy_fields` y generaciones importadas forman parte del soporte de transición/restore; `navigation/legacy` tiene caller; `refreshGroupsAndFacets` conserva export diagnóstico (posible extracción); `rebuildDerivedProjections` alimenta scripts/tests; MAIN es nueva optimización y no legacy; `catalogDirectPort`/webTransport están vivos por import dinámico; `0027` fences existen precisamente por tablas legacy. No autorizar drops por prefijo de nombre.

## 11. Pruebas existentes, CI y huecos — sin PASS inventados

**Disponibles en el árbol/manifest, no ejecutadas en P05:**
- Contrato, esquema y autoridad: `catalog-contract.test.cjs`, `catalog-schema.integration.cjs`, `catalog-authority.test.cjs` / `.integration.cjs`, `catalog-fence.test.cjs` / `.integration.cjs`; `scripts/catalog-suites.json:91-159,330-423@ad8f8d0`.
- Lecturas/cursor/queries/búsqueda: `catalog-cursor.test.cjs`, `catalog-queries.test.cjs` / `.integration.cjs`, `catalog-search-text.integration.cjs`, `catalog-facets-delta.integration.cjs`; `catalog-suites.json:111-136,423-487@ad8f8d0`.
- Comandos/proyección/trash/portada: `catalog-metadata-rules.test.cjs`, `catalog-commands.test.cjs` / `.integration.cjs`, `catalog-artwork-unlink.integration.cjs`; `catalog-suites.json:487-565@ad8f8d0`.
- Transfers y jobs: `catalog-operations.test.cjs` / `.integration.cjs`, `catalog-worker.test.cjs` / `.integration.cjs`, `catalog-direct.test.cjs`, `catalog-transport-gateway.test.cjs` / `.integration.cjs`, `catalog-purge.test.cjs` / `.integration.cjs`, `catalog-playback.test.cjs` / `.integration.cjs`, `catalog-prefix-packs.integration.cjs` (visibles en `cloud-server/tests/catalog/` e inventario).
- Web: `tests/component-dom/catalogApi.test.ts`, `catalogQueryStore.test.ts`, `catalogMutations.test.ts`, `catalogInteractionStore.test.ts`, `catalogPlaybackSession.test.ts`, `catalogMainPack.test.ts`, `catalogVirtualGallery.test.tsx`; `catalog-suites.json:565-626@ad8f8d0` y caller-search en HEAD.
- Runner `scripts/catalog-check.cjs:1-17,47-82,119-123@ad8f8d0` registra suites, bloquea ficheros/red no permitidos y trata SKIP/vacío como no PASS. El GitHub workflow `.github/workflows/catalog-checks.yml:8-49,58-95@ad8f8d0` usa Postgres efímero (no producción).

**Hallazgo de cobertura del disparador:** `.github/workflows/catalog-checks.yml:14-41@ad8f8d0` **enumera explícitamente solo migrations 0026–0030** entre rutas de push. Un commit que toque **únicamente** `0031–0042`, sin otra ruta incluida, podría **no disparar ese workflow**. El workflow sí tiene `workflow_dispatch` y suites sobre cambios incluidos; **no es evidencia de que ninguna prueba se corra en otra CI**. La nota inicial del propio YAML («solo LOCAL») está desactualizada frente a su configuración efectiva, que incluye `main` (líneas 10–12,59–60).

**Huecos de falsación antes de refactor/retirada:**
1. Pruebas de contrato **equivalencia exacta** de PATCH vs IMPORT vs REPLACE en todas las columnas, legacy_json, tags y search_text; incluyendo null/ausente y Unicode.
2. Fallos entre COMMIT SQL y efecto Telegram, pérdida de respuesta, lease robado y doble worker; conservar recibos, no doble envío ni borrado.
3. Reconciliación de `restore_hold`, objeto OPAQUE, objeto compartido/retained y journal caído; no desbloquear purge físico por «test feliz».
4. Casos límites de stale sets, selección CAS, reconstrucción shuffle con consumed, rollback de epoch y cursor HMAC tras cambio.
5. Contratos clientes DTO/estados terminales respecto al servidor y pruebas de un cambio de campo en los dos escritores.
6. Evidencia del **flujo físico real de reproducción/descarga** ausente en cierre LIVE documentado; G2 NO PROVEN; no convertir CI unit/integration en prueba Telegram real.

## 12. Plan de limpieza condicionado: prioridades por riesgo de datos / ahorro cognitivo

| Prioridad | Candidato y beneficio | Evidencia y límite | Precondiciones antes de **cambiar** (no ejecutar ahora) |
|---|---|---|---|
| **P0 preservar** | Fences SQL, backups/restore, purge journal y reconciliación bytes. Ahorrar código **no compensa** pérdida de beat | `0027:124-306`; `purge.js:307-421`; `worker.js:86-108` | Mantener y ampliar pruebas de fallos, snapshot/restauración reproducible; no eliminar guardas |
| **P1 alto beneficio** | **Unificar escritor/proyección SQL de metadata**: reduce desalineación PATCH/REPLACE/IMPORT (riesgo de datos **medio-alto**) | `commands.js:67-95` vs `operations.js:396-423` | Fixture de cada campo; tests por estado/import/replace y transacción/revisión/facetas; firma explícita para INSERT/UPDATE |
| **P1 alto beneficio** | Extraer **núcleo transaccional con políticas** `mutationTx`; reduce 6 guardas duplicadas (riesgo **alto** si mal hecho) | `commands.js:130-151`; `operations.js:120-137`; `direct.js:54-71`; `playback.js:80-96`; `purge.js:88-105`; `prefix-packs.js:69-83` | Matriz por dominio: quarantine/IDLE vs allowFrozen, error.commit, timeout, lock order, gateway jamás dentro tx |
| **P2** | Servicio compartido de bumpRevision/eventSeq/event insert (riesgo **medio**) | `commands.js:153-161`, `operations.js:458-464`, `purge.js:154-159` | Demostrar secuenciación serializable bajo library lock; preservar eventos existentes, idempotencia y contadores |
| **P2** | Consolidar `readTx` y mapping de errores SQL, con contratos explícitos (riesgo **medio**) | `queries.js:252-272`, `media.js:32-39` y cinco módulos adicionales | Definir aislamiento y deadlines por endpoint; no convertir QuerySet.writeTx en lectura ni quitar comprobaciones |
| **P2** | Centralizar fetch/auth/CSRF/error y base de DTOs de read/list/detail (riesgo **medio-bajo**) | `catalogApi.ts:138-174` vs `catalogCommandsApi.ts:59-96`; DTO query/commands | Snapshot HTTP shape/ETag/idempotency; mismos nombres/errores para UI |
| **P3 con prueba** | Encapsular `refreshGroupsAndFacets` en herramienta de reconstrucción u oráculo; evaluar export sobrante (ahorro pequeño) | `commands.js:97-120,739`, caller search sin ruta de aplicación | Pruebas/generador/algún import dinámico verificados; oráculo alternativo; **no drop de tablas facetas** |
| **P3 con prueba** | Mantener `/navigation/legacy` y DirectPort; solo retirar compat cuando desaparezcan links/imports reales (ahorro futuro) | `catalogQueryStore.ts:293-305`; `catalogLibraryProvider.tsx:74-78` | Inventario callers, URLs reales, pruebas de deep-links; no eliminar `webTransport*` |
| **P3 operaciones/CI** | Incluir migraciones 0031–0042 en trigger/paths y revisar discrepancia de comentario (ahorro de riesgo) | `catalog-checks.yml:1-3,8-41` | Modificación posterior aprobada en rama autorizada, sin tocar DB ni desplegar desde este informe |

**Orden razonado:** primero consolidar *escrituras* con tests de equivalencia y cortafuegos; después transacciones; después eventos/DTO/HTTP; al final decidir dead exports. No tocar esquema, datos, bot ni migraciones para «demostrar» simplicidad. Los informes de otros P0x pueden cubrir aspectos UI, Cloud y transport antes de autorizar refactors transversales.

## 13. Cuestiones abiertas precisas y experimentos de comprobación posteriores

1. ¿Tiene el cliente un caller de `refreshGroupsAndFacets` fuera de los símbolos indizados (require dinámico, tooling, acceso por export indirecto)? Resultado actual: export presente; no caller de ejecución encontrado. Inspección focalizada de imports/tests antes de mover.
2. ¿Por qué `normalizeTag` colapsa whitespace mientras `projectBeat.normKey` no? ¿Garantía de input normalizado solo en V1 o compat histórica? Añadir casos de equivalencia y datos legacy sin leer DB real.
3. ¿Qué contrato oficial de campos debe ser único para PATCH/import/replace? La escritura de `operations.js` y `commands.js` diverge en construcción SQL; escoger helper transaccional y comparar snapshot semántico (no cambiar formato JSON a ciegas).
4. ¿Cómo se preserva `commit: true` en wrappers y el `allowFrozen` de purge tras concentrarlos? Requerir tabla de políticas con pruebas de 409 persisted conflict vs rollback, incluyendo timeout.
5. ¿Hay runtime real que consume `CatalogQuerySet: RELEASED` o `CatalogBulkStatus: BLOCKED` en TypeScript? Localizar estado terminal y tipos antes de ajustar contratos.
6. ¿Existen suites en otros workflows que cubran push **solo** de migrations 0031–0042? Inventariar workflows existentes, luego decidir extensión del filtro.
7. ¿El MAIN/prefix persistente invalida siempre por `file_sha256/file_revision` y tras REPLACE/restore? Corroborar en tests y cliente; no tratar MAIN como segunda autoridad.
8. ¿Qué evidencia concreta permitiría levantar `restore_hold` y validar delete Telegram real bajo G2? El documento LIVE deja G2 no probado y el backup final sin bytes restaurados; depende del análisis físico de medios, no de P05 estático.
9. ¿Están respaldadas y ejercitadas todas las transiciones entre estados de consultas, transfer y purge con backoff y un worker reiniciado? Revisar reportes CI existentes en un pase posterior; **no se ejecutaron**.
10. ¿Con qué migración *nueva* y contrato de retrocompatibilidad se añadiría un campo futuro? Solo tras consensuar shape y haber concentrado el escritor; **no editar migraciones 0026–0042**.

## 14. Dictamen final

**COMPRENSION_SUFFICIENTE_PARA_PLAN**

Está **suficientemente reconstruido para elaborar un plan de refactorización incremental sin tocar código**: fuente/propiedad canónica, 17 migraciones, familias de tablas, entradas Cloud/worker/Web, rutas de escritura/lectura/media, estados durables y límites de seguridad están mapeados con referencias a HEAD real; las duplicaciones **existentes** se separan de las supuestas, hay puntos de concentración y precondiciones de regresión. **No significa comprensión completa del funcionamiento físico ni autorización de cambios o drops.** Para convertir el plan en implementación segura faltan, en este orden, (a) pruebas de equivalencia de los dos escritores y de wrappers/DTO, (b) resolver las preguntas #1–#7 con callers/tests, (c) validar fallo/reintento/bytes y restore/G2 según evidencias externas autorizadas. Esos pendientes **no impiden planificar**, pero **sí impiden simplificar o borrar las defensas de datos hoy**.
