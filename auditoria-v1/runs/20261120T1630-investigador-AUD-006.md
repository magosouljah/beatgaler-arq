# AUD-006 — Gating de mutaciones ante estados no saludables (2026-11-20 16:30 CST)

**Fuente fija:** `magosouljah/BeatGaler@45ec5b27e778127414537d01d170e0b972777768`, rama `local/landing-gallery-unificada`. Compare GitHub: identical (0 delta). Solo lectura estática; sin tests ni runtime. **Asignación única:** AUD-006 del PLAN 16:00, enmienda v2.1.

## HECHO: mapa y ownership
- `src/features/library/catalog/useCatalogGalleryScope.ts:504-507`: el scope traduce exclusivamente `snapshot.status === "offline"` a `connectionState="offline"`; cualquier otro estado se convierte en `"online"`. `rejectOfflineMutation` solo rechaza si no es `online`. `cloudSessionVerified` excluye idle/resolving/loading/unauthenticated/unavailable, pero no interviene en esta guarda. **CONFIRMADO estático**, no se infiere que todos esos estados sean alcanzables con UI interactiva.
- `CatalogAppShell.tsx:55-69`: drop llama `rejectOfflineMutation` antes de import/reemplazo; botón Add también. `CatalogAppShell.tsx:85-90`: Edit por tarjeta comprueba guarda; Delete pasa `scope.deleteBeat` directamente. `CatalogAppShell.tsx:100-111`: banner offline; botones bulk habilitados por count y selection.status, no por connectionState. `CatalogAppShell.tsx:119-121`: rename dialog sin guarda de conexión en este shell.
- `useCatalogGalleryScope.ts:248-267,273-303`: `commitDrawerCloudMutation` llama `mutations.patchBeat/replaceBeat`, `deleteBeat` llama `trashBeats`, `applyBulkUpdate/handleRemoveBulk` llaman `interactionStore.startBulk`, `confirmTagRename` llama `interactionStore.confirmRename`. Estas funciones no invocan `rejectOfflineMutation` internamente. `CatalogAppShell.tsx:173,184`: modal de import y Drawer reciben `mutationAllowed={connectionState==="online"}`, protección UI adicional para esos dos caminos.
- `catalogMutations.ts:136-168`: `patchBeat` delega a commands y tipifica conflictos; `trashBeats` delega por lotes a commands; no verifica `snapshot.status` (ni lo recibe). Backend y `interactionStore` pueden imponer guardas adicionales: no inspeccionados aquí.

## Tabla de escenarios estáticos

| snapshot.status | connectionState | Acción | Guarda en tramo auditado | Destino |
|---|---|---|---|---|
| offline | offline | Add/drop/Edit | rejectOfflineMutation bloquea | sin llamada desde esos controles |
| offline | offline | Delete tarjeta | sin guarda en deleteBeat | trashBeats → commands |
| offline | offline | Remove all con selección active | botón solo exige count>0 y active | startBulk(BULK_TRASH) |
| error/integrity/quarantined **si son valores reales** | online | Add/drop/Edit | rejectOfflineMutation permite; provisional puede volver shell inert | modal o mutación posterior |
| online normal | online | Delete | sin guarda local | trashBeats; servidor decide |

**Contraejemplo al riesgo absoluto:** `snapshot.provisional` aplica `inert` a la raíz (`CatalogAppShell.tsx:94-98`); `mutationAllowed` en Drawer/Review (`:173,184`) y la guarda de drop/Edit impiden algunos caminos. No es cierto que toda acción esté siempre habilitada.

## Clasificación y límites
- **CONFIRMADO (código):** la conversión de estado a conexión es binaria; la guarda local no cubre todos los estados ni todos los entrypoints; Delete/bulk carecen de esa guarda en los tres módulos examinados.
- **RIESGO R-003:** si la UI conserva tarjetas/selección interactiva durante un estado no saludable distinto de offline (o durante offline), pueden iniciarse solicitudes que el servidor rechace. No se ha demostrado escritura indebida, corrupción ni bug visible.
- **NO_VERIFICABLE en este microlote:** enumeración real de `snapshot.status` y significado de integrity/quarantined; bloqueo del `interactionStore`; validaciones de backend, efecto de `inert` según render efectivo; tests pertinentes y ejecución runtime. No afirmar que existan estados `integrity`/`quarantined` sin comprobar el tipo/store.

## Cobertura propuesta
`useCatalogGalleryScope.ts`: C2 **parcial**, solo gating/entrypoints; `CatalogAppShell.tsx`: C2 **parcial**, controles principales; `catalogMutations.ts`: C1 y C2 **parcial** para patch/trash. C3 **ninguno**. Los otros módulos, SQL y Cloud no se certifican.

## PENDIENTE separable
1. Revisar el tipo/transiciones reales de `snapshot.status` y cuándo se desmonta o bloquea el shell.
2. Revisar `interactionStore.startBulk` y comandos Cloud para determinar rechazo efectivo; pruebas escritas de offline/error.
3. Recorrer Delete y bulk en navegador con autorización futura, si se busca demostrar efecto runtime.

**Modificación futura orientativa, no implementada:** centralizar una política de capacidad de mutación derivada de estados reales, aplicarla en entrypoints de scope/servicios además de disabled visual, y dejar el servidor como autoridad final. Validar primero estados alcanzables y semántica de errores.

**Resultado:** AUD-006 puede cerrarse PARCIAL como mapa estático, con R-003 conservado y huecos convertidos en lotes nuevos. No modificar PLAN ni registros canónicos.
