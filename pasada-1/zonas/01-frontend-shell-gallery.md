# Zona 01 — Frontend: armazón de la app, Gallery y biblioteca

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en código; PROVISIONAL = inferido. Nada se ejecutó. Rutas relativas a `E:\777\app\BeatGaler\`.

Tres hallazgos que condicionan el resto (FIRME en código, no ejecutados):
- La rama catálogo no tiene restaurar ni vaciar papelera cableados: el cliente existe y está probado, pero ningún componente lo llama.
- En catálogo, los archivos MASTER/WAV/PROJECT elegidos en el Drawer se descartan al guardar sin aviso.
- En Web legacy, renombrar tag y la edición en lote solo cambian el estado local: no sale ninguna llamada.

## Sistemas

**1. Arranque y enrutado (activo).** `src/main.tsx:127` elige por `platform.kind`: Web → `src/app/WebExperience.tsx`; Desktop → `src/app/DesktopExperience.tsx` (lazy). `WebExperience.tsx:24` enruta a mano por `location.pathname`: `/` → Landing; `/gallery|/login|/signup` → `src/app/WebGalleryEntry.tsx` (`AuthExperienceGate` y, ya autenticado, `WebGalleryWorkspace`); el resto → "Page not found". FIRME.

**2. Puerta de composición legacy/catálogo (activo, flag apagado por defecto).** `src/app/WebGalleryWorkspace.tsx:19-30` con `useLibraryComposition` (`src/features/library/catalog/catalogLibraryProvider.tsx:85`) y `LibraryCompositionGate.tsx:29`.
- El flag es `VITE_CATALOG_API_ENABLED` (`catalogComposition.ts:7-16`), de build: un bundle es legacy o catálogo, no se decide por cuenta.
- Flag off → `LegacyWorkspace` = `LibraryUxBridge` + `WebLibraryPagination` + `App`.
- Flag on → `GET /catalog/v1/context`; si responde `LIBRARY_NOT_PROVISIONED`, el cliente lanza solo `POST /catalog/v1/library/provision` (`catalogApi.ts:208-211`).
- `ready` monta `CatalogGalleryWorkspace`; cualquier otro estado muestra un mensaje de bloqueo y nunca cae a legacy. FIRME.

**3. Shell legacy (activo en Web hoy; también es el shell de Desktop).** `src/App.tsx` → `src/app/BeatGalerApp.tsx` → `useBeatGalerComposition.ts` (676 líneas, unos 45 hooks) → `AppShell.tsx` (571 líneas).
- El hook devuelve un objeto de ~150 claves y `AppShell` lo recibe como `scope: Record<string, any>` (`AppShell.tsx:26-27`).
- `AppShell` bifurca por `web` en la misma función: Web usa `GalleryChrome`; Desktop usa barra antigua con `SearchBar`/`SortMenu` y tira de tags inline (`AppShell.tsx:138-255`).
- Grid plano con dnd-kit, sin virtualizar (`AppShell.tsx:322-388`). FIRME.

**4. Shell catálogo (construido; apagado en producto).** `src/features/library/catalog/`: `CatalogAppShell.tsx` (140), `useCatalogGalleryScope.ts` (304), `CatalogVirtualGallery.tsx`, `useCatalogVirtualRows.ts`, `catalogRowGeometry.ts`. Reutiliza los mismos `GalleryChrome`, `BeatCard`, `Drawer`, `Player`, `SettingsPanel` y `AddBeatModal`. Servicios (`catalogLibraryProvider.tsx:39-82`):
- `catalogApi` (lecturas), `catalogCommandsApi` (comandos), `catalogMutations`, `catalogTransfer` (subidas por capacidad).
- `catalogQueryStore`: ventana de ≤6 bloques × 240 DTO.
- `catalogInteractionStore`: selección en servidor, rename, bulk, facetas.
- `catalogPlaybackSession`, `catalogMediaClient`, `catalogNavigation` (URL `bgAnchor/bgQ/...`).

**5. Piezas visuales aprobadas** (archivos reales, FIRME):
- Landing: `src/features/design/LANDING/LandingPage.tsx`.
- Gallery infinita virtualizada: `CatalogVirtualGallery.tsx` + `useCatalogVirtualRows.ts`; solo existe en la rama catálogo. La Gallery legacy es una página de 240 con paginador.
- BeatCard: `src/components/BeatCard.tsx` (799), único para ambas ramas y Desktop; cambia de aspecto con `web` (`:339`, `:379`).
- Tag Bar: `src/features/design/GALLERY/TagNavigation.tsx`, montada por `GalleryChrome.tsx`.
- Toolbar (buscar/ordenar/perfil): `src/features/design/MASTER/StudioToolbarCandidate.tsx` (WebGL).
- Playbar: `src/components/Player.tsx`.

**6. `src/features/design/` (26 archivos) es UI de producción con nombres de laboratorio.** Todo está vivo vía `GalleryChrome`, `LandingPage`, `BeatCard` (`beatCardTags`, `beatCard.css`) y `BeatTagPeek`; no hay punto de entrada de laboratorio en `src`. Quedan los nombres `lab-*`, `StudioToolbarCandidate`, `MASTER/`. No hay dos generaciones de BeatCard/Drawer, sino tres capas mezcladas:
- componentes antiguos con estilos inline (`src/components/`), compartidos con Desktop;
- chrome nuevo (`design/`) solo Web;
- `src/features/library/LibraryUxBridge.tsx` (378), que parchea el DOM por texto y estilos con un MutationObserver. En Web sale pronto y solo retoca menús (`:340`), así que ese archivo y `src/styles/library-ux.css` (360) son en la práctica Desktop. FIRME.

**7. Estado legacy de biblioteca (Web legacy + Desktop).** No hay una fuente de verdad sino una cadena de copias:
- INDEX de Telegram (autoridad), leído con `worker.getLibraryIndex()`.
- `WebLibraryWindowConsumer.currentPage` y `webBeatRegistry`, singletons en `src/platform/webAdapter.ts:21-24`.
- `beats` de React (`src/features/library/useLibraryState.ts`) y su espejo manual `beatsLatestRef`.
- Caché en localStorage `beatvault:library:v2:<cuenta>`.
- Refs de huellas anti-duplicado (`cloudMetaSnapshotRef`, `cloudLibrarySnapshotRef`, `visibleLibraryFingerprintRef`), sembradas a mano en 6+ hooks.
- `beatRuntimeStatesRef` (`src/features/state/`).
- `src/lib/libraryStateManager.ts` (92): cola serializadora de recarga/commit. En Web `commitSnapshot` lanza "unavailable" (`webAdapter.ts:100`), así que solo sirve `reloadAuthoritative`; los commits son Desktop.

Estado de vista: `useLibraryViewState`, `useTagFilters`, `useBeatSelection`, `src/lib/tagColors.ts` (localStorage, por navegador en ambas ramas), `src/lib/jobStore.ts`. FIRME.

**8. Estado catálogo.** La autoridad es PostgreSQL. En cliente:
- `catalogQueryStore` (≤1.440 DTO), `catalogInteractionStore` (token, contador y flags), `catalogPlaybackSession`.
- En `useCatalogGalleryScope`: `dtoById` (≤512), `artworkUrls`, y espejos locales de búsqueda y tags con debounce de 250 ms (`:76-124`).
- La URL, y referencias de operación en localStorage `beatgaler:catalog-ops:v1:<cuenta>`.

No consume `GET /catalog/v1/changes`: se refresca solo tras mutaciones propias con `store.notifyLibraryChanged()`. FIRME.

**9. Otros.**
- `src/components/SettingsPanel.tsx` (715) mezcla cuenta, plan/billing, preferencias, papelera y textos legales.
- `src/components/JobStatusBar.tsx` + `jobStore`: jobs de YouTube y tag-rename por eventos Tauri (Desktop). Solo lo monta `AppShell`, no el shell catálogo.
- `src/domain/beat.ts` y `src/types/index.ts`: el tipo `Beat` tiene forma Desktop (`mp3_path`, `folder_path`, `telegram_file_id`…).

## Flujos

**(a) Editar nombre/tags/portada.**
- *Legacy Web*:
  1. `BeatCard` o `Player` → `setDrawer`.
  2. `Drawer.tsx:309` llama `platform.editor.commit` porque NO recibe `onCloudMutationCommit` (`AppShell.tsx:445`).
  3. `webAdapter.ts:184` → `WebGalerCloudTransport.commitBeatEdit` (`src/features/cloud/webGalerCloudTransport.ts:603`).
  4. Salen: `/transport/operation/begin`, `getLibraryIndex` al worker, subida, `/transport/index/publish`, `/transport/index/commit`.
  5. `onSaved` → `useBeatEditing.updateBeat` → `setBeats`.
- *Catálogo*:
  1. `CatalogAppShell.tsx:125` sí pasa `onCloudMutationCommit`, así que el Drawer entra por su rama Desktop (`Drawer.tsx:351-479`; `saveBeatMeta` es no-op sin Tauri).
  2. `useCatalogGalleryScope.commitDrawerCloudMutation` (`:203`).
  3. Sin portada nueva: `PATCH /catalog/v1/beats/:id` con `expectedVersion`.
  4. Con portada nueva: `replaceBeat` → `POST /catalog/v1/operations`, capacidad por parte, `PUT`, `/commit`.
  5. `store.notifyLibraryChanged()`.
- *Desktop*: `saveBeatMeta`/`syncBeatMetadataToTelegram` (Tauri) + `libraryStateManager.commitSnapshot`.

**(b) Buscar/filtrar/ordenar.**
- *Legacy*: `StudioToolbar`/`TagNavigation` → `setSearch`/`handleTagClick`/`setSortBy` → `selectFilteredAndSortedBeats` (`src/features/library/librarySelectors.ts`) sobre `beats`. Ninguna llamada: filtra solo la página cargada de ≤240. El paginador recarga con `location.assign(?bgPage=)` (`WebLibraryPagination.tsx:31`).
- *Catálogo*: mismos controles → debounce → `store.setQuery`/`setSort` → `GET /catalog/v1/beats?…`; facetas por `GET /catalog/v1/facets`; es global en el servidor.

**(c) Papelera/restaurar.**
- *Legacy*: menú de `BeatCard` → `useTrashActions.deleteBeat` → `platform.trash.moveBeats` → `moveBeatsToTrash` (`operation/begin` "trash_move", reescritura de INDEX, `index/commit`). Restaurar: `SettingsPanel.tsx:234` → `platform.trash.restoreBeat` → `handleBeatRestored`. Vaciar: `/transport/trash/purge`.
- *Catálogo*: borrar = `POST /catalog/v1/beats/trash`; en lote = `POST /catalog/v1/operations` con `BULK_TRASH`.
  - Restaurar y vaciar no tienen llamador: `restoreBeats`, `purgeTrash`, `purgeState`, `bulkOverSelection` no se usan fuera de su definición (`git grep`).
  - Además `SettingsPanel` montado en catálogo sigue llamando `platform.trash.listBeats()` al abrirse (`SettingsPanel.tsx:169`), es decir, al transporte INDEX. FIRME la llamada; PROVISIONAL el efecto (un comentario en `webAdapter.ts:47` dice que el servidor responde 410).

**(d) Selección múltiple.**
- *Legacy*: `useBeatSelection` guarda un `Set` de ids local; "Select All" cubre solo `displayedBeats`. Editar en lote: `Drawer.tsx:321-348` → `applyBulkUpdate` → `setBeats`.
- *Catálogo*: `interactionStore.toggle/selectAll` → `POST /catalog/v1/query-sets`, `/selections`, `/selections/:id/ops`; lote → `POST /catalog/v1/operations` (`BULK_PATCH`, `BULK_TRASH`).

**Renombrar tag.**
- *Legacy*: `useTagRename` → `renameTagEverywhere` (Tauri).
- *Catálogo*: `POST /catalog/v1/tags/rename/preview` y luego `/tags/rename`.

## Fricción (por coste)

1. **El Drawer (906) decide su camino de guardado por capability × presencia de un prop.** Hay tres rutas en un `handleSave` de 240 líneas, y la rama catálogo viaja por la de Desktop. Coste concreto, FIRME en código:
   - La sección FILES se muestra en catálogo (`Drawer.tsx:834`), pero `pendingWebEdit` solo se lee en `:313`, que es legacy: los archivos elegidos se descartan.
   - Un beat sin `telegram_file_id` no dispara el commit (`:462-464`) y el Drawer se cierra como si hubiera guardado.
   - El store tiene un editor con conflicto tipado (`openEditor`/`saveEditor`) que nadie usa.
   - Quien toque el guardado debe conocer Tauri, el transporte INDEX y el catálogo a la vez.

2. **En Web legacy hay mutaciones que no persisten.** FIRME en código:
   - Rename de tag: `renameTagEverywhere` devuelve `{0,0}` sin Tauri (`src/lib/tauri.ts:563-566`) y luego se hace `setBeats` local. El job queda en "processing" porque nadie emite `tag-rename:done`.
   - Edición en lote: `saveBeatMeta` es no-op y `applyBulkUpdate` solo cambia estado local.
   - Causa de fondo: `src/lib/tauri.ts` (1.358) hace no-op silencioso en vez de fallar, así que el seam `platform` se puede saltar sin que se note.

3. **`useBeatGalerComposition` → `scope: Record<string, any>` → `AppShell`.** La interface tiene ~150 claves sin tipos y es igual de compleja que la implementation (shallow). Prueba de borrado: desaparece un archivo, pero la complejidad está en el cableado de refs compartidos (`beatsLatestRef` y las tres refs de huellas pasan a 8-10 hooks). Seguir "editar" obliga a saltar entre `useBeatEditing`, `useDrawerCloudPersistence`, `libraryFingerprints` y `beatRuntimeState`.

4. **El tipo `Beat` es la interface de todos los componentes y tiene forma Desktop.** `beatFromCatalogDetail` (`catalogMutations.ts:63-72`) rellena campos falsos (`telegram_file_id: "catalog:<fileId>"`, rutas vacías), y `CatalogAppShell.tsx:56-63` pasa ~12 callbacks vacíos a `BeatCard`. Los fallos del punto 1 nacen aquí.

5. **Capabilities por plataforma, no por autoridad.** `platform.capabilities.*` y `platform.trash/editor` apuntan siempre al transporte INDEX. El shell catálogo monta componentes que los consultan (`SettingsPanel`, `Drawer`, `AddBeatModal`), así que el seam del catálogo acaba en el scope y los componentes lo cruzan por debajo.

6. **Dos shells duplicados a mano.** `CatalogAppShell` copia el JSX de `AppShell` (barra de selección, botón Add, avisos, props de Player). El catálogo no monta `JobStatusBar`, `ImportReviewHost`, `CloudFilesModal` ni las descargas. `TagColorMenu` en `CatalogAppShell.tsx:86-89` no se puede abrir: nadie llama `setTagColorMenu({...})`.

7. **Los clientes HTTP del catálogo importan de un componente de UI.** Seis módulos toman `getBeatGalerAuthToken`/`getResolvedCloudApiBase` de `src/components/AccountGate.tsx` (894). La cabecera y el CSRF están reimplementados cuatro veces (`catalogApi`, `catalogCommandsApi`, `catalogTransfer`, `catalogMediaClient`) y una quinta inline para playback en `catalogLibraryProvider.tsx:50-62`. `dataUrlToFile` está duplicado (`useCatalogGalleryScope.ts:34`, `catalogMutations.ts:87`).

8. **Bus de eventos `window`.** Unos 25 nombres `beatgaler:*` y `beatcard:close-menus` sin tipos; `BeatCard` escucha cinco. `LibraryUxBridge` depende de textos y colores inline: cambiar un estilo rompe la accesibilidad de Desktop.

9. **Pruebas.**
   - 49 archivos de test leen el código fuente como texto (`readFileSync`), por ejemplo `tests/component-dom/appShellExtraction.test.ts`: fijan la forma del código, no su comportamiento.
   - Sin referencia en tests: `CatalogAppShell`, `useCatalogGalleryScope`, `useCatalogVirtualRows`, `useTrashActions`, `TagNavigation`, `BeatTagPeek`, `jobStore`.
   - Bien cubiertos con fakes inyectables (deep): `catalogQueryStore`, `catalogInteractionStore`, `catalogMutations`, `catalogTransfer`, `catalogMediaClient`, `catalogPlaybackSession`, `catalogRowGeometry`.
   - El hueco está en el pegamento entre servicios y UI, que es donde aparecen los fallos de 1 y 5.

## Candidatos a retirar

- `src/components/SetupModal.tsx` (180): sin importadores en todo el repo. FIRME.
- `TagColorMenu` y su estado en `CatalogAppShell.tsx`: inalcanzable. FIRME.
- Métodos del catálogo sin llamador en `src`: `openEditor/setDraft/saveEditor/reloadEditorOrigin/closeEditor`, `cancelBulk/resumeBulk/dismissBulk`, `beginDrop/cancelDrop/completeDrop`, `restoreBeats`, `purgeTrash/purgeState`, `bulkOverSelection`, `resolvePendingTransfers`, `api.changes`. No están muertos: son funcionalidad pendiente de cablear.
- Solo Desktop dentro del shell compartido: bloque `!web` de `AppShell`, `SearchBar`, `SortMenu` como componente (su tipo `SortKey` sí se usa), casi todo `LibraryUxBridge` + `library-ux.css`, `useLibraryReorder`, `useNativeLibraryDrop`, la tubería de `JobStatusBar`, `UploadModal`/`UploadSchedulerNew`.
- Importan `lib/tauri` en esta zona: `useBeatGalerComposition`, `BeatCard`, `Drawer`, `JobStatusBar`, `AddBeatModal`, `useBeatEditing`, `useDrawerCloudPersistence`, `useTrashActions`, `useTagRename`, `useBeatAssetUpdates`, `useBeatProjects`, `useLibraryReload`, `useLibraryReorder`, `dropStaging`, `libraryStateManager`.
- Desaparece al retirar INDEX (Web): `LegacyWorkspace`, `WebLibraryPagination`, `webLibrary.ts`, `webLibraryWindow.ts`, `webLibraryNavigation.ts`, `useWebLibraryReconciled`, `mergeActiveUploads`, `libraryFingerprints`, la caché de beats de `libraryPresentationCache`, `useLibraryState`, `useLibraryReload`, `librarySelectors`, `tagSelectors`, `useTagFilters`, `useBeatSelection`, `src/features/trash/webTrash.ts`, `src/features/edit/webBeatEdit.ts`. Si Desktop también se retira, se suman `useBeatGalerComposition`, `AppShell`, `libraryStateManager`, `src/features/state/*` y los hooks de edit/trash/tags legacy.
- Nombres engañosos, no muertos: `StudioToolbarCandidate`, `MASTER/`, clases `lab-*`; el ErrorBoundary dice "BeatVault crashed" (`main.tsx:115`).

## Dudas y límites

- No se ejecutó nada: los fallos de Fricción 1 y 2 y la falta de restaurar en catálogo son lectura de código, no reproducción. El más urgente de confirmar en LAB es la pérdida de archivos del Drawer en catálogo.
- `notifyLibraryChanged()` recarga el primer bloque (`catalogQueryStore.ts:~320`). No se sabe si tras editar o borrar con scroll profundo la vista salta al inicio.
- `BeatCard` usa `useSortable` sin `DndContext` en catálogo; se supone inocuo, sin verificar.
- No se sabe si el servidor responde 410 a `platform.trash.listBeats()` con catálogo activo; solo consta en un comentario.
- No se profundizó en `UploadModal`, `Player`, `AccountGate`, import/dragdrop, ni en el interior de `StudioToolbarCandidate` y `GLUtils` (WebGL).
- No se contrastó `BLUEPRINT/` ni `docs/` con estos hallazgos.
