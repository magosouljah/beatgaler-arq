# AUD-002 — Microlote UI de filtros, selección, audio y estados de error
Fecha: 2026-11-20 12:31 CST. Fuente única: `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17` (ref explícito en todas las lecturas). Investigación ESTÁTICA; ningún test ni producto ejecutado.

## HECHO — recorrido y propietarios
1. `CatalogGalleryWorkspace.tsx:5-17` no implementa lógica: carga CSS y delega props a `CatalogAppShell`. Por ello el punto real de UI es `CatalogAppShell.tsx:46-49,70-95,125-145,187-191`: usa `useCatalogGalleryScope`, conecta `GalleryChrome` con search/tags/sort, `BeatCard` con play/selección, `CatalogVirtualGallery` con el store y `Player` con la sesión de audio. El shell no es dueño de la consulta.
2. `useCatalogGalleryScope.ts:70-73,116-121,127-168`: `useSyncExternalStore` consume snapshot de `CatalogQueryStore`; el hook posee borrador local de búsqueda, include/exclude tags, y aplica debounce (`SEARCH_DEBOUNCE_MS`) antes de llamar `interactionStore.onFiltersChanged` y `store.setQuery`. El arranque puede usar seed, URL `bgPage`, filtros URL, cursor o primer bloque (127-142); actualiza historial según `queryKey` (145-155). `setSortBy` en :171 actualiza interactionStore y query store; `handleTagClick` :172-176 alterna inclusión/exclusión. Cambios de filtros se propagan además a `session.setQuery(query)` (:168).
3. `catalogQueryStore.ts:354-360`: `setQuery` calcula identidad de filtros+sort, evita refetch cuando coincide con bloques, publica filtros y carga primer bloque; `setSort` delega. `:193-216` limita inflight y distingue 401, 503, OFFLINE, CURSOR_STALE; `:340-343` retry según borde; `:261-284` retira seed provisional si revalidación falla.
4. `catalogInteractionStore.ts:18-19,90-110,173-205`: selección GLOBAL server-side. Owner cliente: token/versión/count/flags residentes, no lista completa de IDs; `onFiltersChanged` limpia selección con aviso condicionado y cancela preparaciones en vuelo; `onSortChanged` conserva miembros y borra ancla Shift; `onRevisionChanged` marca conflicto; `refreshFlags` pide flags para IDs residentes. `useCatalogGalleryScope.ts:191-210` conecta tarjetas, select all y refresco de flags.
5. `catalogPlaybackSession.ts:1-16,26-66,73-107`: owner de current/queue/shuffle/repeat/progress/source, separado del store de tarjetas. Fuente de audio mediante lease `acquireSource`; cambio de consulta no elimina bytes de audio actual según contrato comentado, pero su comportamiento completo requiere seguir `setQuery`. `useCatalogGalleryScope.ts:217-240` enlaza eventos de audio y comandos play/next/previous. `CatalogAppShell.tsx:187-191` conecta `Player`.
6. `CatalogVirtualGallery.tsx:34-51,68-114`: suscripción al store, filas virtuales, estados vacíos y fallos. Error/offline/unavailable muestran Retry (`store.retry`); enlaces legacy pueden mostrar «Ir al inicio»; los errores de borde ofrecen retry contextual.

### Mapa textual
`GalleryChrome(search/tags/sort)` → `CatalogAppShell` → `useCatalogGalleryScope (draft/debounce)` → `catalogInteractionStore (selección)` + `catalogQueryStore (filtros, bloques, revisión)` → `CatalogVirtualGallery/BeatCard`.
`BeatCard.play` → `scope.handlePlay` → `catalogPlaybackSession` → `resolveFile/acquireSource` → `Player`.
`query snapshot` → `scope.session.setQuery` → navegación siguiente/anterior sobre conjunto servidor (contrato parcial; no rastreado hasta Cloud).
`catalogQueryStore.error` → `CatalogVirtualGallery` → `store.retry`.

## Contraejemplos, problemas y límites
- **DESCARTADO en el tramo leído:** cambiar sort no borra explícitamente selección: `onSortChanged` solo cambia ancla/sort (:188), frente a `onFiltersChanged` (:179-186). No demuestra ausencia de otras limpiezas.
- **RIESGO / no confirmado:** `useCatalogGalleryScope.ts:157-168` usa efecto de debounce dependiente de `search,includedTags,excludedTags` con supresión de exhaustividad; lee `snapshot.filters`, `snapshot.sort`, `revision` y `interactionStore` por cierre. Un cambio de sort durante el debounce podría hacer que el callback use sort previo y llame `store.setQuery(filters, snapshot.sort)`, revirtiendo el orden recién elegido. Escenario: escribir búsqueda, antes de que venza debounce cambiar sort, luego vence timeout. **No probado en runtime**; confirmar orden de commits de React y si cambio de sort actualiza alguna dependencia del efecto antes de elevar a bug.
- **RIESGO / no confirmado:** `useCatalogGalleryScope.ts:504-505` trata estados `error`, `integrity` y `quarantined` como `connectionState=online`; operaciones pueden seguir habilitadas aunque Gallery no tenga estado utilizable. Hay validación adicional en comandos no inspeccionada; no afirmar mutación indebida.
- **No verificado:** contratos SQL/HTTP concretos para selección y reproducción, implementación completa de `session.setQuery`, pruebas de UI pertinentes, alcanzabilidad de fallos en navegador real, y comparación semántica de filtros cliente/servidor. No hay bug operativo confirmado por este informe.

## Cobertura propuesta (NO certificada; Director decide)
- `CatalogGalleryWorkspace.tsx`: C2 estático (wrapper completo).
- `CatalogAppShell.tsx`: C2 de tramo UI conexión GalleryChrome/BeatCard/Player; resto C1 parcial.
- `useCatalogGalleryScope.ts`: C2 parcial de filtros, selección, audio y URL; resto C1 parcial.
- `catalogQueryStore.ts`, `catalogInteractionStore.ts`, `catalogPlaybackSession.ts`, `CatalogVirtualGallery.tsx`: C2 de tramos concretos arriba, NO C2 de módulos completos.
- Flujo UI filtros→consulta→render: C2 parcial estático. Flujo filtros→selección y reproducción: C2 parcial. C3 NO probado.

## Pendiente / siguiente microlote sugerido (NO asignado)
AUD-002 puede cerrarse **PARCIAL** por Director si exige trazar API/SQL y tests: estos son otros microlotes. Para falsar riesgo de sort/debounce, contrastar efecto, cronología de snapshots y pruebas escritas; para audio, `catalogPlaybackSession.setQuery` y sus contratos. AUD-003 canonicalización cliente/SQL y AUD-004 membresía permanecen en backlog del Director. Ningún archivo de BeatGaler modificado.
