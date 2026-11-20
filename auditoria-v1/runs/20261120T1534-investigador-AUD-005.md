# AUD-005 — debounce de filtros frente a sort (2026-11-20 15:34 CST)

**Fuente única de código:** `magosouljah/BeatGaler@9680c73da477cc9bcd201a036490d736bb6a7b12` (ref explícito en cada lectura). **Estado:** HECHO para reconstrucción estática del tramo; NO_VERIFICABLE en ejecución React/browser. No se ejecutaron pruebas ni CI.

## Pregunta y veredicto
**RIESGO R-002 fortalecido por contraejemplo estático:** el callback diferido de filtros captura `snapshot.sort` del render en que se creó; cambiar solo sort no figura en las dependencias del efecto, por lo que no cancela/recrea el temporizador. Si el temporizador todavía está pendiente, puede llamar `store.setQuery(filters, sortAnterior)` y restaurar el orden previo. La posibilidad lógica está sustentada en código; no se afirma reproducción runtime ni frecuencia real.

## Arquitectura y ownership
- `CatalogAppShell.tsx:30-39,67-79`: monta `useCatalogGalleryScope` y pasa `search/setSearch/sortBy/setSortBy` a `GalleryChrome`. El Shell no posee el orden; solo presenta callbacks y tarjetas.
- `useCatalogGalleryScope.ts:114-122`: `useSyncExternalStore` lee snapshot del query store; `search`, `includedTags` y `excludedTags` son estado local React; `sortBy` es `snapshot.sort`. `query` para interacción/reproducción deriva de filtros, sort y revisión.
- `useCatalogGalleryScope.ts:155-171`: efecto crea timer 250 ms y construye filtros desde estado local y `snapshot.filters`; llama `interactionStore.onFiltersChanged` y `store.setQuery(filters, snapshot.sort)`. Cleanup cancela timer solo al variar `search/includedTags/excludedTags` o desmontar. Dependencias excluyen sort/snapshot.
- `useCatalogGalleryScope.ts:174-175`: `setSortBy` llama `interactionStore.onSortChanged(sort)` y `store.setSort(sort)` inmediatamente, sin cancelar timer.
- `catalogQueryStore.ts:355-361`: `setSort(sort)` delega a `setQuery(snapshot.filters, sort)`; `setQuery` publica filtros, sort y queryKey y llama `loadFirst` salvo cache hit por clave+bloques. El store es owner de sort, queryKey y generación/cargas.
- `catalogQueryStore.ts:362-368`: nueva generación aborta controlador y limpia inflight; protección de red no impide que un timer viejo emita otra consulta legítima.
- `useCatalogGalleryScope.ts:145-152,172`: cambios de query afectan historial; sesión playback recibe query derivada. La regresión de sort podría propagarse a historial/sesión si ocurre.

**Mapa textual:** GalleryChrome → CatalogAppShell.chromeScope → useCatalogGalleryScope (search/tags React; sort en snapshot) → timer filtros / setSortBy inmediato → catalogQueryStore.setQuery/setSort → queryKey + carga → snapshot → GalleryChrome/virtualización; paralelo: interactionStore y playback session.

## Cronología que falsaría R-002
1. Render R0: `snapshot.sort = rating`, `search = ""`; efecto registra timer T0 con captura rating.
2. Antes de 250 ms, usuario selecciona `name`: `setSortBy(name)` publica snapshot con sort name y solicita carga.
3. Re-render R1 por external store; como `search`, `includedTags`, `excludedTags` mantienen identidad, efecto del timer no vuelve a ejecutarse y T0 no se cancela.
4. T0 vence. Si los filtros capturados difieren de `snapshot.filters` capturados, ejecuta `store.setQuery(filters, rating)`. Incluso con los mismos filtros en el store actual, la clave cambia por sort y puede volver a rating. Ejemplo concreto: escribir q='kick', seleccionar name antes de vencer debounce: T0 ve q='kick' vs q='' de R0 y restaura rating.

**Contraejemplos/limitadores:** si se modifica search/tags otra vez antes de T0, cleanup cancela el timer y captura el sort actualizado; si T0 vence antes del cambio de sort, no hay reversión por este orden temporal. Si la query key ya coincide y hay bloques, `setQuery` retorna temprano. Ninguno elimina el escenario anterior.

## Errores y pruebas
`store.setQuery` y `interactionStore.onFiltersChanged` se invocan con `void` en el timer; este tramo no muestra manejo local de rechazos. No se rastreó el tratamiento interno de errores del store ni se inspeccionaron pruebas escritas en esta ejecución: **PENDIENTE**, no afirmar ausencia de tests. No se inspeccionó implementación interna de GalleryChrome, pero su integración como caller está verificada en Shell.

## Clasificación y cobertura propuesta
- **CONFIRMADO (estático):** dependencias del efecto excluyen sort; timer captura `snapshot.sort`; setSort actualiza store inmediatamente; store acepta sort en setQuery.
- **RIESGO R-002:** carrera determinista bajo la cronología descrita según semántica normal de hooks, **no bug observado en producto**.
- **NO_VERIFICABLE:** comportamiento runtime exacto, frecuencia, interacción de React StrictMode y tests.
- **C2 parcial propuesto** para `useCatalogGalleryScope.ts` (tramo filtros/sort), `catalogQueryStore.ts` (setQuery/setSort), `CatalogAppShell.tsx` (paso de callbacks). **C3 pendiente** hasta contrastar tests y efectos de cargas.
- **Posible mejora, no implementada:** hacer que el callback diferido use sort vigente del store al disparar, o cancelar/reprogramar el debounce al cambiar sort, conservando semántica de selección y playback. Revisar efectos en estos tres archivos antes de cambiar.

## HECHO / PENDIENTE / siguiente microlote
HECHO: cronología, ownership, límites, contraejemplos, mapa de dependencias. PENDIENTE: tests escritos, revisión independiente de Director y verificación en navegador autorizada (no ejecutada). **Siguiente:** Director puede cerrar AUD-005 PARCIAL y asignar AUD-006 gating R-003; mantener tests de debounce como deuda separada. No se modificó BeatGaler ni registros canónicos.
