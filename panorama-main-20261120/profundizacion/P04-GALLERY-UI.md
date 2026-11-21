# P04 — Composición de BeatGaler Web / Gallery PostgreSQL

**Modalidad:** NEW chat · ALTA · BeatGaler V1 · SOLO DIAGNÓSTICO  
**Fuente de código única:** magosouljah/BeatGaler, rama main, HEAD inmovilizado al inicio: **ad8f8d0436bba5c3f663a301440ebf977200d953**.  
**Panorama de entrada:** magosouljah/beatgaler-arq/panorama-main-20261120/PANORAMA.md y familias pertinentes de INVENTARIO-C0.md; referencia del panorama = exactamente el HEAD observado. **Delta: ninguno.**  
**Notación de pruebas:** toda referencia @ad8f8d0 significa @ad8f8d0436bba5c3f663a301440ebf977200d953. La cita archivo:L1-L2@SHA señala el código inspeccionado; no certifica su ejecución real.  
**Restricciones respetadas:** sin cambios en BeatGaler, sin ejecutar tests, navegador, procesos, Cloud, AWS, PostgreSQL ni Telegram; sin leer secretos. Informe nuevo e independiente. El diseño visual de Landing, Gallery y Playbar queda fuera de cualquier propuesta de cambio.

## 0. Alcance, niveles y tesis

**VERIFICADO_EN_CÓDIGO:** El árbol productivo Web monta el catálogo PostgreSQL por defecto; el camino INDEX no se usa como fallback. Que un archivo tenga nombre legacy, diseño o Candidate no demuestra inactividad. El catálogo decide qué beat existe, qué filtra y su versión; el navegador mantiene estado efímero de presentación; el plano de datos de audio y archivos sigue Direct B contra Telegram. Referencias: src/features/library/catalog/catalogComposition.ts:7-24@ad8f8d0; src/app/WebGalleryWorkspace.tsx:14-29@ad8f8d0; src/features/library/catalog/catalogLibraryProvider.tsx:66-100@ad8f8d0.

**VERIFICADO_EN_FUNCIONAMIENTO:** No se asigna ese nivel a ninguna afirmación nueva en P04. No hubo ejecución y no se verificó un artefacto de CI o prueba física asociado al HEAD congelado. Las pruebas existentes se identifican como **código de prueba disponible**, no como PASS.

**HIPÓTESIS:** R-002 (interleaving search/sort) y R-004 (arriendo de audio adquirido después de invalidarse sesión) tienen caminos estáticos concretos que merecen regresión. Su materialización en navegador/producción **no** está demostrada. R-003 no puede arrastrarse globalmente del historial: las guardas bulk actuales están implementadas; la eliminación individual requiere revisión acotada.

## 1. Plano de composición efectivo (pantallas y runtime)

    src/main.tsx — Web
        └─ WebExperience [ruta /, /gallery, /login, /signup]
           ├─ / → lazy src/features/design/LANDING/LandingPage.tsx
           └─ /gallery, /login, /signup → lazy WebGalleryEntry
              └─ AuthExperienceGate [cookie/CSRF, fases de login/alta/MFA/recuperación]
                 └─ WebGalleryWorkspace [usuario activo + useLibraryComposition]
                    ├─ catalogComposition: flag true por defecto; /catalog/v1/context
                    ├─ LibraryCompositionGate [ready vs bloqueado, sin fallback INDEX]
                    └─ CatalogGalleryWorkspace → CatalogAppShell
                       ├─ useCatalogGalleryScope [conecta los stores a callbacks]
                       │  ├─ catalogQueryStore ← HTTP /beats, /facets, /context
                       │  ├─ catalogInteractionStore ← query-sets, selections, operations
                       │  ├─ catalogPlaybackSession ← rounds/neighbor/query-sets
                       │  ├─ useAudio ← URL MediaLease de catalogMediaClient
                       │  ├─ catalogMutations ← PATCH, trash, restore, transfer
                       │  └─ estado React: borradores, modales, avisos y portadas
                       ├─ GalleryChrome → TagNavigation + StudioToolbarCandidate
                       ├─ CatalogVirtualGallery → BeatCard (tarjetas residentes)
                       ├─ AddBeatModal → Drawer de revisión → subida en segundo plano
                       ├─ Drawer (detalle/edición/bulk) + CloudFilesModal
                       ├─ SettingsPanel → Trash vía catalogTrashSource
                       └─ Player (misma Playbar visual compartida)

    Servicios de cuenta (uno por identidad/época)
        catalogLibraryProvider/createCatalogServices
          ├─ CatalogApi + CatalogCommandsApi (HTTP, cookie/bearer + CSRF)
          ├─ QueryStore + InteractionStore + PlaybackSession
          ├─ CatalogMutations + CatalogTransfer
          ├─ CatalogMediaClient (MSE/Blob, arte, grants, refcounts)
          ├─ firstBlockCache, prefixCache, artworkCache, MAIN coordinator
          └─ DirectPort lazy → catalogDirectPort → webTransportController/
             webTransportWorkerClient/webTransportSession → Worker MTProto → Telegram

**Registro real:** src/main.tsx:3-29,124-127@ad8f8d0; src/app/WebExperience.tsx:1-25@ad8f8d0; src/app/WebGalleryEntry.tsx:1-17@ad8f8d0; src/features/auth/AuthExperienceGate.tsx:22-26,69-110@ad8f8d0; src/features/library/catalog/catalogComposition.ts:14-24@ad8f8d0; src/features/library/catalog/CatalogAppShell.tsx:5-40,95-197@ad8f8d0.

**Dinámicos y límites:** WebExperience hace lazy de Landing/Gallery; WebGalleryEntry precalienta el import de workspace sin omitir AuthExperienceGate. catalogLibraryProvider importa dinámicamente catalogDirectPort para Web real y catalogLabDirectPort exclusivamente cuando import.meta.env.DEV y el flag LAB lo exigen. catalogDirectPort importa **de forma activa** webTransportWorkerClient, webTransportController y webTransportSession: aunque esos archivos convivan con el transporte histórico, **no se pueden borrar como dead Web**. El flag VITE_CATALOG_API_ENABLED=false lleva a pantalla de retirado/contención, NO a INDEX operativo. Referencias: src/app/WebGalleryEntry.tsx:1-17@ad8f8d0; src/features/library/catalog/catalogLibraryProvider.tsx:69-77@ad8f8d0; src/features/library/catalog/catalogDirectPort.ts:1-30,54-75@ad8f8d0; src/features/library/catalog/catalogComposition.ts:14-24@ad8f8d0.

## 2. Sistemas, submódulos y condición

| Subsistema / archivo dueño | Función / dato principal | Estado | Consumidor efectivo |
|---|---|---|---|
| WebExperience / WebGalleryEntry / AuthExperienceGate | rutas, gate de identidad, cookie/CSRF, fases auth | **ACTIVO** | main.tsx |
| catalogComposition / LibraryCompositionGate | autoridad habilitada y estados blocked/ready | **ACTIVO** | WebGalleryWorkspace |
| catalogLibraryProvider | identidad de cuenta/era/epoch, instanciación y teardown servicios | **ACTIVO** | WebGalleryWorkspace, CatalogAppShell |
| CatalogAppShell + useCatalogGalleryScope | montaje, puente UI/callbacks, estado React local | **ACTIVO** | Gallery Web |
| catalogQueryStore / catalogApi | query, bloques residentes, cursores, revisión, errores | **ACTIVO** | scope + CatalogVirtualGallery |
| catalogInteractionStore / CommandsApi | selección global CAS, facetas cacheadas, bulk/rename | **ACTIVO** | scope + Toolbar/Drawer |
| catalogPlaybackSession | current, queue, repeat, shuffle round, source lease | **ACTIVO** | scope → Player/useAudio |
| catalogMediaClient / PrefixCache / MAIN / ArtworkCache | archivos por FileId, grants, URLs, streaming, caches | **ACTIVO** | Player, BeatCard, Drawer, Downloads |
| catalogMutations / Transfer / DrawerSave / ImportPlan | PATCH, reemplazo, importación, refs persistidas, versionado | **ACTIVO** | scope, Drawer, AddBeatModal |
| catalogTrashSource / catalogDownloads | Settings Trash y descargas Postgres reales | **ACTIVO** | SettingsPanel, CloudFilesModal |
| CatalogVirtualGallery / useCatalogVirtualRows / Navigation | filas virtuales, ancla, URL, carga de bordes | **ACTIVO** | CatalogAppShell |
| src/features/design/GALLERY y MASTER/StudioToolbarCandidate | TagNavigation, GalleryChrome, motor de Toolbar aprobada | **ACTIVO**, pese a nombres de laboratorio | CatalogAppShell |
| src/features/design/LANDING/LandingPage | Landing de / | **ACTIVO** | WebExperience |
| src/components/{BeatCard,Drawer,Player,SettingsPanel,AddBeatModal} | interfaz compartida y ramas por capabilities | **COMPARTIDO** | CatalogAppShell, otras plataformas |
| src/platform, src/lib/tauri.ts | abstracción cross-platform; helpers Web/Tauri | **COMPARTIDO** | BeatCard/Drawer/Player/Settings |
| src/features/cloud/webTransport* | Worker, sesión y lectura/envío Direct B | **COMPARTIDO**, no muerto | catalogDirectPort |
| DESIGN/* | workbench visual separado, tests y demos aislados | **LEGACY/LAB SEPARADO**, no entrypoint Web principal | DESIGN/main.tsx y laboratorio |
| callbacks vacíos del Shell (upload legacy, reorder, offline) | satisfacen Props compartidas con función deshabilitada en catálogo | **LEGACY DE ADAPTADOR**; no borrar firmas aún | BeatCard/Player |
| antiguos caminos INDEX / webTransport de metadata | no se montan en esta composición Web PostgreSQL | **LEGACY EN ESTA RUTA**; dependencia transitiva por auditar | otros consumidores y Direct B |

Referencias cruzadas: src/features/library/catalog/CatalogAppShell.tsx:5-31,70-93,164-194@ad8f8d0; src/features/design/GALLERY/GalleryChrome.tsx:1-9,36-52@ad8f8d0; src/features/design/MASTER/StudioToolbarCandidate.tsx:1-18,102-136,476-535@ad8f8d0; src/features/design/LANDING/LandingPage.tsx:133-154@ad8f8d0; src/features/library/catalog/catalogDirectPort.ts:18-30@ad8f8d0; src/lib/tauri.ts:362-371@ad8f8d0. Las entradas DESIGN/* proceden del inventario pertinente y de su main propio: **no** son argumento para eliminar src/features/design/*.

## 3. Propiedad del estado y duplicaciones

| Estado/dato | Autoridad y archivo dueño | Réplica local, límites y conflicto |
|---|---|---|
| Cuenta, cookie y CSRF | AuthExperienceGate + AccountGate / Cloud (no QueryStore) | AuthExperienceGate mantiene phase/account/busy/error; activeWebAccount guarda ID/generación. Cookie y CSRF no deben pasar a DTOs |
| Autoridad, era, época, generación y revisión | PostgreSQL catalog_libraries; contexto Cloud | catalogLibraryProvider crea servicios por identidad; cambio desmonta sesión, selección, medios y cachés residentes |
| Beat, tags, BPM, Key, rating, slots y versión | PostgreSQL catalog_beats, catalog_beat_tags, catalog_current_files y versiones | CatalogQueryStore conserva DTOs por bloques: máximo 6 bloques / 12 MiB / 2 in-flight (config). Scope conserva Map de 512 DTO para Player/cola, **no autoridad** |
| Search/tags/sort | QueryStore + consulta SQL como verdad de resultados; sort del QueryStore | Search/included/excluded son borradores React en scope; GalleryChrome recibe proyección de tags; Toolbar puede tener estado local para modo no controlado |
| Facetas globales/tag frequency | SQL catalog_facets | InteractionStore guarda caché de facetas (acotada); scope las proyecta en React para TagNavigation |
| Selección global y versión | Cloud catalog_selections, catalog_selection_ops, catalog_query_sets | InteractionStore guarda token/count/status/flags de residente; selectMode es solo booleano React. selectedBeats del Drawer es **subconjunto residente**, no toda selección |
| Edición normal | Version+1/revision+1 tras commit en Cloud; expectedVersion | Drawer guarda draft/data/pendingWebEdit/pendingCloud/error; scope usa dtoById para versión; no se publica un Beat editado como autoridad |
| Bulk/rename | catalog_operations + jobs/batches en PG | InteractionStore sondea, informa confirmados/no ejecutados/conflictos; Drawer compone campos seleccionados |
| Playback/Next/Shuffle | catalogPlaybackSession; rounds/neighbor SQL y query-set leases | useAudio posee play/pause/progress/volume; Player presenta controles y popups. La reproducción continúa al cambiar filtros |
| Transferencia de bytes | Telegram recibe datos vía Direct B; Cloud/PG guarda ticket, receipt, estado | Browser File retenido por importer, refs de operation en almacenamiento por cuenta sin credenciales; review/uploads/pendingImports son UI efímera |
| Artwork | fileId+revision en PostgreSQL; bytes Telegram | media manager: memoria/refcounts, LRU 32 MiB y IndexedDB por cuenta/epoch/fileId/revision; scope tiene URLs por fileId, se invalida en reemplazo |
| Posición virtual | cursor opaco SQL, queryGeneration y residentes en QueryStore | useCatalogVirtualRows mide columnas/pitch, ancla del scroll; Navigation mantiene URL de filtros y cursor en history.state |
| Papelera | catalog_beats state TRASH / catálogo y jobs de purga PG | catalogTrashSource mantiene Map de versiones; SettingsPanel mantiene lista/busy/status/errores mientras abierto |

Evidencia: src/features/library/catalog/catalogLibraryProvider.tsx:66-116,140-155,159-206@ad8f8d0; src/features/library/catalog/useCatalogGalleryScope.ts:69-122,190-210,237-289,357-418,496-545@ad8f8d0; src/features/library/catalog/catalogQueryStore.ts:13-19,94-113,169-184@ad8f8d0; src/components/Drawer.tsx:74-98@ad8f8d0; src/features/library/catalog/catalogInteractionStore.ts:80-107,109-205,261-348@ad8f8d0.

**Duplicaciones reales de representación, no dos autoridades independientes:** (a) Search/tags React → QueryStore filters → URL; (b) selección token del servidor + flags residentes + selectMode local + selectedBeats parcial; (c) sesión musical + useAudio + datos visibles de Player; (d) DTOs en bloques + Map de 512 + Beat adaptado + Artwork URLs; (e) Drawer draft + DTO original; (f) revisión/importer File + uploads + pendingImports + operación durable PG. Esta duplicación se justifica parcialmente por responsividad y compatibilidad visual, pero hay superficies para reducir adaptadores **sin cambiar diseño ni semántica**. Referencias: useCatalogGalleryScope.ts:77-122,190-210,212-243,245-289,357-418@ad8f8d0; CatalogAppShell.tsx:70-77,78-94,123-144@ad8f8d0.

## 4. Mapa pantalla → callback → servicio → Cloud/SQL/Telegram

| Pantalla y acción | Callback de entrada | Servicio / contrato | Autoridad o resultado |
|---|---|---|---|
| Landing: CTA Gallery | WebExperience navegación | WebGalleryEntry → AuthExperienceGate | Sólo acceso a UI autenticada; Landing no escribe catálogo |
| Login/registro/Google/X | AuthExperienceGate fases/storeWebCookieSession/startWebOAuth | AccountGate + /auth/oauth/start y auth Cloud; cookie/CSRF | cuenta/instalación en Cloud, fuera del catálogo |
| Toolbar: search | StudioToolbarCandidate.onSearchChange → scope.setSearch | debounce 250 ms → interaction.onFiltersChanged + QueryStore.setQuery → GET /catalog/v1/beats | SQL filtra ANTES de LIMIT; DTOs residentes re-render |
| Toolbar: sort | onSortChange → scope.setSortBy | interaction.onSortChanged + QueryStore.setSort → GET /beats | SQL ORDER BY keyset: manual/rating/name/bpm |
| Tag Bar: include/exclude/all | TagNavigation.onCycleTag/onClear → scope.handleTagClick/clearTagFilters | React sets → debounce → QueryStore + /facets | SQL ANY/ALL/exclude; selección global se limpia por cambio de filtros |
| Tag Bar: rename | TagNavigation.onRename → scope.openTagRename/continue/confirm | interaction.previewRename/confirmRename → /tags/rename/preview, /operations | job durable y alcance ACTIVE+TRASH |
| BeatCard: Play | onPlay → scope.handlePlay | session.play → getBeat → media.acquireStream → /files/:id/access → Direct B | source arrendado; useAudio reproduce MSE/Blob |
| Player: Next/Prev | onNext/onPrev → session.next/previous | query-set READY + GET /query-sets/:id/neighbor; cola primero | servidor determina orden; no sort local de beats |
| Player: Shuffle/Repeat | onToggleShuffle/onCycleRepeat | playback rounds POST /playback/rounds/next/consume/rebuild/release | mapeo/consumidos en PG; repeat en sesión |
| BeatCard: Edit/Detail | onEdit/onDetail → scope.setDrawer | Drawer draft → onCatalogSave → saveDrawerChanges → patchBeat/replaceBeat | versión PG; error/conflicto preserva draft |
| Drawer: nombre/tags/BPM/Key/rating | handleSave | validate, cleanTags → PATCH /catalog/v1/beats/:id expectedVersion; 409 | evento/revisión PG; refresco de bloques |
| Drawer: nueva portada/WAV/MASTER/PROJECT | handleSave → saveDrawerToCatalog | saveFiles/replaceBeat → catalogTransfer → operation/send-ticket/receipt/commit | bytes Direct B Telegram + referencias PG ACTIVE |
| Drawer: quitar portada | artworkRemoved → saveDrawerChanges | PATCH con artwork:null + metadatos (y REPLACE posterior si archivos) | desvincula slot en PG; borra cachés, NO borra archivo Telegram en ese PATCH |
| BeatCard: Remove | onDelete → scope.deleteBeat | mutations.trashBeats([{beatId,expectedVersion}]) → POST /beats/trash | TRASH con versión; aviso de conflicto; sin borrado de bytes |
| Selection: Select All/Shift | scope.toggleSelection/toggleSelectAll | InteractionStore → /query-sets, /selections, /selections/:id/ops | conteo/membresía PG sin enumerar biblioteca al navegador |
| Selection: Edit all / Remove all | scope.applyBulkUpdate/handleRemoveBulk | startBulk BULK_PATCH/BULK_TRASH → POST /operations y get/poll | journal, lotes ≤50, progreso parcial y CAS |
| Add beat / drop en vacío | AddBeatModal.onAdd → scope.addBeatsAndReview | platform.importer (File); Drawer review; resolveImportPlan; mutations.importBeat | reserva/transferencia/commit SQL; UI de progreso no es confirmación |
| Drop sobre tarjeta | useCatalogFileDrop → routeDrop → scope.replaceAudioByDrop/replaceArtworkByDrop | confirmaciones + mutations.replaceBeat | MASTER/WAV/PROJECT/artwork con versionado |
| BeatCard: Download | onCloudFiles → scope.openDownloads | get/listBeatFiles → CloudFilesModal → downloadBeatFiles/media.downloadFile | /beats/:id/files, /files/:id/access; Direct B; MP3 ID3 regenerado; Blob local |
| Settings → Trash | SettingsPanel.restore/emptyTrash | catalogTrashSource → listBeats(state=TRASH), restoreBeats, purgeTrash/purgeState | versión PG, PURGE job; limpieza Telegram diferida |
| Reload / scroll / URL | scope.reloadLibrary, CatalogVirtualGallery.retry/scroll, history writer | QueryStore.loadFirst/loadNext/loadPrevious/revalidate + /navigation/legacy | bloques SQL, ancla y cursors; no pager visible |

Pruebas de enlace más cercanas: src/features/design/GALLERY/GalleryChrome.tsx:38-49@ad8f8d0; src/features/library/catalog/CatalogAppShell.tsx:53-93,105-112,123-144,164-194@ad8f8d0; src/features/library/catalog/useCatalogGalleryScope.ts:157-176,190-240,245-355,357-494,508-529@ad8f8d0; src/features/library/catalog/catalogDownloads.ts:9-55@ad8f8d0; src/features/library/catalog/catalogTrashSource.ts:11-52@ad8f8d0.

## 5. Contratos HTTP / SQL / eventos / Telegram

### Consulta

- **GET** /catalog/v1/context y **POST** /catalog/v1/library/provision solo ante LIBRARY_NOT_PROVISIONED: resuelve identidad, era, época, generación, revisión y capacidades. No usa Telegram para catálogo. catalogApi.ts:176-215@ad8f8d0; cloud-server/catalog/routes.js:71-76@ad8f8d0.
- **GET** /catalog/v1/beats: q, includeTags, excludeTags, includeMode, state, sort, cursor, limit, includeTotal; filtro completo en PG; keyset y cursor firmado; límite del endpoint 240, page/residentes separadas. **GET** /beats/:id y /beats/:id/files; **GET** /facets y /facets/active. cloud-server/catalog/routes.js:4-11,80-93@ad8f8d0; cloud-server/catalog/queries.js:18-35,107-123,154-205,310-351@ad8f8d0.
- SQL real de lectura desde catalog_libraries (autoridad), catalog_beats (tenant/generation/state), catalog_beat_tags, catalog_current_files/catalo​g_file_versions, catalog_facets, catalog_query_sets/catalog_query_members. READ ONLY/REPEATABLE READ con deadline; falla sin fingir lista vacía. cloud-server/catalog/queries.js:1-10,200-224,310-335,494-510,518-618@ad8f8d0.
- Los links antiguos bgPage tienen resolución hasta el límite contractual; bgAnchor sólo de entrada, cursor del historial en history.state; el escritor hace replace de ancla con debounce 300ms, push para cambio de query. catalogNavigation.ts:1-21,38-85,100-135@ad8f8d0; useCatalogGalleryScope.ts:123-155@ad8f8d0.

### Mutación

- **PATCH** /beats/:id con expectedVersion; **POST** /beats/trash y /beats/restore por listas versionadas (≤50); **POST/GET** /query-sets y **POST/GET** /selections y /selections/:id/ops CAS; **POST/GET** /operations, cancel/resume; **POST** /tags/rename/preview. Encabezados de escritura idempotency-key, X-Catalog-Era, X-Catalog-Epoch y CSRF de sesión Web donde corresponda. cloud-server/catalog/routes.js:36-46,104-121,143-170@ad8f8d0; src/features/library/catalog/catalogCommandsApi.ts:59-142@ad8f8d0.
- SQL mutante: catalog_libraries FOR UPDATE, catalog_beats por beatId/version, catalog_beat_tags y grupos, catalog_current_files; catalog_events event_seq/revision; catalog_operations y catalog_operation_batches/items para lote; catalog_jobs agenda pasos; catalog_selections/selection_ops y query_members. Cualquiera de 409, revisión cambiada o conflicto no equivale a éxito total. cloud-server/catalog/commands.js:1-11,72-95,125-174,329-418,487-541,555-657@ad8f8d0.
- **GET** /catalog/v1/changes expone eventos catalog_events; el evento y revision son autoritativos, los avisos/overlays de React no. Esto no demuestra un consumidor Web de polling continuo; su existencia y frecuencia deben verificarse antes de afirmar actualización cross-device inmediata. cloud-server/catalog/routes.js:170@ad8f8d0; cloud-server/catalog/commands.js:159-161,716-723@ad8f8d0.

### Bytes y audio

- El cliente realiza operación durable, obtiene ticket por parte en **POST** /operations/:id/parts/:partKey/send-ticket, envía bytes con catalogDirectPort → webTransport.worker/mtcute → Telegram, entrega **PUT** direct-receipt, sigue/verifica operación y **POST** commit. UN­CERTAIN/RECONCILE bloquean reenvío ciego; recibo cliente no equivale a verificación del proveedor. src/features/library/catalog/catalogTransfer.ts:1-9,225-293@ad8f8d0; src/features/library/catalog/catalogDirectPort.ts:1-30,137-160@ad8f8d0; cloud-server/catalog/routes.js:155-169@ad8f8d0.
- Media: **POST** /files/:fileId/access genera concesión opaca y partes; el navegador recupera bytes por Direct B; acquireStream decide MSE prefijo+rangos o Blob; descarga verifica partes/tamaño/hash y reescribe ID3 de MASTER cuando procede. Cloud no es propietario/relay de los bytes. src/features/library/catalog/catalogMediaClient.ts:1-9,188-229,247-301@ad8f8d0; src/features/library/catalog/catalogDownloads.ts:24-55@ad8f8d0; cloud-server/catalog/routes.js:204-205@ad8f8d0.
- Eventos UI: beatgaler:artwork-drag y beatgaler:beat-update-drag son indicadores locales de drag; beatgaler:account-updated actualiza el gate; no constituyen commit de catálogo. src/features/library/catalog/useCatalogFileDrop.ts:22-70@ad8f8d0; src/features/auth/AuthExperienceGate.tsx:69-81@ad8f8d0.

## 6. Diagramas de camino feliz y fallo / reintento

**A. Abrir Gallery y filtrar:**

    WebExperience(/gallery) → AuthExperienceGate(cookie)
      → WebGalleryWorkspace/useLibraryComposition → GET /catalog/v1/context
      → identidad PG lista → createCatalogServices(account+epoch)
      → opcional copia IndexedDB del primer bloque (provisional/inert)
      → GET /catalog/v1/beats verificado → QueryStore bloques/estado/revisión
      → CatalogVirtualGallery virtualiza → BeatCard y Artwork lazy
      → TagNavigation/search/Sort → [debounce search/tags]
      → QueryStore nuevo queryKey → GET /beats con WHERE + ORDER BY en PG
      → se invalidan selecciones si cambió filtro; Player sigue con su source.

    Fallo:
      /context 401/503/quarantine → LibraryCompositionGate bloquea; NO INDEX.
      Seed no revalidada → inert, descartar copia si cambió identidad.
      GET /beats offline/timeout → mensaje contextual + Reintentar;
      CURSOR_STALE → reanclar/reiniciar primer bloque sin presentar viejo como nuevo.
      Fallo borde → placeholder con retry; no convertir error en Empty Gallery.

Refs: catalogLibraryProvider.tsx:159-206@ad8f8d0; catalogQueryStore.ts:140-163,191-210,345-403@ad8f8d0; CatalogVirtualGallery.tsx:33-43,85-139@ad8f8d0.

**B. Editar/subir archivo (sin duplicar bytes):**

    BeatCard/Edit → Drawer draft conserva archivo File
      → validación nombre/tags/BPM/Key → onCatalogSave
      → saveDrawerChanges [expectedVersion]
         ├─ metadata-only → PATCH → 200, refresh
         ├─ quitar portada → PATCH artwork:null + metadatos → invalida cachés
         └─ MASTER/WAV/PROJECT/portada nueva → REPLACE
               → preparar MASTER ID3 / PROJECT ZIP
               → operation idempotente + partes/ticket
               → Direct B navegador→Telegram
               → receipt → verify/reconcile/commit PG → version/revision
      → QueryStore.notifyLibraryChanged → reconsulta residente → BeatCard real.

    Fallo:
      409 versión → conservar draft; requiere actualización explícita del origen.
      Rechazo antes de transferencia → revisión permanece; no hubo commit.
      Error de red después de envío / RECONCILE / timeout → operación pendiente
        por cuenta; NO repetir archivo ni afirmar que no llegó.
      Refresh de pestaña → resolvePendingTransfers consulta operación; informa
        COMMITTED/terminal/pendiente, sin reenvío automático.
      Portada quitada + reemplazo de archivos → son DOS pasos por diseño;
        si el segundo falla puede existir commit parcial del primero, se avisa.

Refs: Drawer.tsx:277-343@ad8f8d0; catalogDrawerSave.ts:23-71@ad8f8d0; catalogMutations.ts:115-145,191-203@ad8f8d0; useCatalogGalleryScope.ts:312-332,419-494@ad8f8d0.

**C. Reproducir y recuperar:**

    BeatCard Play → session.play beatId
      → GET /beats/:id playback fileId
      → POST /files/:id/access
      → media.acquireStream [MSE/Blob + prefix cache]
      → session publica source lease → useAudio.play(url) → Player
      → Next: cola > neighbor(query-set, sort)
         o Shuffle: round durable/next sin repetición → nuevo source
      → release del lease anterior al cambiar beat o teardown.

    Fallo:
      archivo sin playback → aviso, no inventar fuente.
      medio sin conexión/Direct → error de sesión y aviso; current/queue
        siguen en session para reintento, no autoavanza con falso éxito.
      teardown/logout durante acquireSource → comprobación de generación;
        **revisar riesgo R-004: lease adquirido tarde no se libera explícitamente**.

Refs: catalogPlaybackSession.ts:62-93,155-222@ad8f8d0; useCatalogGalleryScope.ts:212-243@ad8f8d0; catalogMediaClient.ts:203-230@ad8f8d0.

**D. Papelera:**

    BeatCard Remove → trashBeats(expectedVersion) → TRASH PG
      → Settings/Trash list state=TRASH
      → Restore: restoreBeats(expectedVersion) → ACTIVE o conflicto NAME_TAKEN
      → Empty trash: operation PURGE → poll durable → PURGED PG
      → limpieza Telegram posterior en servidor.

    Fallo:
      409 NAME_TAKEN/versión → conservar entrada + aviso.
      PURGE PENDING/FAILED/PARTIAL/BLOCKED → no declarar vaciado exitoso;
      Settings recarga la lista cuando el backend confirma.
      No interpretar la desaparición del beat de PG como prueba de eliminación
      física inmediata del mensaje Telegram.

Refs: catalogTrashSource.ts:11-52@ad8f8d0; SettingsPanel.tsx:240-305@ad8f8d0; catalogMutations.ts:148-189@ad8f8d0.

## 7. Refutación/corroboración de riesgos históricos con HEAD main

| ID / afirmación histórica | Dictamen desde código ACTUAL | Nivel y prueba faltante |
|---|---|---|
| **R-002 — sort/debounce** | **CAMINO DE RIESGO VIGENTE.** Search/tags crean timeout 250ms, capturan snapshot.sort y dependencia del efecto sólo search/includedTags/excludedTags. Un sort síncrono intercalado llama store.setSort, pero no limpia el timeout pendiente; al dispararse, store.setQuery(filters, sort anterior) puede volver a cambiar orden. setQuery toma sort explícito. | **VERIFICADO_EN_CÓDIGO** para secuencia; **HIPÓTESIS** para fallo en navegador. Crear prueba determinista con timers falsos «editar búsqueda → cambiar sort antes de 250ms → confirmar que prevalece sort último». Ref: useCatalogGalleryScope.ts:157-171@ad8f8d0; catalogQueryStore.ts:354-360@ad8f8d0. |
| **R-003 — guardas Delete / bulk** | **NO ES VÁLIDO COMO FALLO GLOBAL.** Bulk está gobernado por selection.status, token/version CAS, permisos requireCommandsEnabled, job durable y mensaje confirmed/total; barra deshabilita botones si selección no está activa. Delete individual usa expectedVersion y captura errores, no hace delete físico. **Riesgo residual de UX**: deleteBeat no invoca rejectOfflineMutation ni confirma explícitamente y retorna silenciosamente si DTO no está en Map; evaluar disponibilidad desde Player/BeatCard y feedback sin asumir pérdida. El Drawer bulk usa selectedBeats residentes sólo para el formulario, mientras la operación actúa sobre selección global. | **VERIFICADO_EN_CÓDIGO** para guardas bulk y ausencia de guarda local en callback individual; **HIPÓTESIS** de incidencia visible. Ref: CatalogAppShell.tsx:106-112@ad8f8d0; catalogInteractionStore.ts:80-107,109-205,261-275@ad8f8d0; useCatalogGalleryScope.ts:263-289@ad8f8d0; cloud-server/catalog/commands.js:329-418,487-541@ad8f8d0. |
| **R-004 — lease tardío** | **CAMINO DE RIESGO VIGENTE EN EL CONTRATO.** session.play espera acquireSource; después assertGen; si teardown invalida generación durante await, la fuente ya devuelta aún no se asignó a lease y no hay finally que invoque next.release al fallar assertGen. media.teardown revoca objetos contabilizados pero los sinks MSE individuales de acquireStream se cierran en release; por tanto hay ventana de recurso tardío no cerrado explícitamente. No afirmar leak reproducido ni duración. | **VERIFICADO_EN_CÓDIGO** para camino de control; **HIPÓTESIS** para consumo real. Prueba deferred promise: play → teardown → resolve acquireSource; exigir release exactamente una vez; variante fallback Blob y MSE. Ref: catalogPlaybackSession.ts:78-93,216-222@ad8f8d0; catalogMediaClient.ts:208-229,292-299@ad8f8d0. |
| Histórico «Drawer ignora WAV/PROJECT, metadatos sin MASTER o quitar portada» | **CORREGIDO EN RUTA NORMAL.** onCatalogSave está cableado; la rama normal return tras guardar; saveDrawerChanges usa REPLACE y PATCH artwork:null. Remoción + archivos es intencionalmente bifásica, no atómica global. | **VERIFICADO_EN_CÓDIGO**; pruebas escritas §6.1. Drawer.tsx:324-343@ad8f8d0; catalogDrawerSave.ts:23-58@ad8f8d0. |
| Histórico «descargar no usa catálogo» | **CORREGIDO.** BeatCard → CloudFilesModal → /beats/:id/files → media.downloadFile → browser Blob + ID3. | **VERIFICADO_EN_CÓDIGO**; pruebas de descarga existentes. CatalogAppShell.tsx:164-168@ad8f8d0; useCatalogGalleryScope.ts:508-529@ad8f8d0; catalogDownloads.ts:9-55@ad8f8d0. |
| Histórico «Settings Trash vuelve a INDEX / informa borrado al solicitar» | **CORREGIDO.** Inyecta catalogTrashSource, restaura por versión y sólo declara PURGED tras polling; BLOCKED/PARTIAL/PENDING se distinguen. La limpieza Telegram queda separada. | **VERIFICADO_EN_CÓDIGO**; pruebas escritas §6.1/AuditFixes. CatalogAppShell.tsx:175-179@ad8f8d0; catalogTrashSource.ts:11-52@ad8f8d0. |
| Histórico «subida interrumpida sin resolver; revisión perdida; tarjetas triplicadas» | **HAY CORRECCIONES EFECTIVAS.** resolvePendingTransfers se invoca al arrancar; cola review evita sobrescribir una abierta; pendingImports/handedOff presentan una tarjeta provisional y traspaso único cuando está la real. Confirmar carrera real con navegador queda fuera de P04. | **VERIFICADO_EN_CÓDIGO**. useCatalogGalleryScope.ts:357-418,419-494@ad8f8d0; catalogDrawerSave.ts:60-84@ad8f8d0. |

**Matiz importante para R-003:** Drawer.handleSave en modo bulk llama primero saveBeatMeta para cada selectedBeat residente (Drawer.tsx:345-370@ad8f8d0). En Web sin invoke, src/lib/tauri.ts:362-371@ad8f8d0 devuelve rutas sin hacer escritura nativa. **No es evidencia de mutación de archivos Web**. Después onBulkSaved realiza el verdadero BULK_PATCH global de PG; el bucle es una dependencia/híbrido innecesario para Web y un candidato de separación interna **sólo** si se prueban otras plataformas.

## 8. Pruebas escritas y huecos (sin ejecutar nada)

**Disponibles y relevantes en main (no se declara PASS):**
- tests/component-dom/catalogQueryStore.test.ts: persistencia de ventanas, query, bordes/errores; catalogVirtualGallery.test.tsx y catalogRowGeometry.test.ts: rango/anclas; catalogNavigation.test.ts: URL/cursor.
- catalogInteractionStore.test.ts: selección global, CAS/conflicto, bulk batches, tagsOp, rebase, rename, drops; catalogPlaybackSession.test.ts: cola, vecino, shuffle sin repetición, teardown; catalogMediaClient.test.ts y catalogPrefixStreaming.test.ts: medios/leases/streaming.
- catalogSection61.test.tsx: Drawer MASTER/WAV/PROJECT, metadata sin MASTER, quitar portada, purge, RECONCILE, recuperación de transferencias, cola de revisiones. catalogAuditFixes.test.ts: download, plan de importación, PROJECT por drop y Trash. catalogE80/E82/E83/E85: progreso, descarga/revisión/handoff/estrellas; catalogReviewProject, catalogAudioReplace, catalogDropRouting y catalogArtworkCache.
- catalogLibraryComposition.test.tsx y catalogFirstBlockCache.test.tsx: gate y first paint; webBeatEditDrawer.test.tsx y webDownloads.test.ts complementan rutas compartidas.
- cloud-server/tests/catalog/{catalog-queries,catalog-commands,catalog-playback,catalog-operations,catalog-purge,catalog-routes}.test.cjs y catalog-harness/* documentan contratos SQL y servidor.
- .github/workflows/catalog-checks.yml prevé unit/faults/integration y tareas T03–T19 con Postgres **efímero**, disparadas desde CI. Su YAML es evidencia de configuración, **no** de que haya corrido ni de resultado en este HEAD.
- tests/catalog-harness/catalog-harness.e2e.mjs existe y hay runners browser, pero **no se ejecutaron** ni se atribuye prueba real a la versión desplegada.

**Huecos que importan antes de cambiar código:**
1. Test controlado de R-002 con timers, sort durante debounce; incluir back/forward URL y selección al cambiar filtro.
2. Test asíncrono R-004: lease tarda después de teardown/cambio de cuenta, MSE y Blob, contador release.
3. Prueba UI de Delete individual en offline, 409 y doble acción; desde tarjeta y Player con beat ya evicto; bulk confirmado vs parcial y selección global > residentes.
4. Integración de Drawer bulk Web con selectedBeats parciales: cero escritura Tauri accidental, operación global única, campos seleccionados y conflictos.
5. E2E existente reejecutado **en entorno aislado y sólo bajo aprobación posterior**: cookie/CSRF → arranque/first-cache → buscar+sort → editar+portada → importar+timeout/reconcile → reproducir/Next → descargar → Trash/Restore/Purge. No intentar simular Telegram real en P04.
6. Verificar si existe consumidor **activo** y cadencia de /catalog/v1/changes para cambios de otro dispositivo; no inferir refresco push solo porque exista el endpoint.

Refs de ejemplos examinados: tests/component-dom/catalogAuditFixes.test.ts:16-99@ad8f8d0; tests/component-dom/catalogSection61.test.tsx:51-130,150-272@ad8f8d0; tests/component-dom/catalogInteractionStore.test.ts:22-195@ad8f8d0; tests/component-dom/catalogPlaybackSession.test.ts:35-115@ad8f8d0; .github/workflows/catalog-checks.yml:1-85@ad8f8d0. La presencia de los demás ficheros se verificó contra INVENTARIO-C0; su cobertura detallada es una **pregunta abierta**, no una prueba interpretada por nombre.

## 9. Candidatos internos de simplificación, precondiciones y prioridad

**P0 — preservar datos/bytes y cerrar incertidumbre antes de limpiar**
1. **R-004:** hacer explícita la propiedad del lease tardío de Player, conservando source, continuidad visual, MSE y referencia de media; precondición: test deferred/cancel. **No retirar** catalogMediaClient, lease/refcounts, Direct B ni webTransport*.
2. **R-003 individual:** uniformar guardas de conexión y feedback de delete individual con las invariantes del bulk, sin introducir cambios visuales; precondición: contrato de UX existente + test 401/409/offline y Player evicto. **No retirar** expectedVersion, selección server-side o jobs durables.
3. **Drawer doble paso:** documentar resultado parcial de quitar portada + archivos y comprobar reintentos; simplificar sólo si preserva contrato SQL y no duplica transferencia; precondición: fixtures de parcialidad y compatibilidad con archivos de Telegram.

**P1 — menor complejidad, sin cambiar presentación**
4. **R-002:** unificar la transición query de search/tags/sort para que el último sort no sea reemplazado por un callback diferido; precondición: prueba de interleaving y preservación de URL/selección/Player. **No mover sort/filter al cliente**.
5. **Adaptador GalleryChrome:** tipar chromeScope en lugar de Record<string, any>, quitar displayedBeats:[] cuando el contrato compartido lo permita; mantener el motor de Toolbar intacto. Precondición: rastreo de consumidores Web+lab y snapshot visual idéntico.
6. **Drawer rama bulk:** aislar saveBeatMeta Tauri en puente de plataforma; en Web usar exclusivamente onBulkSaved/BULK_PATCH, sin bucle nativo no-op; precondición: fixtures de Web y Desktop, pruebas de campos/tags/selección parcial. **No borrar** src/lib/tauri.ts global.
7. **DTO/proyecciones:** centralizar adaptaciones DTO→Beat / Map conocido / URLs donde reduzcan copias sin cambiar cache keys ni ventana residente; precondición: pruebas de playing evicto, lazy artwork e invalidación de cuenta.
8. **Callbacks no-op:** documentar props compartidas deshabilitadas; sólo eliminar desde firma compartida después de inventariar consumidores de otras plataformas. **No borrar** BeatCard/Player/Drawer por referencias antiguas.

**P2 — mantener tal cual hasta que haya justificación**
9. Virtualización, anclas, LRU, cache de primer bloque, prefix/MAIN, media Direct y session isolation: complejidad con función y contratos activos. Evitar reescritura cosmética o eliminación por prefijo legacy.
10. **Diseño aprobado intocable:** LandingPage, GalleryChrome/TagNavigation, StudioToolbarCandidate, BeatCard CSS/render, Player Playbar, layout/scroller. El laboratorio DESIGN/* no es fuente de verdad de producción, pero su similitud nominal no implica que src/features/design/* esté muerto.

**Criterio de retiro obligatorio:** antes de marcar un helper LEGACY borrable exigir grafo de imports estáticos/dinámicos + configuración Vite/Web/Desktop/CI, consumidores conocidos, tests que demuestren equivalencia, estado de fallbacks y plan de reversión. Un comentario histórico que diga «apagado T08» no vence al montaje actual de T16. Especialmente **catalogDirectPort conserva webTransport***, y **src/components** es compartido. Ref: catalogLibraryProvider.tsx:69-78@ad8f8d0; catalogDirectPort.ts:18-28@ad8f8d0; CatalogAppShell.tsx:70-94@ad8f8d0.

## 10. Cuestiones abiertas concretas, sin fingir resolución

1. ¿Qué observación externa/fixture de interleaving confirma R-002 en Chrome en el HEAD y qué secuencia preserva sort/URL después de arreglarlo? Referencia inicial: useCatalogGalleryScope.ts:157-171@ad8f8d0.
2. ¿Cierra/cancela efectivamente el sink MSE cuando media.teardown ocurre antes de que acquireStream resuelva y sesión rechace assertGen? El propio release es quien cierra sink; falta fixture. catalogPlaybackSession.ts:78-93@ad8f8d0; catalogMediaClient.ts:208-229,292-299@ad8f8d0.
3. ¿Qué decisión histórica autoriza eliminar sin confirmación visible un beat desde BeatCard/Player, y cómo se muestra un 409/offline? No convertir un posible problema de UX en «pérdida de datos». useCatalogGalleryScope.ts:263-267@ad8f8d0.
4. ¿Existe un puente activo de /changes hacia QueryStore para revisión de otros dispositivos, o sólo reload/notify por mutaciones locales? Ver consumidores antes de proponer polling. cloud-server/catalog/routes.js:170@ad8f8d0; catalogQueryStore.ts:367-403@ad8f8d0.
5. ¿Qué ocurre en Drawer bulk cuando se eligen 100+ items pero sólo hay 10 residentes, especialmente a nivel de preview de datos y selección de campos? La autoridad bulk está en PG, pero el draft toma seleccionados residentes. CatalogAppShell.tsx:180-185@ad8f8d0; useCatalogGalleryScope.ts:268-289@ad8f8d0.
6. ¿La prueba de portada/descarga cubre combinación: remover artwork y reemplazar PROJECT tras un PATCH confirmado pero REPLACE incierto? catalogDrawerSave.ts:23-58@ad8f8d0.
7. ¿La actualización cross-account se limpia si el trabajo asíncrono de artwork o historial termina luego del teardown? Los guardas de cuenta de media y first-cache existen; falta cruzar los efectos con un fixture de React. catalogMediaClient.ts:255-299@ad8f8d0.
8. ¿Qué tests existentes se ejecutaron efectivamente contra el SHA exacto y cuáles sólo contra commits previos? P04 no consultó resultados privados de CI con autoridad suficiente, de modo que no declara PASS.
9. ¿Existe un consumidor Web para los no-op de BeatCard aparte de la Gallery PostgreSQL o son sólo el contrato compartido con Desktop? Su eliminación queda bloqueada hasta grafo completo.

## 11. Dictamen

**COMPRENSION_SUFFICIENTE_PARA_PLAN**

Se conoce el camino de entrada real, componentes visibles, propietarios de estado, dependencias dinámicas críticas, contratos UI→Cloud→SQL/Telegram y cómo se preserva o revierte una acción de alto riesgo. **Suficiente para PLANEAR exclusivamente simplificaciones internas y pruebas de regresión**, sin tocar Landing/Gallery/Playbar ni declarar muerto lo que consume Direct B. **No es autorización para implementar, retirar archivos ni declarar bugs operativos.**

**Falta para ejecución segura:** resolver con pruebas aisladas R-002 y R-004; confirmar el comportamiento de Delete individual y Drawer bulk bajo selección global/conflictos; constatar consumidores de /changes, artefactos de CI del SHA y todos los imports cruzados de cualquier código propuesto para retirar. Esos huecos son acotados y trazables; no justifican reabrir todo el histórico ni acumular porcentajes de comprensión.
